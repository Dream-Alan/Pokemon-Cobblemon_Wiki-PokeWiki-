// Download shiny official artwork (base dex + special forms) and emit a manifest.
//   node scripts/fetch-shiny-art.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MIRRORS = [
  'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/shiny',
  'https://gcore.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/shiny',
  'https://ghproxy.net/https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny',
];
const OUT = 'public/art-shiny';
const OUT_FORM = 'public/form-oa-shiny';
const WORKERS = Number(process.env.WORKERS || 16);

const pad = (n) => String(n).padStart(4, '0');

async function get(pid, tries = 4) {
  for (let i = 0; i < tries; i++) {
    for (const base of MIRRORS) {
      try {
        const r = await fetch(`${base}/${pid}.png`, {
          headers: { 'user-agent': 'pokewiki' },
          signal: AbortSignal.timeout(25000),
        });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(String(r.status));
        return Buffer.from(await r.arrayBuffer());
      } catch {
        // rotate mirror, then retry
      }
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  return null;
}

async function save(buf, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) return;
  await sharp(buf)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(dest);
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(OUT_FORM, { recursive: true });

/* ---------- base dex ---------- */
const FORMS_ONLY = process.argv.includes('--forms-only');
const argNum = (flag, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${flag}=`));
  return hit ? Number(hit.split('=')[1]) : dflt;
};
const FROM = argNum('from', 1);
const TO = argNum('to', 1025);
const writeManifest = FROM === 1 && TO === 1025;
const jobs = [];
if (!FORMS_ONLY) {
  for (let id = FROM; id <= TO; id++) {
    const dest = path.join(OUT, `${pad(id)}.webp`);
    if (!(fs.existsSync(dest) && fs.statSync(dest).size > 800)) jobs.push({ pid: id, dest });
  }
}

/* ---------- special forms ---------- */
const rows = fs
  .readFileSync('.cache/csv/pokemon_forms.csv', 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(','));
const byIdent = new Map(rows.map((r) => [r[1], Number(r[3])]));

const dexRaw = JSON.parse(fs.readFileSync('src/data/pokedex.json', 'utf8'));
const dex = new Map((Array.isArray(dexRaw) ? dexRaw : Object.values(dexRaw)).map((p) => [p.id, p]));
const cobble = JSON.parse(fs.readFileSync('src/data/cobblemon.json', 'utf8'));
const forms = JSON.parse(fs.readFileSync('src/data/forms.json', 'utf8')).forms;

const SUFFIX = {
  mega: ['mega'],
  mega_x: ['mega-x'],
  mega_y: ['mega-y'],
  gmax: ['gmax', 'gigantamax'],
  primal: ['primal'],
  origin: ['origin'],
  'origin-forme': ['origin'],
  'therian-forme': ['therian'],
  alolan: ['alola'],
  galarian: ['galar'],
  hisuian: ['hisui'],
  paldean: ['paldea', 'paldea-combat-breed'],
  'paldean_aqua-breed': ['paldea-aqua-breed'],
  'paldean_blaze-breed': ['paldea-blaze-breed'],
  battlebond: ['battle-bond'],
  crowned: ['crowned'],
  eternamax: ['eternamax'],
  whitestriped: ['white-striped'],
  'galarian_zen-mode': ['galar-zen'],
  'dusk-form': ['own-tempo'],
  'dusk-fusion': ['dusk'],
  'dawn-fusion': ['dawn'],
  'ultra-fusion': ['ultra'],
  'white-fusion': ['white'],
  'black-fusion': ['black'],
  'wash-appliance': ['wash'],
};

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/['’]/g, '')
    .replace(/[.:\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const unmatched = [];
const pidMap = fs.existsSync('.cache/form-pid.json')
  ? new Map(JSON.parse(fs.readFileSync('.cache/form-pid.json', 'utf8')).map((r) => [`${r.id}-${r.key}`, r.pid]))
  : null;
for (const [dexNo, list] of Object.entries(forms)) {
  const id = Number(dexNo);
  const species = slug(dex.get(id)?.name?.en || cobble[String(id)]?.species || '');
  for (const f of list) {
    let pid = pidMap ? pidMap.get(`${id}-${f.key}`) : null;
    if (!pid) {
      for (const suf of SUFFIX[f.key] || [f.key]) {
        pid = byIdent.get(`${species}-${suf}`);
        if (pid) break;
      }
    }
    if (!pid) {
      unmatched.push(`${id}-${f.key}`);
      continue;
    }
    const dest = path.join(OUT_FORM, `${id}-${f.key}.webp`);
    if (!(fs.existsSync(dest) && fs.statSync(dest).size > 800)) jobs.push({ pid, dest });
  }
}

console.log(`jobs ${jobs.length}, form-unmatched ${unmatched.length}`);
let ok = 0;
let fail = 0;
const queue = [...jobs];
async function worker() {
  for (;;) {
    const job = queue.shift();
    if (!job) return;
    const buf = await get(job.pid);
    if (!buf) {
      fail++;
      fs.appendFileSync('.cache/shiny-fail.txt', `${job.pid} ${job.dest}\n`);
      continue;
    }
    await save(buf, job.dest);
    ok++;
    if (ok % 100 === 0) console.log(`  ${ok}/${jobs.length}`);
  }
}

await Promise.all(Array.from({ length: WORKERS }, worker));
console.log(`saved ${ok}, failed ${fail}`);

/* ---------- manifest for the UI ---------- */
if (writeManifest) {
  const base = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith('.webp'))
    .map((f) => Number(f.replace('.webp', '')))
    .sort((a, b) => a - b);
  const formKeys = fs
    .readdirSync(OUT_FORM)
    .filter((f) => f.endsWith('.webp'))
    .map((f) => f.replace('.webp', ''));
  fs.writeFileSync(
    'src/data/shiny-art.json',
    JSON.stringify({ base, forms: formKeys.sort(), updated: new Date().toISOString().slice(0, 10) }, null, 0)
  );
  console.log(`manifest: ${base.length} base, ${formKeys.length} forms`);
}