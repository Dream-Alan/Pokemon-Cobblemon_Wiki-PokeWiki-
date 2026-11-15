// Resolve official artwork for every special form (mega / gmax / regional …).
// PokeAPI exposes a `pokemon` id per form (e.g. charizard-mega-x = 10034) and the
// sprites repo ships official-artwork for those ids.
//   node scripts/fetch-form-art.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DRY = process.argv.includes('--dry');
const OUT = 'public/form-oa';
const SPRITE_PATHS = (pid) => [
  `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${pid}.png`,
  `https://ghproxy.net/https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pid}.png`,
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pid}.png`,
];

// form key (from Cobblemon aspects) -> candidate PokeAPI suffixes, in priority order
const SUFFIX = {
  mega: ['mega'],
  '10-percent': ['10'],
  'complete-percent': ['complete'],
  'pom_pom-style': ['pom-pom'],
  "pa'u-style": ['pau'],
  'sensu-style': ['sensu'],
  'sunny-form': ['sunny'],
  'rainy-form': ['rainy'],
  'snowy-form': ['snowy'],
  'zen-mode': ['zen'],
  'school-form': ['school'],
  'midnight-form': ['midnight'],
  'hero-form': ['hero'],
  'terastal-form': ['terastal'],
  'stellar-form': ['stellar'],
  'wellspring-mask': ['wellspring-mask'],
  'hearthflame-mask': ['hearthflame-mask'],
  'cornerstone-mask': ['cornerstone-mask'],
  'noice_face': ['noice'],
  unbound: ['unbound'],
  'pirouette-forme': ['pirouette'],
  mega_x: ['mega-x'],
  mega_y: ['mega-y'],
  mega_z: ['mega-z'],
  gmax: ['gmax', 'gigantamax'],
  primal: ['primal'],
  origin: ['origin'],
  'origin-forme': ['origin'],
  therian: ['therian'],
  alolan: ['alola'],
  galarian: ['galar'],
  hisuian: ['hisui'],
  paldean: ['paldea', 'paldea-combat-breed'],
  'paldean_aqua-breed': ['paldea-aqua-breed'],
  'paldean_blaze-breed': ['paldea-blaze-breed'],
  whitestriped: ['white-striped'],
  'galarian_zen-mode': ['galar-zen'],
  'dusk-form': ['own-tempo'],
  'dusk-fusion': ['dusk'],
  'dawn-fusion': ['dawn'],
  'ultra-fusion': ['ultra'],
  'white-fusion': ['white'],
  'black-fusion': ['black'],
  battlebond: ['battle-bond'],
  'battle-bond': ['battle-bond'],
  crowned: ['crowned'],
  eternamax: ['eternamax'],
  ultra: ['ultra'],
  totem: ['totem'],
  ash: ['ash'],
  'ash-greninja': ['ash'],
  dusk: ['dusk'],
  'dusk-mane': ['dusk-mane'],
  'dawn-wings': ['dawn-wings'],
  'black': ['black'],
  'white': ['white'],
  'resolute': ['resolute'],
  'pirouette': ['pirouette'],
  'therian-forme': ['therian'],
  'attack-forme': ['attack'],
  'defense-forme': ['defense'],
  'speed-forme': ['speed'],
  'normal-forme': ['normal'],
  'sky-forme': ['sky'],
  'land-forme': ['land'],
  'zen': ['zen'],
  'school': ['school'],
  'blade': ['blade'],
  'shield': ['shield'],
  'hangry': ['hangry'],
  'gulping': ['gulping'],
  'gorging': ['gorging'],
  'amped': ['amped'],
  'low-key': ['low-key'],
  'noice': ['noice'],
  'ice-face': ['ice'],
  'wash-appliance': ['wash'],
  'heat-appliance': ['heat'],
  'frost-appliance': ['frost'],
  'fan-appliance': ['fan'],
  'mow-appliance': ['mow'],
  'trash-cloak': ['trash'],
  'plant-cloak': ['plant'],
  'sandy-cloak': ['sandy'],
  'sunshine-form': ['sunshine'],
  'overcast-form': ['overcast'],
  'east-sea': ['east'],
  'west-sea': ['west'],
  'single-strike': ['single-strike'],
  'rapid-strike': ['rapid-strike'],
  'ice-rider': ['ice'],
  'shadow-rider': ['shadow'],
  'rapid_strike-style': ['rapid-strike'],
  'single_strike-style': ['single-strike'],
  'hero-of-many-battles': ['hero-of-many-battles'],
  'ten-percent': ['10'],
  'complete-forme': ['complete'],
  'meteor-form': ['meteor'],
  'core-form': ['core'],
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

const csv = fs.readFileSync('.cache/csv/pokemon_forms.csv', 'utf8');
const rows = csv.trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
const byIdent = new Map(rows.map((r) => [r[1], Number(r[3])]));

const dexRaw = JSON.parse(fs.readFileSync('src/data/pokedex.json', 'utf8'));
const dex = new Map((Array.isArray(dexRaw) ? dexRaw : Object.values(dexRaw)).map((p) => [p.id, p]));
const cobble = JSON.parse(fs.readFileSync('src/data/cobblemon.json', 'utf8'));
const forms = JSON.parse(fs.readFileSync('src/data/forms.json', 'utf8')).forms;

const results = [];
const missing = [];

for (const [dexNo, list] of Object.entries(forms)) {
  const id = Number(dexNo);
  const base = cobble[String(id)]?.species || slug(dex.get(id)?.name?.en || '');
  // PokeAPI uses the canonical English slug (mr-mime, mime-jr …) while Cobblemon
  // squashes them (mrmime, mimejr), so prefer the dex name and fall back to the mod key.
  const species = slug(dex.get(id)?.name?.en || base.replace(/_/g, '-'));
  for (const f of list) {
    const cands = SUFFIX[f.key] || [f.key];
    let pid = null;
    for (const suf of cands) {
      const hit = byIdent.get(`${species}-${suf}`);
      if (hit) {
        pid = hit;
        break;
      }
    }
    // fuzzy fallback: same species, suffix contains all key tokens
    if (!pid) {
      const tokens = f.key.split(/[-_]/).filter((t) => t && t !== 'form' && t !== 'forme');
      const hit = rows.find((r) => {
        if (!r[1].startsWith(`${species}-`)) return false;
        const rest = r[1].slice(species.length + 1);
        return tokens.every((t) => rest.includes(t));
      });
      if (hit) pid = Number(hit[3]);
    }
    if (pid) results.push({ id, key: f.key, pid });
    else missing.push(`${id}/${f.key} (${f.label})`);
  }
}

console.log(`forms ${results.length + missing.length}, matched ${results.length}, unmatched ${missing.length}`);
if (missing.length) console.log('unmatched:', missing.join(', '));
fs.mkdirSync('.cache', { recursive: true });
fs.writeFileSync('.cache/form-pid.json', JSON.stringify(results));
if (DRY) process.exit(0);

fs.mkdirSync(OUT, { recursive: true });

async function get(pid, tries = 3) {
  for (const url of SPRITE_PATHS(pid)) {
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(url, { headers: { 'user-agent': 'pokewiki' }, signal: AbortSignal.timeout(30000) });
        if (r.status === 404) break;
        if (!r.ok) throw new Error(String(r.status));
        return Buffer.from(await r.arrayBuffer());
      } catch {
        await new Promise((res) => setTimeout(res, 600 * (i + 1)));
      }
    }
  }
  return null;
}

let ok = 0;
let fail = 0;
const queue = [...results];
async function worker() {
  for (;;) {
    const job = queue.shift();
    if (!job) return;
    const dest = path.join(OUT, `${job.id}-${job.key}.webp`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 800) {
      ok++;
      continue;
    }
    const buf = await get(job.pid);
    if (!buf) {
      fail++;
      console.warn(`  ! ${job.id}/${job.key} <- ${job.pid}`);
      continue;
    }
    await sharp(buf).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toFile(dest);
    ok++;
    if (ok % 25 === 0) console.log(`  ${ok}/${results.length}`);
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
console.log(`art saved ${ok}, failed ${fail}`);