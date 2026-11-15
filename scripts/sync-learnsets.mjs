// Build src/data/learnsets.json with two sources per species:
//   cobblemon — the learnset shipped in the modpack's Cobblemon jar (level / tm / tutor / egg / legacy)
//   game      — mainline learnsets aggregated from PokeAPI's pokemon_moves.csv
// Each entry is a compact tuple list: [moveId, methodCode, level]
//   methodCode: 0 level-up, 1 machine, 2 egg, 3 tutor, 4 legacy
import fs from 'node:fs';
import path from 'node:path';

const COBBLE_ROOT = '.cache/cobblemon/data/cobblemon/species';
const CSV_CACHE = '.cache/csv';
const CSV_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_moves.csv';

if (!fs.existsSync('.cache/csv/pokemon_moves.csv')) {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`pokemon_moves.csv ${res.status}`);
  fs.writeFileSync(`${CSV_CACHE}/pokemon_moves.csv`, await res.text());
}

const movesJson = JSON.parse(fs.readFileSync('src/data/moves.json', 'utf8'));
const byIdent = movesJson.byIdent;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

function methodCode(prefix) {
  if (prefix === 'tm') return 1;
  if (prefix === 'egg') return 2;
  if (prefix === 'tutor') return 3;
  if (prefix === 'legacy') return 4;
  return 0;
}

function parseMoves(list) {
  const out = [];
  for (const raw of list || []) {
    const [head, name] = String(raw).split(':');
    if (!name) continue;
    const id = byIdent[String(name).toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (!id) continue;
    const code = methodCode(head);
    out.push([id, code, code === 0 ? Number(head) || 0 : 0]);
  }
  return out;
}

// ---- Cobblemon ------------------------------------------------------------
const cobblemon = {};
const cobblemonForms = {};
const unmappedCobble = new Set();
for (const file of walk(COBBLE_ROOT)) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dex = j.nationalPokedexNumber;
  if (!dex) continue;
  for (const raw of j.moves || []) {
    const name = String(raw).split(':')[1];
    if (name && !byIdent[String(name).toLowerCase().replace(/[^a-z0-9]/g, '')]) unmappedCobble.add(name);
  }
  cobblemon[dex] = parseMoves(j.moves);
  for (const form of j.forms || []) {
    const aspects = (form.aspects || []).filter((a) => a !== 'shiny' && a !== 'alpha_eyes');
    if (!aspects.length) continue;
    const key = aspects.join('_');
    if (!form.moves || !form.moves.length) continue;
    (cobblemonForms[dex] ||= {})[key] = parseMoves(form.moves);
  }
}

// ---- mainline games -------------------------------------------------------
const text = fs.readFileSync(`${CSV_CACHE}/pokemon_moves.csv`, 'utf8').replace(/^\uFEFF/, '');
const game = {};
const seen = new Map(); // key -> Set("moveId|code")
const METHOD = { 1: 0, 2: 2, 3: 3, 4: 1 };
let skipped = 0;
for (const line of text.split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const [pid, , mid, method, level] = line.split(',');
  const id = Number(pid);
  if (!(id >= 1 && id <= 1025)) { skipped++; continue; }
  const code = METHOD[Number(method)];
  if (code === undefined) continue;
  const mv = Number(mid);
  if (!movesJson.moves[mv]) continue;
  const key = `${mv}|${code}`;
  let set = seen.get(id);
  if (!set) seen.set(id, (set = new Map()));
  const lvl = code === 0 ? Number(level) || 0 : 0;
  const prev = set.get(key);
  if (prev === undefined || (code === 0 && lvl < prev)) set.set(key, lvl);
}
for (const [id, set] of seen) {
  game[id] = [...set.entries()].map(([k, lvl]) => {
    const [mv, code] = k.split('|').map(Number);
    return [mv, code, lvl];
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  cobblemon,
  cobblemonForms,
  game,
};
fs.writeFileSync('src/data/learnsets.json', JSON.stringify(out));
const stats = {
  cobblemonSpecies: Object.keys(cobblemon).length,
  cobblemonFormSets: Object.values(cobblemonForms).reduce((n, f) => n + Object.keys(f).length, 0),
  gameSpecies: Object.keys(game).length,
  cobblemonMoves: Object.values(cobblemon).reduce((n, l) => n + l.length, 0),
  gameMoves: Object.values(game).reduce((n, l) => n + l.length, 0),
  unmappedCobble: [...unmappedCobble].slice(0, 10),
  unmappedCobbleCount: unmappedCobble.size,
  skipped,
  sizeKB: Math.round(fs.statSync('src/data/learnsets.json').size / 1024),
};
console.log(stats);