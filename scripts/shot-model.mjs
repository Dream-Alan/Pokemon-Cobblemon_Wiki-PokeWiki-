// 切到「方可梦建模」标签后截图，验证 3D 模型
// 注意：模型会慢慢自转，截图前必须按住鼠标（dragging=true 会暂停自转），否则每次角度都不一样
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => fs.existsSync(p));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
fs.mkdirSync('shots', { recursive: true });

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['6', '150', '448', '133', '94'];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

for (const id of ids) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/pokedex/${id}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.textContent && x.textContent.includes('方可梦建模')) || btns.find(x => x.textContent && x.textContent.includes('3D'));
    if (b) { b.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 3000));
  const canvas = await page.$('canvas');
  let clip = { x: 0, y: 60, width: 1280, height: 760 };
  if (canvas) {
    const box = await canvas.boundingBox();
    if (box) {
      // 按住不放，冻结自转，保证每次截图角度一致
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await new Promise(r => setTimeout(r, 700));
      clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    }
  }
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { canvas: false };
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return { canvas: true, w: c.width, h: c.height, gl: !!gl };
  });
  const name = `shots/model_${String(id).padStart(4, '0')}.png`;
  await page.screenshot({ path: name, clip });
  console.log(name, 'clicked=', clicked, JSON.stringify(canvasInfo));
  if (canvas) await page.mouse.up();
  await page.close();
}

await browser.close();