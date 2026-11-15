/**
 * 生成攻略 content/guides/special-locations.md：按「特殊地形 / 维度」与「特殊建筑 / 结构」整理整合包里的特殊方可梦获取方式。
 *
 * 数据全部来自 src/data/special.json（scripts/build-special.mjs，读取整合包内所有 spawn_pool_world、
 * 传说遗迹召唤、化石、团体战巢穴与首领数据），这里只做分组与排版，不手写物种特例。
 * 改数据后重跑：node scripts/build-special.mjs && node scripts/build-location-guide.mjs
 */
import fs from 'node:fs';

const special = JSON.parse(fs.readFileSync('src/data/special.json', 'utf8'));
const dexRaw = JSON.parse(fs.readFileSync('src/data/pokedex.json', 'utf8'));
const NAME = new Map((Array.isArray(dexRaw) ? dexRaw : Object.values(dexRaw)).map(p => [p.id, p.name.zh]));
const link = (dex) => `[${NAME.get(dex) || `#${dex}`}](/pokedex/${dex}/)`;
const fact = (e, k) => e.facts.filter(f => f.k === k).map(f => f.v);
const uniq = (a) => [...new Set(a.filter(Boolean))];
const cell = (a, max = 2) => {
  const u = uniq(a);
  return u.length ? u.slice(0, max).join(' / ') + (u.length > max ? ' 等' : '') : '—';
};
/** 稀有度 + 等级 + 时间等条件压成一列 */
const conditions = (e) => {
  const parts = [];
  for (const k of ['时间', '光照', '高度', '天气', '月相', '附近方块', '脚下方块']) {
    const v = uniq(fact(e, k));
    if (v.length) parts.push(`${k}：${v.slice(0, 2).join(' / ')}${v.length > 2 ? ' 等' : ''}`);
  }
  return parts.join('；') || '—';
};
const esc = (s) => String(s).replace(/\|/g, '／');

/** 收集所有方可梦条目 */
const all = [];
for (const [d, v] of Object.entries(special)) for (const e of v.cobblemon || []) all.push({ dex: Number(d), ...e });
const byDex = (a, b) => a.dex - b.dex;

function table(rows, cols) {
  const head = `| ${cols.map(c => c[0]).join(' | ')} |\n|${cols.map(() => '---').join('|')}|`;
  return [head, ...rows.map(r => `| ${cols.map(c => esc(c[1](r))).join(' | ')} |`)].join('\n');
}
const spawnCols = [
  ['宝可梦', r => link(r.dex)],
  ['形态', r => cell(fact(r, '形态'))],
  ['稀有度', r => cell(fact(r, '稀有度'))],
  ['等级', r => cell(fact(r, '等级'))],
  ['条件', r => conditions(r)],
];
/** 同一物种在同一地点有多条记录时合并成一行 */
function mergeByDex(list) {
  const m = new Map();
  for (const e of list) {
    const cur = m.get(e.dex);
    if (!cur) m.set(e.dex, { ...e, facts: [...e.facts] });
    else cur.facts.push(...e.facts);
  }
  return [...m.values()].sort(byDex);
}

const out = [];
const today = new Date().toISOString().slice(0, 10);
out.push(`---
title: 特殊地形与建筑：去哪里抓那些「刷不到」的方可梦
slug: special-locations
order: 3.5
summary: 狩猎地带、传说遗迹、林地府邸、沉船湾、团体战巢穴……按地点整理整合包里的特殊获取方式
tags: [地点, 结构, 维度, 传说, 整合包]
updated: ${today}
sources:
  - https://wiki.cobblemon.com/index.php/Pok%C3%A9mon/Spawning
  - https://modrinth.com/mod/legendary-monuments
  - https://modrinth.com/mod/cobblemon-raid-dens
---

> 本页由 \`scripts/build-location-guide.mjs\` 从整合包「Lets go cobblemon master 6.0.2」的数据文件自动生成：Cobblemon 本体、Mega Showdown、Z-A Megas、JoStar 大集合 / 挑战系列数据包、传说遗迹（Legendary Monuments）。
> 表里的稀有度、等级、时间、光照、高度都是数据里的原始条件；点宝可梦名字可以看它的完整生成规则与其他获取方式。

## 先说找路：怎么到这些地方

- **结构**：整合包装了「探险家指南针」（Explorer's Compass），合成后右键选择结构名即可指向最近的林地府邸、沉船、古迹废墟等；开了作弊也可以用 \`/locate structure <结构ID>\`。
- **群系**：「自然指南针」（Nature's Compass）同理，用来找繁茂洞穴、樱花树林等群系。
- **生成范围**：方可梦只会在你周围 16–64 格内生成（见「生成机制」攻略），到了结构里要**在结构内部走动**，站在门口等效率很低。
- **整合包没有的联动**：Cobblemon 本体自带天境（The Aether）、蜂巢（The Bumblezone）的联动生成表，但本整合包没有装这两个模组，那部分宝可梦不会出现，下面也不列。
`);

/* ---------- 一、狩猎地带 ---------- */
const safari = all.filter(e => e.title === '狩猎地带');
if (safari.length) {
  const areas = new Map();
  for (const e of safari) {
    const area = fact(e, '群系').find(v => v.startsWith('狩猎地带')) || '狩猎地带（其他区域）';
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area).push(e);
  }
  const species = new Set(safari.map(e => e.dex));
  out.push(`## 一、狩猎地带（Cobble Safari）

狩猎地带是 Cobble Safari 模组的专属区域，生成表按**属性分区**（数据里的群系名就是「虫区」「龙区」……）：每个区只刷对应属性的宝可梦，适合定向刷某一属性。全区共 **${species.size}** 种宝可梦的生成规则来自 JoStar 数据包。
`);
  const order = [...areas.keys()].sort((a, b) => a.localeCompare(b, 'zh'));
  for (const area of order) {
    const rows = mergeByDex(areas.get(area));
    out.push(`### ${area}（${rows.length} 种）\n\n${table(rows, spawnCols)}\n`);
  }
}

/* ---------- 二、传说遗迹 ---------- */
const summon = all.filter(e => e.kind === 'summon').sort(byDex);
const lmMap = all.filter(e => e.title === '传说遗迹维度');
if (summon.length || lmMap.length) {
  out.push(`## 二、传说遗迹（Legendary Monuments）

传说遗迹模组在世界里生成专属遗迹建筑，传说 / 幻之宝可梦**不会随机刷新**，而是在遗迹里的专属基座上使用对应道具召唤；部分遗迹会把你带进专属维度。
`);
  if (summon.length) {
    out.push(`### 基座召唤（${summon.length} 种）\n\n${table(summon, [
      ['宝可梦', r => link(r.dex)],
      ['所在遗迹', r => cell(fact(r, '所在结构'))],
      ['专属基座', r => cell(fact(r, '专属基座'))],
      ['召唤道具', r => cell(fact(r, '召唤道具'), 3)],
    ])}\n`);
  }
  if (lmMap.length) {
    const groups = new Map();
    for (const e of lmMap) for (const g of uniq(fact(e, '群系')).length ? uniq(fact(e, '群系')) : ['传说遗迹维度']) {
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(e);
    }
    out.push(`### 遗迹维度里的野生宝可梦\n\n召唤仪式所在的维度（扭曲世界、起源大厅等）也有自己的生成表：\n`);
    for (const [g, list] of groups) out.push(`#### ${g}\n\n${table(mergeByDex(list), spawnCols)}\n`);
  }
}

/* ---------- 三、特殊建筑 ---------- */
const structures = all.filter(e => e.kind === 'structure' && e.title !== '狩猎地带');
if (structures.length) {
  const groups = new Map();
  for (const e of structures) {
    if (!groups.has(e.title)) groups.set(e.title, []);
    groups.get(e.title).push(e);
  }
  const ranked = [...groups].map(([t, l]) => [t, mergeByDex(l)]).sort((a, b) => b[1].length - a[1].length);
  out.push(`## 三、特殊建筑与结构

下面这些宝可梦只在**特定结构里或附近**生成（条件里写了结构，或用了结构专属的生成预设，比如林地府邸要求周围有府邸的方块）。按每个结构的物种数排序。

| 结构 | 物种数 |
|---|---|
${ranked.map(([t, l]) => `| ${esc(t)} | ${l.length} |`).join('\n')}
`);
  for (const [t, rows] of ranked) out.push(`### ${t}（${rows.length} 种）\n\n${table(rows, spawnCols)}\n`);
}

/* ---------- 四、化石 ---------- */
const fossils = all.filter(e => e.kind === 'fossil').sort(byDex);
if (fossils.length) {
  out.push(`## 四、化石复活

拿到对应的化石或道具后放进化石分析仪即可复活。整合包里（含 JoStar 数据包新增的配方）共 ${fossils.length} 种：

${table(fossils, [['宝可梦', r => link(r.dex)], ['需要的化石 / 道具', r => cell(fact(r, '道具'), 3)]])}
`);
}

/* ---------- 五、团体战巢穴 ---------- */
const raids = all.filter(e => e.kind === 'raid');
if (raids.length) {
  const by = (pred) => mergeByDex(raids.filter(pred));
  const tera7 = by(e => e.title.startsWith('太晶团体战') && fact(e, '星级').includes('★7'));
  const special = by(e => fact(e, '巢穴').some(v => v.startsWith('专属巢穴')));
  const mega = by(e => e.title.startsWith('超级进化团体战'));
  const gmax = by(e => e.title.includes('超极巨化'));
  out.push(`## 五、团体战巢穴（Cobblemon Raid Dens）

世界里会生成**团体战巢穴**，进入后与首领对战，击败后可以尝试捕捉。JoStar 数据包为巢穴补充了太晶、超级进化、极巨化三类首领：

- 超级进化团体战：**${mega.length}** 种（首领直接以超级进化形态出现，击败后掉落进化石）
- 超极巨化团体战：**${gmax.length}** 种
- ★7 太晶团体战：**${tera7.length}** 种（多为传说宝可梦）
- 有**专属巢穴**（专门的战斗场地）的：**${special.length}** 种

### 专属巢穴

${table(special, [['宝可梦', r => link(r.dex)], ['星级', r => cell(fact(r, '星级'))], ['太晶属性', r => cell(fact(r, '太晶属性'))], ['巢穴', r => cell(fact(r, '巢穴'))]])}

### ★7 太晶团体战

${table(tera7, [['宝可梦', r => link(r.dex)], ['太晶属性', r => cell(fact(r, '太晶属性'))], ['巢穴', r => cell(fact(r, '巢穴'))]])}

### 超极巨化团体战

${gmax.map(r => link(r.dex)).join('、')}

### 超级进化团体战

${mega.map(r => link(r.dex)).join('、')}
`);
}

/* ---------- 六、首领战 ---------- */
const bosses = all.filter(e => e.kind === 'boss');
if (bosses.length) {
  const megaDrops = mergeByDex(bosses.filter(e => /超级进化|原始回归/.test(e.title)));
  out.push(`## 六、野外首领战（Cobblemon Boss）

JoStar 数据包里的首领会在野外随机出现（陆地、空中、水面、岩浆表面等，按首领各自的设定）。**首领不能捕捉**（模组提示「这个宝可梦太过于强大，好像捕捉不了」），但击败后会掉落扭蛋币、进化石、极巨糖果等；每个首领还有更稀有的闪光版本。共 ${new Set(bosses.map(e => e.dex)).size} 种宝可梦有首领版本。

### 掉落进化石 / 原始回归道具的首领

${table(megaDrops, [['宝可梦', r => link(r.dex)], ['首领形态', r => cell(uniq(r.facts.filter(f => f.k === '形态').map(f => f.v)).length ? fact(r, '形态') : [r.title.replace('首领 · ', '')], 3)], ['掉落', r => cell(fact(r, '掉落'), 2)]])}
`);
}

out.push(`## 数据说明

- 「稀有度 / 等级 / 时间」等直接取自生成表；同一只在同一地点有多条规则时合并显示，「等」表示还有更多取值，完整内容见宝可梦详情页的「特殊获取途径」。
- 团体战首领的具体等级、首领战的等级由模组配置决定，数据文件里没有，这里不写。
- 本页随数据重新生成，手动修改会被覆盖；需要补充说明请改 \`scripts/build-location-guide.mjs\`。
`);

fs.writeFileSync('content/guides/special-locations.md', out.join('\n'));
const md = out.join('\n');
console.log(`special-locations.md：${(md.length / 1024).toFixed(0)}KB，${(md.match(/\]\(\/pokedex\//g) || []).length} 个宝可梦链接，${(md.match(/^#{2,4} /gm) || []).length} 个小节`);
