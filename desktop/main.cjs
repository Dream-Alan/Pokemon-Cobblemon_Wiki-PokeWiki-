/*
 * PokeWiki 桌面启动器（Node SEA 单文件 exe）
 *
 * 打包时把站点压缩包整块嵌入 exe，运行时**不落地解压**：
 * 直接在内存里解析 zip 中央目录，按需 inflate 出单个文件返回。
 * 双击后立刻起一个本机静态服务器，并用默认浏览器打开首页。
 * 关闭控制台窗口即停止。
 */
"use strict";

const http = require("node:http");
const zlib = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");

const VERSION = "1.8.0";
const START_PORT = Number(process.env.POKEWIKI_PORT || 3417);

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

function say(msg) {
  process.stdout.write(msg + "\n");
}

// 控制台默认是 GBK 代码页，中文会变乱码；把当前控制台切成 UTF-8
if (process.platform === "win32") {
  try {
    execFileSync("cmd", ["/c", "chcp 65001 >nul"], { stdio: "ignore" });
  } catch {}
}

/* ---------------- 内存 zip 读取 ---------------- */

class ZipArchive {
  constructor(buf) {
    this.buf = buf;
    this.entries = new Map();
    this.#readCentralDirectory();
  }

  #readCentralDirectory() {
    const buf = this.buf;
    // EOCD 在文件末尾，最长 22 + 65535 字节注释
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("不是有效的 zip 文件（找不到中央目录）");

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

/* ---------------- 资源定位 ---------------- */

function loadArchive() {
  try {
    const sea = require("node:sea");
    return new ZipArchive(Buffer.from(sea.getRawAsset("site.zip")));
  } catch {
    // 开发模式：允许 POKEWIKI_ZIP 指向现成的 zip，或退回仓库里的 out/
    const zipPath = process.env.POKEWIKI_ZIP;
    if (zipPath && fs.existsSync(zipPath)) return new ZipArchive(fs.readFileSync(zipPath));
    return null;
  }
}

/** 把 URL 解析成 zip 里的条目名：/pokedex/25/ → pokedex/25/index.html */
function zipEntryFor(archive, pathname) {
  let clean = pathname.split("?")[0].split("#")[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  clean = clean.replace(/^\/+/, "");
  if (clean.includes("\0") || clean.split("/").includes("..")) return null;
  const candidates = clean === "" ? ["index.html"] : [clean, `${clean.replace(/\/$/, "")}/index.html`, `${clean}.html`];
  for (const c of candidates) if (archive.has(c)) return c;
  return null;
}

/* ---------------- HTTP ---------------- */

const CACHE_MAX = 24 * 1024 * 1024;
const cache = new Map(); // 条目 → Buffer（只缓存小的文本/图片）
let cacheBytes = 0;

function cached(archive, entry) {
  const hit = cache.get(entry);
  if (hit) return hit;
  const data = archive.read(entry);
  if (!data) return null;
  if (data.length <= 256 * 1024 && cacheBytes + data.length <= CACHE_MAX) {
    cache.set(entry, data);
    cacheBytes += data.length;
  }
  return data;
}

function startArchiveServer(archive, port) {
  const server = http.createServer((req, res) => {
    const entry = zipEntryFor(archive, req.url || "/");
    if (!entry) {
      const nf = archive.read("404.html");
      res.writeHead(404, { "content-type": MIME[".html"] });
      res.end(nf || "404 Not Found");
      return;
    }
    const data = cached(archive, entry);
    if (!data) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("读取失败：" + entry);
      return;
    }
    const ext = path.extname(entry).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "content-length": data.length,
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=86400",
    });
    res.end(data);
  });

  return listenWithFallback(server, port);
}

function startDirServer(root, port) {
  const server = http.createServer((req, res) => {
    let clean = (req.url || "/").split("?")[0];
    try {
      clean = decodeURIComponent(clean);
    } catch {}
    const full = path.normalize(path.join(root, clean));
    if (!full.startsWith(root)) {
      res.writeHead(403).end("403");
      return;
    }
    const candidates = [full, path.join(full, "index.html"), full + ".html"];
    const file = candidates.find((c) => {
      try {
        return fs.statSync(c).isFile();
      } catch {
        return false;
      }
    });
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return listenWithFallback(server, port);
}

function listenWithFallback(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", (err) => {
      if (err && err.code === "EADDRINUSE" && port < START_PORT + 30) {
        resolve(listenWithFallback(server, port + 1));
      } else reject(err);
    });
    server.listen(port, "127.0.0.1", () => resolve({ server, port }));
  });
}

/* ---------------- 入口 ---------------- */

(async () => {
  say("");
  say(`  宝可梦百科 · PokeWiki ${VERSION}`);
  say("  ------------------------------------");

  const archive = loadArchive();
  let handle;
  try {
    handle = archive ? await startArchiveServer(archive, START_PORT) : await startDirServer(path.join(__dirname, "..", "out"), START_PORT);
  } catch (err) {
    say("启动失败：" + err.message);
    say("按回车退出…");
    process.stdin.resume();
    process.stdin.once("data", () => process.exit(1));
    return;
  }

  const url = `http://127.0.0.1:${handle.port}/`;
  say(`  站点已启动：${url}${archive ? "" : "（开发模式：读取 out/）"}`);
  say(`  关闭此窗口即停止。`);
  say("");

  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
})();