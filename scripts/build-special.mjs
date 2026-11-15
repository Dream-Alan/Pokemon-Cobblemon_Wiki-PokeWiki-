/**
 * 生成 src/data/special.json：每只宝可梦的「特殊获取途径」
 *  - cobblemon：整合包里非野外随机刷新的途径（限定结构 / 特殊维度 / 钓竿 / 化石复活 / 传说遗迹召唤）
 *  - game：正作里非「草丛走路」的途径（赠送 / 定点 / 交换 / 团体战 / 特殊道具 / 特殊地点）
 *
 * 每个条目都带结构化 facts（位置 / 群系 / 时间 / 光照 / 高度 / 天气 / 结构 / 稀有度 …），
 * 全部从数据里读，不手写物种特例、不做推测。
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const CACHE = ".cache";
const OUT = "src/data/special.json";

/* ---------- 数据源 ---------- */
/**
 * 所有包里的 spawn_pool_world：任意命名空间（cobblemon / jostar_spawn_18 / cobblesafari / paradox_spawns_ccc …），
 * 递归读取子目录（Cobblemon 本体把联动生成放在子目录里）。
 */
const PACK_SRC = {
  cobblemon: "Cobblemon", mega: "Mega Showdown", zamega: "Z-A Megas",
  jo: "JoStar 挑战系列", jo2: "JoStar 大集合", legendmon: "传说遗迹",
};
const POOL_DIRS = [];
for (const [pack, src] of Object.entries(PACK_SRC)) {
  const data = path.join(CACHE, pack, "data");
  if (!fs.existsSync(data)) continue;
  for (const ns of fs.readdirSync(data)) {
    const dir = path.join(data, ns, "spawn_pool_world");
    if (fs.existsSync(dir)) POOL_DIRS.push({ src, dir });
  }
}
/**
 * 整合包里没有的联动模组：其群系 / 维度不存在，对应生成条目不会生效，一律跳过。
 * 判断依据：JoStar「补充汉化」资源包为本整合包的全部模组提供中文（120 个命名空间），
 * 其中有 biomesoplenty / terralith / cobblesafari / legendarymonuments 等，但没有 aether、the_bumblezone、cobblemon-additions。
 */
const ABSENT_NS = new Set(["aether", "the_bumblezone", "bumblezone"]);
const ABSENT_MODS = new Set(["aether", "the_bumblezone", "cobblemon-additions"]);
const FOSSIL_DIRS = [
  { src: "Cobblemon", dir: path.join(CACHE, "cobblemon/data/cobblemon/fossils") },
  { src: "JoStar 大集合", dir: path.join(CACHE, "jo2/data/cobblemon/fossils") },
];
const PRESET_DIR = path.join(CACHE, "cobblemon/data/cobblemon/spawn_detail_presets");
const TAG_DIR = path.join(CACHE, "cobblemon/data/cobblemon/tags/worldgen/biome");

/* ---------- 词表 ---------- */
/** 需要「特殊地点」的 preset（其余 natural/water/treetop 之类算普通刷新） */
const SPECIAL_PRESET = new Set([
  "mansion", "mansion_bedrooms", "mansion_dining", "trail_ruins", "ancient_city", "jungle_pyramid",
  "desert_pyramid", "derelict", "village", "urban", "cobblesafari", "stronghold", "underground",
  "ruined_portal", "nether_fossil", "underwater", "webs", "legendary", "lava",
]);

const PRESET_ZH = {
  natural: "地表", mansion: "林地府邸", mansion_bedrooms: "林地府邸（卧室）", mansion_dining: "林地府邸（餐厅）",
  trail_ruins: "古迹废墟", ancient_city: "远古城市", jungle_pyramid: "丛林神庙",
  desert_pyramid: "沙漠神殿", derelict: "废弃沉船", village: "村庄", urban: "城镇",
  cobblesafari: "狩猎地带", stronghold: "要塞", underground: "地下", ruined_portal: "废弃传送门",
  nether_fossil: "下界化石堆", underwater: "水下", webs: "蛛网洞穴", legendary: "传说遗迹",
  lava: "熔岩区域", foliage: "树叶间", treetop: "树冠", water: "水中", wild: "荒野",
};

const STRUCT_ZH = {
  "#cobblemon:spawns/is_civilization": "人类聚落附近",
  "#minecraft:village": "村庄",
  "#cobblemon:spawns/is_witch_structure": "女巫小屋",
  "#cobblemon:spawns/is_graveyard": "墓地",
  "#cobblemon:spawns/is_ruins": "遗迹",
  "#cobblemon:spawns/is_dungeon": "地牢",
  "#cobblemon:spawns/is_igloo": "雪屋",
  "#cobblemon:spawns/is_illager_outpost": "掠夺者前哨站",
  "#cobblemon:spawns/is_illager_structure": "灾厄村民建筑",
  "#cobblemon:spawns/is_jungle_monument": "丛林神庙",
  "#cobblemon:spawns/is_ocean_monument": "海底神殿",
  "#cobblemon:spawns/is_ocean_ruins": "海底废墟",
  "#cobblemon:spawns/is_desert_monument": "沙漠神殿",
  "#cobblemon:spawns/is_end_structure": "末地结构",
  "#cobblemon:spawns/is_nether_structure": "下界结构",
  "#cobblemon:spawns/is_shipwreck": "沉船",
  "#cobblemon:spawns/is_shipwreck_cove": "沉船湾",
  "#cobblemon:shipwreck_cove": "沉船湾",
  "cobblemon:shipwreck_coves/submerged_shipwreck_cove": "水下沉船湾",
  "cobblemon:shipwreck_coves/lush_shipwreck_cove": "繁茂沉船湾",
  "cobblemon:ruins/luna_henge_ruins": "月之环遗迹",
  "cobblemon:ruins/sol_henge_ruins": "日之环遗迹",
  "cobblemon:ruins/stonjourner_henge_ruins": "石之环遗迹",
  "#cobblemon:ruins/arch": "石拱遗迹",
  "minecraft:mansion": "林地府邸",
  "minecraft:desert_well": "沙漠水井",
  "minecraft:fortress": "下界要塞",
  "minecraft:trial_chambers": "试炼密室",
  "mega_showdown:mega_site": "超级进化遗迹",
  "mega_showdown:megaroid": "陨石遗迹",
  "mega_showdown:wishing_weald": "祈愿林",
  "#aether:dungeons": "天境地牢",
  "#betterdeserttemples:better_desert_temples": "沙漠神殿（扩展）",
  "#betterjungletemples:better_jungle_temples": "丛林神庙（扩展）",
  "genomons:dyna_tree_hill": "极巨树丘",
  "hiddenmons:areazero_cave": "零号区洞窟",
  "hiddenmons:ultraforest": "究极森林",
};

/** 自定义维度 / 群系命名空间 → 中文地图名 */
const DIM_ZH = {
  legendarymonuments: "传说遗迹维度",
  aether: "天境维度",
  the_bumblezone: "蜂巢维度",
  bumblezone: "蜂巢维度",
  hiddenmons: "隐藏宝可梦维度",
  genomons: "Genomons 维度",
  cobblesafari: "狩猎地带",
};

/** 特定维度内的群系 → 更精确的名字 */
const BIOME_ZH = {
  "legendarymonuments:distortion_world_biome": "扭曲世界",
  "legendarymonuments:hall_of_origin_world_biome": "起源大厅",
  "legendarymonuments:reawakening_sanctum_biome": "复苏圣所",
  "legendarymonuments:dyna_plains": "极巨平原",
  "legendarymonuments:plains_of_death": "死亡平原",
  "aether:skyroot_forest": "天根森林",
  "aether:skyroot_woodland": "天根林地",
  "cobblesafari:domedimension": "狩猎地带 · 穹顶",
  "cobblesafari:unionroom": "狩猎地带 · 联盟房间",
  "cobblesafari:dungeon_biome": "狩猎地带 · 地下城",
  "cobblesafari:dungeon_underground_biome": "狩猎地带 · 地下城（地底）",
  "cobblesafari:dungeon_paris_biome": "狩猎地带 · 地下城（巴黎）",
  "cobblesafari:dungeon_jump_biome": "狩猎地带 · 地下城（跳跃）",
  "cobblesafari:dungeon_distortion_biome": "狩猎地带 · 地下城（扭曲）",
};
// 狩猎地带按属性划分区域：cobblesafari:<属性> → 「狩猎地带 · 虫区」
for (const t of JSON.parse(fs.readFileSync("src/data/types.json", "utf8"))) {
  BIOME_ZH[`cobblesafari:${String(t.key).toLowerCase()}`] = `狩猎地带 · ${t.zh}区`;
}


/** Cobblemon 群系标签 → 中文 */
const BIOME_TAG_ZH = {
  "#cobblemon:is_temperate": "温带",
  "#cobblemon:is_forest": "森林",
  "#cobblemon:is_plains": "平原",
  "#cobblemon:is_jungle": "丛林",
  "#cobblemon:is_tropical_island": "热带岛屿",
  "#cobblemon:is_freezing": "极寒地带",
  "#cobblemon:is_spooky": "阴森地带",
  "#cobblemon:is_floral": "花田",
  "#cobblemon:is_beach": "沙滩",
  "#cobblemon:is_ocean": "海洋",
  "#cobblemon:is_desert": "沙漠",
  "#cobblemon:is_savanna": "热带草原",
  "#cobblemon:is_taiga": "针叶林",
  "#cobblemon:is_swamp": "沼泽",
  "#cobblemon:is_mountain": "山地",
  "#cobblemon:is_hills": "丘陵",
  "#cobblemon:is_overworld": "主世界",
  "#cobblemon:is_nether": "下界",
  "#cobblemon:is_end": "末地",
  "#cobblemon:is_cave": "洞窟",
  "#cobblemon:is_lush": "繁茂地带",
  "#cobblemon:is_dripstone": "溶洞",
  "#cobblemon:is_deep_dark": "深暗之域",
  "#cobblemon:is_cherry_blossom": "樱花树林",
  "#cobblemon:is_badlands": "恶地",
  "#cobblemon:is_mushroom": "蘑菇岛",
  "#cobblemon:is_river": "河流",
  "#cobblemon:is_snowy": "雪地",
  "#cobblemon:is_glacial": "冰川",
  "#cobblemon:is_frozen_ocean": "冻洋",
  "#cobblemon:is_arid": "干旱地带",
  "#cobblemon:is_highlands": "高地",
  "#cobblemon:is_volcanic": "火山地带",
  "#cobblemon:is_sky": "天空",
  "#cobblemon:is_urban": "城镇",
  "#minecraft:is_forest": "森林（原版标签）",
  "#minecraft:is_jungle": "丛林（原版标签）",
  "#minecraft:is_ocean": "海洋（原版标签）",
  "#minecraft:is_nether": "下界（原版标签）",
  "#minecraft:is_end": "末地（原版标签）",
  "#minecraft:is_mountain": "山地（原版标签）",
};

/** 原版群系 → 中文 */
const VANILLA_BIOME_ZH = {
  plains: "平原", sunflower_plains: "向日葵平原", forest: "森林", flower_forest: "繁花森林",
  birch_forest: "白桦森林", old_growth_birch_forest: "原始白桦森林", dark_forest: "黑森林",
  cherry_grove: "樱花树林", jungle: "丛林", sparse_jungle: "稀疏丛林", bamboo_jungle: "竹林",
  swamp: "沼泽", mangrove_swamp: "红树林沼泽", desert: "沙漠", savanna: "热带草原",
  savanna_plateau: "热带草原高地", windswept_savanna: "风袭热带草原", taiga: "针叶林",
  snowy_taiga: "积雪针叶林", old_growth_pine_taiga: "原始松林", old_growth_spruce_taiga: "原始云杉林",
  snowy_plains: "雪原", ice_spikes: "冰刺之地", snowy_beach: "积雪沙滩", beach: "沙滩",
  stony_shore: "石岸", mushroom_fields: "蘑菇岛", meadow: "草甸", grove: "雪林",
  snowy_slopes: "雪坡", jagged_peaks: "尖峭山峰", frozen_peaks: "冰封山峰", stony_peaks: "裸岩山峰",
  windswept_hills: "风袭丘陵", windswept_gravelly_hills: "风袭沙砾丘陵", windswept_forest: "风袭森林",
  badlands: "恶地", eroded_badlands: "被风蚀的恶地", wooded_badlands: "疏林恶地",
  warm_ocean: "暖水海洋", lukewarm_ocean: "温水海洋", deep_lukewarm_ocean: "深层温水海洋",
  cold_ocean: "冷水海洋", deep_cold_ocean: "深层冷水海洋", frozen_ocean: "冻洋",
  deep_frozen_ocean: "深层冻洋", deep_ocean: "深海", river: "河流", frozen_river: "冻河",
  lush_caves: "繁茂洞穴", dripstone_caves: "溶洞", deep_dark: "深暗之域",
  nether_wastes: "下界荒地", soul_sand_valley: "灵魂沙峡谷", crimson_forest: "绯红森林",
  warped_forest: "诡异森林", basalt_deltas: "玄武岩三角洲",
  the_end: "末地", end_barrens: "末地荒地", end_highlands: "末地高地",
  end_midlands: "末地内陆", small_end_islands: "末地小岛", the_void: "虚空",
};

const BUCKET_ZH = { common: "常见", uncommon: "少见", rare: "稀有", "ultra-rare": "极稀有" };

const ASPECT_ZH = {
  male: "雄性", female: "雌性", shiny: "闪光",
  alolan: "阿罗拉形态", galarian: "伽勒尔形态", hisuian: "洗翠形态", paldean: "帕底亚形态",
  valencian: "巴伦西亚形态", paldean_blaze: "帕底亚·火", paldean_combat: "帕底亚·战斗",
  attack: "攻击形态", defense: "防御形态", speed: "速度形态", normal: "普通形态",
  heat: "加热", wash: "清洗", frost: "结冰", fan: "旋转", mow: "切割",
  zen: "达摩形态", standard: "普通形态", school: "群聚形态",
  gmax: "超极巨化", mega: "超级进化", mega_x: "超级进化 X", mega_y: "超级进化 Y",
  hisui: "洗翠形态", bloodmoon: "血月形态", terastal: "太晶形态", stellar: "星晶形态",
};

const POSITION_ZH = {
  grounded: "陆地",
  surface: "水面",
  submerged: "水下",
  seafloor: "海底",
  fishing: "垂钓",
};

const TIME_ZH = { day: "白天", night: "夜晚", dusk: "黄昏", dawn: "黎明", morning: "清晨", noon: "正午" };

const BLOCK_TAG_ZH = {
  "#cobblemon:mansion_blocks": "林地府邸方块",
  "#cobblemon:ancient_city_blocks": "远古城市方块",
  "#cobblemon:trees": "树木",
  "#cobblemon:natural": "自然方块",
  "#minecraft:leaves": "树叶",
  "#c:leaves": "树叶",
  "#cobblemon:cobblemon_blocks": "方可梦方块",
};

/** 传说遗迹结构文件名 → 中文（只翻译已知的宝可梦地标） */
const STRUCTURE_FILE_ZH = {
  "spear_pillar/211.nbt": "枪之柱",
  "spear_pillar/211": "枪之柱",
  "dragonspiraltower.nbt": "龙螺旋塔",
  dragonspiraltower: "龙螺旋塔",
  "burned_tower.nbt": "烧焦塔",
  burned_tower: "烧焦塔",
  "kyuremcave.nbt": "酋雷姆洞窟",
  "heatran_cave.nbt": "席多蓝恩洞窟",
  "hoopa_pyramid.nbt": "胡帕金字塔",
  "final_island/main.nbt": "终焉之岛",
  "traditional_village/ecruteak/bell_tower_top.nbt": "圆朱市·铃铛塔顶",
  "throneroom_of_knightly_heroes/throneroom.nbt": "英雄王座",
  "giratina_island/main/222.nbt": "骑拉帝纳岛",
};

const LURE_ROD_ZH = { "cobblemon:love_rod": "恋爱钓竿", "cobblemon:master_rod": "大师钓竿" };
const BAIT_ZH = { "cobblemon:love_sweet": "恋爱糖" };

/* ---------- 工具 ---------- */
const COBBLEMON_META = JSON.parse(fs.readFileSync("src/data/cobblemon.json", "utf8"));
const SPECIES_TO_DEX = new Map();
for (const [dex, entry] of Object.entries(COBBLEMON_META)) {
  if (entry?.species) SPECIES_TO_DEX.set(entry.species.toLowerCase(), Number(dex));
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/**
 * 全部中文语言条目（物品 / 方块 / 群系名）：各模组包自带的 zh_cn + JoStar「补充汉化」资源包
 * （.cache/zhpack 由该 zip 里的 assets/<ns>/lang/zh_cn.json 解出）。首次调用时加载。
 */
let LANG_ALL = null;
function langZh(key) {
  if (!LANG_ALL) {
    LANG_ALL = {};
    const roots = [path.join(CACHE, "zhpack"), ...["cobblemon", "mega", "zamega", "jo", "jo2", "legendmon"].map((p) => path.join(CACHE, p))];
    for (const root of roots) {
      const assets = path.join(root, "assets");
      if (!fs.existsSync(assets)) continue;
      for (const ns of fs.readdirSync(assets)) {
        const j = readJsonSafe(path.join(assets, ns, "lang", "zh_cn.json"));
        if (j) for (const [k, v] of Object.entries(j)) if (!(k in LANG_ALL) && /^(item|block|biome|structure)\./.test(k)) LANG_ALL[k] = String(v).replace(/§./g, "");
      }
    }
  }
  return LANG_ALL[key] || null;
}

function slugToDex(slug) {
  return SPECIES_TO_DEX.get(String(slug || "").toLowerCase()) ?? null;
}

function prettify(id) {
  const s = String(id).replace(/^#/, "").split(":").pop() || String(id);
  return s.replace(/[_/]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function tagLabel(tag) {
  const base = BIOME_TAG_ZH[tag] || BIOME_ZH[tag];
  const values = TAG_CACHE.get(String(tag).replace(/^#/, "")) || [];
  const kids = [...new Set(values
    .filter((v) => typeof v === "string" && v.startsWith("#"))
    .map((v) => BIOME_TAG_ZH[v])
    .filter(Boolean))];
  if (!base) return kids.slice(0, 3).join(" / ");
  return kids.length ? `${base}（${kids.slice(0, 3).join("、")}）` : base;
}

function biomeName(raw) {
  const id = String(raw);
  if (BIOME_TAG_ZH[id]) return BIOME_TAG_ZH[id];
  if (BIOME_ZH[id]) return BIOME_ZH[id];
  const fromLang = !id.startsWith("#") && id.includes(":") ? langZh(`biome.${id.replace(":", ".")}`) : null;
  if (fromLang) return fromLang;
  const ns = id.replace(/^#/, "").split(":")[0];
  if (ns === "minecraft") {
    const key = id.split(":")[1];
    return VANILLA_BIOME_ZH[key] || prettify(key);
  }
  if (DIM_ZH[ns]) {
    const key = id.split(":")[1];
    return key ? `${DIM_ZH[ns]}·${prettify(key)}` : DIM_ZH[ns];
  }
  return prettify(id);
}

/** 递归展开 cobblemon 群系标签，收集原版群系名 */
const TAG_CACHE = new Map();
function loadTags() {
  if (!fs.existsSync(TAG_DIR)) return;
  for (const f of fs.readdirSync(TAG_DIR).filter((x) => x.endsWith(".json"))) {
    const j = readJsonSafe(path.join(TAG_DIR, f));
    if (!j?.values) continue;
    TAG_CACHE.set("cobblemon:" + f.replace(/\.json$/, ""), j.values.map((v) => (typeof v === "string" ? v : v?.id)).filter(Boolean));
  }
}
loadTags();

function expandTag(tag, depth = 0, acc = new Set()) {
  if (depth > 5) return acc;
  const values = TAG_CACHE.get(tag.replace(/^#/, ""));
  if (!values) return acc;
  for (const v of values) {
    if (typeof v !== "string") continue;
    if (v.startsWith("#")) {
      // 原版标签没有本地文件，停止展开
      expandTag(v, depth + 1, acc);
    } else if (v.startsWith("minecraft:")) {
      acc.add(v.split(":")[1]);
    }
  }
  return acc;
}

/* ---------- 条件 → facts ---------- */
function lightFact(c) {
  const parts = [];
  if (typeof c.minSkyLight === "number" && typeof c.maxSkyLight === "number") {
    parts.push(c.minSkyLight === c.maxSkyLight ? `天空光照 ${c.minSkyLight}` : `天空光照 ${c.minSkyLight}–${c.maxSkyLight}`);
  } else if (typeof c.minSkyLight === "number") {
    parts.push(`天空光照 ≥ ${c.minSkyLight}`);
  } else if (typeof c.maxSkyLight === "number") {
    parts.push(`天空光照 ≤ ${c.maxSkyLight}`);
  }
  if (typeof c.minLight === "number") parts.push(`方块光照 ≥ ${c.minLight}`);
  if (typeof c.maxLight === "number") parts.push(`方块光照 ≤ ${c.maxLight}`);
  if (c.canSeeSky === true) parts.push("露天");
  if (c.canSeeSky === false) parts.push("非露天");
  return parts.join(" · ");
}

function heightFact(c) {
  if (typeof c.minY === "number" && typeof c.maxY === "number") return `Y ${c.minY} – ${c.maxY}`;
  if (typeof c.minY === "number") return `Y ≥ ${c.minY}`;
  if (typeof c.maxY === "number") return `Y ≤ ${c.maxY}`;
  return "";
}

function weatherFact(c) {
  const parts = [];
  if (c.isRaining === true) parts.push("下雨");
  if (c.isThundering === true) parts.push("雷雨");
  if (c.isRaining === false) parts.push("不下雨");
  return parts.join(" · ");
}

function blockNames(list) {
  return [...new Set((list || []).map((b) => BLOCK_TAG_ZH[b] || prettify(b)))].slice(0, 3).join(" / ");
}

/** 原版结构的官方中文名 */
const VANILLA_STRUCT_ZH = {
  woodland_mansion: "林地府邸", mansion: "林地府邸", trail_ruins: "古迹废墟", ancient_city: "远古城市",
  ruined_portal: "废弃传送门", nether_fossil: "下界化石", desert_pyramid: "沙漠神殿", jungle_pyramid: "丛林神庙",
  stronghold: "要塞", monument: "海底神殿", ocean_monument: "海底神殿", ocean_ruin_warm: "温水海底废墟",
  ocean_ruin_cold: "冷水海底废墟", shipwreck: "沉船", end_city: "末地城", fortress: "下界要塞",
  bastion_remnant: "堡垒遗迹", pillager_outpost: "掠夺者前哨站", igloo: "雪屋", swamp_hut: "女巫小屋",
  trial_chambers: "试炼密室", mineshaft: "废弃矿井", village_plains: "平原村庄", village_desert: "沙漠村庄",
  village_savanna: "热带草原村庄", village_snowy: "雪原村庄", village_taiga: "针叶林村庄",
  ruin: "遗迹", ruins: "遗迹", village_small: "小型村庄", village_mid: "中型村庄",
};
function structureName(id) {
  const raw = String(id);
  if (STRUCT_ZH[raw]) return STRUCT_ZH[raw];
  const [ns, p] = raw.replace(/^#/, "").includes(":") ? raw.replace(/^#/, "").split(":") : ["minecraft", raw];
  return langZh(`structure.${ns}.${p.replace(/\//g, ".")}`) || langZh(`structure.${ns}.${p.split("/").pop()}`)
    || (ns === "minecraft" ? VANILLA_STRUCT_ZH[p] : null) || VANILLA_STRUCT_ZH[p.split("/").pop()] || prettify(raw);
}
function structureNames(list) {
  return [...new Set((list || []).map(structureName))].slice(0, 3).join(" / ");
}

/** preset 自带的额外条件（spawn_detail_presets/*.json） */
function presetFacts(name) {
  const j = readJsonSafe(path.join(PRESET_DIR, `${name}.json`));
  const out = [];
  if (!j) return out;
  const c = j.condition || {};
  const h = heightFact(c);
  if (h) out.push(["高度", h]);
  const l = lightFact(c);
  if (l) out.push(["光照", l]);
  if (c.structures?.length) out.push(["结构", structureNames(c.structures)]);
  if (c.neededNearbyBlocks?.length) out.push(["附近方块", blockNames(c.neededNearbyBlocks)]);
  if (c.neededBaseBlocks?.length) out.push(["脚下方块", blockNames(c.neededBaseBlocks)]);
  return out;
}

/** 从 spawn 记录提炼条目；返回 { dex, entries, ordinary } */
function entriesFromSpawn(s) {
  const pokemon = String(s.pokemon || "").trim();
  const [slug, ...aspects] = pokemon.split(/\s+/);
  const dex = slugToDex(slug);
  if (!dex) return null;

  const c = s.condition || {};
  const anti = s.anticondition || {};
  const biomes = c.biomes || [];
  const structures = c.structures || [];
  const presets = s.presets || [];
  const specialPresets = presets.filter((p) => SPECIAL_PRESET.has(p));
  const position = s.spawnablePositionType ?? s.context ?? "grounded";

  // 维度（自定义命名空间）与群系
  const dims = new Set();
  const biomeLabels = [];
  const vanillaBiomes = new Set();
  for (const b of biomes) {
    const raw = String(b);
    if (BIOME_ZH[raw]) {
      const ns = raw.split(":")[0];
      dims.add(DIM_ZH[ns] || BIOME_ZH[raw]);
      biomeLabels.push(BIOME_ZH[raw]);
      continue;
    }
    if (raw.startsWith("#")) {
      const label = tagLabel(raw);
      if (label) biomeLabels.push(label);
      continue;
    }
    const ns = raw.split(":")[0];
    if (DIM_ZH[ns] && !raw.startsWith("bca:")) {
      dims.add(BIOME_ZH[raw] || DIM_ZH[ns]);
      continue;
    }
    if (ns === "minecraft") {
      const v = raw.split(":")[1];
      vanillaBiomes.add(v);
      biomeLabels.push(VANILLA_BIOME_ZH[v] || prettify(v));
      continue;
    }
    biomeLabels.push(biomeName(raw));
  }

  const ordinary = !dims.size && !structures.length && !specialPresets.length && position !== "fishing";
  const base = [];
  const bucket = BUCKET_ZH[s.bucket] || s.bucket || "";
  const level = s.level ? `Lv ${s.level}` : "";

  const commonFacts = () => {
    const f = [];
    const pos = PRESET_ZH[position] || POSITION_ZH[position] || "";
    const posParts = [POSITION_ZH[position], ...presets.filter((p) => p !== "natural").map((p) => PRESET_ZH[p] || prettify(p))]
      .filter(Boolean);
    f.push(["位置", [...new Set(posParts)].join(" · ") || pos || "地表"]);
    const bl = [...new Set(biomeLabels)].slice(0, 4);
    if (bl.length) f.push(["群系", bl.join(" · ")]);
    const t = TIME_ZH[c.timeRange];
    if (t) f.push(["时间", t]);
    const l = lightFact(c);
    if (l) f.push(["光照", l]);
    const h = heightFact(c);
    if (h) f.push(["高度", h]);
    const w = weatherFact(c);
    if (w) f.push(["天气", w]);
    if (typeof c.moonPhase === "string" || typeof c.moonPhase === "number") f.push(["月相", String(c.moonPhase)]);
    if (c.neededNearbyBlocks?.length) f.push(["附近方块", blockNames(c.neededNearbyBlocks)]);
    if (c.neededBaseBlocks?.length) f.push(["脚下方块", blockNames(c.neededBaseBlocks)]);
    if (c.isPokeSnack === true) f.push(["诱饵", "宝可梦点心"]);
    if (typeof c.minLureLevel === "number") f.push(["诱饵等级", `≥ ${c.minLureLevel}${typeof c.maxLureLevel === "number" ? `（≤ ${c.maxLureLevel}）` : ""}`]);
    if (c.rodType) f.push(["钓竿", LURE_ROD_ZH[c.rodType] || prettify(c.rodType)]);
    if (c.bait) f.push(["鱼饵", BAIT_ZH[c.bait] || prettify(c.bait)]);
    if (c.isSlimeChunk === true) f.push(["区块", "史莱姆区块"]);
    if (anti.biomes?.length) f.push(["避开群系", [...new Set(anti.biomes.map(biomeName))].slice(0, 3).join(" · ")]);
    if (bucket) f.push(["稀有度", bucket]);
    if (typeof s.weight === "number") f.push(["权重", `${s.weight}（同区域相对值，越大越常见）`]);
    if (level) f.push(["等级", level]);
    if (aspects.length) f.push(["形态", aspects.map((a) => ASPECT_ZH[a] || prettify(a)).join(" / ")]);
    return f;
  };

  // 维度
  for (const dim of dims) {
    const facts = [["地图", dim], ...commonFacts()];
    base.push({ kind: "map", title: dim, facts });
  }
  // 结构
  if (structures.length) {
    const facts = [["结构", structureNames(structures)], ...commonFacts()];
    base.push({ kind: "structure", title: structureNames(structures), facts });
  }
  // 特殊地点（preset）
  if (specialPresets.length && !structures.length) {
    const names = [...new Set(specialPresets.map((p) => PRESET_ZH[p] || prettify(p)))];
    const pf = specialPresets.flatMap((p) => presetFacts(p));
    const facts = [...commonFacts(), ...pf];
    base.push({ kind: "structure", title: names.slice(0, 3).join(" / "), facts });
  }
  // 垂钓
  if (position === "fishing") {
    base.push({ kind: "item", title: "钓竿垂钓", facts: [["方式", "手持钓竿在水中垂钓"], ...commonFacts()] });
  }

  return { dex, entries: base, ordinary };
}

/* ---------- 汇总方可梦 ---------- */
const cobble = new Map(); // dex -> Map(key -> entry)

function pushCobble(dex, entry, source) {
  const key = `${entry.kind}|${entry.title}`;
  if (!cobble.has(dex)) cobble.set(dex, new Map());
  const m = cobble.get(dex);
  if (!m.has(key)) {
    m.set(key, { kind: entry.kind, title: entry.title, facts: [], source });
  }
  const target = m.get(key);
  for (const [k, v] of entry.facts || []) {
    if (!v) continue;
    if (!target.facts.some((f) => f.k === k && f.v === v)) target.facts.push({ k, v });
  }
}

const rawSpawns = [];
const ordinaryDex = new Set();
const skipped = { absentMod: 0, absentBiome: 0 };
/**
 * 去掉条件里整合包不存在的群系 / 维度；去掉后没有任何可用群系或维度的条目返回 null（不会生效）
 */
const isAbsent = (x) => ABSENT_NS.has(String(x).replace(/^#/, "").split(":")[0]);
const stripAbsent = (s) => {
  const c = s.condition || {};
  const b = c.biomes || [];
  const d = c.dimensions || [];
  const nb = b.filter((x) => !isAbsent(x));
  const nd = d.filter((x) => !isAbsent(x));
  if ((b.length && !nb.length) || (d.length && !nd.length)) return null;
  if (nb.length === b.length && nd.length === d.length) return s;
  return { ...s, condition: { ...c, ...(b.length ? { biomes: nb } : {}), ...(d.length ? { dimensions: nd } : {}) } };
};
for (const { src, dir } of POOL_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir, { recursive: true }).map(String).filter((x) => x.endsWith(".json"));
  for (const f of files) {
    const j = readJsonSafe(path.join(dir, f));
    if (!j || j.enabled === false) continue;
    if ((j.neededInstalledMods || []).some((m) => ABSENT_MODS.has(m))) { skipped.absentMod++; continue; }
    const arr = Array.isArray(j) ? j : j?.spawns || [];
    for (const raw of arr) {
      const s = stripAbsent(raw);
      if (!s) { skipped.absentBiome++; continue; }
      const hit = entriesFromSpawn(s);
      if (!hit) continue;
      rawSpawns.push({ s, src });
      if (hit.ordinary) ordinaryDex.add(hit.dex);
    }
  }
}

for (const { s, src } of rawSpawns) {
  const hit = entriesFromSpawn(s);
  if (!hit) continue;
  for (const e of hit.entries) pushCobble(hit.dex, e, src);
}

/* ---------- 化石 ---------- */
const ITEM_ZH = {};
for (const f of [
  `${CACHE}/cobblemon/assets/cobblemon/lang/zh_cn.json`,
  `${CACHE}/jo2/assets/cobblemon/lang/zh_cn.json`,
  `${CACHE}/mega/assets/mega_showdown/lang/zh_cn.json`,
  `${CACHE}/jo/assets/mega_showdown/lang/zh_cn.json`,
  `${CACHE}/legendmon/assets/legendarymonuments/lang/zh_cn.json`,
]) {
  const j = readJsonSafe(f);
  if (j) for (const [k, v] of Object.entries(j)) if (!(k in ITEM_ZH) && /^item\./.test(k)) ITEM_ZH[k] = v;
}

for (const { src: fossilSrc, dir } of FOSSIL_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const j = readJsonSafe(path.join(dir, f));
    if (!j?.result) continue;
    const dex = slugToDex(j.result);
    if (!dex) continue;
    const items = (j.fossils || []).map((id) => {
      const raw = String(id);
      const [ns, p] = raw.includes(":") ? raw.split(":") : ["cobblemon", raw];
      return ITEM_ZH[`item.${ns}.${p}`] || prettify(p);
    });
    pushCobble(dex, {
      kind: "fossil",
      title: "化石复活",
      facts: [
        ["道具", items.join(" / ") || "化石"],
        ["机器", "化石分析仪（Fossil Analyzer）"],
        ["结果", "从化石复活出这一只"],
      ],
    }, fossilSrc);
  }
}

/* ---------- 传说遗迹召唤 ---------- */
const LANG_ZH = readJsonSafe(path.join(CACHE, "legendmon/assets/legendarymonuments/lang/zh_cn.json")) || {};
const ADV_DIR = path.join(CACHE, "legendmon/data/legendarymonuments/advancement");
const STRUCT_NBT_DIR = path.join(CACHE, "legendmon/data/legendarymonuments/structure");

/* ---------- 道具配方 / 宝箱出处（legendarymonuments + Mega Showdown） ---------- */
const VANILLA_ITEM_ZH = {
  experience_bottle: "附魔之瓶",
  emerald: "绿宝石",
  golden_apple: "金苹果",
  iron_ingot: "铁锭",
  gold_ingot: "金锭",
  copper_ingot: "铜锭",
  netherite_ingot: "下界合金锭",
  netherite_scrap: "下界合金碎片",
  redstone: "红石",
  ender_pearl: "末影珍珠",
  blaze_rod: "烈焰棒",
  blaze_powder: "烈焰粉",
  fire_charge: "火焰弹",
  flint_and_steel: "打火石",
  tinted_glass: "遮光玻璃",
  glass: "玻璃",
  iron_sword: "铁剑",
  iron_block: "铁块",
  gold_block: "金块",
  diamond: "钻石",
  diamond_block: "钻石块",
  amethyst_shard: "紫水晶碎片",
  obsidian: "黑曜石",
  crying_obsidian: "哭泣的黑曜石",
  orange_wool: "橙色羊毛",
  light_blue_wool: "浅蓝色羊毛",
  red_wool: "红色羊毛",
  blue_wool: "蓝色羊毛",
  white_wool: "白色羊毛",
  black_wool: "黑色羊毛",
  sun_stone: "日之石",
  moon_stone: "月之石",
  dusk_stone: "暗之石",
  dawn_stone: "觉醒之石",
  ice_stone: "冰之石",
  shiny_stone: "光之石",
  fire_stone: "火之石",
  thunder_stone: "雷之石",
  water_stone: "水之石",
  leaf_stone: "叶之石",
  peat_block: "泥炭块",
  paper: "纸",
  glass_bottle: "玻璃瓶",
  end_crystal: "末影水晶",
  nether_star: "下界之星",
  totem_of_undying: "不死图腾",
};

const itemLabel = (id) => {
  const raw = String(id);
  const bare = raw.includes(":") ? raw.split(":")[1] : raw;
  return (
    ITEM_ZH["item." + raw.replace(":", ".")] ||
    LANG_ZH["block." + raw.replace(":", ".")] ||
    VANILLA_ITEM_ZH[bare] ||
    prettify(bare)
  );
};

const RECIPE_BY_RESULT = new Map();
for (const dir of [
  path.join(CACHE, "legendmon/data/legendarymonuments/recipe"),
  path.join(CACHE, "jo2/data/mega_showdown/recipe"),
  path.join(CACHE, "mega/data/mega_showdown/recipe"),
]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const j = readJsonSafe(path.join(dir, f));
    const rid = j?.result?.id;
    if (!rid || RECIPE_BY_RESULT.has(rid)) continue;
    if (j.type === "minecraft:crafting_shaped" && Array.isArray(j.pattern)) {
      const count = new Map();
      for (const ch of j.pattern.join("").replace(/ /g, "")) {
        const it = j.key?.[ch]?.item;
        if (!it) continue;
        count.set(it, (count.get(it) || 0) + 1);
      }
      if (!count.size) continue;
      RECIPE_BY_RESULT.set(
        rid,
        "工作台 " + j.pattern.map((r) => r.replace(/ /g, "") || "·").join(" / ") + "：" + [...count].map(([i, n]) => itemLabel(i) + "×" + n).join("、"),
      );
    } else if (Array.isArray(j.ingredients)) {
      const ids = j.ingredients.map((x) => x.item).filter(Boolean);
      if (!ids.length) continue;
      RECIPE_BY_RESULT.set(rid, "无序合成：" + ids.map(itemLabel).join(" + "));
    }
  }
}

const CHEST_ZH = {
  bell_tower_chest: "铃铛塔",
  calyrex_chest: "丰饶之王神殿",
  dragoeleki_chest: "龙电神殿",
  heatran_cave_chest: "火山洞窟",
  liberty_island_chest: "自由岛",
  lugia_temple_chest: "洛奇亚神殿",
  regice_chest: "雷吉艾斯神殿",
  regigigas_chest: "雷吉奇卡斯神殿",
  regirock_chest: "雷吉洛克神殿",
  registeel_chest: "雷吉斯奇鲁神殿",
  swsh_temple_sword: "剑之神殿",
  swsh_temple_shield: "盾之神殿",
  turnback_cave_chest: "归还洞窟",
  turnback_cave_vault: "归还洞窟·密室",
};

const LOOT_BY_ITEM = new Map();
const CHEST_DIR = path.join(CACHE, "legendmon/data/legendarymonuments/loot_table/chests");
if (fs.existsSync(CHEST_DIR)) {
  for (const f of fs.readdirSync(CHEST_DIR).filter((x) => x.endsWith(".json"))) {
    const base = f.replace(/\.json$/, "");
    const label = CHEST_ZH[base] || prettify(base.replace(/_chest$/, ""));
    const txt = fs.readFileSync(path.join(CHEST_DIR, f), "utf8");
    for (const m of txt.matchAll(/"name":\s*"([a-z0-9_]+:[a-z0-9_\/\.]+)"/g)) {
      const set = LOOT_BY_ITEM.get(m[1]) || new Set();
      set.add(label);
      LOOT_BY_ITEM.set(m[1], set);
    }
  }
}


/** 扫描结构 NBT，找出哪个结构里放了 <species>_pedestal 方块 */
const pedestalStructure = new Map();
if (fs.existsSync(STRUCT_NBT_DIR)) {
  const files = fs.readdirSync(STRUCT_NBT_DIR, { recursive: true }).map(String).filter((f) => f.endsWith(".nbt"));
  const buffers = [];
  for (const f of files) {
    try {
      buffers.push([f.replace(/\\/g, "/"), zlib.gunzipSync(fs.readFileSync(path.join(STRUCT_NBT_DIR, f)))]);
    } catch {
      /* 跳过无法解压的 */
    }
  }
  for (const f of fs.existsSync(ADV_DIR) ? fs.readdirSync(ADV_DIR).filter((x) => x.endsWith(".json")) : []) {
    const j = readJsonSafe(path.join(ADV_DIR, f));
    const trig = Object.values(j?.criteria || {}).map((c) => c?.trigger).find(Boolean) || "";
    const m = /legendarymonuments:([a-z0-9_]+)_summoned/.exec(String(trig));
    if (!m) continue;
    const want = Buffer.from(`${m[1]}_pedestal`, "utf8");
    const hit = buffers.find(([, buf]) => buf.includes(want));
    if (hit) pedestalStructure.set(m[1], hit[0]);
  }
}

if (fs.existsSync(ADV_DIR)) {
  for (const f of fs.readdirSync(ADV_DIR).filter((x) => x.endsWith(".json"))) {
    const j = readJsonSafe(path.join(ADV_DIR, f));
    const trig = Object.values(j?.criteria || {}).map((c) => c?.trigger).find(Boolean) || "";
    const m = /legendarymonuments:([a-z0-9_]+)_summoned/.exec(String(trig));
    if (!m) continue;
    const dex = slugToDex(m[1]);
    if (!dex) continue;
    const icon = j?.display?.icon?.id || "";
    const iconKey = icon.replace(":", ".");
    const iconRecipe = RECIPE_BY_RESULT.get(icon);
    const iconLoot = LOOT_BY_ITEM.get(icon);
    const iconItemZh = icon ? ITEM_ZH[`item.${iconKey}`] || "" : "";
    const iconBlockZh = icon ? LANG_ZH[`block.${iconKey}`] || "" : "";
    const pedestalKey = `block.legendarymonuments.${m[1]}_pedestal`;
    const pedestalZh = LANG_ZH[pedestalKey] || "";
    const structFile = pedestalStructure.get(m[1]) || "";
    const structZh = STRUCTURE_FILE_ZH[structFile] || (structFile ? prettify(structFile.replace(/\.nbt$/, "")) : "");
    pushCobble(dex, {
      kind: "summon",
      title: "传说遗迹召唤",
      facts: [
        iconItemZh ? ["召唤道具", iconItemZh] : null,
        !iconItemZh && iconBlockZh && iconBlockZh !== (LANG_ZH[`block.legendarymonuments.${m[1]}_pedestal`] || "")
          ? ["召唤建筑", iconBlockZh]
          : null,
        pedestalZh ? ["专属基座", pedestalZh] : null,
        structZh ? ["所在结构", structZh] : null,
        iconRecipe ? ["合成配方", iconRecipe] : null,
        iconLoot?.size ? ["宝箱出处", [...iconLoot].slice(0, 4).join(" / ") + (iconLoot.size > 4 ? " 等 " + iconLoot.size + " 处" : "")] : null,
        ["条件", "在基座上使用道具召唤，不会随机刷新"],
      ].filter(Boolean),
    }, "传说遗迹");
  }
}

/* ---------- 物品 / 特性中文名 ---------- */

const itemZh = (id) => {
  const [ns, p] = String(id).includes(":") ? String(id).split(":") : ["minecraft", String(id)];
  return langZh(`item.${ns}.${p}`) || langZh(`block.${ns}.${p}`) || (ns === "minecraft" && VANILLA_ITEM_ZH[p]) || prettify(p);
};
const ABILITY_ZH = new Map();
for (const a of Object.values(readJsonSafe("src/data/ability-info.json") || {})) {
  ABILITY_ZH.set(String(a.key).replace(/[^a-z0-9]/gi, "").toLowerCase(), a.zh);
}
const abilityZh = (k) => ABILITY_ZH.get(String(k).replace(/[^a-z0-9]/gi, "").toLowerCase()) || prettify(k);
const FORM_ZH = {
  mega: "超级进化", mega_x: "超级进化 X", mega_y: "超级进化 Y", mega_z: "超级进化 Z",
  gmax: "超极巨化", primal: "原始回归", "low_key-form": "低调的样子", low_key: "低调的样子",
};
const TYPE_ZH = Object.fromEntries(JSON.parse(fs.readFileSync("src/data/types.json", "utf8")).map((t) => [String(t.key).toUpperCase(), t.zh]));

/* ---------- 首领战（cobblemonboss，JoStar 数据包）：不可捕捉，击败后掉落道具 ---------- */
const LOCATION_ZH = {
  LAND: "陆地", SKY: "空中", WATER_SURFACE: "水面", UNDERWATER: "水下",
  LAVA_SURFACE: "岩浆表面", CAVE: "洞穴", UNDERGROUND: "地下",
};
const bossSeen = new Map(); // `${dex}|${form}` → { shiny }
for (const pack of ["jo2", "jo"]) {
  const dir = path.join(CACHE, pack, "data/cobblemonboss/bosses");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const j = readJsonSafe(path.join(dir, f));
    if (!j?.species) continue;
    const dex = slugToDex(String(j.species).split(":").pop());
    if (!dex) continue;
    const form = String(j.form || "");
    const key = `${dex}|${form}`;
    const seen = bossSeen.get(key);
    if (seen) { if (j.shiny) seen.shiny = true; continue; } // 同一首领的闪光版 / 另一个包里的同名文件
    bossSeen.set(key, { shiny: !!j.shiny });
    const loot = new Map();
    for (const it of j.loot_table || []) loot.set(it, (loot.get(it) || 0) + 1);
    const title = `首领 · ${FORM_ZH[form] || (form ? prettify(form) : "普通")}`;
    pushCobble(dex, {
      kind: "boss",
      title,
      facts: [
        ["方式", "野外随机出现的首领战（不可捕捉，击败后获得掉落）"],
        ["出现位置", (j.spawn_locations?.allowed_types || []).map((t) => LOCATION_ZH[t] || t).join(" · ")],
        j.spawn_biomes?.length ? ["群系", j.spawn_biomes.map(biomeName).join(" · ")] : null,
        typeof j.spawn_weight === "number" ? ["出现权重", `${j.spawn_weight}（首领之间的相对值）`] : null,
        j.abilities?.length ? ["特性", j.abilities.map(abilityZh).join(" / ")] : null,
        j.held_items?.length ? ["持有物", j.held_items.map(itemZh).join(" / ")] : null,
        loot.size ? ["掉落", [...loot].map(([it, n]) => `${itemZh(it)}${n > 1 ? ` ×${n}` : ""}`).join("、")] : null,
      ].filter(Boolean),
    }, pack === "jo2" ? "JoStar 大集合" : "JoStar 挑战系列");
  }
}
// 有闪光版首领的补一条说明
for (const [key, v] of bossSeen) {
  if (!v.shiny) continue;
  const [dex, form] = key.split("|");
  const e = cobble.get(Number(dex))?.get(`boss|首领 · ${FORM_ZH[form] || (form ? prettify(form) : "普通")}`);
  if (e && !e.facts.some((x) => x.k === "闪光版")) e.facts.push({ k: "闪光版", v: "另有更稀有的闪光首领，额外掉落星尘等" });
}

/* ---------- 太晶 / 极巨 / 超级团体战（cobblemonraiddens，JoStar 数据包） ---------- */
const TIER_ZH = { TIER_ONE: "★1", TIER_TWO: "★2", TIER_THREE: "★3", TIER_FOUR: "★4", TIER_FIVE: "★5", TIER_SIX: "★6", TIER_SEVEN: "★7" };
const FEATURE_ZH = { DEFAULT: "太晶团体战", TERA: "太晶团体战", DYNAMAX: "极巨团体战", MEGA: "超级进化团体战" };
const denZh = (d) => {
  const n = String(d).split("/").pop();
  return n === "basic" ? "普通巢穴" : `专属巢穴（${prettify(n)}）`;
};
const raidBase = new Map(); // boss id → { tier, type }
for (const pack of ["jo2", "jo"]) {
  const dir = path.join(CACHE, pack, "data/cobblemonraiddens/raid/boss");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const id = f.replace(/\.json$/, "");
    const j = readJsonSafe(path.join(dir, f));
    if (!j?.pokemon?.species || raidBase.has(id)) continue;
    const [slug, ...aspects] = String(j.pokemon.species).split(/\s+/);
    const dex = slugToDex(slug.split(":").pop());
    raidBase.set(id, { tier: j.raid_tier, type: j.raid_type });
    if (!dex) continue;
    const feature = j.raid_feature || "DEFAULT";
    pushCobble(dex, {
      kind: "raid",
      title: `${FEATURE_ZH[feature] || "团体战"} ${TIER_ZH[j.raid_tier] || ""}`.trim(),
      facts: [
        ["方式", "在世界中的团体战巢穴发起挑战，击败后可尝试捕捉"],
        ["星级", TIER_ZH[j.raid_tier] || prettify(j.raid_tier || "")],
        j.raid_type ? ["太晶属性", TYPE_ZH[j.raid_type] || prettify(j.raid_type)] : null,
        aspects.length ? ["形态", aspects.map((a) => ASPECT_ZH[a] || prettify(a)).join(" / ")] : null,
        j.den?.length ? ["巢穴", [...new Set(j.den.map(denZh))].join(" / ")] : null,
      ].filter(Boolean),
    }, pack === "jo2" ? "JoStar 大集合" : "JoStar 挑战系列");
  }
}
for (const pack of ["jo2", "jo"]) {
  const dir = path.join(CACHE, pack, "data/cobblemonraiddens/raid/boss_additions");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const j = readJsonSafe(path.join(dir, f));
    const add = j?.additions || {};
    const feature = add.raid_feature;
    if (!feature || feature === "TERA" || feature === "DEFAULT") continue; // 太晶变体不改变物种，只记超级 / 极巨
    // custom_properties 是 { name, value } 对象（也兼容 "name=value" 字符串写法）
    const props = [...(add.boss?.custom_properties || []), ...(add.pokemon?.custom_properties || [])];
    const propVal = (want) => {
      for (const p of props) {
        if (p && typeof p === "object" && p.name === want) return String(p.value);
        const m = typeof p === "string" ? new RegExp(`${want}=(\\S+)`).exec(p) : null;
        if (m) return m[1];
      }
      return null;
    };
    const formProp = propVal("mega_evolution") || propVal("dynamax_form");
    for (const inc of j.include || []) {
      const id = String(inc).split(":").pop();
      const dex = slugToDex(id.replace(/_(galarian|alolan|hisuian|paldean)$/, ""));
      if (!dex) continue;
      const base = raidBase.get(id);
      const formName = feature === "DYNAMAX" ? (formProp === "gmax" || add.gigantamax ? "超极巨化" : "极巨化") : FORM_ZH[formProp] || "超级进化";
      pushCobble(dex, {
        kind: "raid",
        title: `${FEATURE_ZH[feature]} · ${formName}`,
        facts: [
          ["方式", "团体战巢穴里以该形态出现的首领，击败后可尝试捕捉"],
          ["形态", formName],
          ["星级", TIER_ZH[add.raid_tier] || (base ? TIER_ZH[base.tier] : "") || "沿用该物种的基础团体战星级"],
          add.den?.length ? ["巢穴", [...new Set(add.den.map(denZh))].join(" / ")] : null,
          add.is_catchable === false ? ["捕捉", "不可捕捉"] : null,
        ].filter(Boolean),
      }, pack === "jo2" ? "JoStar 大集合" : "JoStar 挑战系列");
    }
  }
}

/* ---------- 正作 ---------- */
const ENCOUNTERS = JSON.parse(fs.readFileSync("src/data/encounters.json", "utf8"));

/** 普通刷新方式（草丛/水面/钓竿/群战等），不算特殊 */
const ORDINARY = new Set([
  "陆地", "水面", "水面（主世界）", "水面（特殊）", "主世界", "主世界（特殊）", "深色草丛", "草丛（摇晃）",
  "红的花丛", "紫的花丛", "黄的花丛", "崎岖地形", "沙地", "空中（主世界）", "空中（特殊）",
  "四处游荡", "草丛游荡", "水面游荡", "群战", "厉害钓竿", "好钓竿", "旧钓竿", "厉害钓竿钓点",
  "冲浪钓点", "泡沫钓点", "海藻", "海底", "水下", "水面", "桥上（阴影）", "宝可梦聚集点",
]);

/** 方式 → 分类说明 */
const GAME_KIND = {
  "洞窟（尘土）": ["地点", "洞窟尘土（使用道具吹起尘土后出现）"],
  "洞窟": ["地点", "洞窟"],
  "游戏内赠送": ["赠送", "由 NPC 赠送"],
  "游戏内获得蛋": ["赠送", "由 NPC 赠送蛋"],
  "定点遭遇": ["定点", "剧情定点遭遇"],
  "仅有一只（剧情）": ["定点", "仅此一只的剧情遭遇"],
  "NPC 交换": ["交换", "与游戏内 NPC 交换"],
  "极巨团体战": ["团体战", "极巨团体战"],
  "极巨大冒险": ["团体战", "极巨大冒险"],
  "暗影宝可梦（抢夺）": ["暗影", "暗影宝可梦（抢夺）"],
  "暗影宝可梦再战": ["暗影", "暗影宝可梦再战"],
  岛屿扫描: ["扫描", "岛屿扫描"],
  隐藏洞穴: ["地点", "隐藏洞穴"],
  果树: ["地点", "果树"],
  蜂蜜树: ["地点", "蜂蜜树"],
  撞树: ["地点", "撞树"],
  "撞树（高处）": ["地点", "撞树（高处）"],
  "撞树（低处）": ["地点", "撞树（低处）"],
  宝可梦聚集点: ["地点", "宝可梦聚集点"],
  海藻: ["地点", "海藻"],
  碎岩: ["地点", "碎岩"],
  垃圾桶伏击: ["地点", "垃圾桶伏击"],
  灌木丛伏击: ["地点", "灌木丛伏击"],
  洞顶伏击: ["地点", "洞顶伏击"],
  空中伏击: ["地点", "空中伏击"],
  地面伏击: ["地点", "地面伏击"],
  水面追逐: ["地点", "水面追逐"],
  宝可梦笛: ["道具", "宝可梦笛"],
  得文侦测镜: ["道具", "得文侦测镜"],
  喷水壶: ["道具", "喷水壶"],
  吼吼鲸喷壶: ["道具", "吼吼鲸喷壶"],
  丑丑鱼钓点: ["钓点", "特定钓点（丑丑鱼）"],
  宝可梦巡护员联动: ["联动", "宝可梦巡护员联动"],
  宝可梦频道联动: ["联动", "宝可梦频道联动"],
  圆形竞技场特典: ["联动", "圆形竞技场特典"],
  呼唤同伴: ["呼唤", "呼唤同伴"],
  泡沫点呼唤同伴: ["呼唤", "泡沫点呼唤同伴"],
};

const game = new Map();
for (const [idStr, versions] of Object.entries(ENCOUNTERS)) {
  const id = Number(idStr);
  if (!Number.isFinite(id)) continue;
  for (const v of versions) {
    for (const m of v.methods || []) {
      const name = m.mZh;
      if (ORDINARY.has(name)) continue;
      const [kind, note] = GAME_KIND[name] || ["其他", name];
      const facts = [
        ["版本", `GEN ${v.gen} · ${v.verZh}`],
        ["方式", note],
        m.lv ? ["等级", `Lv ${m.lv}`] : null,
        typeof m.chance === "number" && m.chance < 100 ? ["概率", `${m.chance}%`] : null,
        m.areas?.length ? ["地点", m.areas.slice(0, 3).join(" / ") + (m.areaCount > 3 ? ` 等 ${m.areaCount} 处` : "")] : null,
      ].filter(Boolean);
      if (!game.has(id)) game.set(id, new Map());
      const key = `${kind}|${v.verZh}|${note}|${m.lv}`;
      game.get(id).set(key, { kind, title: v.verZh, facts: facts.map(([k, val]) => ({ k, v: val })) });
    }
  }
}


/* ---------- 形态道具（合体 / 组装 / 王冠形态） ---------- */
const FORM_ITEMS = [
  ["mega_showdown:zygarde_cube", 718, "组装：基格尔德多面体", "在方块内收集细胞与核心，按收集量组装成 10% / 50% / 完全体"],
  ["mega_showdown:n_solarizer", 800, "合体：日食形态", "对索尔迦雷欧使用，合体为日食奈克洛兹玛"],
  ["mega_showdown:n_lunarizer", 800, "合体：月食形态", "对露奈雅拉使用，合体为月食奈克洛兹玛"],
  ["mega_showdown:dna_splicer", 646, "合体：焰白 / 暗黑", "对莱希拉姆或捷克罗姆使用，合体为焰白 / 暗黑酋雷姆"],
  ["mega_showdown:reins_of_unity", 898, "合体：骑乘形态", "对雪暴马 / 灵幽马使用，合体为骑乘形态"],
  ["mega_showdown:rusted_sword", 888, "王冠形态：剑之王", "让苍响携带后变为剑之王形态"],
  ["mega_showdown:rusted_shield", 889, "王冠形态：盾之王", "让藏玛然特携带后变为盾之王形态"],
  ["mega_showdown:griseous_orb", 487, "起源形态：白金宝珠", "让骑拉帝纳携带后变为起源形态"],
];
for (const [itemId, dex, title, note] of FORM_ITEMS) {
  const facts = [["道具", itemLabel(itemId)], ["用法", note]];
  const recipe = RECIPE_BY_RESULT.get(itemId);
  if (recipe) facts.push(["合成", recipe]);
  const loot = LOOT_BY_ITEM.get(itemId);
  if (loot?.size) facts.push(["宝箱出处", [...loot].slice(0, 4).join(" / ") + (loot.size > 4 ? " 等 " + loot.size + " 处" : "")]);
  pushCobble(dex, { kind: "feature", title, facts }, "Mega Showdown");
}

/* 基格尔德细胞的宝箱出处（写进上面的道具条目之外，单列一条更直观） */
const cellLoot = LOOT_BY_ITEM.get("mega_showdown:zygarde_cell");
if (cellLoot?.size) {
  pushCobble(
    718,
    {
      kind: "item",
      title: "基格尔德细胞",
      facts: [
        ["道具", "基格尔德细胞"],
        ["来源", [...cellLoot].slice(0, 6).join(" / ") + (cellLoot.size > 6 ? " 等 " + cellLoot.size + " 处" : "") + " 的宝箱"],
        ["用途", "存入基格尔德多面体，与核心一起组装形态"],
      ],
    },
    "传说遗迹",
  );
}

/* ---------- 企业家（Entrepreneur）出售的道具 ----------
 * 传说遗迹模组的村民职业 `legendarymonuments:entrepreneur`，交易由 Java 代码注册
 * （com.jorgaomc.legendarymonuments.villagers.ModVillagersImpl#registerTrades），
 * 没有可读取的数据文件；下表取自该类的交易物品清单，并用模组语言文件核对中文名与用途。
 * 注意：基格尔德细胞（mega_showdown:zygarde_cell）在 legendarymonuments 8.1 / 8.2 里都不在交易表中，
 * 只能从神殿宝箱获得，因此这里不写“可购买”。
 */
const PURCHASE_ITEMS = [
  ["legendarymonuments:celestica_flute", 493, "神奥之笛", "天界之笛的合成材料，与空间天球仪、时间天球仪、反物质天球仪无序合成"],
  ["legendarymonuments:silver_wing", 249, "银色羽毛", "携带后洛奇亚的特攻与特防提升 50%（模组物品说明）"],
  ["legendarymonuments:love_letter", 905, "情书", "用于召唤眷恋云；由其他玩家制作的情书更容易召唤出闪光眷恋云"],
  ["legendarymonuments:firescourge_seal", 1004, "火灾之印", "用于定位「火灾之祠」，炽焰咆哮虎在那里出现"],
  ["legendarymonuments:icerend_seal", 1002, "冰裂之印", "用于定位「冰裂之祠」，古剑豹在那里出现"],
  ["legendarymonuments:groundblight_seal", 1003, "土枯之印", "用于定位「土枯之祠」，古鼎鹿在那里出现"],
  ["legendarymonuments:grasswither_seal", 1001, "草凋之印", "用于定位「草凋之祠」，古简蜗在那里出现"],
  ["legendarymonuments:lightstone_shard", 643, "光明石碎片", "光明石与火焰宝石一同使用可复活莱希拉姆"],
  ["legendarymonuments:darkstone_shard", 644, "黑暗石碎片", "黑暗石与电力宝石一同使用可复活捷克罗姆"],
];
for (const [itemId, dex, title, use] of PURCHASE_ITEMS) {
  pushCobble(
    dex,
    {
      kind: "item",
      title,
      facts: [
        ["购买", "「企业家」处可购买（传说遗迹模组新增的村民职业）"],
        ["用途", use],
      ],
    },
    "传说遗迹",
  );
}

/* ---------- 专属维度进入方式 ---------- */
pushCobble(
  487,
  {
    kind: "dimension",
    title: "扭曲世界",
    facts: [
      ["维度", "扭曲世界（Distortion World）"],
      ["进入方式", "放置「反转传送门」进入"],
      ["反转传送门", RECIPE_BY_RESULT.get("legendarymonuments:distortion_portal") || "由初始粗矿合成"],
    ],
  },
  "传说遗迹",
);

pushCobble(
  493,
  {
    kind: "summon",
    title: "天界之笛 · 初始之殿",
    facts: [
      ["召唤道具", "天界之笛"],
      ["合成", RECIPE_BY_RESULT.get("legendarymonuments:azure_flute") || "无序合成：空间天球仪 + 时间天球仪 + 反物质天球仪 + 神奥之笛"],
      ["进入方式", "使用天界之笛，进入「初始之殿」维度"],
      ["所在结构", "初始之殿（Hall of Origin）"],
      ["说明", "进入初始之殿后与阿尔宙斯对战并捕捉；阿尔宙斯不会出现在普通野外刷新"],
    ],
  },
  "传说遗迹",
);

pushCobble(
  493,
  {
    kind: "feature",
    title: "属性随石板改变",
    facts: [
      ["机制", "携带石板时属性与形态同步改变（Multitype）"],
      ["石板", "17 种属性石板可用 9 个对应属性宝石合成（如龙之宝石×9 → 龙之石板）"],
      ["传说石板", "一般属性的「传说石板」不在合成表内，需在狩猎地带地下寻宝取得"],
    ],
  },
  "Mega Showdown",
);

/* ---------- 合并输出 ---------- */
const KIND_ORDER = { map: 0, structure: 1, dimension: 2, item: 3, fossil: 4, summon: 5, feature: 6, raid: 7, boss: 8 };
const out = {};
for (const [dex, m] of cobble) {
  const list = [...m.values()].sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)).slice(0, 14);
  if (list.length) (out[dex] ||= {}).cobblemon = list;
}
for (const [dex, m] of game) {
  const list = [...m.values()].slice(0, 10);
  if (list.length) (out[dex] ||= {}).game = list;
}

fs.writeFileSync(OUT, JSON.stringify(out));
const withCobble = Object.values(out).filter((x) => x.cobblemon?.length).length;
const withGame = Object.values(out).filter((x) => x.game?.length).length;
const kinds = new Map();
for (const v of Object.values(out)) {
  for (const e of v.cobblemon || []) kinds.set("C:" + e.kind, (kinds.get("C:" + e.kind) || 0) + 1);
  for (const e of v.game || []) kinds.set("G:" + e.kind, (kinds.get("G:" + e.kind) || 0) + 1);
}
console.log("skipped (mod not in pack):", JSON.stringify(skipped), "| pool dirs:", POOL_DIRS.length);
console.log("species with cobblemon special:", withCobble, "| with game special:", withGame, "| total:", Object.keys(out).length);
console.log("size:", (fs.statSync(OUT).size / 1024).toFixed(0), "KB");
console.log([...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join("  "));