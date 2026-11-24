// 在没有子进程权限的环境里重打「绿色版」：
// 1) 把 out/ 打包成资源包 site.zip（内存 zip 写入器，deflate）；
// 2) 读取旧的 portable zip，替换其中的 resources/site.zip，其余条目原样复制；
// 3) 输出 release/PokeWiki-<version>-portable.zip 并自检。
//
// 用法：node scripts/build-portable.mjs [旧 zip 路径] [版本号]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";

const ROOT = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const version = process.argv[3] || pkg.version;
const oldZip = path.resolve(
  ROOT,
  process.argv[2] || `release/PokeWiki-1.8.1-portable.zip`,
);
const outDir = path.join(ROOT, "out");
const dest = path.join(ROOT, "release", `PokeWiki-${version}-portable.zip`);

if (!fs.existsSync(oldZip)) {
  console.error(`找不到旧的 portable zip：${oldZip}`);
  process.exit(1);
}
if (!fs.existsSync(outDir)) {
  console.error("找不到 out/，请先 npm run build");
  process.exit(1);
}

/* ---------------- CRC32 ---------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ---------------- zip 读取 ---------------- */
function readZip(buf) {
  // 定位 EOCD
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("不是有效的 zip（找不到 EOCD）");
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) throw new Error("暂不支持 zip64");

  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`中央目录条目损坏 @${p}`);
    const method = buf.readUInt16LE(p + 10);
    const dosTime = buf.readUInt16LE(p + 12);
    const dosDate = buf.readUInt16LE(p + 14);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const externalAttrs = buf.readUInt32LE(p + 38);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    // 从本地头读真实数据
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`本地头损坏：${name}`);
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    const data = name.endsWith("/") ? Buffer.alloc(0) : method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw);

    entries.push({ name, method, dosTime, dosDate, crc, size, externalAttrs, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/* ---------------- zip 写入 ---------------- */
const D = new Date(2026, 10, 24, 9, 0, 0); // 固定时间戳，保证可复现
const dosTime = ((D.getHours() << 11) | (D.getMinutes() << 5) | (D.getSeconds() >> 1)) & 0xffff;
const dosDate = (((D.getFullYear() - 1980) << 9) | ((D.getMonth() + 1) << 5) | D.getDate()) & 0xffff;

function writeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const e of entries) {
    const isDir = e.name.endsWith("/");
    const data = isDir ? Buffer.alloc(0) : e.data;
    const comp = isDir ? Buffer.alloc(0) : zlib.deflateRawSync(data, { level: 9 });
    const crc = isDir ? 0 : crc32(data);
    const nameBuf = Buffer.from(e.name, "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 flag
    local.writeUInt16LE(isDir ? 0 : 8, 8); // deflate
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(isDir ? 0 : 8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(e.externalAttrs ?? (isDir ? 0x10 : 0), 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + comp.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

/* ---------------- 1) 打包 out/ → site.zip ---------------- */
function* walk(dir, prefix = "") {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      yield* walk(path.join(dir, ent.name), rel);
    } else if (ent.isFile()) {
      yield rel;
    }
  }
}

const siteEntries = [];
for (const rel of walk(outDir)) {
  const abs = path.join(outDir, rel);
  siteEntries.push({ name: rel, data: fs.readFileSync(abs) });
}
// 目录条目（Electron 不依赖，但保持结构完整）
const dirs = new Set();
for (const e of siteEntries) {
  const parts = e.name.split("/");
  for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/") + "/");
}
const siteZipBuf = writeZip([
  ...[...dirs].sort().map(name => ({ name, data: Buffer.alloc(0) })),
  ...siteEntries.sort((a, b) => a.name.localeCompare(b.name)),
]);
console.log(`site.zip: ${siteEntries.length} 个文件, ${(siteZipBuf.length / 1024 / 1024).toFixed(1)} MB`);

/* ---------------- 2) 替换 portable 里的 resources/site.zip ---------------- */
const oldEntries = readZip(fs.readFileSync(oldZip));
const target = "resources/site.zip";
if (!oldEntries.some(e => e.name === target)) {
  console.error("旧 zip 里没有 resources/site.zip");
  process.exit(1);
}
const merged = oldEntries.map(e =>
  e.name === target ? { ...e, data: siteZipBuf, externalAttrs: e.externalAttrs } : e,
);
fs.writeFileSync(dest, writeZip(merged));
console.log(
  `portable: ${merged.length} 个条目, ${(fs.statSync(dest).size / 1024 / 1024).toFixed(1)} MB → ${path.relative(ROOT, dest)}`,
);

/* ---------------- 3) 自检 ---------------- */
const check = readZip(fs.readFileSync(dest));
const siteEntry = check.find(e => e.name === target);
const inner = readZip(siteEntry.data);
const names = new Set(inner.map(e => e.name));
const need = ["index.html", "tools/index.html", "pokedex/25/index.html", ".nojekyll"];
for (const n of need) console.log(`  ${names.has(n) ? "✓" : "✗"} ${n}`);
console.log(`  ✓ PokeWiki.exe: ${check.some(e => e.name === "PokeWiki.exe")}`);
console.log(`  ✓ app.asar: ${check.some(e => e.name === "resources/app.asar")}`);
const sha = crypto.createHash("sha256").update(fs.readFileSync(dest)).digest("hex").slice(0, 16);
console.log(`  sha256(前16): ${sha}`);