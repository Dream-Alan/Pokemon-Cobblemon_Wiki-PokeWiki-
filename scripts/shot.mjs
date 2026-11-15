// 用本机 Edge 截图验证 UI（puppeteer-core，无内置 Chromium）
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const OUT = 'shots';
fs.mkdirSync(OUT, { recursive: true });

const targets = process.argv.slice(2).length
  ? process.argv.slice(2).map(s => {
      const [p, w] = s.split('@');
      return { path: p, width: Number(w || 1440) };
    })
  : [
      { path: '/', width: 1440 },
      { path: '/pokedex/', width: 1440 },
      { path: '/pokedex/25/', width: 1440 },
      { path: '/pokedex/6/', width: 1440 },
      { path: '/types/?focus=dragon', width: 1440 },
      { path: '/guides/', width: 1440 },
      { path: '/guides/catching/', width: 1440 },
      { path: '/', width: 390 },
      { path: '/pokedex/448/', width: 390 },
    ];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
  ],
  defaultViewport: null,
});

const errors = [];
for (const t of targets) {
  const page = await browser.newPage();
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[${t.path}] console: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', e => errors.push(`[${t.path}] pageerror: ${String(e).slice(0, 200)}`));
  await page.setViewport({ width: t.width, height: t.width < 600 ? 844 : 900, deviceScaleFactor: 1 });
  const url = BASE + t.path;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => errors.push(`[${t.path}] goto: ${e.message}`));
  await new Promise(r => setTimeout(r, Number(process.env.WAIT || 2500)));
  const name = `${OUT}/${(t.path.replace(/[/?=&]+/g, '_').replace(/^_|_$/g, '') || 'home')}${t.width < 600 ? '_m' : ''}.png`;
  await page.screenshot({ path: name, fullPage: process.env.FULL !== '0' });
  console.log('shot', name);
  await page.close();
}

await browser.close();
if (errors.length) {
  console.log('\n--- issues ---');
  for (const e of [...new Set(errors)].slice(0, 30)) console.log(e);
} else {
  console.log('\nno console errors');
}