/**
 * 打 Windows 桌面版（Electron + electron-builder portable）
 *
 * 步骤：out/ → desktop/electron/site.zip → 生成 icon.png → electron-builder
 * 产物：release/desktop/PokeWiki-<版本>-windows.exe（单文件，双击开窗，不解压站点）
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const APP_DIR = path.join(ROOT, "desktop", "electron");
const ZIP = path.join(APP_DIR, "site.zip");
const ICON = path.join(APP_DIR, "icon.png");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("out/index.html 不存在，请先 npm run build");
  process.exit(1);
}

// 桌面版版本号与站点版本保持一致
const appPkgPath = path.join(APP_DIR, "package.json");
const appPkg = JSON.parse(fs.readFileSync(appPkgPath, "utf8"));
appPkg.version = pkg.version;
fs.writeFileSync(appPkgPath, JSON.stringify(appPkg, null, 2) + "\n");

console.log("· 打包站点…");
fs.rmSync(ZIP, { force: true });
execFileSync("tar", ["-a", "-c", "-f", ZIP, "*"], { cwd: OUT, stdio: "inherit" });
console.log(`  site.zip = ${(fs.statSync(ZIP).size / 1024 / 1024).toFixed(1)} MB`);

console.log("· 生成应用图标…");
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#f4f3ef"/>
  <circle cx="256" cy="256" r="176" fill="#fff" stroke="#0a0a09" stroke-width="26"/>
  <path d="M80 256a176 176 0 0 1 352 0z" fill="#ff4d5a" stroke="#0a0a09" stroke-width="26"/>
  <rect x="80" y="243" width="352" height="26" fill="#0a0a09"/>
  <circle cx="256" cy="256" r="66" fill="#fff" stroke="#0a0a09" stroke-width="26"/>
  <circle cx="256" cy="256" r="26" fill="#0a0a09"/>
</svg>`;
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(ICON);

console.log("· electron-builder 生成 portable exe…");
const electronBuilder = path.join(ROOT, "node_modules", "electron-builder", "out", "cli", "cli.js");
execFileSync(process.execPath, [electronBuilder, "--win", "portable", "--x64"], {
  cwd: APP_DIR,
  stdio: "inherit",
  env: {
    ...process.env,
    ELECTRON_BUILDER_BINARIES_MIRROR: "https://npmmirror.com/mirrors/electron-builder-binaries/",
  },
});

const outDir = path.join(ROOT, "release", "desktop");
const exe = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith(".exe"))
  .map((f) => path.join(outDir, f))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
if (!exe) {
  console.error("未找到产物 exe");
  process.exit(1);
}
const target = path.join(ROOT, "release", `PokeWiki-${pkg.version}-windows.exe`);
fs.copyFileSync(exe, target);
console.log(`完成：release/${path.basename(target)}（${(fs.statSync(target).size / 1024 / 1024).toFixed(1)} MB）`);

/**
 * 再打一个「解压即用」的绿色包。
 * portable exe 每次启动都要把整包解到 %TEMP%，在临时目录被安全软件/策略锁住时
 * NSIS 会直接报 “Error writing temporary file”，这个 zip 完全绕开 NSIS 与 %TEMP%。
 */
const unpacked = path.join(outDir, "win-unpacked");
if (fs.existsSync(unpacked)) {
  console.log("· 打包绿色版（解压即用）…");
  const green = path.join(ROOT, "release", `PokeWiki-${pkg.version}-portable.zip`);
  fs.rmSync(green, { force: true });
  execFileSync("tar", ["-a", "-c", "-f", green, "*"], { cwd: unpacked, stdio: "inherit" });
  console.log(`完成：release/${path.basename(green)}（${(fs.statSync(green).size / 1024 / 1024).toFixed(1)} MB）`);
}