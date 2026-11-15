/**
 * 解析 Cobblemon 的 spawn_pool_world，生成「方可梦里的获取途径」数据
 * 输出：src/data/spawns.json → { "25": { species, rules: [{ bucket, lv, weight, where[], when[], preset[], aspects[] }] } }
 *
 * 所有文字都由 jar 内真实条件翻译而来，不编造。
 */
import fs from 'node:fs';
import path from 'node:path';

// 本体 + Mega Showdown + JoStar 大集合的生成池（后者补齐本体未实装物种的出现条件）
const POOL_DIRS = [
  '.cache/cobblemon/data/cobblemon/spawn_pool_world',
  '.cache/mega/data/cobblemon/spawn_pool_world',
  '.cache/jo2/data/cobblemon/spawn_pool_world',
].map(p => path.resolve(p));
const OUT = path.resolve('src/data/spawns.json');

const BIOME_ZH = {
  '#cobblemon:is_overworld': '主世界',
  '#cobblemon:is_ocean': '海洋',
  '#cobblemon:is_deep_ocean': '深海',
  '#cobblemon:is_warm_ocean': '温暖海洋',
  '#cobblemon:is_lukewarm_ocean': '温和海洋',
  '#cobblemon:is_cold_ocean': '寒冷海洋',
  '#cobblemon:is_frozen_ocean': '冰冻海洋',
  '#cobblemon:is_coast': '海岸',
  '#cobblemon:is_beach': '沙滩',
  '#cobblemon:is_jungle': '丛林',
  '#cobblemon:is_tropical_island': '热带岛屿',
  '#cobblemon:is_swamp': '沼泽',
  '#cobblemon:is_forest': '森林',
  '#cobblemon:is_freshwater': '淡水',
  '#cobblemon:is_river': '河流',
  '#cobblemon:is_hills': '丘陵',
  '#cobblemon:is_highlands': '高地',
  '#cobblemon:is_mountain': '山地',
  '#cobblemon:is_peak': '山峰',
  '#cobblemon:is_plateau': '高原',
  '#cobblemon:is_taiga': '针叶林',
  '#cobblemon:is_temperate': '温带',
  '#cobblemon:is_arid': '干旱地带',
  '#cobblemon:is_lush': '繁茂洞穴',
  '#cobblemon:is_magical': '魔法森林',
  '#cobblemon:is_badlands': '恶地',
  '#cobblemon:is_savanna': '热带草原',
  '#cobblemon:is_sky': '天空',
  '#cobblemon:is_warm': '温暖地区',
  '#cobblemon:is_cold': '寒冷地区',
  '#cobblemon:is_floral': '花田',
  '#cobblemon:is_cherry_blossom': '樱花林',
  '#cobblemon:is_mushroom': '蘑菇岛',
  '#cobblemon:is_grassland': '草原',
  '#cobblemon:is_snowy_forest': '雪林',
  '#cobblemon:is_snowy_taiga': '积雪针叶林',
  '#cobblemon:is_snowy': '雪原',
  '#cobblemon:is_frozen': '冰冻地带',
  '#cobblemon:is_freezing': '极寒地带',
  '#cobblemon:is_glacial': '冰川',
  '#cobblemon:is_desert': '沙漠',
  '#cobblemon:is_spooky': '幽暗森林',
  '#cobblemon:is_tundra': '冻原',
  '#cobblemon:is_plains': '平原',
  '#cobblemon:is_bamboo': '竹林',
  '#cobblemon:is_end': '末地',
  '#cobblemon:is_island': '岛屿',
  '#cobblemon:is_shrubland': '灌木丛',
  '#cobblemon:is_dripstone': '溶洞',
  '#cobblemon:is_deep_dark': '深暗之域',
  '#cobblemon:is_thermal': '热泉',
  '#cobblemon:is_volcanic': '火山',
  '#cobblemon:has_block/mud': '泥块附近',
  '#cobblemon:nether/is_basalt': '玄武岩三角洲',
  '#cobblemon:nether/is_crimson': '绯红森林',
  '#cobblemon:nether/is_warped': '诡异森林',
  '#cobblemon:nether/is_soul_sand': '灵魂沙峡谷',
  '#cobblemon:nether/is_soul_fire': '灵魂火区域',
  '#cobblemon:nether/is_forest': '下界森林',
  '#cobblemon:nether/is_fungus': '菌类区域',
  '#cobblemon:nether/is_mountain': '下界山地',
  '#cobblemon:nether/is_desert': '下界荒漠',
  '#cobblemon:nether/is_quartz': '石英区域',
  '#cobblemon:nether/is_frozen': '下界冰冻区域',
  '#cobblemon:nether/is_overgrowth': '下界蔓生区域',
  '#cobblemon:nether/is_toxic': '下界剧毒区域',
  '#cobblemon:nether/is_wasteland': '下界荒原',
  '#minecraft:is_nether': '下界',
  '#aether:is_aether': '以太',
  'aether:skyroot_forest': '天根森林',
  'aether:skyroot_grove': '天根树林',
  'aether:skyroot_meadow': '天根草甸',
  'aether:skyroot_woodland': '天根林地',
  'the_bumblezone:the_bumblezone': '嗡嗡蜂巢维度',
  'the_bumblezone:crystal_canyon': '水晶峡谷',
  'the_bumblezone:floral_meadow': '花之草甸',
  'the_bumblezone:howling_constructs': '咆哮建筑',
  'the_bumblezone:pollinated_fields': '授粉原野',
  'biomesoplenty:crystalline_chasm': '水晶裂谷',
  'minecraft:frozen_river': '冰河',
  'minecraft:mushroom_fields': '蘑菇岛',
  'minecraft:snowy_beach': '积雪沙滩',
  'minecraft:sunflower_plains': '向日葵平原',
};

const PRESET_ZH = {
  natural: '地表',
  water: '水中',
  lava: '岩浆',
  foliage: '树叶',
  treetop: '树冠',
  derelict: '废弃结构',
  wild: '荒野',
  urban: '城镇',
  mansion: '林地府邸',
  redstone: '红石结构',
  webs: '蜘蛛网',
  trail_ruins: '古迹废墟',
  ruined_portal: '废弃传送门',
  jungle_pyramid: '丛林神庙',
  desert_pyramid: '沙漠神殿',
  ancient_city: '远古城市',
  nether_fossil: '下界化石',
  stronghold: '要塞',
  mansion_bedrooms: '府邸卧室',
  mansion_dining: '府邸餐厅',
  salt: '盐滩',
};

const STRUCTURE_ZH = {
  '#cobblemon:spawns/is_civilization': '人类建筑附近',
  '#cobblemon:spawns/is_witch_structure': '女巫建筑附近',
  '#cobblemon:spawns/is_graveyard': '墓地附近',
  '#cobblemon:spawns/is_ruins': '遗迹附近',
  '#cobblemon:spawns/is_jungle_monument': '丛林神庙附近',
  '#cobblemon:spawns/is_ocean_monument': '海底神殿附近',
  '#cobblemon:spawns/is_desert_monument': '沙漠神殿附近',
  '#cobblemon:spawns/is_ocean_ruins': '海底废墟附近',
  '#cobblemon:spawns/is_nether_structure': '下界建筑附近',
  '#cobblemon:spawns/is_illager_structure': '灾厄建筑附近',
  'cobblemon:shipwreck_coves/submerged_shipwreck_cove': '沉船湾',
  'cobblemon:shipwreck_coves/lush_shipwreck_cove': '繁茂沉船湾',
  'cobblemon:shipwreck_cove': '沉船湾',
  'minecraft:mansion': '林地府邸',
  '#aether:dungeons': '以太地牢',
};

const BUCKET_ZH = {
  common: '常见',
  uncommon: '少见',
  rare: '稀有',
  'ultra-rare': '极稀有',
};

const zh = (map, key, fallback) => map[key] ?? fallback ?? key;

/** 未收录标签的兜底显示：末地/蜂巢/狩猎地带/原版群系 */
const EXTRA_BIOME_ZH = {
  '#minecraft:is_end': '末地',
  '#minecraft:is_nether': '下界',
  '#minecraft:is_beach': '沙滩',
  '#minecraft:is_ocean': '海洋',
  '#cobblemon:is_cave': '洞窟',
  '#cobblemon:is_sandy': '沙地',
  '#cobblemon:is_arid': '干旱地带',
  '#cobblemon:is_sky': '天空',
  '#the_bumblezone:the_bumblezone': '蜂巢维度',
  'minecraft:ice_spikes': '冰刺平原',
  'minecraft:bamboo_jungle': '竹林',
  'minecraft:dark_forest': '黑森林',
  'minecraft:mushroom_fields': '蘑菇岛',
  'minecraft:lush_caves': '繁茂洞窟',
  'minecraft:dripstone_caves': '滴水石洞',
  'minecraft:deep_dark': '深暗之域',
  'minecraft:cherry_grove': '樱花树林',
  'minecraft:snowy_plains': '雪原',
  'minecraft:swamp': '沼泽',
  'minecraft:desert': '沙漠',
  'minecraft:jungle': '丛林',
};
const prettify = (key) => {
  if (EXTRA_BIOME_ZH[key]) return EXTRA_BIOME_ZH[key];
  const safari = key.match(/^cobblesafari:([a-z]+)$/);
  if (safari) return `狩猎地带·${zh({ bug: '虫', grass: '草', flying: '飞行', psychic: '超能力', steel: '钢', ice: '冰', poison: '毒', electric: '电', ground: '地面', rock: '岩石', ghost: '幽灵', water: '水', normal: '一般', fighting: '格斗', fire: '火', dark: '恶', dragon: '龙', fairy: '妖精' }, safari[1], safari[1])}园区`;
  return key.replace(/^#/, '').replace(/^[a-z_]+:/, '').replace(/_/g, ' ');
};

/** 把单条 spawn 规则翻译成中文条件 */
function translate(rule) {
  const c = rule.condition ?? {};
  const where = [];
  for (const b of c.biomes ?? []) {
    const label = BIOME_ZH[b] ?? prettify(b);
    if (label && !where.includes(label)) where.push(label);
  }
  if (where.length > 6) where.length = 6;

  const when = [];
  if (c.timeRange) {
    const t = { day: '白天', night: '夜晚', dusk: '黄昏' }[c.timeRange];
    if (t) when.push(t);
  }
  if (c.canSeeSky) when.push('需要露天');
  if (c.minSkyLight >= 8) when.push('白天光照 ≥ 8');
  else if (c.maxSkyLight === 0) when.push('无天空光照（洞窟或夜晚）');
  if (c.isRaining) when.push('下雨时');
  if (c.isThundering) when.push('雷雨时');
  if (c.isPokeSnack) when.push('放置宝可梦点心');
  if (c.moonPhase !== undefined) when.push('特定月相');
  if (c.minLureLevel) when.push(`钓竿诱饵等级 ≥ ${c.minLureLevel}`);
  for (const s of c.structures ?? []) {
    const label = zh(STRUCTURE_ZH, s, null);
    if (label && !when.includes(label)) when.push(label);
  }
  if (c.minY !== undefined && c.maxY !== undefined) when.push(`高度 Y ${c.minY}–${c.maxY}`);
  else if (c.minY !== undefined) when.push(`高度 Y ≥ ${c.minY}`);
  else if (c.maxY !== undefined) when.push(`高度 Y ≤ ${c.maxY}`);

  const presets = [];
  for (const p of rule.presets ?? []) {
    const label = zh(PRESET_ZH, p, p);
    if (!presets.includes(label)) presets.push(label);
  }

  const aspects = typeof rule.pokemon === 'string' && rule.pokemon.includes(' ')
    ? rule.pokemon.split(' ').slice(1).join(' ').replace(/region_bias=/g, '').trim()
    : '';
  const ASPECT_ZH = { alola: '阿罗拉形态', galar: '伽勒尔形态', hisui: '洗翠形态', paldea: '帕底亚形态' };
  const aspectZh = aspects && ASPECT_ZH[aspects] ? ASPECT_ZH[aspects] : aspects;

  return {
    bucket: rule.bucket ?? 'common',
    bucketZh: BUCKET_ZH[rule.bucket] ?? rule.bucket ?? '常见',
    lv: rule.level ?? '?',
    weight: typeof rule.weight === 'number' ? Math.round(rule.weight * 100) / 100 : null,
    where: where.length ? where : ['主世界'],
    when,
    presets,
    aspects: aspectZh,
  };
}

const files = [];
for (const dir of POOL_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.isFile() && d.name.endsWith('.json')) files.push(path.join(dir, d.name));
  }
}
const out = {};

for (const file of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  for (const rule of data.spawns ?? []) {
    if (rule.type !== 'pokemon' || typeof rule.pokemon !== 'string') continue;
    const species = rule.pokemon.split(' ')[0].toLowerCase();
    const entry = (out[species] ??= { species, rules: [] });
    const t = translate(rule);
    const dup = entry.rules.some(r => r.bucket === t.bucket && r.lv === t.lv && r.where.join() === t.where.join() && r.when.join() === t.when.join());
    if (!dup) entry.rules.push(t);
  }
}

// 排序：常见 → 极稀有，同稀有度按等级
const order = { common: 0, uncommon: 1, rare: 2, 'ultra-rare': 3 };
for (const e of Object.values(out)) {
  e.rules.sort((a, b) => (order[a.bucket] ?? 9) - (order[b.bucket] ?? 9));
  if (e.rules.length > 8) e.rules = e.rules.slice(0, 8);
}

fs.writeFileSync(OUT, JSON.stringify(out));
const rules = Object.values(out).reduce((a, e) => a + e.rules.length, 0);
console.log(`spawns.json: ${Object.keys(out).length} 个物种 / ${rules} 条生成规则，${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);