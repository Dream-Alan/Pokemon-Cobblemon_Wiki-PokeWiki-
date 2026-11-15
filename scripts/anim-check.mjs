import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import sharp from 'sharp';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const ids = (process.argv[2] || '25,133,6').split(',').map(Number);

const b = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--window-size=900,900'],
});
const page = await b.newPage();
await page.setViewport({ width: 900, height: 900 });

for (const id of ids) {
  await page.goto(`${BASE}/pokedex/${id}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /方可梦建模/.test(b.textContent || ''));
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 3500));

  // 冻结旋转，只留动画
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 200));

  const shots = [];
  for (let i = 0; i < 14; i++) {
    const buf = await canvas.screenshot({ encoding: 'binary' });
    shots.push(await sharp(Buffer.from(buf)).raw().toBuffer());
    await new Promise(r => setTimeout(r, 130));
  }
  await page.mouse.up();

  const diffs = [];
  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1];
    const c = shots[i];
    let d = 0;
    const px = Math.min(a.length, c.length) / 3;
    for (let k = 0; k < px; k++) {
      const o = k * 3;
      if (Math.abs(a[o] - c[o]) > 6 || Math.abs(a[o + 1] - c[o + 1]) > 6 || Math.abs(a[o + 2] - c[o + 2]) > 6) d++;
    }
    diffs.push(+(d / px * 100).toFixed(2));
  }
  const sorted = [...diffs].sort((x, y) => x - y);
  const median = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];
  const mean = diffs.reduce((s, x) => s + x, 0) / diffs.length;
  console.log(`#${id} 帧间差: ${diffs.join(' ')}`);
  console.log(`#${id} mean=${mean.toFixed(2)}% median=${median}% max=${max}% 最大/中位=${(max / Math.max(median, 0.01)).toFixed(1)}x`);
}
await b.close();