/**
 * 生成攻略 content/guides/legendary-monuments.md：传说遗迹（legendarymonuments）的
 * 「位置 → 前置道具 → 召唤流程 → 宝箱奖励」一页式速查。
 *
 * 数据全部来自整合包内 legendarymonuments 8.1 的原始数据：
 *   - worldgen/structure + worldgen/structure_set：所在群系与生成间距
 *   - structure/**.nbt（gunzip 后搜 chests/<名字>）：宝箱与遗迹的对应关系
 *   - loot_table/chests/*.json：每个宝箱的真实掉落与数量区间
 *   - recipe/*.json：前置道具的合成表
 *   - advancement/*.json：每个传说的召唤触发器与图标道具
 *   - lang/zh_cn.json：道具/方块中文名
 *
 * 手工维护的只有「遗迹 → 中文名 / 召唤对象 / 步骤提示」这张表，其余全部自动生成，
 * 避免把数字和掉落写错。改数据后重跑：
 *   node scripts/build-monument-guide.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const MOD = '.cache/legendmon'
const DATA = `${MOD}/data/legendarymonuments`
const ASSETS = `${MOD}/assets/legendarymonuments`

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const exists = (p) => fs.existsSync(p)
const walk = (dir, out = []) => {
  if (!exists(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/* ---------------- 中文名 ---------------- */
const LANG = readJson(`${ASSETS}/lang/zh_cn.json`)
const stripNs = (id) => String(id || '').split(':').pop()

/** 整合包内其它模组与原版的中文名（Cobblemon 覆盖了大部分宝可梦相关道具） */
const EXTRA_LANG = {}
for (const p of [
  '.cache/cobblemon/assets/cobblemon/lang/zh_cn.json',
  '.cache/mega/assets/mega_showdown/lang/zh_cn.json',
  '.cache/jo2/assets/cobblemon/lang/zh_cn.json',
]) {
  try {
    Object.assign(EXTRA_LANG, readJson(p))
  } catch {}
}
/** 原版物品里整合包语言文件没覆盖到的常客 */
const VANILLA_ZH = {
  gold_ingot: '金锭',
  iron_ingot: '铁锭',
  copper_ingot: '铜锭',
  gold_nugget: '金粒',
  iron_nugget: '铁粒',
  raw_gold: '粗金',
  raw_iron: '粗铁',
  emerald: '绿宝石',
  diamond: '钻石',
  lapis_lazuli: '青金石',
  amethyst_shard: '紫水晶碎片',
  ender_pearl: '末影珍珠',
  ghast_tear: '恶魂之泪',
  gunpowder: '火药',
  netherite_scrap: '下界合金碎片',
  netherite_ingot: '下界合金锭',
  nether_wart: '下界疣',
  blaze_powder: '烈焰粉',
  bricks: '砖块',
  magme_block: '岩浆块',
  magma_block: '岩浆块',
  blackstone: '黑石',
  gilded_blackstone: '镶金黑石',
  echo_shard: '回响碎片',
  amethyst_block: '紫水晶块',
  totem_of_undying: '不死图腾',
  shulker_shell: '潜影壳',
  nautilus_shell: '鹦鹉螺壳',
  heart_of_the_sea: '海洋之心',
  ink_sac: '墨囊',
  glow_ink_sac: '荧光墨囊',
  pufferfish: '河豚',
  axolotl_bucket: '美西螈桶',
  enchanted_golden_apple: '附魔金苹果',
  golden_apple: '金苹果',
  golden_carrot: '金胡萝卜',
  music_disc_11: '音乐唱片 11',
  torchflower: '火把花',
  spell_tag: '诅咒之符',
  black_sludge: '黑色污泥',
  silk_scarf: '丝绸围巾',
  metal_coat: '金属膜',
  king_s_rock: "王者之证",
  stones: '石头',
  sand: '沙子',
  gravel: '沙砾',
  shield: '盾牌',
  iron_sword: '铁剑',
  paper: '纸',
  brick: '红砖',
  fire_charge: '火焰弹',
  apple: '苹果',
  experience_bottle: '附魔之瓶',
  turtle_egg: '海龟蛋',
  sniffer_egg: '嗅探兽蛋',
  bone: '骨头',
  spider_eye: '蛛眼',
  rotten_flesh: '腐肉',
  saddle: '鞍',
  iron_horse_armor: '铁马铠',
  golden_horse_armor: '金马铠',
  book: '书',
  dune_armor_trim_smithing_template: '沙丘盔甲纹饰锻造模板',
  firium_z: '火Z',
  dragonium_z: '龙Z',
  electrium_z: '电Z',
  steelium_z: '钢Z',
  ghostium_z: '幽灵Z',
  dragon_breath: '龙息',
  iceroot_carrot_seeds: '黑根胡萝卜种子',
  shaderoot_carrot_seeds: '幽灵胡萝卜种子',
  tumblestone: '玉石',
  black_tumblestone: '黑玉石',
  sky_tumblestone: '天蓝玉石',
  ancient_relic: '古代残骸',
  dragon_fang: '龙之牙',
  never_melt_ice: '不融冰',
  hard_stone: '硬石头',
  metal_coat_relic: '金属膜',
  enchanted_book: '附魔书',
  rusted_sword: '腐朽的剑',
  rusted_shield: '腐朽的盾',
  lapis_block: '青金石块',
  redstone_block: '红石块',
  end_crystal: '末影水晶',
  water_bucket: '水桶',
  iron_chestplate: '铁胸甲',
  dive_rod: '潜水竿',
  turtle_helmet: '海龟壳头盔',
  string: '线',
  blaze_rod: '烈焰棒',
  ender_eye: '末影之眼',
  prismarine_shard: '海晶碎片',
  prismarine_crystals: '海晶砂粒',
  milk_bucket: '牛奶桶',
  honey_bottle: '蜂蜜瓶',
  slime_ball: '黏液球',
  obsidian: '黑曜石',
  crying_obsidian: '哭泣的黑曜石',
  nether_star: '下界之星',
  end_crystal: '末影水晶',
  glowstone_dust: '荧石粉',
  redstone: '红石',
  quartz: '下界石英',
  glass_bottle: '玻璃瓶',
  water_bucket: '水桶',
  lava_bucket: '熔岩桶',
  sugar: '糖',
  egg: '鸡蛋',
  wheat: '小麦',
  feather: '羽毛',
  leather: '皮革',
  coal: '煤炭',
  charcoal: '木炭',
  stick: '木棍',
  oak_planks: '橡木木板',
  chest: '箱子',
  hopper: '漏斗',
  iron_block: '铁块',
  gold_block: '金块',
  diamond_block: '钻石块',
  lapis_block: '青金石块',
  redstone_block: '红石块',
  emerald_block: '绿宝石块',
}
function itemName(id) {
  const p = stripNs(id)
  const ns = String(id || '').split(':')[0]
  return (
    LANG[`item.legendarymonuments.${p}`] ||
    LANG[`block.legendarymonuments.${p}`] ||
    EXTRA_LANG[`item.${ns}.${p}`] ||
    EXTRA_LANG[`block.${ns}.${p}`] ||
    VANILLA_ZH[p] ||
    prettify(p)
  )
}
function prettify(s) {
  return String(s || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ---------------- 版本号 ---------------- */
const MOD_VERSION = (() => {
  const f = walk(MOD).find((p) => p.endsWith('fabric.mod.json') || p.endsWith('mods.toml'))
  if (f && f.endsWith('fabric.mod.json')) {
    try {
      const j = readJson(f)
      return j.version || ''
    } catch {
      return ''
    }
  }
  return ''
})()

/* ---------------- 群系标签中文 ---------------- */
const BIOME_ZH = {
  '#cobblemon:is_mountain': '山地',
  '#cobblemon:is_snowy': '积雪地带',
  '#cobblemon:is_plains': '平原',
  '#cobblemon:is_deep_ocean': '深海',
  '#cobblemon:is_tundra': '苔原',
  '#cobblemon:is_overworld': '主世界（任意）',
  '#cobblemon:is_desert': '沙漠',
  '#cobblemon:is_nether': '下界（任意）',
  '#minecraft:is_nether': '下界（任意）',
  '#minecraft:is_overworld': '主世界（任意）',
  '#minecraft:is_forest': '森林',
  '#cobblemon:is_forest': '森林',
  '#cobblemon:is_badlands': '恶地',
  '#cobblemon:is_savanna': '热带草原',
  '#cobblemon:is_jungle': '丛林',
  '#cobblemon:is_swamp': '沼泽',
  '#cobblemon:is_beach': '沙滩',
  '#cobblemon:is_freezing': '极寒',
  '#cobblemon:is_arid': '干旱地带',
  '#legendarymonuments:not_mountain': '非山地',
  '#legendarymonuments:has_tree_of_life': '生命之树',
  '#legendarymonuments:is_plains_of_death': '枯寂平原',
  '#legendarymonuments:is_dyna_plains': '极巨平原',
  'legendarymonuments:plains_of_death': '枯寂平原',
  'legendarymonuments:dyna_plains': '极巨平原',
  'legendarymonuments:distortion_world_biome': '扭曲世界',
  'legendarymonuments:hall_of_origin_world_biome': '初始之殿',
  'legendarymonuments:reawakening_sanctum_biome': '复苏圣所',
  '#minecraft:empty': '虚空（无生物群系）',
  'minecraft:snowy_plains': '雪原',
  'minecraft:sunflower_plains': '向日葵平原',
  'minecraft:dark_forest': '黑森林',
  'minecraft:snowy_taiga': '积雪针叶林',
  '#minecraft:is_soul_sand': '灵魂沙峡谷',
  '#minecraft:is_basalt': '玄武岩三角洲',
  '#minecraft:is_fungus': '菌类森林',
  'end_highlands': '末地高地',
  'end_midlands': '末地内陆',
  'end_barrens': '末地荒原',
  '#legendarymonuments:has_structure/distortion_portal': '扭曲世界（反转世界）',
  'nether/is_wasteland': '下界荒地',
  'nether/is_basalt': '玄武岩三角洲',
  'nether/is_soul_sand': '灵魂沙峡谷',
  'nether/is_fungus': '菌类森林',
  'nether/is_forest': '下界森林',
}
const biomeLabel = (b) => BIOME_ZH[b] || b.replace(/^#/, '').replace(/^[a-z_]+:/, '')

/* ---------------- 结构：间距 + 群系 ---------------- */
const structureFile = new Map()
for (const f of walk(`${DATA}/worldgen/structure`)) {
  if (!f.endsWith('.json')) continue
  const id = path.basename(f, '.json')
  structureFile.set(id, readJson(f))
}
const setSpacing = new Map()
for (const f of walk(`${DATA}/worldgen/structure_set`)) {
  if (!f.endsWith('.json')) continue
  const j = readJson(f)
  const placement = j.placement || {}
  const entry = { spacing: placement.spacing, separation: placement.separation, salt: placement.salt }
  const structs = new Set()
  for (const s of j.structures || []) {
    const key = typeof s === 'string' ? s : s.structure
    if (key) structs.add(stripNs(key))
  }
  if (!structs.size) structs.add(path.basename(f, '.json'))
  for (const s of structs) if (!setSpacing.has(s)) setSpacing.set(s, entry)
}
function biomesOf(id) {
  const j = structureFile.get(id)
  if (!j) return []
  const b = j.biomes
  if (!b) return []
  const list = Array.isArray(b) ? b : typeof b === 'string' ? [b] : [b]
  return list.map((x) => (typeof x === 'string' ? x : String(x.tag || x)))
}

/* ---------------- 宝箱 ↔ 遗迹 ---------------- */
const STRUCT_DIR = `${DATA}/structure`
const chestToStruct = new Map()
for (const f of walk(STRUCT_DIR)) {
  if (!f.endsWith('.nbt')) continue
  let s = ''
  try {
    s = zlib.gunzipSync(fs.readFileSync(f)).toString('latin1')
  } catch {
    continue
  }
  const rel = f.replace(/\\/g, '/').replace(`${STRUCT_DIR}/`, '')
  for (const m of s.matchAll(/chests\/([a-z0-9_]+)/g)) {
    const k = m[1]
    if (!chestToStruct.has(k)) chestToStruct.set(k, new Set())
    chestToStruct.get(k).add(rel)
  }
}
const structToChest = new Map()
for (const [chest, set] of chestToStruct) {
  for (const rel of set) {
    if (rel.includes('/spawners/')) continue
    const top = rel.split('/')[0].replace(/\.nbt$/, '')
    if (!structToChest.has(top)) structToChest.set(top, new Set())
    structToChest.get(top).add(chest)
  }
}

/* ---------------- 掉落表 ---------------- */
const LOOT = new Map()
for (const f of walk(`${DATA}/loot_table/chests`)) {
  if (!f.endsWith('.json')) continue
  const name = path.basename(f, '.json')
  const j = readJson(f)
  const rows = []
  let rolls = 0
  for (const pool of j.pools || []) {
    const r = pool.rolls
    if (typeof r === 'number') rolls += r
    else if (r && typeof r === 'object') rolls += r.max || r.min || 0
    for (const e of pool.entries || []) {
      if (!e.name) continue
      const fn = e.functions?.find((x) => x.function === 'minecraft:set_count')
      let count = 1
      if (fn?.count && typeof fn.count === 'object') count = fn.count.max && fn.count.max > fn.count.min ? fn.count.min + '~' + fn.count.max : fn.count.min || 1
      else if (typeof fn?.count === 'number') count = fn.count
      rows.push({ id: e.name, name: itemName(e.name), count, weight: e.weight })
    }
  }
  LOOT.set(name, { rolls, rows })
}

/* ---------------- 合成表 ---------------- */
const RECIPE = new Map()
for (const [dirName, dir] of [
  ['legendarymonuments', `${DATA}/recipe`],
  ['mega_showdown', '.cache/mega/data/mega_showdown/recipe'],
  ['mega_showdown', '.cache/jo2/data/mega_showdown/recipe'],
  ['cobblemon', '.cache/cobblemon/data/cobblemon/recipe'],
]) {
  for (const f of walk(dir)) {
    if (!f.endsWith('.json')) continue
    if (/\/old\//.test(f.replace(/\\/g, '/'))) continue
    let j
    try {
      j = readJson(f)
    } catch {
      continue
    }
    const raw = typeof j.result === 'string' ? j.result : j.result?.item || j.result?.id
    if (!raw) continue
    const key = stripNs(raw)
    if (RECIPE.has(key)) continue
    const parts = new Map()
    const addPart = (id, c) => {
      if (!id) return
      const name = itemName(id)
      parts.set(name, (parts.get(name) || 0) + (c || 1))
    }
    if (Array.isArray(j.ingredients)) {
      for (const i of j.ingredients.flat()) {
        if (!i) continue
        const id = typeof i === 'string' ? i : i.item
        const c = typeof i === 'object' ? i.count : 1
        addPart(id, c)
      }
    }
    if (j.key && typeof j.key === 'object') {
      parts.clear()
      if (Array.isArray(j.pattern)) {
        for (const row of j.pattern) {
          for (const ch of String(row || '')) {
            if (!ch || ch === ' ') continue
            const v = j.key[ch]
            if (!v) continue
            const id = typeof v === 'string' ? v : v.item
            const c = typeof v === 'object' ? v.count || 1 : 1
            addPart(id, c)
          }
        }
      } else {
        for (const v of Object.values(j.key)) {
          const id = typeof v === 'string' ? v : v.item
          const c = typeof v === 'object' ? v.count || 1 : 1
          addPart(id, c)
        }
      }
    }
    RECIPE.set(key, { result: itemName(raw), parts: [...parts].map(([name, count]) => ({ name, count })), shaped: Boolean(j.pattern), from: dirName })
  }
}
function recipeOf(itemId) {
  const k = stripNs(itemId)
  return RECIPE.get(k) || null
}

/* ---------------- 遗迹清单（人工维护的唯一一张表） ---------------- */
const M = [
  {
    struct: 'spear_pillar',
    name: '枪之柱',
    species: [483, 484],
    prep: ['红色锁链', '时间天球仪', '空间天球仪'],
    steps: [
      '红色锁链由**由克希的爪子 + 亚克诺姆的尖牙 + 艾姆利多的羽毛**无序合成，三件遗物分别来自睿智湖、立志湖、心齐湖的湖神试炼。',
      '时间天球仪召唤帝牙卢卡、空间天球仪召唤帕路奇亚；两个基座在塔顶两侧，各自独立。',
      '带着锁链与天球仪进塔，在对应基座上使用道具即可开战。',
    ],
    tips: '两只可以分别召唤，不需要一次打完；塔内宝箱没有独立的战利品表，收益主要来自湖神遗迹。',
  },
  {
    struct: 'hall_of_origin',
    name: '初始之殿',
    species: [493],
    prep: ['天界之笛'],
    steps: [
      '天界之笛 = **空间天球仪 + 时间天球仪 + 反物质天球仪 + 神奥之笛**（无序合成）。',
      '神奥之笛可在「企业家」处购买，也能在归途洞窟的宝库里开出来；三个天球仪分别对应帕路奇亚 / 帝牙卢卡 / 骑拉帝纳的遗迹。',
      '吹响天界之笛进入初始之殿（虚空维度），阿尔宙斯在那里等你。',
    ],
    tips: '这是全模组最长的前置链，建议先把枪之柱、归途洞窟的宝库刷完再合成。殿内的「阿尔宙斯雕像」只是装饰，不能召唤。',
  },
  {
    struct: 'turnback_cave',
    name: '归途洞窟',
    species: [487],
    prep: ['反物质天球仪', '反转传送门'],
    steps: [
      '洞窟深处的宝库（vault）是**神奥之笛、初始锭、白金/金刚/白玉宝珠**的稳定来源，也是刷基格尔德细胞的好地方。',
      '反转传送门由**初始粗矿 + 铁锭**合成，放置后进入扭曲世界；骑拉帝纳的基座在扭曲世界的「骑拉帝纳岛」，不在这座洞窟里。',
      '洞窟分主厅（big_rooms）与走廊（hallways），宝库房在 big_room_1~3 等 12 个模板里。',
    ],
    tips: '宝箱是全模组奖励最厚的：神奥之笛、初始锭、三色宝珠、妖怪石板、幽灵存储碟、大量玉石，值得反复刷。',
  },
  {
    struct: 'giratina_island',
    name: '骑拉帝纳岛',
    species: [487],
    prep: ['反物质天球仪'],
    where: '扭曲世界（需要先进入反转世界）',
    steps: [
      '反物质天球仪（antimatter_globe）在岛上的**骑拉帝纳基座**上使用即可召唤。',
      '进岛方式：用反转传送门方块进入扭曲世界，再在扭曲世界里找岛。',
    ],
    tips: '反物质天球仪本身没有合成表，数据里也没有宝箱来源——先确认你已经拿到它再出发。',
  },
  {
    struct: 'distortion_portal',
    name: '反转世界入口',
    species: [487],
    prep: ['反转传送门'],
    steps: ['用反转传送门方块进入扭曲世界（dimension: legendarymonuments:distortion_world）。', '扭曲世界里的野生宝可梦是一套独立表（鬼斯、梦妖、怨影娃娃一系），骑拉帝纳的岛屿也在其中。'],
    tips: '扭曲世界的祭坛与传送门方块在扭曲枢纽（distortion_nexus）与骑拉帝纳岛附近大量出现。',
  },
  {
    struct: 'lake_verity',
    name: '睿智湖',
    species: [480],
    prep: ['征服证明（由克希）'],
    steps: ['湖中心触发试炼，通过后拿到**征服证明（由克希）**，右键使用即可召唤由克希。', '由克希的爪子是红色锁链的合成材料之一。'],
  },
  {
    struct: 'lake_valor',
    name: '立志湖',
    species: [482],
    prep: ['征服证明（亚克诺姆）'],
    steps: ['通过试炼拿到**征服证明（亚克诺姆）**，右键召唤亚克诺姆。', '亚克诺姆的尖牙是红色锁链的合成材料之一。'],
  },
  {
    struct: 'lake_acuity',
    name: '心齐湖',
    species: [481],
    prep: ['征服证明（艾姆利多）'],
    steps: ['通过试炼拿到**征服证明（艾姆利多）**，右键召唤艾姆利多。', '艾姆利多的羽毛是红色锁链的合成材料之一。'],
  },
  {
    struct: 'burned_tower',
    name: '烧焦塔',
    species: [243, 244, 245],
    prep: ['炎帝宝可方块盒', '雷公宝可方块盒', '水君宝可方块盒'],
    steps: [
      '三个「宝可方块盒」分别用**宝可方块盒 + 四种杏果**合成（炎帝 / 雷公 / 水君配方各不相同）。',
      '进塔后在对应位置使用方块盒召唤，三只可以分别召唤。',
      '每只各给一根羽毛：火之羽毛（炎帝）、水之羽毛（水君）、雷之羽毛（雷公）。',
    ],
    tips: '三根羽毛 + 合成表里的「虹色羽毛」是凤王的前置；烧焦塔的宝箱（bell_tower_chest，8 抽）里还有光明石碎片、黑暗石碎片、复苏石板、安抚之铃、幸运蛋等。',
  },
  {
    struct: 'traditional_village',
    name: '传统村庄 · 铃铛塔',
    species: [250, 251],
    prep: ['虹色羽毛', 'GS 球'],
    steps: [
      '铃铛塔在传统村庄（圆朱市风格）里，塔顶召唤凤王：**红羽毛 + 蓝羽毛 + 黄羽毛 = 虹色羽毛**，在塔上使用。',
      '时拉比不在这里——它在**桐树林祠堂**（ilex_shrine），使用 **GS 球**召唤；GS 球由**下界合金碎片 + 黄球果**合成。',
    ],
    tips: '铃铛塔的宝箱与烧焦塔共用 bell_tower_chest（8 抽），是早期最肥的资源点。',
  },
  {
    struct: 'dragonspiraltower',
    name: '龙螺旋塔',
    species: [643, 644],
    prep: ['光明石', '黑暗石', '火焰宝石', '电力宝石'],
    steps: [
      '光明石 + 火焰宝石 → 莱希拉姆；黑暗石 + 电力宝石 → 捷克罗姆。',
      '光明石 / 黑暗石由对应的碎片合成（碎片来自宝箱，企业家也有售）。',
      '塔顶有两个基座，分别放石头后召唤。',
    ],
    tips: '两只都拿到后，用**基因之楔**把酋雷姆与它们合体成暗黑/焰白酋雷姆。',
  },
  {
    struct: 'kyuremcave',
    name: '酋雷姆洞窟',
    species: [646],
    prep: ['真实之瓶', '理想之瓶'],
    steps: ['真实之瓶与理想之瓶**同时使用**才能召唤酋雷姆（tooltip 明确写了这一点）。', '洞窟在积雪地带，进洞找基座。'],
    tips: '酋雷姆是合体素材，单只战斗力一般，但暗黑/焰白形态很强。',
  },
  {
    struct: 'snowpoint_temple',
    name: '切锋神殿',
    species: [377, 378, 379, 894, 895, 486],
    prep: ['钢/岩/冰/电/龙 魔像钥匙', '泰坦钥匙'],
    steps: [
      '五把「魔像钥匙」各自解锁一间密室：钢 → 雷吉斯奇鲁、岩 → 雷吉洛克、冰 → 雷吉艾斯、电/龙 → 雷吉艾勒奇 / 雷吉铎拉戈。',
      '钥匙配方 = **对应属性宝石 + 对应魔像锭**；雷吉三柱的「魔像锭」由遗迹里的石板(`regi_tablet`)转化而来。',
      '泰坦钥匙（五块雷吉石板合成）解锁**雷吉奇卡斯**密室。',
    ],
    tips: '一间神殿里能刷 6 只传说，是全模组效率最高的点。宝箱按密室分表：regice / regirock / registeel / dragoeleki 各有独立掉落，都含**基格尔德细胞**。',
  },
  {
    struct: 'amphitheater',
    name: '圆形剧场',
    species: [486],
    prep: ['泰坦钥匙'],
    steps: ['沙漠里的圆形剧场同样是雷吉奇卡斯的召唤点，替代切锋神殿的泰坦密室。', '剧场宝箱（regigigas_chest）是**基格尔德核心**的两个来源之一。'],
  },
  {
    struct: 'throneroom_of_knightly_heroes',
    name: '英雄王座',
    species: [888, 889],
    prep: ['英雄之剑', '英雄之盾', '不死图腾'],
    steps: [
      '**英雄之剑 + 不死图腾**召唤苍响；**英雄之盾 + 不死图腾**召唤藏玛然特。',
      '剑/盾在王座大厅的两个基座上使用，左右分开。',
    ],
    tips: '腐朽的剑 / 腐朽的盾由「铁剑（盾牌）+ 下界合金碎片 + 火焰弹」合成，不是宝箱掉落；剑/盾专属宝箱出的是老格斗家的毛巾与阴影兜帽（玛夏多前置）。',
  },
  {
    struct: 'crown_shrine',
    name: '皇冠神殿',
    species: [898, 896, 897],
    prep: ['冰根胡萝卜', '幽灵胡萝卜'],
    steps: [
      '蕾冠王需要**灵马基座**：先用冰根胡萝卜召唤雪暴马，或用幽灵胡萝卜召唤灵幽马，再与蕾冠王合体。',
      '两种胡萝卜都能在对应的耕地种植（种子来自宝箱）。',
    ],
    tips: '皇冠神殿的宝箱（calyrex_chest）给冰之宝石、黑根胡萝卜种子、**基格尔德细胞**、复苏石板。',
  },
  {
    struct: 'heatran_cave',
    name: '席多蓝恩洞窟',
    species: [485],
    prep: ['火山镇石'],
    steps: ['火山镇石由**熔岩方块 + 下界合金碎片**合成（3×3 图案），在下界的熔岩洞窟里使用召唤席多蓝恩。'],
    tips: '洞窟宝箱给熔岩增幅器、护具、古代精灵球/重球（古代、巨重、超重、沉重）、下界合金碎片、活力块与灼伤药。',
  },
  {
    struct: 'hoopa_pyramid',
    name: '胡帕金字塔',
    species: [720],
    prep: ['胡帕基座', '神殿钥匙'],
    steps: ['末地的金字塔里有神殿锁（temple_lock），需要**神殿钥匙**开门。', '开门后在胡帕基座旁召唤胡帕；用 Mega Showdown 的**惩戒之壶**（prison_bottle）可以让它变成解放胡帕。'],
    tips: '神殿钥匙的获取方式在数据文件里没有记录（只在 Java 逻辑里使用），以游戏内提示为准。',
  },
  {
    struct: 'eternatus_cocoon',
    name: '无极汰那之茧',
    species: [890],
    prep: ['无（直接交互）'],
    steps: ['末地高地的茧，交互即召唤无极汰那。', '打赢后可以拿到无极汰那的进化素材，用于巨型化形态研究。'],
  },
  {
    struct: 'final_island',
    name: '终焉之岛',
    species: [151],
    prep: ['古老海图', '一撮梦幻的毛发'],
    where: '主世界任意非山地群系',
    steps: ['**古老海图**用于定位终焉之岛；进岛后在梦幻的基座上使用**一撮梦幻的毛发**召唤梦幻。', '海图可在自由庭院、枯寂遗迹的宝箱里开出。'],
  },
  {
    struct: 'southern_island',
    name: '南方孤岛',
    species: [380, 381],
    prep: ['拉帝亚斯宝可方块盒', '拉帝欧斯宝可方块盒'],
    steps: ['两种方块盒分别召唤拉帝亚斯 / 拉帝欧斯，配方是宝可方块盒 + 四种杏果。', '岛上还有「靛蓝色宝珠」等道具。'],
  },
  {
    struct: 'lugia_temple',
    name: '洛奇亚神殿',
    species: [249],
    prep: ['涡流石', '银色羽毛', '洛奇亚钥匙'],
    steps: [
      '**涡流石**（熔岩之石 + 雷电之石 + 极寒之石）是挑战资格，tooltip 写「拥有此石者，方有资格挑战洛奇亚」。',
      '银色羽毛可在企业家处购买，携带后洛奇亚特攻/特防 +50%（不是召唤道具）。',
      '神殿在水下，门锁需要**洛奇亚钥匙**；钥匙的获取方式未在数据中出现。',
    ],
    tips: '神殿宝箱给水太晶碎块、潜水球、靛蓝色宝珠、海洋之心。',
  },
  {
    struct: 'liberty_island',
    name: '自由庭院',
    species: [494],
    prep: ['自由通行证', '古老海图'],
    steps: ['自由通行证可以从**枯寂遗迹（thalic）的宝箱**开出（企业家不出售）。', '进岛后在比克提尼锁处使用通行证召唤比克提尼。'],
  },
  {
    struct: 'tree_of_life',
    name: '生命之树',
    species: [716, 717],
    prep: ['极光精华罐', '灵魂罐'],
    steps: ['两个罐子分别召唤哲尔尼亚斯与伊裴尔塔尔。', '树在特殊群系里，需要先找到「生命之树」群系。'],
  },
  {
    struct: 'yveltal_cocoon',
    name: '伊裴尔塔尔之茧',
    species: [717],
    prep: ['灵魂罐'],
    steps: ['枯寂平原（plains_of_death）上的茧，用灵魂罐召唤。'],
    tips: '枯寂平原还有枯寂遗迹群（thalic_*）：宝箱给自由通行证、古老海图、光明/黑暗石碎片、复苏石板。',
  },
  {
    struct: 'firescourge_shrine',
    name: '火灾之祠',
    species: [1004],
    prep: ['火灾之印'],
    steps: ['火灾之印用于定位火灾之祠（tooltip 原文），跟随指引找到祠后用**火灾之柱**解封并召唤古玉鱼。'],
  },
  {
    struct: 'icerend_shrine',
    name: '冰裂之祠',
    species: [1002],
    prep: ['冰裂之印'],
    steps: ['冰裂之印定位冰裂之祠，解封后召唤古剑豹。'],
  },
  {
    struct: 'groundblight_shrine',
    name: '土枯之祠',
    species: [1003],
    prep: ['土枯之印'],
    steps: ['土枯之印定位土枯之祠，解封后召唤古鼎鹿。'],
  },
  {
    struct: 'grasswither_shrine',
    name: '草凋之祠',
    species: [1001],
    prep: ['草凋之印'],
    steps: ['草凋之印定位草凋之祠，解封后召唤古简蜗。'],
  },
  {
    struct: 'thalic_pyramid',
    name: '枯寂金字塔',
    species: [],
    prep: ['无（纯探索）'],
    steps: ['枯寂平原上的沙漠遗迹，没有专属传说，但宝箱（thalic_chest）会出**自由通行证**、古老海图、复苏石板、光明/黑暗石碎片。', '旁边的枯寂营地与枯寂水井共用 `cove2_barrel` 小桶。'],
    tips: '想拿比克提尼，这里是最稳定的通行证来源。',
  },
  {
    struct: 'dyna_tree',
    name: '极巨树',
    species: [],
    prep: ['极巨树苗'],
    steps: ['极巨树苗以 **5×5 阵型放 25 个**能长出极巨树（tooltip 原文），也可以直接找自然生成的极巨树。', '树下是伽勒尔之瓮材料（极巨果）的来源之一。'],
  },
]

/* ---------------- 辅助：按 dex 取中文名 ---------------- */
const dexRaw = readJson('src/data/pokedex.json')
const POKE = new Map((Array.isArray(dexRaw) ? dexRaw : Object.values(dexRaw)).map((p) => [p.id, p.name.zh]))
const pokeLink = (dex) => `[${POKE.get(dex) || `#${dex}`}](/pokedex/${dex}/)`

/* ---------------- 掉落渲染 ---------------- */
const JUNK = /^(experience_candy|relic_coin|relic_coin_pouch|exp_candy|emerald|gold_ingot|iron_ingot|copper_ingot|raw_gold|raw_iron|diamond|sand|gravel|lapis_lazuli|stones)/
const QUEST = /(flute|origin_ingot|_orb|_core|zygarde|_plate$|platelegend|_key$|_seal$|_stake$|carrot(?!_seeds)|_disc|whistle|letter|cowl|towel|herosword|heroshield|meltan|cosmic_bag|_tablet$|gs_ball|_pass$)/
function lootBuckets(chest) {
  const t = LOOT.get(chest)
  if (!t) return { quest: [], normal: [], rolls: 0 }
  const seen = new Set()
  const quest = []
  const normal = []
  for (const r of t.rows) {
    if (seen.has(r.name)) continue
    seen.add(r.name)
    const id = stripNs(r.id)
    const label = r.count && r.count !== 1 ? `${r.name}×${r.count}` : r.name
    if (QUEST.test(id)) quest.push(label)
    else if (!JUNK.test(id)) normal.push(label)
  }
  return { quest, normal, rolls: t.rolls }
}

/* ---------------- 生成 ---------------- */
const today = new Date().toISOString().slice(0, 10)
const lines = []
const P = (s = '') => lines.push(s)

P('---')
P('title: 传说遗迹全图鉴：每座遗迹的奖励与传说收集路线')
P('slug: legendary-monuments')
P('order: 3.6')
P('summary: 传奇遗迹（legendarymonuments）逐座拆解：找谁、带什么、在哪召唤、宝箱里到底有什么')
P('tags: [传说, 遗迹, 宝箱, 收集, legendarymonuments]')
P(`updated: ${today}`)
P('sources:')
P('  - https://modrinth.com/mod/legendary-monuments')
P('  - https://wiki.cobblemon.com/')
P('  - https://www.minecraft.net/')
P('---')
P()
P(`> 适用版本：整合包「Lets go cobblemon master 5.9.2」内的 legendarymonuments ${MOD_VERSION || '8.1'}（MC 1.21.1 / Cobblemon 1.8.x）。`)
P('>')
P('> 本文由整合包内的原始数据自动生成：结构生成表（`worldgen/structure`）、宝箱与遗迹的对应关系（`.nbt` 里的 `chests/<名称>`）、'
  + '掉落表（`loot_table/chests`）、合成表（`recipe`）、成就触发器（`advancement`）与官方中文语言文件。'
  + '凡数据里查不到的（例如两把钥匙的获取方式），文中会明确写「未在数据中记录」，不做推测。')
P()
P('## 一、开工前先搞懂三件事')
P()
P('### 1. 阿尔宙斯手机')
P()
P('模组给了你一台**阿尔宙斯手机**，里面装着这些东西：')
P()
P('| APP | 作用 |')
P('| --- | --- |')
P('| 任务 | 主线/支线清单，遗迹进度看这里 |')
P('| 传说追踪 | 已解锁传说、当前位置 |')
P('| 关键道具 | 钥匙、印、羽毛等任务道具收纳 |')
P('| 系统升级 | 解锁更多 APP |')
P('| 百科 / 图鉴 / 电脑 / 治疗 / 末影箱 | 便携版原版功能 |')
P()
P('### 2. 遗迹不是随机刷在眼前的')
P()
P('全部遗迹都是**结构**，用 `/locate structure <id>` 就能找。间距（spacing）越大越稀有，下表是主世界几个大件的间距：')
P()
{
  const spacingRows = M.filter((m) => setSpacing.get(m.struct)?.spacing)
    .sort((a, b) => (setSpacing.get(b.struct).spacing || 0) - (setSpacing.get(a.struct).spacing || 0))
    .map((m) => `| ${m.name} | \`legendarymonuments:${m.struct}\` | ${setSpacing.get(m.struct).spacing} / ${setSpacing.get(m.struct).separation} |`)
  P('| 遗迹 | 结构 ID | spacing / separation（区块） |')
  P('| --- | --- | --- |')
  for (const r of spacingRows) P(r)
}
P()
P('> spacing 只是「最小间隔」，不代表每 220 区块必有一处；找到一处后建议先把整片群系扫一遍。')
P()
P('### 3. 奖励分三种来源')
P()
P('- **专属宝箱**：每座遗迹有自己的战利品表，下面逐座列出真实掉落；')
P('- **BOSS 掉落**：传说本身不额外掉装备，主要价值是「抓到」与图鉴登记；')
P('- **通用素材**：`遗迹硬币`、`复苏徽章碎片`、`古老之歌唱片碎片`、`基格尔德细胞` 遍布各遗迹，是所有召唤道具的基础货币。')
P()

P('## 二、遗迹速查表')
P()
P('| 遗迹 | 所在群系 | 可召唤 | 关键前置 |')
P('| --- | --- | --- | --- |')
for (const m of M) {
  const b = biomesOf(m.struct).map(biomeLabel).slice(0, 2).join(' / ') || '—'
  const sp = m.species.map((d) => POKE.get(d) || `#${d}`).join('、') || '（无专属传说）'
  P(`| ${m.name} | ${b} | ${sp} | ${m.prep.join('、')} |`)
}
P()

P('## 三、逐座遗迹')
P()
for (const m of M) {
  const spacing = setSpacing.get(m.struct)
  P(`### ${m.name}`)
  P()
  P(`- 结构 ID：\`legendarymonuments:${m.struct}\``)
  const b = biomesOf(m.struct).map(biomeLabel)
  if (m.where) P(`- 生成地点：${m.where}`)
  else if (b.length) P(`- 生成群系：${b.join(' / ')}`)
  if (spacing?.spacing) P(`- 生成间距：spacing ${spacing.spacing} / separation ${spacing.separation}`)
  if (m.species.length) P(`- 可召唤：${m.species.map(pokeLink).join('、')}`)
  P()
  if (m.prep.length) {
    P(`**要准备**：${m.prep.join('、')}`)
    P()
  }
  P('**流程**')
  P()
  for (const s of m.steps) P(`- ${s}`)
  P()
  const chests = [...(structToChest.get(m.struct) || [])]
  if (chests.length) {
    P('**宝箱奖励**')
    P()
    for (const c of chests) {
      const t = LOOT.get(c)
      if (!t) continue
      const { quest, normal, rolls } = lootBuckets(c)
      P(`- \`${c}\`（${rolls} 抽）`)
      if (quest.length) P(`  - 关键道具：${quest.join('、')}`)
      if (normal.length) P(`  - 素材与消耗品：${normal.slice(0, 16).join('、')}${normal.length > 16 ? ' 等' : ''}`)
    }
    P()
  }
  if (m.tips) {
    P(`> ${m.tips}`)
    P()
  }
}

P('## 四、关键道具怎么来')
P()
P('下表只列出**数据里确实有合成表**的道具，其余（神殿钥匙、洛奇亚钥匙、初始钥匙等）在整合包数据中没有合成表，来源以游戏内提示为准。')
P()
P('| 道具 | 合成方式 | 备注 |')
P('| --- | --- | --- |')
const KEY_ITEMS = [
  'azure_flute', 'red_chain', 'rainbow_feather', 'vortex_stone', 'magma_stone', 'distortion_portal',
  'titan_key', 'steel_golem_key', 'rock_golem_key', 'ice_golem_key', 'electric_golem_key', 'dragon_golem_key',
  'urn_of_embers', 'urn_of_storms', 'urn_of_frost', 'galarian_urn_of_embers', 'galarian_urn_of_storms', 'galarian_urn_of_frost',
  'entei_treat', 'raikou_treat', 'suicune_treat', 'latios_treat', 'latias_treat',
  'fullmoon_whistle', 'newmoon_whistle', 'meltan_box', 'cosmic_bag', 'dream_catcher', 'love_letter',
  'rusted_sword', 'rusted_shield', 'disc_of_the_first_song', 'medallion_of_renewal',
  'shards_to_lightstone', 'shards_to_darkstone', 'gs_ball', 'herosword', 'heroshield', 'arc_phone',
]
for (const key of KEY_ITEMS) {
  const r = RECIPE.get(key)
  if (!r) continue
  const list = (r.parts || [])
    .filter((p) => p.name)
    .map((p) => (p.count > 1 ? `${p.name}×${p.count}` : p.name))
    .join(' + ')
  if (!list) continue
  P(`| ${itemName(key)} | ${list} | ${r.shaped ? '有序合成（在工作台按格局摆放）' : '无序合成（材料位置随意）'} |`)
}
P()

P('## 五、按道具反查：我还差什么？')
P()
P('| 我手上的道具 | 能召唤 | 去哪 |')
P('| --- | --- | --- |')
const ITEM_HINTS = [
  ['时间天球仪', [483], 'spear_pillar'],
  ['空间天球仪', [484], 'spear_pillar'],
  ['反物质天球仪', [487], 'giratina_island（扭曲世界）'],
  ['天界之笛', [493], 'hall_of_origin'],
  ['征服证明（由克希）', [480], 'lake_verity'],
  ['征服证明（艾姆利多）', [481], 'lake_acuity'],
  ['征服证明（亚克诺姆）', [482], 'lake_valor'],
  ['炎帝 / 雷公 / 水君 宝可方块盒', [243, 244, 245], 'burned_tower（烧焦塔/传统村庄内）'],
  ['虹色羽毛', [250], 'traditional_village'],
  ['GS 球', [251], 'traditional_village'],
  ['光明石 + 火焰宝石', [643], 'dragonspiraltower'],
  ['黑暗石 + 电力宝石', [644], 'dragonspiraltower'],
  ['真实之瓶 + 理想之瓶', [646], 'kyuremcave'],
  ['魔像钥匙 / 泰坦钥匙', [377, 378, 379, 894, 895, 486], 'snowpoint_temple'],
  ['英雄之剑 + 不死图腾', [888], 'throneroom_of_knightly_heroes'],
  ['英雄之盾 + 不死图腾', [889], 'throneroom_of_knightly_heroes'],
  ['冰根 / 幽灵胡萝卜', [896, 897, 898], 'crown_shrine'],
  ['火山镇石', [485], 'heatran_cave'],
  ['一撮梦幻的毛发 + 古老海图', [151], 'final_island'],
  ['拉帝亚斯 / 拉帝欧斯宝可方块盒', [380, 381], 'southern_island'],
  ['涡流石 + 洛奇亚钥匙', [249], 'lugia_temple'],
  ['自由通行证', [494], 'liberty_island'],
  ['极光精华罐 / 灵魂罐', [716, 717], 'tree_of_life'],
  ['火灾 / 冰裂 / 土枯 / 草凋之印', [1004, 1002, 1003, 1001], 'firescourge_shrine 等四祠'],
  ['新月哨子 / 满月哨子', [491, 488], '（任意夜晚 / 满月）'],
  ['美录坦盒子', [808], '（任意地点）'],
  ['宇宙之袋', [789], '（任意地点）'],
  ['古老之歌唱片', [648], '（专属点唱机）'],
  ['阴影兜帽', [802], '（任意地点）'],
  ['情书', [905], '（任意地点）'],
]
for (const [item, dexes, where] of ITEM_HINTS) {
  P(`| ${item} | ${dexes.map(pokeLink).join('、')} | ${where} |`)
}
P()

P('## 六、容易踩的坑')
P()
P('1. **银色羽毛不是召唤道具**：它的 tooltip 是「携带后洛奇亚特攻/特防 +50%」，召唤洛奇亚靠涡流石 + 神殿钥匙。')
P('2. **天界之笛 ≠ 天球仪**：三个天球仪是召唤骑拉帝纳/帝牙卢卡/帕路奇亚用的，天界之笛只是「进初始之殿的钥匙」，合成时四件都要。')
P('3. **初始之殿里的阿尔宙斯雕像不能召唤**：它只是 `CustomName:"arceus"` 的盔甲架，真正的召唤靠天界之笛进殿。')
P('4. **基格尔德细胞只能从宝箱拿**：8 处神殿宝箱（含归途洞窟）出细胞，`registeel` / `regigigas` 宝箱还会额外给「基格尔德核心」；企业家不出售细胞。')
P('5. **神殿钥匙（temple_key）与洛奇亚钥匙（lugia_key）没有合成表**：数据里只在胡帕金字塔、洛奇亚神殿的锁上被引用，来源以游戏内任务提示为准。')
P('6. **极巨树苗要摆 5×5 共 25 个**才长成极巨树，不是单棵种植。')
P()
P('---')
P()
P(
  `> 数据来源：整合包内 \`legendarymonuments\` ${MOD_VERSION || '8.1'} 的 \`worldgen/\`、\`structure/\`、\`loot_table/\`、\`recipe/\`、\`advancement/\` 与 \`lang/zh_cn.json\`；`
    + '宝可梦中文名取自本站图鉴数据（PokeAPI）。掉落数量区间来自战利品表的 `set_count` 函数，未做概率换算——权重相同的条目在表里等概率。',
)
P()

const out = lines.join('\n')
fs.writeFileSync('content/guides/legendary-monuments.md', out)
console.log(`wrote content/guides/legendary-monuments.md  ${(out.length / 1024).toFixed(1)}KB  ${lines.length} lines  mod=${MOD_VERSION || 'unknown'}`)
console.log(`structures=${structureFile.size} sets=${setSpacing.size} chests=${LOOT.size} recipes=${RECIPE.size}`)