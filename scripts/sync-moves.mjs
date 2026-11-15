// Build src/data/moves.json from PokeAPI CSV dumps.
// Moves are shared by both learnset sources (Cobblemon + mainline games),
// so we key everything by PokeAPI move id and keep a normalized identifier lookup.
import fs from 'node:fs';
import path from 'node:path';

const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const CACHE = '.cache/csv';
fs.mkdirSync(CACHE, { recursive: true });

async function get(name) {
  const dest = path.join(CACHE, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) return fs.readFileSync(dest, 'utf8');
  const res = await fetch(`${CSV}/${name}`);
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(dest, text);
  return text;
}

// RFC4180-ish parser: these dumps contain quoted fields with commas AND newlines.
function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (c === '\r') continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift() || [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => {
      const o = {};
      head.forEach((h, i) => (o[h.trim()] = (r[i] ?? '').trim()));
      return o;
    });
}

const TYPE_KEYS = {
  1: 'normal', 2: 'fighting', 3: 'flying', 4: 'poison', 5: 'ground', 6: 'rock', 7: 'bug',
  8: 'ghost', 9: 'steel', 10: 'fire', 11: 'water', 12: 'grass', 13: 'electric',
  14: 'psychic', 15: 'ice', 16: 'dragon', 17: 'dark', 18: 'fairy',
};

const ZH = '12';
const CLASS = { 1: 'status', 2: 'physical', 3: 'special' };
const CLASS_ZH = { status: '变化', physical: '物理', special: '特殊' };

const clean = (s) =>
  (s || '')
    .replace(/\u000c/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]+/g, ' ')
    // 官方中文里句中断行会留下空格，中文之间不需要空格
    .replace(/([\u3000-\u9fff])\s+(?=[\u3000-\u9fff])/g, '$1')
    .trim();

const [moveCsv, nameCsv, effectCsv, flavorCsv] = await Promise.all([
  get('moves.csv'),
  get('move_names.csv'),
  get('move_effect_prose.csv'),
  get('move_flavor_text.csv'),
]);

const zhName = new Map();
const enName = new Map();
for (const r of parseCsv(nameCsv)) {
  if (r.local_language_id === ZH) zhName.set(r.move_id, clean(r.name));
  if (r.local_language_id === '9') enName.set(r.move_id, clean(r.name));
}

const effectZh = new Map();
const effectEn = new Map();
for (const r of parseCsv(effectCsv)) {
  const text = clean(r.short_effect) || clean(r.effect);
  if (!text) continue;
  if (r.local_language_id === ZH && !effectZh.has(r.move_effect_id)) effectZh.set(r.move_effect_id, text);
  if (r.local_language_id === '9' && !effectEn.has(r.move_effect_id)) effectEn.set(r.move_effect_id, text);
}

// Pick the newest-generation Chinese flavour text as a fallback description.
const flavorZh = new Map();
for (const r of parseCsv(flavorCsv)) {
  if (r.language_id !== ZH) continue;
  const vg = Number(r.version_group_id) || 0;
  const prev = flavorZh.get(r.move_id);
  if (!prev || vg > prev.vg) flavorZh.set(r.move_id, { vg, text: clean(r.flavor_text) });
}

const moves = {};
const byIdent = {};
let noZh = 0;
let noDesc = 0;
for (const r of parseCsv(moveCsv)) {
  const id = Number(r.id);
  const cls = CLASS[Number(r.damage_class_id)] || 'status';
  const zh = zhName.get(r.id) || '';
  if (!zh) noZh++;
  const desc = effectZh.get(r.effect_id) || flavorZh.get(r.id)?.text || effectEn.get(r.effect_id) || '';
  if (!desc) noDesc++;
  moves[id] = {
    n: zh || enName.get(r.id) || r.identifier,
    e: enName.get(r.id) || r.identifier,
    t: TYPE_KEYS[Number(r.type_id)] || 'normal',
    c: cls,
    cz: CLASS_ZH[cls],
    p: Number(r.power) || 0,
    pp: Number(r.pp) || 0,
    a: Number(r.accuracy) || 0,
    pr: Number(r.priority) || 0,
    d: desc,
  };
  byIdent[normalize(r.identifier)] = id;
}
// Cobblemon inherits the Gen-3 spelling of some identifiers.
if (byIdent.vicegrip) byIdent.visegrip = byIdent.vicegrip;

function normalize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/moves.json', JSON.stringify({ generatedAt: new Date().toISOString(), moves, byIdent }));
console.log(
  `moves ${Object.keys(moves).length}, ${(fs.statSync('src/data/moves.json').size / 1024).toFixed(0)}KB, 无中文名 ${noZh}, 无描述 ${noDesc}`,
);
console.log('sample', JSON.stringify(moves[53]));