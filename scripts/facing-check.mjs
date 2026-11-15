import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const b = await puppeteer.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage();
await p.setViewport({ width: 1000, height: 900 });
const out = [];
for (const id of [25, 5, 6, 133]) {
  await p.goto(`http://127.0.0.1:4199/pokedex/${id}/`, { waitUntil: 'networkidle2' });
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(x => /方可梦建模/.test(x.textContent || ''));
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  const c = await p.$('canvas');
  const buf = await c.screenshot({ encoding: 'binary' });
  const { data, info } = await sharp(Buffer.from(buf)).raw().toBuffer({ resolveWithObject: true });
  let red = 0, yellow = 0, dark = 0, body = 0;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], bl = data[i + 2];
    if (r < 30 && g < 30 && bl < 40) continue;
    body++;
    if (r > 140 && g < 120 && bl < 120) red++;
    if (r > 170 && g > 130 && bl < 120) yellow++;
    if (r < 70 && g < 70 && bl < 70) dark++;
  }
  out.push(`#${id} ${info.width}x${info.height} 非背景=${body} 红=${red} 黄=${yellow} 深色=${dark}`);
}
console.log(out.join('\n'));
await b.close();