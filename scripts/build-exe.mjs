/**
 * 把 out/ 打成单文件 exe（Node SEA）
 *
 * 1. 用 tar 生成 desktop/site.zip（正斜杠、无 ./ 前缀）
 * 2. 写 sea-config.json（把 site.zip 作为资源嵌入）
 * 3. node --experimental-sea-config 生成 blob
 * 4. 复制 node.exe 并用 postject 注入 blob
 *
 * 用法：node scripts/build-exe.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const DESKTOP = path.join(ROOT, "desktop");
const RELEASE = path.join(ROOT, "release");
const ZIP = path.join(DESKTOP, "site.zip");
const BLOB = path.join(DESKTOP, "sea-prep.blob");
const CONFIG = path.join(DESKTOP, "sea-config.json");
const EXE = path.join(RELEASE, "PokeWiki-console.exe");

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = pkg.version;

if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("out/index.html 不存在，请先 npm run build");
  process.exit(1);
}

console.log("· 打包站点压缩包…");
for (const f of [ZIP, BLOB]) fs.rmSync(f, { force: true });
execFileSync("tar", ["-a", "-c", "-f", ZIP, "*"], { cwd: OUT, stdio: "inherit" });
const zipMb = (fs.statSync(ZIP).size / 1024 / 1024).toFixed(1);
console.log(`  site.zip = ${zipMb} MB`);

fs.writeFileSync(
  CONFIG,
  JSON.stringify(
    {
      main: path.join(DESKTOP, "main.cjs"),
      output: BLOB,
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: false,
      assets: { "site.zip": ZIP },
    },
    null,
    2,
  ),
);
console.log("· 生成 SEA blob…");
execFileSync(process.execPath, ["--experimental-sea-config", CONFIG], { stdio: "inherit" });

console.log("· 复制 node 并注入 blob…");
fs.mkdirSync(RELEASE, { recursive: true });
fs.copyFileSync(process.execPath, EXE);
// postject 的安装脚本会被 allowScripts 拦掉，但 CLI 本身可以直接用 node 跑
execFileSync(
  process.execPath,
  [
    path.join(ROOT, "node_modules", "postject", "dist", "cli.js"),
    EXE,
    "NODE_SEA_BLOB",
    BLOB,
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ],
  { stdio: "inherit" },
);

for (const f of [ZIP, BLOB, CONFIG]) fs.rmSync(f, { force: true });
const exeMb = (fs.statSync(EXE).size / 1024 / 1024).toFixed(1);
fs.writeFileSync(
  path.join(RELEASE, `PokeWiki-console-${version}.txt`),
  `PokeWiki ${version}\r\n单文件启动器：双击运行 → 解压到 %LOCALAPPDATA%\\PokeWiki\\${version}\\site → 本地起服务并打开浏览器\r\n体积 ${exeMb} MB\r\n`,
);

console.log(`完成：release/PokeWiki-console.exe（${exeMb} MB）`);