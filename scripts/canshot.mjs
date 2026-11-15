// 批量截 canvas：node scripts/canshot.mjs 5 /pokedex/5/?still=1&yaw=180 [更多…]
// 参数成对：id 与 查询串；输出 shots/can_<id>_<tag>.png
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => fs.existsSync(p));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const pairs = process.argv.slice(2);
if (!pairs.length) {
  console.error('usage: node scripts/canshot.mjs <id> <query> [<id> <query> ...]');
  process.exit(1);
}
fs.mkdirSync('shots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
for (let i = 0; i < pairs.length; i += 2) {
  const id = pairs[i];
  const q = pairs[i + 1] || '?still=1';
  const tag = q.replace(/^\?/, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '') || 'default';
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  const path = q.startsWith('/') ? q : `/pokedex/${id}/${q}`;
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes('方可梦建模'));
    b?.click();
  });
  await new Promise(r => setTimeout(r, 2600));
  const canvas = await page.$('canvas');
  if (!canvas) {
    console.log(`#${id} ${q} -> no canvas`, errors);
    await page.close();
    continue;
  }
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 400));
  const out = `shots/can_${id}_${tag}.png`;
  await page.screenshot({ path: out, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  console.log(`#${id} ${q} -> ${out}`, errors);
  await page.mouse.up();
  await page.close();
}
await browser.close();