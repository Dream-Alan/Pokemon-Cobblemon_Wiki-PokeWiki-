/** 用面朝向配色判断相机到底看到的是模型的哪一面（+X/-X/+Y/-Y/+Z/-Z） */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const dex = process.argv[2] || '25';
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  defaultViewport: { width: 1200, height: 900 },
});
const page = await browser.newPage();
const url = `${BASE}/pokedex/${Number(dex)}/?faces=1`;
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
const btns = await page.$$('button[aria-pressed]');
for (const b of btns) {
  const t = await page.evaluate(el => el.textContent || '', b);
  if (t.includes('方可梦建模')) { await b.click(); break; }
}
await new Promise(r => setTimeout(r, 2500));
const canvas = await page.$('canvas');
const box = await canvas.boundingBox();
const buf = await page.screenshot({ clip: box });
await browser.close();

const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
const names = { '1,0,0': '+X 红', '0,1,0': '-X 绿', '0,0,1': '+Y 蓝', '1,1,0': '-Y 黄', '1,0,1': '+Z 品红', '0,1,1': '-Z 青' };
const counts = {};
for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const key = `${r > 127 ? 1 : 0},${g > 127 ? 1 : 0},${b > 127 ? 1 : 0}`;
  counts[key] = (counts[key] || 0) + 1;
}
const rows = Object.entries(counts)
  .filter(([k]) => names[k])
  .map(([k, v]) => [names[k], v])
  .sort((a, b) => b[1] - a[1]);
console.log(`#${dex} 各朝向可见面积：`);
for (const [k, v] of rows) console.log(`  ${k}: ${v}`);
fs.mkdirSync('shots', { recursive: true });
fs.writeFileSync(path.join('shots', `faces_${String(dex).padStart(4, '0')}.png`), buf);