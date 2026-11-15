/**
 * 下载官方原画并转成本地 webp（512px），输出 public/art/{no}.webp
 * 直连 raw.githubusercontent.com 不可达，改走 ghfast.top 代理；失败时回退 pokemondb。
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('public/art');
fs.mkdirSync(OUT, { recursive: true });

const pokedex = JSON.parse(fs.readFileSync(path.resolve('src/data/pokedex.json'), 'utf8'));
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);
const SIZE = Number(process.env.ART_SIZE || 512);

const pad = id => String(id).padStart(4, '0');

async function withRetry(fn, times = 3) {
  let last;
  for (let i = 0; i < times; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise(r => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}

async function fetchArtwork(p) {
  const id = p.id;
  const urls = [
    `https://ghfast.top/https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    `https://img.pokemondb.net/artwork/large/${p.name.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`,
  ];
  for (const url of urls) {
    try {
      const buf = await withRetry(async () => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 45000);
        try {
          const res = await fetch(url, { signal: ctrl.signal });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return Buffer.from(await res.arrayBuffer());
        } finally { clearTimeout(timer); }
      }, 2);
      if (buf.length < 1000) throw new Error('too small');
      return buf;
    } catch { /* next */ }
  }
  return null;
}

let done = 0, skipped = 0, failed = [];
const total = pokedex.length;
const t0 = Date.now();

async function worker(queue) {
  while (queue.length) {
    const p = queue.shift();
    const dest = path.join(OUT, `${pad(p.id)}.webp`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 800) { skipped++; done++; continue; }
    try {
      const buf = await fetchArtwork(p);
      if (!buf) { failed.push(p.id); done++; continue; }
      await sharp(buf)
        .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 82 })
        .toFile(dest);
    } catch (e) {
      failed.push(p.id);
    }
    done++;
    if (done % 50 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${done}/${total}  skipped=${skipped} failed=${failed.length}  ${(done / el).toFixed(1)}/s  eta=${Math.round((total - done) / (done / el))}s`);
    }
  }
}

const queue = [...pokedex];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

const bytes = fs.readdirSync(OUT).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`\n完成: ${done} 张, 跳过 ${skipped}, 失败 ${failed.length}, 体积 ${(bytes / 1024 / 1024).toFixed(1)}MB`);
if (failed.length) {
  console.log('失败 ID:', failed.slice(0, 50).join(','));
  fs.writeFileSync('.cache/art-failed.json', JSON.stringify(failed));
}