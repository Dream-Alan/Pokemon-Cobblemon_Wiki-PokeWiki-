// 探针：读取模型头骨朝向，判断是否平视（pitch≈0）
// 用法：node scripts/headcheck.mjs "&xs=-1" 6,5,719
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => fs.existsSync(p));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const extra = process.env.EXTRA || '';
const ids = (process.env.IDS || '6').split(',');

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const id of ids) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/pokedex/${id}/?still=1&dbg=1${extra}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes('方可梦建模'));
    b?.click();
  });
  await new Promise(r => setTimeout(r, 2800));
  const dir = await page.evaluate(() => (typeof globalThis.__headDir === 'function' ? globalThis.__headDir() : 'no hook'));
  console.log(`#${id}`, JSON.stringify(dir));
  await page.close();
}
await browser.close();