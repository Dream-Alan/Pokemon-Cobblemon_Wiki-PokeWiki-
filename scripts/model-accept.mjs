// 建模渲染验收（数字，不看观感）：node scripts/model-accept.mjs
// 需要预览服务：node scripts/serve.mjs out 4199
//   1. 可复现性：still=1 连拍两张，像素差 <0.5%
//   2. 朝向：?faces=1 六面顶点色，-Z（青）像素占比最高
//   3. layers：#6 / #493 开关图层像素差 >2%；render_*.json 里没有 alpha_eyes
//   4. mirror：随机 5 个含 mirror 的模型，镜像 cube 的 +X/-X 面板平均色不相等
//   5. poser：#6 gmax 与 #6 male 的模型空间高度比
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => fs.existsSync(p));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  — ${detail}`);
};

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

async function grab(dex, query) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/pokedex/${dex}/${query}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(x => x.textContent?.includes('方可梦建模'))?.click();
  });
  await page.waitForSelector('canvas', { timeout: 20000 });
  // layers 异步挂载完成后 mount 上会写 data-layers
  await page.waitForFunction(() => document.querySelector('canvas')?.parentElement?.dataset.layers !== undefined, { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  const el = await page.$('canvas');
  const png = await el.screenshot();
  await page.close();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
}

function diffRatio(a, b) {
  let diff = 0;
  const n = a.w * a.h;
  for (let i = 0; i < n; i++) {
    const o = i * a.ch;
    if (Math.abs(a.data[o] - b.data[o]) + Math.abs(a.data[o + 1] - b.data[o + 1]) + Math.abs(a.data[o + 2] - b.data[o + 2]) > 24) diff++;
  }
  return diff / n;
}

// 1. 可复现性
for (const dex of [6, 25]) {
  const a = await grab(dex, '?still=1');
  const b = await grab(dex, '?still=1');
  const r = diffRatio(a, b);
  check(`#${dex} still=1 连拍可复现`, r < 0.005, `像素差 ${(r * 100).toFixed(3)}%`);
}

// 2. 朝向：按主色把像素分到六个面
{
  const img = await grab(6, '?still=1&faces=1');
  const names = ['+X红', '-X绿', '+Y蓝', '-Y黄', '+Z品红', '-Z青'];
  const count = new Array(6).fill(0);
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * img.ch;
    const [r, g, b] = [img.data[o], img.data[o + 1], img.data[o + 2]];
    const mx = Math.max(r, g, b);
    if (mx < 60) continue; // 背景 / 网格
    const hi = (x) => x > mx * 0.6;
    const k = `${+hi(r)}${+hi(g)}${+hi(b)}`;
    const idx = { '100': 0, '010': 1, '001': 2, '110': 3, '101': 4, '011': 5 }[k];
    if (idx !== undefined) count[idx]++;
  }
  const total = count.reduce((a, b) => a + b, 0) || 1;
  const best = count.indexOf(Math.max(...count));
  check('#6 faces=1 正脸(-Z 青)占比最高', best === 5, names.map((n, i) => `${n} ${((count[i] / total) * 100).toFixed(1)}%`).join(' / '));
}

// 3. layers（另附「相对模型像素」与侧视角的数字：小面积图层占整张画布很少）
const modelPixels = (img) => {
  let n = 0;
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * img.ch;
    if (Math.max(img.data[o], img.data[o + 1], img.data[o + 2]) > 40) n++;
  }
  return n;
};
for (const [dex, q] of [[6, '?still=1'], [6, '?still=1&yaw=120'], [493, '?still=1']]) {
  const on = await grab(dex, q);
  const off = await grab(dex, `${q}&layers=0`);
  const r = diffRatio(on, off);
  const rel = (r * on.w * on.h) / (modelPixels(off) || 1);
  check(`#${dex} ${q} 图层开/关像素差 >2%（整张画布）`, r > 0.02, `画布 ${(r * 100).toFixed(2)}% / 相对模型像素 ${(rel * 100).toFixed(2)}%`);
}
{
  const root = 'public/cobblemon';
  let files = 0, alpha = 0;
  for (const d of fs.readdirSync(root)) for (const f of fs.readdirSync(path.join(root, d))) {
    if (!/^render_.*\.json$/.test(f)) continue;
    files++;
    const j = JSON.parse(fs.readFileSync(path.join(root, d, f), 'utf8'));
    for (const L of [...(j.layers || []), ...(j.shinyLayers || [])]) if (L.name === 'alpha_eyes') alpha++;
  }
  check('alpha_eyes 未导出', alpha === 0, `${files} 个 render sidecar 中 alpha_eyes 层 ${alpha} 个`);
}

// 4. mirror：与 CobblemonViewer.buildBoxGeometry 相同的面板规则
{
  const root = 'public/cobblemon';
  const manifest = JSON.parse(fs.readFileSync('src/data/cobblemon.json', 'utf8'));
  const cands = [];
  for (const [dex, e] of Object.entries(manifest)) for (const f of e.forms) {
    const geo = JSON.parse(fs.readFileSync(path.join(root, dex, f.model), 'utf8'))['minecraft:geometry'][0];
    const cubes = geo.bones.flatMap(b => (b.cubes || []).map(c => ({ ...c, mirror: c.mirror ?? b.mirror }))).filter(c => c.mirror && c.size[2] >= 1 && c.size[1] >= 1);
    if (cubes.length) cands.push({ dex, f, geo, cubes });
  }
  // 固定种子的伪随机，结果可复现
  let seed = 20261112;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const picks = [];
  while (picks.length < 5) {
    const c = cands[Math.floor(rnd() * cands.length)];
    if (!picks.includes(c)) picks.push(c);
  }
  for (const { dex, f, geo, cubes } of picks) {
    const tw = geo.description?.texture_width || 64;
    const th = geo.description?.texture_height || 64;
    const tex = await sharp(path.join(root, dex, f.texture)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const sx = tex.info.width / tw, sy = tex.info.height / th;
    const avg = (x, y, w, h) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = Math.floor(y * sy); yy < Math.floor((y + h) * sy); yy++) for (let xx = Math.floor(x * sx); xx < Math.floor((x + w) * sx); xx++) {
        const o = (yy * tex.info.width + xx) * 4;
        if (xx < 0 || yy < 0 || xx >= tex.info.width || yy >= tex.info.height || tex.data[o + 3] < 128) continue;
        r += tex.data[o]; g += tex.data[o + 1]; b += tex.data[o + 2]; n++;
      }
      return n ? [r / n, g / n, b / n].map(Math.round) : null;
    };
    let differ = 0, comparable = 0;
    for (const c of cubes) {
      const [u, v] = c.uv, [w, h, d] = c.size;
      const east = [u, v + d, d, h], west = [u + d + w, v + d, d, h];
      const [px, nx] = c.mirror ? [west, east] : [east, west]; // mirror：east/west 互换
      const a = avg(...px), b = avg(...nx);
      if (!a || !b) continue;
      comparable++;
      if (a.some((x, i) => x !== b[i])) differ++;
    }
    check(`mirror #${dex} ${f.model}`, differ > 0, `${cubes.length} 个 mirror cube，可比 ${comparable}，+X/-X 平均色不同 ${differ}`);
  }
}

// 5. poser / 尺寸：模型空间高度（可见部件，含 transformedParts 位移）
{
  const height = (dex, key) => {
    const e = JSON.parse(fs.readFileSync('src/data/cobblemon.json', 'utf8'))[dex].forms.find(f => f.key === key);
    const geo = JSON.parse(fs.readFileSync(`public/cobblemon/${dex}/${e.model}`, 'utf8'))['minecraft:geometry'][0];
    let lo = Infinity, hi = -Infinity;
    for (const b of geo.bones) for (const c of b.cubes || []) {
      lo = Math.min(lo, c.origin[1]);
      hi = Math.max(hi, c.origin[1] + c.size[1]);
    }
    return hi - lo;
  };
  const hm = height(6, 'male'), hg = height(6, 'gmax');
  check('#6 gmax / male 高度比 >1.2', hg / hm > 1.2, `gmax ${hg.toFixed(1)} / male ${hm.toFixed(1)} = ${(hg / hm).toFixed(2)}`);
}

await browser.close();
const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
