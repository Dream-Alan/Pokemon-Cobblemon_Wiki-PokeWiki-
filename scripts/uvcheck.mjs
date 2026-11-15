// 检查某个模型头部立方体的六个面贴图区域，输出每个面采样到的平均色
// 用法：node scripts/uvcheck.mjs 5 charmeleon head
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [dex, name, boneName = 'head'] = process.argv.slice(2);
const geoPath = `public/cobblemon/${dex}/${name}.geo.json`;
const texPath = `public/cobblemon/${dex}/${name}.png`;
const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
const body = geo['minecraft:geometry'][0].description;
const texW = body.texture_width, texH = body.texture_height;
const bones = geo['minecraft:geometry'][0].bones;
const bone = bones.find(b => b.name === boneName);
if (!bone) {
  console.log('bones:', bones.map(b => b.name).join(', '));
  process.exit(1);
}

// 与 CobblemonViewer 的 buildBoxGeometry 保持一致的 box-uv 布局
function rectsFor(uv, size) {
  const [u, v] = uv;
  const [w, h, d] = size;
  return [
    [u, v + d, d, h],            // +X ← west 面板
    [u + d + w, v + d, d, h],    // -X ← east 面板
    [u + d, v, w, d],            // +Y ← up
    [u + d + w, v, w, d],        // -Y ← down
    [u + d + w + d, v + d, w, h],// +Z ← south
    [u + d, v + d, w, h],        // -Z ← north（正脸）
  ];
}
const FACE_NAMES = ['+X', '-X', '+Y', '-Y', '+Z', '-Z(face)'];

const img = sharp(texPath);
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const sample = ([x, y, w, h]) => {
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i < 0 || j < 0 || i >= texW || j >= texH) continue;
      const o = (j * info.width + i) * ch;
      r += data[o]; g += data[o + 1]; b += data[o + 2]; a += ch === 4 ? data[o + 3] : 255; n++;
    }
  }
  if (!n) return 'empty';
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)} a${Math.round(a / n)}`;
};

console.log(`texture ${info.width}x${info.height}, declared ${texW}x${texH}, bone ${boneName}`);
for (const cube of bone.cubes || []) {
  const { uv, size } = cube;
  const rs = rectsFor(uv, size);
  console.log(`cube uv=${JSON.stringify(uv)} size=${JSON.stringify(size)}`);
  for (let i = 0; i < rs.length; i++) {
    console.log(`  ${FACE_NAMES[i].padEnd(9)} rect=${JSON.stringify(rs[i])} mean=${sample(rs[i])}`);
  }
}