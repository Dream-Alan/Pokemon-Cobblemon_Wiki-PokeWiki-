/**
 * 从 PokeAPI 的 CSV 数据源生成本地中文数据集。
 *
 * 数据源走 ghfast.top 代理（本机直连 raw.githubusercontent.com 不可达）。
 * 输出：src/data/pokedex.json / types.json / chains.json / abilities.json
 */
import fs from 'node:fs';
import path from 'node:path';

const CSV_BASE = 'https://ghfast.top/https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const CACHE = path.resolve('.cache/csv');
const OUT = path.resolve('src/data');

const FILES = [
  'pokemon_species.csv',
  'pokemon_species_names.csv',
  'pokemon_species_flavor_text.csv',
  'pokemon.csv',
  'pokemon_stats.csv',
  'pokemon_types.csv',
  'pokemon_abilities.csv',
  'pokemon_evolution.csv',
  'evolution_chains.csv',
  'evolution_triggers.csv',
  'types.csv',
  'type_names.csv',
  'type_efficacy.csv',
  'abilities.csv',
  'ability_names.csv',
  'items.csv',
  'item_names.csv',
  'stats.csv',
  'pokemon_colors.csv',
  'version_names.csv',
];

const LANG_ZH = 12; // zh-Hans
const LANG_EN = 9;
const LANG_JA = 11;

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// ---------- CSV ----------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  // 去掉 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function load(name) {
  const file = path.join(CACHE, name);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    const t = Date.now();
    const res = await fetch(CSV_BASE + name);
    if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(file, text);
    process.stdout.write(`  ↓ ${name} ${(text.length / 1024).toFixed(0)}KB ${Date.now() - t}ms\n`);
    await new Promise(r => setTimeout(r, 250));
  }
  const raw = fs.readFileSync(file, 'utf8');
  const rows = parseCSV(raw);
  const header = rows[0];
  const out = [];
  for (const r of rows.slice(1)) {
    if (!r.length || r[0] === '') continue;
    // 兜底：未加引号的逗号导致列数超标时，把多出来的并回最后一列
    if (r.length > header.length) {
      const extra = r.length - header.length;
      const merged = r.splice(header.length - 1, extra + 1).join(',');
      r.push(merged);
    }
    if (r.length !== header.length) continue;
    const o = {};
    for (let i = 0; i < header.length; i++) o[header[i]] = r[i];
    out.push(o);
  }
  return out;
}

const num = v => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

console.log('▶ 读取 CSV 数据源');
const species = await load('pokemon_species.csv');
const speciesNames = await load('pokemon_species_names.csv');
const flavorRows = await load('pokemon_species_flavor_text.csv');
const pokemon = await load('pokemon.csv');
const statsRows = await load('pokemon_stats.csv');
const typeRows = await load('pokemon_types.csv');
const abilityRows = await load('pokemon_abilities.csv');
const evoRows = await load('pokemon_evolution.csv');
const chainsRows = await load('evolution_chains.csv');
const evoTriggers = await load('evolution_triggers.csv');
const typesRows = await load('types.csv');
const typeNames = await load('type_names.csv');
const efficacy = await load('type_efficacy.csv');
const abilitiesRows = await load('abilities.csv');
const abilityNames = await load('ability_names.csv');
const itemsRows = await load('items.csv');
const itemNames = await load('item_names.csv');
const statsMeta = await load('stats.csv');
const colorRows = await load('pokemon_colors.csv');
const versionNames = await load('version_names.csv');

// ---------- 基础字典 ----------
const nameOf = (lang) => {
  const m = new Map();
  for (const r of speciesNames) {
    if (num(r.local_language_id) === lang) m.set(num(r.pokemon_species_id), r);
  }
  return m;
};
const zhNames = nameOf(LANG_ZH);
const enNames = nameOf(LANG_EN);
const jaNames = nameOf(LANG_JA);

const typeZh = new Map();
const typeEn = new Map();
for (const r of typeNames) {
  if (num(r.local_language_id) === LANG_ZH) typeZh.set(num(r.type_id), r.name);
  if (num(r.local_language_id) === LANG_EN) typeEn.set(num(r.type_id), r.name);
}

const abilityZh = new Map();
for (const r of abilityNames) if (num(r.local_language_id) === LANG_ZH) abilityZh.set(num(r.ability_id), r.name);

const itemZh = new Map();
for (const r of itemNames) if (num(r.local_language_id) === LANG_ZH) itemZh.set(num(r.item_id), r.name);

const statNameById = new Map(statsMeta.map(s => [num(s.id), s.identifier]));
const colorNameById = new Map(colorRows.map(c => [num(c.id), c.identifier]));
const versionNameById = new Map(versionNames.filter(v => num(v.local_language_id) === LANG_EN).map(v => [num(v.version_id), v.name]));

// 图鉴描述：取“最新”版本的中文描述（该文件表头是 species_id）
const flavorById = new Map();
for (const r of flavorRows) {
  if (num(r.language_id) !== LANG_ZH) continue;
  const sid = num(r.species_id ?? r.pokemon_species_id);
  const vid = num(r.version_id);
  const prev = flavorById.get(sid);
  if (!prev || vid > prev.vid) {
    flavorById.set(sid, { vid, text: r.flavor_text.replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim() });
  }
}

// ---------- 宝可梦 ----------
const defaultPokemon = new Map();
for (const p of pokemon) {
  if (num(p.is_default) !== 1) continue;
  defaultPokemon.set(num(p.species_id), {
    height: num(p.height),
    weight: num(p.weight),
    baseExp: num(p.base_experience),
  });
}

const statsByPokemon = new Map();
for (const r of statsRows) {
  const pid = num(r.pokemon_id);
  const key = statNameById.get(num(r.stat_id));
  if (!statsByPokemon.has(pid)) statsByPokemon.set(pid, {});
  statsByPokemon.get(pid)[key] = num(r.base_stat);
}
const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

const typesByPokemon = new Map();
for (const r of typeRows) {
  const pid = num(r.pokemon_id);
  if (!typesByPokemon.has(pid)) typesByPokemon.set(pid, []);
  typesByPokemon.get(pid).push({ slot: num(r.slot), type: typeEn.get(num(r.type_id)) });
}
for (const arr of typesByPokemon.values()) arr.sort((a, b) => a.slot - b.slot);

const abilitiesByPokemon = new Map();
for (const r of abilityRows) {
  const pid = num(r.pokemon_id);
  if (!abilitiesByPokemon.has(pid)) abilitiesByPokemon.set(pid, []);
  abilitiesByPokemon.get(pid).push({
    id: num(r.ability_id),
    name: abilityZh.get(num(r.ability_id)) || null,
    hidden: num(r.is_hidden) === 1,
    slot: num(r.slot),
  });
}
for (const arr of abilitiesByPokemon.values()) arr.sort((a, b) => a.slot - b.slot);

// 进化关系
const evoByTarget = new Map();
for (const r of evoRows) evoByTarget.set(num(r.evolved_species_id), r);

const speciesById = new Map(species.map(s => [num(s.id), s]));

function describeEvolution(row) {
  if (!row) return '特殊方式';
  const parts = [];
  const trigger = evoTriggers.find(t => num(t.id) === num(row.evolution_trigger_id))?.identifier || 'level-up';
  const lvl = num(row.minimum_level);
  if (lvl) parts.push(`等级 ${lvl}`);
  if (num(row.trigger_item_id)) {
    const n = itemZh.get(num(row.trigger_item_id));
    parts.push(n ? `使用「${n}」` : '使用道具');
  }
  if (num(row.held_item_id)) {
    const n = itemZh.get(num(row.held_item_id));
    parts.push(n ? `携带「${n}」` : '携带道具');
  }
  if (row.time_of_day) parts.push(row.time_of_day === 'day' ? '白天' : '夜晚');
  if (num(row.minimum_happiness)) parts.push(`亲密度 ${row.minimum_happiness}`);
  if (num(row.minimum_affection)) parts.push('友好度达标');
  if (num(row.known_move_id)) parts.push('掌握特定招式');
  if (num(row.known_move_type_id)) parts.push(`掌握${typeZh.get(num(row.known_move_type_id)) || ''}属性招式`);
  if (num(row.gender_id) === 1) parts.push('雄性');
  if (num(row.gender_id) === 2) parts.push('雌性');
  if (trigger === 'trade' && !num(row.held_item_id)) parts.push('交换');
  if (trigger === 'use-item' && !num(row.trigger_item_id)) parts.push('使用进化石');
  if (trigger === 'shed') parts.push('特殊方式');
  if (!parts.length) parts.push(trigger === 'level-up' ? '升级' : '特殊方式');
  return parts.join(' · ');
}

// ---------- 输出 ----------
const out = [];
for (const s of species) {
  const sid = num(s.id);
  const base = defaultPokemon.get(sid);
  if (!base) continue;
  const zh = zhNames.get(sid);
  const en = enNames.get(sid);
  const ja = jaNames.get(sid);
  const st = statsByPokemon.get(sid) || {};
  const stats = {};
  for (const k of STAT_KEYS) stats[k] = st[k] ?? 0;

  out.push({
    id: sid,
    name: {
      zh: zh?.name || en?.name || s.identifier,
      en: en?.name || s.identifier,
      ja: ja?.name || null,
    },
    genus: zh?.genus || en?.genus || null,
    types: (typesByPokemon.get(sid) || []).map(t => t.type),
    stats,
    total: STAT_KEYS.reduce((a, k) => a + (stats[k] || 0), 0),
    height: base.height,
    weight: base.weight,
    abilities: (abilitiesByPokemon.get(sid) || []).map(a => ({ id: a.id, name: a.name, hidden: a.hidden })),
    gen: num(s.generation_id),
    legendary: num(s.is_legendary) === 1,
    mythical: num(s.is_mythical) === 1,
    color: colorNameById.get(num(s.color_id)) || null,
    captureRate: num(s.capture_rate),
    hatchCounter: num(s.hatch_counter),
    genderRate: num(s.gender_rate),
    evolvesFrom: num(s.evolves_from_species_id),
    evolutionChain: num(s.evolution_chain_id),
    evolution: num(s.evolves_from_species_id)
      ? describeEvolution(evoByTarget.get(sid), speciesById.get(num(s.evolves_from_species_id)))
      : null,
    flavor: flavorById.get(sid)?.text || null,
    flavorVersion: flavorById.get(sid) ? (versionNameById.get(flavorById.get(sid).vid) || null) : null,
  });
}

out.sort((a, b) => a.id - b.id);

// 属性
const typeIdentifierById = new Map(typesRows.map(t => [num(t.id), t.identifier]));
const typeOrder = typesRows.map(t => num(t.id)).filter(Boolean).sort((a, b) => a - b)
  .filter(id => !['unknown', 'stellar', 'shadow'].includes(typeIdentifierById.get(id)));
const TYPE_COLORS = {
  normal: '#9FA19F', fighting: '#FF8000', flying: '#81B9EF', poison: '#9141CB',
  ground: '#915121', rock: '#AFA981', bug: '#91A119', ghost: '#704170',
  steel: '#60A1B8', fire: '#E62829', water: '#2980EF', grass: '#3FA129',
  electric: '#FAC000', psychic: '#EF4179', ice: '#3FD8FF', dragon: '#5060E1',
  dark: '#624D4E', fairy: '#EF70EF', stellar: '#40B5A5', unknown: '#68A090',
};
const types = typeOrder.map(id => {
  const en = typeEn.get(id);
  return {
    id,
    key: en,
    zh: typeZh.get(id) || en,
    en,
    color: TYPE_COLORS[en.toLowerCase()] || TYPE_COLORS[en] || '#888888',
    doubleTo: efficacy.filter(e => num(e.damage_type_id) === id && num(e.damage_factor) === 200).map(e => typeEn.get(num(e.target_type_id))),
    halfTo: efficacy.filter(e => num(e.damage_type_id) === id && num(e.damage_factor) === 50).map(e => typeEn.get(num(e.target_type_id))),
    zeroTo: efficacy.filter(e => num(e.damage_type_id) === id && num(e.damage_factor) === 0).map(e => typeEn.get(num(e.target_type_id))),
  };
});
// 防御向：某个属性作为防守方时被哪些属性克制
for (const t of types) {
  t.weakTo = types.filter(a => a.doubleTo.includes(t.key)).map(a => a.key);
  t.resists = types.filter(a => a.halfTo.includes(t.key)).map(a => a.key);
  t.immuneTo = types.filter(a => a.zeroTo.includes(t.key)).map(a => a.key);
}

// 进化链
const chains = {};
for (const c of chainsRows) {
  const cid = num(c.id);
  chains[cid] = [];
}
for (const p of out) {
  if (!p.evolutionChain) continue;
  chains[p.evolutionChain] ||= [];
  chains[p.evolutionChain].push({
    from: p.evolvesFrom,
    to: p.id,
    detail: p.evolution,
  });
}

// 特性
const abilities = abilitiesRows.map(a => ({
  id: num(a.id),
  key: a.identifier,
  zh: abilityZh.get(num(a.id)) || a.identifier,
})).filter(a => out.some(p => p.abilities.some(x => x.id === a.id)));

const check = out.find(p => p.id === 1);
console.log('\n▶ 校验');
console.log('  #001 →', check?.name.zh, '/', check?.name.en, '| types:', check?.types.join(','), '| total:', check?.total);
console.log('  图鉴描述:', check?.flavor?.slice(0, 40) + '…', `(${check?.flavorVersion})`);
console.log('  属性中文样例:', types.slice(0, 6).map(t => t.zh).join(' '));

fs.writeFileSync(path.join(OUT, 'pokedex.json'), JSON.stringify(out));
fs.writeFileSync(path.join(OUT, 'types.json'), JSON.stringify(types));
fs.writeFileSync(path.join(OUT, 'chains.json'), JSON.stringify(chains));
fs.writeFileSync(path.join(OUT, 'abilities.json'), JSON.stringify(abilities));

// 客户端用的精简索引：[id, 中文名, 英文名, [属性...], 世代, 种族值总和, 传说标记]
const index = out.map(p => [p.id, p.name.zh, p.name.en, p.types, p.gen, p.total, (p.legendary || p.mythical) ? 1 : 0]);
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));

const stats = {
  generatedAt: new Date().toISOString(),
  pokemon: out.length,
  types: types.length,
  abilities: abilities.length,
  chains: Object.keys(chains).length,
  withFlavor: out.filter(p => p.flavor).length,
  withZhName: out.filter(p => p.name.zh && /[\u4e00-\u9fa5]/.test(p.name.zh)).length,
};
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(stats, null, 2));

console.log('\n▶ 完成');
console.log(' ', stats);
for (const f of ['pokedex.json', 'types.json', 'chains.json', 'abilities.json']) {
  console.log(`  ${f.padEnd(16)} ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)}KB`);
}