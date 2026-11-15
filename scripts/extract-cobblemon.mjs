/**
 * 从 Cobblemon 本体 + 整合包里的形态扩展 mod 中提取「方可梦」像素建模
 *
 * 数据来源（都可从「Lets go cobblemon master 6.0.2」整合包清单里追到）：
 *   1. Cobblemon 本体 1.8.4 —— 905 个已实装物种的全部形态
 *   2. Mega Showdown 1.3.x —— 超级进化 / 超极巨化 / 太晶帽子等附加模型
 *   3. ZA Megas 1.8.x —— 《宝可梦传说 Z-A》新增的超级进化
 *
 * 输出：
 *   public/cobblemon/{dex}/{模型}.geo.json          Bedrock 几何
 *   public/cobblemon/{dex}/{贴图}.png               贴图（含闪光）
 *   public/cobblemon/{dex}/anim.json                待机动画（每个物种一份）
 *   src/data/cobblemon.json       → { "25": { species, animation, forms: [{ key, label, model, texture, shiny, source }] } }
 *   src/data/cobblemon-meta.json  → 统计
 *
 * 前置：各 jar 已解压到 .cache/{cobblemon,mega,zamega}/
 */
import fs from 'node:fs';
import path from 'node:path';

const CACHE = path.resolve('.cache');
const OUT = path.resolve('public/cobblemon');

const SOURCES = [
  {
    name: 'Cobblemon',
    assets: path.join(CACHE, 'cobblemon/assets/cobblemon'),
    models: path.join(CACHE, 'cobblemon/assets/cobblemon/bedrock/pokemon/models'),
    textures: path.join(CACHE, 'cobblemon/assets/cobblemon/textures/pokemon'),
    animations: path.join(CACHE, 'cobblemon/assets/cobblemon/bedrock/pokemon/animations'),
    species: path.join(CACHE, 'cobblemon/data/cobblemon/species'),
    resolvers: path.join(CACHE, 'cobblemon/assets/cobblemon/bedrock/pokemon/resolvers'),
  },
  {
    name: 'Mega Showdown',
    assets: path.join(CACHE, 'mega/assets/cobblemon'),
    models: path.join(CACHE, 'mega/assets/cobblemon/bedrock/pokemon/models'),
    textures: path.join(CACHE, 'mega/assets/cobblemon/textures/pokemon'),
    animations: path.join(CACHE, 'mega/assets/cobblemon/bedrock/pokemon/animations'),
    resolvers: path.join(CACHE, 'mega/assets/cobblemon/bedrock/pokemon/resolvers'),
  },
  {
    name: 'Z-A Megas',
    assets: path.join(CACHE, 'zamega/assets/cobblemon'),
    models: path.join(CACHE, 'zamega/assets/cobblemon/bedrock/pokemon/models'),
    textures: path.join(CACHE, 'zamega/assets/cobblemon/textures/pokemon'),
    animations: path.join(CACHE, 'zamega/assets/cobblemon/bedrock/pokemon/animations'),
    resolvers: path.join(CACHE, 'zamega/assets/cobblemon/bedrock/pokemon/resolvers'),
  },
  {
    // JoStar「大集合」资源包：补齐本体未实装的 43 只（时拉比、悖谬种等）
    name: 'JoStar',
    assets: path.join(CACHE, 'jo2/assets/cobblemon'),
    models: path.join(CACHE, 'jo2/assets/cobblemon/bedrock/pokemon/models'),
    textures: path.join(CACHE, 'jo2/assets/cobblemon/textures/pokemon'),
    animations: path.join(CACHE, 'jo2/assets/cobblemon/bedrock/pokemon/animations'),
    resolvers: path.join(CACHE, 'jo2/assets/cobblemon/bedrock/pokemon/resolvers'),
  },
];

// 形态后缀 → 中文名（用于 UI 上的形态切换）
const FORM_LABELS = {
  male: '雄性', female: '雌性',
  alola: '阿罗拉形态', galar: '伽勒尔形态', hisui: '洗翠形态', paldea: '帕底亚形态',
  mega: '超级进化', mega_x: '超级进化 X', mega_y: '超级进化 Y', mega_z: '超级进化 Z',
  megax: '超级进化 X', megay: '超级进化 Y', 'mega-x': '超级进化 X', 'mega-y': '超级进化 Y',
  gmax: '超极巨化', gigantamax: '超极巨化',
  totem: '霸主', partner: '搭档', starter: '初始',
  east: '东海', west: '西海', plant: '草木蓑衣', sandy: '砂土蓑衣', trash: '垃圾蓑衣',
  overcast: '阴天形态', sunshine: '晴天形态',
  black: '黑', white: '白', blue: '蓝', red: '红', orange: '橙', yellow: '黄', green: '绿',
  pink: '粉', purple: '紫', brown: '棕', gray: '灰',
  attack: '攻击形态', defense: '防御形态', speed: '速度形态', normal: '普通形态',
  origin: '起源形态', altered: '变化形态', therian: '灵兽形态', incarnate: '化身形态',
  sky: '天空形态', land: '陆上形态', zen: '达摩形态', standard: '普通形态',
  complete: '完全体', '10': '10%', '50': '50%', ange: '天使形态', mega_za: '超级进化',
};

function labelFor(key) {
  if (FORM_LABELS[key]) return FORM_LABELS[key];
  const parts = key.split(/[_-]/).filter(Boolean);
  if (!parts.length) return '默认';
  return parts.map(p => FORM_LABELS[p] ?? p).join(' · ');
}

function readImplemented(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const gen of fs.readdirSync(dir)) {
    const gdir = path.join(dir, gen);
    if (!fs.statSync(gdir).isDirectory()) continue;
    for (const f of fs.readdirSync(gdir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(gdir, f), 'utf8'));
        if (typeof j.nationalPokedexNumber === 'number') {
          map.set(j.nationalPokedexNumber, { name: j.name, implemented: j.implemented === true });
        }
      } catch {}
    }
  }
  return map;
}

const normSpecies = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const normModel = (s) => path.basename(String(s)).replace(/^[a-z_]+:/, '').replace(/\.geo(\.json)?$/i, '').toLowerCase();

/**
 * Cobblemon 的 resolver 才是「形态 → 模型 + 贴图」的权威映射。
 * 光按模型名猜贴图会错配，例如超级喷火龙 X 用的是 megacharizardx.png，
 * 猜出来就成了超极巨化的贴图。
 */
function readResolvers(src) {
  const map = new Map(); // `${species}|${model}` → { texture, shiny }
  if (!src.resolvers || !fs.existsSync(src.resolvers)) return map;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.json')) continue;
      let j;
      try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
      const species = normSpecies(String(j.species || '').split(':').pop());
      // variations 是「按顺序叠加」的：闪光变体往往只写 texture，不写 model，
      // 此时它继承前一个变体的模型——所以必须顺序迭代并记住当前模型。
      let curModel = null;
      for (const v of j.variations || []) {
        if (v.model) curModel = normModel(v.model);
        if (!curModel) continue;
        const key = `${species}|${curModel}`;
        const shiny = (v.aspects || []).includes('shiny');
        // alpha_eyes 之类只是发光眼贴图叠加，不是独立形态，跳过以免抢走基础形态的 aspects
        if ((v.aspects || []).includes('alpha_eyes')) continue;
        const tex = v.texture ? path.join(src.assets, String(v.texture).replace(/^[a-z_]+:/, '')) : null;
        const cur = map.get(key) || { texture: null, shiny: null, aspects: [] };
        if (tex && shiny && !cur.shiny) cur.shiny = tex;
        if (tex && !shiny && !cur.texture) {
          cur.texture = tex;
          cur.aspects = (v.aspects || []).filter(a => a !== 'shiny');
        }
        if (!cur.aspects.length && (v.aspects || []).length) {
          const nonShiny = (v.aspects || []).filter(a => a !== 'shiny');
          if (nonShiny.length) cur.aspects = nonShiny;
        }
        map.set(key, cur);
      }
    }
  };
  walk(src.resolvers);
  return map;
}

/**
 * 渲染附加数据（layers + poser transformedParts），按 Cobblemon 的 resolver 语义求值：
 * 同一物种的所有 resolver 文件按 order 合并成一条 variations 链，
 * 对给定的 aspects 集合，每个字段（layers / poser）取「最后一个 aspects 全部命中且该字段非空」的变体。
 */
function readResolverChains() {
  const chains = new Map(); // normSpecies → [{ order, si, file, variations }]
  SOURCES.forEach((src, si) => {
    if (!src.resolvers || !fs.existsSync(src.resolvers)) return;
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!e.name.endsWith('.json')) continue;
        let j;
        try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
        const species = normSpecies(String(j.species || '').split(':').pop());
        if (!species) continue;
        const list = chains.get(species) ?? [];
        list.push({ order: Number(j.order) || 0, si, file: e.name, variations: j.variations || [] });
        chains.set(species, list);
      }
    };
    walk(src.resolvers);
  });
  for (const list of chains.values()) list.sort((a, b) => a.order - b.order || a.si - b.si || a.file.localeCompare(b.file));
  return chains;
}

function resolveField(chain, aspects, field, si = null) {
  // 先只看与模型同来源的 resolver（同一个包里的 resolver / poser / 动画是配套的）；
  // 该来源没有给出这个字段时，再看所有来源合并后的链
  if (si != null) {
    const own = resolveField((chain || []).filter(f => f.si === si), aspects, field);
    if (own != null) return own;
  }
  let out = null;
  for (const file of chain || []) {
    for (const v of file.variations) {
      if (v[field] == null) continue;
      if ((v.aspects || []).every(a => aspects.has(a))) out = v[field];
    }
  }
  return out;
}

/** 所有来源的 poser：名字 → [{ si, path }] */
function readPosers() {
  const map = new Map();
  SOURCES.forEach((src, si) => {
    const dir = path.join(src.assets, 'bedrock/pokemon/posers');
    if (!fs.existsSync(dir)) return;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!e.name.endsWith('.json')) continue;
        const name = e.name.replace(/\.json$/, '').toLowerCase();
        const list = map.get(name) ?? [];
        list.push({ si, path: p });
        map.set(name, list);
      }
    };
    walk(dir);
  });
  return map;
}

/**
 * 选出「展示用的静止姿势」：模组在图鉴 / 队伍界面里用 PROFILE、PORTRAIT，
 * 野外默认是 NONE / STAND。水中、战斗、骑乘、空中这些条件姿势一律排除。
 */
function pickDisplayPose(poser) {
  const poses = Object.entries(poser?.poses || {});
  const ok = ([, p]) => {
    if (p.isTouchingWater === true || p.isUnderWater === true || p.isBattle === true) return false;
    const c = String(p.condition || '');
    if (/(^|[^!])q\.(is_ridden|in_air|is_gliding|is_sprinting)/.test(c)) return false;
    return true;
  };
  const has = (t) => ([, p]) => (p.poseTypes || []).includes(t);
  for (const t of ['PROFILE', 'PORTRAIT', 'NONE', 'STAND']) {
    const hit = poses.filter(ok).find(has(t));
    if (hit) return hit;
  }
  return null;
}

const resolverChains = readResolverChains();
const posers = readPosers();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const implemented = readImplemented(SOURCES[0].species);
const manifest = {};
const stats = { species: 0, forms: 0, models: 0, textures: 0, animations: 0, layerForms: 0, layerTextures: 0, layerBytes: 0, poserForms: 0, poserIdle: 0, animLowMatch: [], bySource: {} };
const noTexture = [];

// 每个图鉴编号的形态累积；base 优先，后加的来源追加
const perDex = new Map();

for (const src of SOURCES) {
  if (!fs.existsSync(src.models)) {
    console.warn(`跳过缺失来源：${src.name}`);
    continue;
  }
  stats.bySource[src.name] = { forms: 0, models: 0 };
  const resolvers = readResolvers(src);
  const dirs = fs.readdirSync(src.models, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const d of dirs) {
    const m = d.name.match(/^(\d+)_(.+)$/);
    if (!m) continue;
    const dex = Number(m[1]);
    if (!(dex >= 1 && dex <= 1025)) continue; // 资源包里偶有 0_/9998_ 之类的占位目录
    const species = m[2];
    const mdir = path.join(src.models, d.name);
    const tdir = path.join(src.textures, d.name);
    const models = fs.readdirSync(mdir).filter(f => f.endsWith('.geo.json')).sort();
    const texs = new Set(fs.existsSync(tdir) ? fs.readdirSync(tdir).filter(f => f.endsWith('.png')) : []);
    if (!texs.size && !resolvers.size) { noTexture.push(`${src.name}:${d.name}`); continue; }

    const entry = perDex.get(dex) ?? { species, forms: [], sources: new Set() };
    perDex.set(dex, entry);
    entry.sources.add(src.name);

    for (const file of models) {
      const base = file.replace(/\.geo\.json$/, '').replace(/_(male|female)$/, '');
      const resolved = resolvers.get(`${normSpecies(species)}|${normModel(file)}`) || null;
      // resolver 里的 aspects 才是形态的权威标识（例如 venusaurmega 模型对应 aspect=mega）
      const aspectKey = resolved?.aspects?.length ? resolved.aspects.join('_') : null;
      const guessed = base === species ? 'male' : base.startsWith(species + '_') ? base.slice(species.length + 1) : base;
      const key = aspectKey || guessed;
      if (entry.forms.some(f => f.key === key)) continue; // 本体优先，扩展来源不覆盖

      // 贴图配对：resolver 权威映射 → 模型名 → 物种名 → 任意非闪光贴图
      let texturePath = null;
      let shinyPath = null;
      if (resolved?.texture && fs.existsSync(resolved.texture)) {
        texturePath = resolved.texture;
        if (resolved.shiny && fs.existsSync(resolved.shiny)) shinyPath = resolved.shiny;
      }
      if (!texturePath) {
        const candidates = [
          `${base}.png`, `${species}.png`,
          ...[...texs].filter(t => !t.includes('_shiny') && !t.includes('_alpha')),
        ];
        const texture = candidates.find(c => texs.has(c)) ?? null;
        if (!texture) continue;
        texturePath = path.join(tdir, texture);
        const shinyCandidates = [
          `${base}_shiny.png`, `${species}_shiny.png`, texture.replace(/\.png$/, '_shiny.png'),
        ];
        const shiny = shinyCandidates.find(c => texs.has(c)) ?? null;
        if (shiny) shinyPath = path.join(tdir, shiny);
      }
      const texture = path.basename(texturePath);
      const shiny = shinyPath ? path.basename(shinyPath) : null;

      entry.forms.push({
        key, label: labelFor(key), model: file, texture, shiny, source: src.name,
        mdir, texturePath, shinyPath, aspects: resolved?.aspects ?? [], si: SOURCES.indexOf(src),
      });
      stats.models++;
      stats.bySource[src.name].models++;
      stats.bySource[src.name].forms++;
    }
  }
}

// 拷贝文件并生成清单
for (const [dex, entry] of [...perDex.entries()].sort((a, b) => a[0] - b[0])) {
  const outDir = path.join(OUT, String(dex));
  fs.mkdirSync(outDir, { recursive: true });

  const forms = [];
  const copied = new Set();
  const layerFiles = new Map(); // 输出文件名 → 源路径
  const animDirName = `${String(dex).padStart(4, '0')}_${entry.species}`;
  // 列出所有候选动画文件：按「候选名优先」（先最具体的文件名，再退到更通用的），
  // 同名时优先形态自己所在的来源。按来源优先会让本体的 mawile.animation.json
  // 抢在 Mega Showdown 的 mawile_mega.animation.json 前面。
  const animCandidates = (names, si = 0) => {
    const dirs = SOURCES.map((s, i) => ({ dir: s.animations, i }))
      .filter(x => x.dir)
      .sort((a, b) => (a.i === si ? -1 : b.i === si ? 1 : a.i - b.i));
    const out = [];
    for (const n of names) {
      for (const { dir } of dirs) {
        const p = path.join(dir, animDirName, n);
        if (fs.existsSync(p) && !out.includes(p)) out.push(p);
      }
    }
    return out;
  };
  /** 选出待机动画：poser 展示姿势引用的优先，否则按名字猜 ground_idle → *.idle → 第一条 */
  const pickIdle = (anims, poseAnimKeys) => {
    const names = Object.keys(anims);
    const fromPoser = poseAnimKeys.filter(k => anims[k]);
    if (fromPoser.length) return { idle: fromPoser, fromPoser: true };
    const guess = names.find(n => /ground_idle$/i.test(n)) || names.find(n => /(^|\.)idle$/i.test(n)) || names[0];
    return { idle: guess ? [guess] : [], fromPoser: false };
  };
  for (const f of entry.forms) {
    const modelAbs = path.join(f.mdir, f.model);
    fs.copyFileSync(modelAbs, path.join(outDir, f.model));
    const copyTex = (abs, name) => {
      if (!abs || !fs.existsSync(abs) || copied.has(name)) return;
      fs.copyFileSync(abs, path.join(outDir, name));
      copied.add(name);
      stats.textures++;
    };
    copyTex(f.texturePath, f.texture);
    copyTex(f.shinyPath, f.shiny);

    // ── poser：选出展示姿势，它决定待机动画与 transformedParts ──
    const chain = resolverChains.get(normSpecies(entry.species));
    const aspectSet = new Set(f.aspects);
    const poserRef = resolveField(chain, aspectSet, 'poser', f.si);
    const poserName = String(poserRef || entry.species).replace(/^[a-z_]+:/, '').toLowerCase();
    const poserHits = posers.get(poserName) || [];
    const poserHit = poserHits.find(h => h.si === f.si) || poserHits[0];
    let picked = null;
    if (poserHit) {
      try { picked = pickDisplayPose(JSON.parse(fs.readFileSync(poserHit.path, 'utf8'))); } catch { /* poser 解析失败就不带姿势数据 */ }
    }
    const pose = picked ? picked[0] : null;
    /** 展示姿势里无条件播放的 bedrock 动画：新格式 q.bedrock('g','n')，旧格式 bedrock(g, n) */
    const poseAnimKeys = (picked?.[1]?.animations || [])
      .filter(a => typeof a === 'string')
      .map(a => a.match(/^\s*(?:q\.)?bedrock\(\s*'?([\w.-]+)'?\s*,\s*'?([\w.-]+)'?/))
      .filter(Boolean)
      .map(m => `animation.${m[1]}.${m[2]}`);

    // 每个形态优先用它自己的动画（超级进化 / 超极巨化的骨骼与基础形态不同）。
    // 同一个动画组名可能在多个来源里各有一份（例如 JoStar 的帕底亚肯泰罗 poser 引用 'tauros'，
    // 而本体的 tauros.animation.json 是普通肯泰罗的），所以用「待机动画驱动的骨骼有多少真的存在于本模型」
    // 来校验：按优先级取第一个覆盖率 ≥90% 的候选，都不达标则取覆盖率最高的。
    const modelBase = f.model.replace(/\.geo\.json$/, '');
    const poserGroups = [...new Set(poseAnimKeys.map(k => k.split('.')[1]))];
    const candidates = animCandidates([
      ...poserGroups.map(g => `${g}.animation.json`), // poser 展示姿势引用的动画组
      `${modelBase}.animation.json`,
      `${entry.species}_${f.key}.animation.json`,
      `${entry.species}.animation.json`,
      `${entry.species}_male.animation.json`,
    ], f.si);
    let modelBones = new Set();
    try {
      const g = JSON.parse(fs.readFileSync(modelAbs, 'utf8'))['minecraft:geometry']?.[0];
      modelBones = new Set((g?.bones || []).map(b => b.name));
    } catch { /* 模型解析失败时不做骨骼校验 */ }
    let best = null;
    for (const p of candidates) {
      let j;
      try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
      const anims = j.animations || {};
      const { idle, fromPoser } = pickIdle(anims, poseAnimKeys);
      const bones = new Set(idle.flatMap(n => Object.keys(anims[n]?.bones || {})));
      const hit = [...bones].filter(b => modelBones.has(b)).length;
      const ratio = bones.size ? hit / bones.size : 0;
      const c = { p, j, anims, idle, fromPoser, ratio };
      if (!best || ratio > best.ratio) best = c;
      if (ratio >= 0.9) { best = c; break; }
    }
    if (best && best.ratio < 0.9) stats.animLowMatch.push(`${dex}/${f.key} ${(best.ratio * 100).toFixed(0)}%`);
    let animation = null;
    if (best) {
      const safeKey = f.key.replace(/[^A-Za-z0-9_-]/g, '_');
      animation = `anim_${safeKey}.json`;
      if (!copied.has(animation)) {
        // 只保留展示姿势的待机动画与眨眼：原始动画文件里几十条 cry/walk/battle
        // 动画我们用不到，全量拷贝会让产物膨胀三四倍。
        const { j, anims, idle, fromPoser } = best;
        if (fromPoser) stats.poserIdle++;
        const keep = {};
        for (const n of idle) keep[n] = anims[n];
        for (const n of Object.keys(anims)) if (/blink/i.test(n)) keep[n] = anims[n];
        const slim = { format_version: j.format_version ?? '1.8.0', animations: keep };
        // 非 Bedrock 字段：告诉渲染器哪几条是展示姿势的待机动画（按 poser 顺序叠加）
        if (fromPoser) slim.pokewiki = { idle, pose };
        fs.writeFileSync(path.join(outDir, animation), JSON.stringify(slim));
        copied.add(animation);
        stats.animations++;
      }
    }
    // ── 渲染附加数据：resolver layers + 展示姿势的 transformedParts ──
    const findAsset = (ref) => {
      const rel = String(ref).replace(/^[a-z_]+:/, '');
      const order = [f.si, ...SOURCES.map((_, i) => i).filter(i => i !== f.si)];
      for (const i of order) {
        const p = path.join(SOURCES[i].assets, rel);
        if (fs.existsSync(p)) return p;
      }
      return null;
    };
    const exportLayers = (raw) => {
      const out = [];
      for (const L of raw || []) {
        if (!L || L.enabled === false) continue;
        if (L.name === 'alpha_eyes') continue; // 头目（alpha）专属的发光眼，不属于普通个体
        const tex = L.texture;
        const refs = typeof tex === 'string' ? [tex] : Array.isArray(tex?.frames) ? tex.frames : [];
        const abs = refs.map(findAsset);
        if (!abs.length || abs.some(a => !a)) continue;
        const name = String(L.name ?? `layer${out.length}`);
        const safe = name.replace(/[^A-Za-z0-9_-]/g, '_');
        const multi = abs.length > 1;
        // 同名但来源不同的层贴图（例如喷火龙本体与超极巨化的 flame）用 -2/-3 区分
        let frames = null;
        for (let k = 1; !frames; k++) {
          const stem = `layer_${safe}${k > 1 ? `-${k}` : ''}`;
          const names = abs.map((_, i) => `${stem}${multi ? `_${i}` : ''}.png`);
          if (names.every((n, i) => !layerFiles.has(n) || layerFiles.get(n) === abs[i])) frames = names;
        }
        frames.forEach((n, i) => {
          if (layerFiles.has(n)) return;
          fs.copyFileSync(abs[i], path.join(outDir, n));
          layerFiles.set(n, abs[i]);
          stats.layerTextures++;
          stats.layerBytes += fs.statSync(abs[i]).size;
        });
        out.push({
          name,
          emissive: L.emissive === true,
          translucent: L.translucent === true || L.translucent_cull === true,
          fps: typeof tex === 'object' && tex ? Number(tex.fps) || 0 : 0,
          loop: typeof tex === 'object' && tex ? tex.loop !== false : true,
          frames,
        });
      }
      return out;
    };
    const layers = exportLayers(resolveField(chain, aspectSet, 'layers'));
    const shinyLayers = exportLayers(resolveField(chain, new Set([...aspectSet, 'shiny']), 'layers'));

    let parts = [];
    if (picked) {
      parts = (picked[1].transformedParts || [])
        .filter(t => t && typeof t.part === 'string')
        .map(t => {
          const o = { part: t.part };
          if (Array.isArray(t.position)) o.position = t.position.map(Number);
          if (Array.isArray(t.rotation)) o.rotation = t.rotation.map(Number);
          const vis = t.isVisible ?? t.visible;
          if (typeof vis === 'boolean') o.isVisible = vis;
          return o;
        })
        .filter(o => o.position || o.rotation || 'isVisible' in o);
    }

    let render = null;
    if (layers.length || shinyLayers.length || parts.length) {
      const safeKey = f.key.replace(/[^A-Za-z0-9_-]/g, '_');
      render = `render_${safeKey}.json`;
      const sidecar = { layers };
      if (JSON.stringify(shinyLayers) !== JSON.stringify(layers)) sidecar.shinyLayers = shinyLayers;
      if (parts.length) Object.assign(sidecar, { poser: poserName, pose, parts });
      fs.writeFileSync(path.join(outDir, render), JSON.stringify(sidecar));
      if (layers.length) stats.layerForms++;
      if (parts.length) stats.poserForms++;
    }

    forms.push({ key: f.key, label: f.label, model: f.model, texture: f.texture, shiny: f.shiny, animation, render, source: f.source });
  }

  forms.sort((a, b) => {
    const rank = (f) => (f.key === 'male' ? 0 : f.key === 'default' ? 1 : f.key === 'female' ? 2 : 3);
    return rank(a) - rank(b);
  });
  // 「male」只是模组里基础模型的文件名后缀：只有同时存在独立的雌性模型时才标「雄性」，
  // 否则（无性别 / 雌雄同模）标为「默认」
  if (!forms.some(f => f.key === 'female')) {
    for (const f of forms) if (f.key === 'male') f.label = '默认';
  }

  // 待机动画：本体每个物种一份 animation json
  // 动画已经按形态各自拷贝为 anim_<key>.json
  manifest[dex] = { species: entry.species, forms };
  stats.species++;
  stats.forms += forms.length;
}

fs.writeFileSync(path.resolve('src/data/cobblemon.json'), JSON.stringify(manifest));

const missing = [];
for (const [dex, info] of implemented) if (!info.implemented) missing.push(dex);

const meta = {
  version: 'Cobblemon 1.8.4 + Mega Showdown + Z-A Megas + JoStar 大集合',
  species: stats.species,
  forms: stats.forms,
  models: stats.models,
  textures: stats.textures,
  animations: stats.animations,
  layerForms: stats.layerForms,
  layerTextures: stats.layerTextures,
  poserForms: stats.poserForms,
  implementedFalse: missing.length,
  bySource: stats.bySource,
};
fs.writeFileSync(path.resolve('src/data/cobblemon-meta.json'), JSON.stringify(meta, null, 2));

const size = fs.readdirSync(OUT, { recursive: true })
  .map(f => path.join(OUT, String(f)))
  .filter(f => fs.statSync(f, { throwIfNoEntry: false })?.isFile())
  .reduce((a, f) => a + fs.statSync(f).size, 0);

console.log(`物种 ${meta.species} 只 / 形态 ${meta.forms} 个 / 模型 ${meta.models} 个 / 贴图 ${meta.textures} 张 / 动画 ${meta.animations} 份`);
console.log(`layers：${stats.layerForms} 个形态 / ${stats.layerTextures} 张层贴图 / ${(stats.layerBytes / 1024 / 1024).toFixed(2)}MB；poser transformedParts：${stats.poserForms} 个形态；待机动画取自 poser：${stats.poserIdle} 份`);
console.log(`动画骨骼覆盖率 <90% 的形态：${stats.animLowMatch.length}`, stats.animLowMatch.slice(0, 20).join(', '));
console.log('按来源：', JSON.stringify(meta.bySource));
console.log(`Cobblemon 中 implemented=false 的物种：${missing.length}`);
console.log(`缺贴图目录：${noTexture.length}`, noTexture.slice(0, 6).join(', '));
console.log(`产物体积 ${(size / 1024 / 1024).toFixed(1)}MB → public/cobblemon/`);