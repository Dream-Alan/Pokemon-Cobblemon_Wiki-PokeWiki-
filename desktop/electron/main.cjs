/**
 * PokeWiki 桌面版（Electron）主进程
 *
 * 站点以 site.zip 形式随包分发，主进程在内存里解析 zip 并按需 inflate，
 * 起一个只监听 127.0.0.1 的静态服务器，再用 BrowserWindow 载入 —— 
 * 这样既保留了 Next 静态导出的路由（/pokedex/25/ 这类目录索引），
 * 又不需要真的把 443MB 解压到磁盘。
 */
"use strict";

const { app, BrowserWindow, Menu, shell, dialog, nativeImage } = require("electron");
const http = require("node:http");
const zlib = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const APP_NAME = "宝可梦百科";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

/* ---------------- 内存 zip ---------------- */

class ZipArchive {
  constructor(buf) {
    this.buf = buf;
    this.entries = new Map();
    this.#readCentralDirectory();
  }

  #readCentralDirectory() {
    const buf = this.buf;
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("site.zip 无效：找不到中央目录");
    const count = buf.readUInt16LE(eocd + 10);
    let ptr = buf.readUInt32LE(eocd + 16);
    for (let i = 0; i < count; i++) {
      if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
      const method = buf.readUInt16LE(ptr + 10);
      const compSize = buf.readUInt32LE(ptr + 20);
      const nameLen = buf.readUInt16LE(ptr + 28);
      const extraLen = buf.readUInt16LE(ptr + 30);
      const commentLen = buf.readUInt16LE(ptr + 32);
      const localOffset = buf.readUInt32LE(ptr + 42);
      const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
      if (!name.endsWith("/")) this.entries.set(name, { method, compSize, localOffset });
      ptr += 46 + nameLen + extraLen + commentLen;
    }
  }

  has(name) {
    return this.entries.has(name);
  }

  read(name) {
    const e = this.entries.get(name);
    if (!e) return null;
    const buf = this.buf;
    const p = e.localOffset;
    if (buf.readUInt32LE(p) !== 0x04034b50) return null;
    const nameLen = buf.readUInt16LE(p + 26);
    const extraLen = buf.readUInt16LE(p + 28);
    const start = p + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + e.compSize);
    if (e.method === 0) return data;
    if (e.method === 8) return zlib.inflateRawSync(data);
    return null;
  }
}

function siteZipPath() {
  const candidates = [
    path.join(process.resourcesPath || "", "site.zip"),
    path.join(__dirname, "site.zip"),
    path.join(__dirname, "..", "..", "desktop", "site.zip"),
  ];
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

function zipEntryFor(archive, pathname) {
  let clean = pathname.split("?")[0].split("#")[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  clean = clean.replace(/^\/+/, "");
  if (clean.includes("\0") || clean.split("/").includes("..")) return null;
  const candidates =
    clean === "" ? ["index.html"] : [clean, `${clean.replace(/\/$/, "")}/index.html`, `${clean}.html`];
  for (const c of candidates) if (archive.has(c)) return c;
  return null;
}

function startServer(archive) {
  const cache = new Map();
  let cacheBytes = 0;

  const server = http.createServer((req, res) => {
    const entry = zipEntryFor(archive, req.url || "/");
    if (!entry) {
      const nf = archive.read("404.html");
      res.writeHead(404, { "content-type": MIME[".html"] });
      res.end(nf || "404 Not Found");
      return;
    }
    let data = cache.get(entry);
    if (!data) {
      data = archive.read(entry);
      if (!data) {
        res.writeHead(500).end("读取失败");
        return;
      }
      if (data.length <= 256 * 1024 && cacheBytes + data.length < 32 * 1024 * 1024) {
        cache.set(entry, data);
        cacheBytes += data.length;
      }
    }
    const ext = path.extname(entry).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "content-length": data.length,
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=86400",
    });
    res.end(data);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

/* ---------------- 窗口 ---------------- */

let mainWindow = null;

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "文件",
      submenu: [
        { label: "重新载入", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.webContents.reload() },
        { label: "返回上一页", accelerator: "Alt+Left", click: () => mainWindow?.webContents.goBack() },
        { type: "separator" },
        { label: "退出", accelerator: "CmdOrCtrl+Q", role: "quit" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { label: "放大", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
        { label: "缩小", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
        { label: "实际大小", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
        { type: "separator" },
        { label: "全屏", accelerator: "F11", role: "togglefullscreen" },
        { label: "开发者工具", accelerator: "F12", role: "toggleDevTools" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: `关于 ${APP_NAME}`,
          click: () =>
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: `关于 ${APP_NAME}`,
              message: `${APP_NAME} ${app.getVersion()}`,
              detail:
                "非商业性质的宝可梦资料整理。\n数据来源：PokeAPI、Cobblemon（含 Mega Showdown、Z-A Megas、JoStar 大集合）、传说遗迹模组。\n\n宝可梦相关名称与图像版权归 Nintendo / Creatures / GAME FREAK 所有。",
              buttons: ["好的"],
            }),
        },
      ],
    },
  ]);
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f4f3ef",
    title: APP_NAME,
    show: false,
    autoHideMenuBar: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(buildMenu());
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 站内外链走系统浏览器，不抢走应用窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}/`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  return mainWindow;
}

/* ---------------- 入口 ---------------- */

const screenshotArg = process.argv.find((a) => a.startsWith("--screenshot="));

/**
 * Chromium 对 userData / sessionData / disk-cache 目录很挑剔：路径里带非 ASCII 字符、
 * 指向不可写位置、或者在只读盘上，都会直接弹「缓存文件夹不合法」之类的错误后退出。
 * 这里统一把运行时目录放到 %LOCALAPPDATA%\PokeWiki（ASCII 路径），
 * 失败再退到 %APPDATA%、%TEMP%，并且把启动过程写日志方便排查。
 */
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return dir;
  } catch {
    return null;
  }
}

function pickRuntimeRoot() {
  const bases = [process.env.LOCALAPPDATA, process.env.APPDATA, os.tmpdir()];
  for (const base of bases) {
    if (!base) continue;
    const dir = ensureDir(path.join(base, "PokeWiki"));
    if (dir) return dir;
  }
  return null;
}

const runtimeRoot = pickRuntimeRoot();
const logFile = runtimeRoot ? path.join(runtimeRoot, "launch.log") : null;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  if (logFile) {
    try {
      fs.appendFileSync(logFile, line);
    } catch {}
  }
  console.log(message);
}

if (runtimeRoot) {
  app.setPath("userData", runtimeRoot);
  app.setPath("sessionData", ensureDir(path.join(runtimeRoot, "session")) || runtimeRoot);
  app.setPath("logs", ensureDir(path.join(runtimeRoot, "logs")) || runtimeRoot);
  const cacheDir = ensureDir(path.join(runtimeRoot, "cache"));
  if (cacheDir) {
    app.commandLine.appendSwitch("disk-cache-dir", cacheDir);
  }
  log(`runtime="PokeWiki" root=${runtimeRoot}`);
} else {
  console.log("[warn] 找不到可写的运行时目录，Chromium 可能无法启动");
}

process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err && err.stack ? err.stack : err}`);
  try {
    dialog.showErrorBox("启动失败", String(err && err.message ? err.message : err));
  } catch {}
  app.quit();
});

app.setName("PokeWiki");
app.whenReady().then(async () => {
  const zip = siteZipPath();
  log(`site.zip=${zip || "(未找到)"}`);
  if (!zip) {
    dialog.showErrorBox("启动失败", "找不到站点数据 site.zip，安装可能不完整。");
    app.quit();
    return;
  }

  let archive;
  try {
    archive = new ZipArchive(fs.readFileSync(zip));
  } catch (err) {
    dialog.showErrorBox("启动失败", err.message);
    app.quit();
    return;
  }

  log(`site.zip ok, ${archive.entries.size} entries`);
  const { port } = await startServer(archive);
  log(`serving on http://127.0.0.1:${port}/`);
  const win = await createWindow(port);
  log("window loaded");

  if (screenshotArg) {
    const out = screenshotArg.slice("--screenshot=".length);
    await new Promise((r) => setTimeout(r, 4000));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(out, img.toPNG());
    console.log("[screenshot] " + out);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on("window-all-closed", () => app.quit());