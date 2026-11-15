// Pre-render a thumbnail for every special form so the dex grid can show
// the real 3D form instead of the base artwork.
//   node scripts/render-forms.mjs [baseUrl] [limit]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const BASE = process.argv[2] || 'http://127.0.0.1:4199';
const LIMIT = Number(process.argv[3] || 0);
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'public/form-art';
fs.mkdirSync(OUT, { recursive: true });

const forms = JSON.parse(fs.readFileSync('src/data/forms.json', 'utf8')).forms;
const jobs = [];
for (const [dex, list] of Object.entries(forms)) {
  for (const f of list) jobs.push({ dex: Number(dex), key: f.key, label: f.label });
}

const todo = jobs.filter((j) => !fs.existsSync(path.join(OUT, `${j.dex}-${j.key}.webp`)));
const queue = LIMIT ? todo.slice(0, LIMIT) : todo;
console.log(`forms ${jobs.length}, pending ${todo.length}, rendering ${queue.length}`);

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  protocolTimeout: 180000,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--no-sandbox',
  ],
});

let done = 0;
let failed = 0;
const retry = [];

async function shot(page, job) {
  // ?still=1 disables the idle auto-rotation, so no pointer juggling is needed.
  const url = `${BASE}/pokedex/${job.dex}/form/${job.key}/?still=1&yaw=180&stage=light&view=model`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));
  const canvas = await page.$('canvas');
  const buf = await canvas.screenshot({ type: 'png' });
  await sharp(buf)
    .trim({ threshold: 6 })
    .resize(360, 360, { fit: 'contain', background: { r: 251, g: 250, b: 247, alpha: 0 } })
    .webp({ quality: 86 })
    .toFile(path.join(OUT, `${job.dex}-${job.key}.webp`));
}

async function worker(slice) {
  const page = await browser.newPage();
  await page.setViewport({ width: 720, height: 720, deviceScaleFactor: 1 });
  for (const job of slice) {
    try {
      await shot(page, job);
      done++;
      if (done % 10 === 0) console.log(`  ${done}/${queue.length}`);
    } catch (err) {
      failed++;
      retry.push(job);
      console.warn(`  ! ${job.dex} ${job.key}: ${err.message}`);
    }
  }
  await page.close();
}

async function run(list, concurrency) {
  const size = Math.ceil(list.length / concurrency) || 1;
  await Promise.all(
    Array.from({ length: concurrency }, (_, i) => worker(list.slice(i * size, (i + 1) * size))),
  );
}

await run(queue, 4);

if (retry.length) {
  console.log(`retrying ${retry.length}…`);
  const again = retry.splice(0, retry.length);
  await run(again, 2);
}

await browser.close();
console.log(`done ${done}, failed ${failed}`);