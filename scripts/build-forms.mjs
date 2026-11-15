// Collect the "special" Cobblemon forms into src/data/forms.json so they can live
// in the dex as first-class entries.
//
// A form is included when it has a 3D model in our extracted assets AND is
//   - a named special form (mega / gmax / regional / primal / origin / …), or
//   - battle-relevant: different typing, or different base stats from the species.
// Pure appearance variants (Vivillon patterns, Alcremie decorations, Unown letters,
// Furfrou trims …) are excluded on purpose.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '.cache/cobblemon/data/cobblemon/species';
const cobble = JSON.parse(fs.readFileSync('src/data/cobblemon.json', 'utf8'));
const abilities = JSON.parse(fs.readFileSync('src/data/abilities.json', 'utf8'));
const dexRaw = JSON.parse(fs.readFileSync('src/data/pokedex.json', 'utf8'));
const dex = new Map((Array.isArray(dexRaw) ? dexRaw : Object.values(dexRaw)).map((p) => [p.id, p]));

const abilityZh = new Map();
const abilityId = new Map();
for (const a of abilities) abilityZh.set(a.key.toLowerCase().replace(/[^a-z0-9]/g, ''), a.zh);
for (const a of abilities) abilityId.set(a.key.toLowerCase().replace(/[^a-z0-9]/g, ''), a.id);
// ability-info.json（scripts/sync-abilities.mjs）覆盖全部特性，补上只属于特殊形态的（亲子爱、始源之海……）
if (fs.existsSync('src/data/ability-info.json')) {
  for (const [id, a] of Object.entries(JSON.parse(fs.readFileSync('src/data/ability-info.json', 'utf8')))) {
    const k = a.key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!abilityZh.has(k)) abilityZh.set(k, a.zh);
    if (!abilityId.has(k)) abilityId.set(k, Number(id));
  }
}

const SIGNIFICANT =
  /(mega|gmax|primal|origin|therian|alolan|galarian|hisuian|paldean|battlebond|crowned|eternamax|ultra|totem|ash|captain|dusk|dawn|black|white)/;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

const forms = {};
const LABEL = {
  mega: '超级进化',
  mega_x: '超级进化 X',
  mega_y: '超级进化 Y',
  mega_z: '超级进化 Z',
  gmax: '超极巨化',
  gigantamax: '超极巨化',
  primal: '原始回归',
  origin: '起源形态',
  alolan: '阿罗拉形态',
  alola: '阿罗拉形态',
  galarian: '伽勒尔形态',
  galar: '伽勒尔形态',
  hisuian: '洗翠形态',
  hisui: '洗翠形态',
  paldean: '帕底亚形态',
  paldea: '帕底亚形态',
  therian: '灵兽形态',
  battlebond: '羁绊变身',
  crowned: '剑／盾之王',
  eternamax: '无尽极巨化',
  ultra: '究极形态',
  dusk: '黄昏形态',
  dawn: '拂晓形态',
  black: '黑',
  white: '白',
  // 形态 / 战斗形态
  attack: '攻击形态',
  defense: '防御形态',
  speed: '速度形态',
  normal: '普通形态',
  sky: '天空形态',
  zen: '达摩形态',
  pirouette: '舞步形态',
  unbound: '解放形态',
  school: '群聚形态',
  midnight: '午夜形态',
  midday: '白昼形态',
  meteor: '流星形态',
  hero: '英雄形态',
  terastal: '太晶形态',
  stellar: '星晶形态',
  bloodmoon: '血月形态',
  hangry: '空腹形态',
  noice: '冰霜形态',
  antique: '古董形态',
  sunny: '晴天形态',
  rainy: '雨天形态',
  snowy: '雪天形态',
  gorging: '暴食形态',
  gulping: '大口形态',
  '10': '10%',
  complete: '完全体',
  ice: '冰之形态',
  shadow: '暗影形态',
  // 家电 / 面具 / 地区细分
  heat: '加热形态',
  wash: '清洗形态',
  frost: '结冰形态',
  fan: '旋转形态',
  mow: '切割形态',
  wellspring: '水井面具',
  hearthflame: '火灶面具',
  cornerstone: '础石面具',
  female: '雌性',
  male: '雄性',
  // 花纹 / 装饰（多为跟随形态，一并给出中文）
  plant: '植物蓑衣',
  sandy: '沙土蓑衣',
  trash: '垃圾蓑衣',
  east: '东海',
  west: '西海',
  overcast: '阴天',
  sunshine: '晴天',
};

/** Cobblemon 的 evYield（defence / special_attack 拼写）→ 本站的能力键名；缺失返回 null */
function evYieldOf(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const n = (v) => Number(v) || 0;
  return {
    hp: n(ev.hp),
    attack: n(ev.attack),
    defense: n(ev.defence ?? ev.defense),
    'special-attack': n(ev.special_attack),
    'special-defense': n(ev.special_defence ?? ev.special_defense),
    speed: n(ev.speed),
  };
}

function labelFor(key) {
  if (LABEL[key]) return LABEL[key];
  const parts = key.split(/[-_]/);
  const out = [];
  for (const p of parts) {
    if (LABEL[p]) out.push(LABEL[p]);
  }
  return out.length ? out.join(' · ') : key;
}

let count = 0;
for (const file of walk(ROOT)) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const id = j.nationalPokedexNumber;
  if (!id) continue;
  const base = dex.get(id);
  const models = cobble[id]?.forms || [];
  for (const form of j.forms || []) {
    const aspects = (form.aspects || []).filter((a) => a !== 'shiny' && a !== 'alpha_eyes');
    if (!aspects.length) continue;
    const key = aspects.join('_');
    const model = models.find((m) => norm(m.key) === norm(key));
    if (!model) continue;

    const types = [form.primaryType, form.secondaryType].filter(Boolean);
    const baseTypes = base ? base.types : [];
    const typeDiff =
      types.length > 0 &&
      (types.length !== baseTypes.length ||
        types.some((t, i) => t.toLowerCase() !== String(baseTypes[i] || '').toLowerCase()));

    const stats = form.baseStats;
    let statDiff = false;
    if (stats && base) {
      const vals = [stats.hp, stats.attack, stats.defence ?? stats.defense, stats.special_attack, stats.special_defence, stats.speed];
      const ref = [base.stats.hp, base.stats.attack, base.stats.defense, base.stats['special-attack'], base.stats['special-defense'], base.stats.speed];
      statDiff = vals.some((v, i) => Number(v) !== Number(ref[i]));
    }

    if (!SIGNIFICANT.test(key) && !typeDiff && !statDiff) continue;
    if (key.includes('cosmetic')) continue;

    const total = stats ? [stats.hp, stats.attack, stats.defence ?? stats.defense, stats.special_attack, stats.special_defence, stats.speed].reduce((n, v) => n + Number(v), 0) : base?.total;
    const abil = (form.abilities || []).map((a) => {
      const hidden = a.startsWith('h:');
      const raw = hidden ? a.slice(2) : a;
      const k = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
      return { id: abilityId.get(k) ?? null, name: abilityZh.get(k) || raw, hidden };
    });

    (forms[id] ||= []).push({
      key,
      label: labelFor(key),
      types,
      stats: {
        hp: stats?.hp ?? base?.stats.hp,
        attack: stats?.attack ?? base?.stats.attack,
        defense: stats?.defence ?? stats?.defense ?? base?.stats.defense,
        'special-attack': stats?.special_attack ?? base?.stats['special-attack'],
        'special-defense': stats?.special_defence ?? base?.stats['special-defense'],
        speed: stats?.speed ?? base?.stats.speed,
      },
      total,
      abilities: abil.length ? abil : (base?.abilities || []).map((a) => ({ id: a.id ?? null, name: a.name, hidden: a.hidden })),
      battleOnly: Boolean(form.battleOnly),
      height: form.height,
      weight: form.weight,
      model: model.model,
      texture: model.texture,
      shiny: model.shiny,
      source: model.source,
      animation: model.animation || null,
      render: model.render || null,
      evYield: evYieldOf(form.evYield ?? j.evYield),
    });
    count++;
  }
}

fs.writeFileSync('src/data/forms.json', JSON.stringify({ generatedAt: new Date().toISOString(), count, forms }));
console.log({ species: Object.keys(forms).length, forms: count });
const sample = forms[386]?.[0];
console.log(JSON.stringify(sample));