/**
 * 从 PokeAPI 抓取「宝可梦游戏里的获取途径」（野外遭遇数据）
 * 输出：src/data/encounters.json
 *   { "25": [ { gen: 1, ver: "yellow", verZh: "皮卡丘版", methods: [ { m: "walk", mZh: "陆地", lv: "4-8", chance: 20, areas: ["Viridian Forest"], areaCount: 12 } ] } ] }
 *
 * 只使用 PokeAPI 的 version_details，不做任何推测。
 */
import fs from 'node:fs';
import path from 'node:path';
import { EXTRA_METHOD_ZH } from './lib-method-zh.mjs';

const OUT = path.resolve('src/data/encounters.json');
const POKEDEX = JSON.parse(fs.readFileSync(path.resolve('src/data/pokedex.json'), 'utf8'));
const API = 'https://pokeapi.co/api/v2';
const CONCURRENCY = 16;

const VERSION_ZH = {
  red: '红', green: '绿', blue: '蓝', yellow: '皮卡丘版',
  'red-japan': '红（日版）', 'green-japan': '绿（日版）', 'blue-japan': '蓝（日版）',
  gold: '金', silver: '银', crystal: '水晶',
  ruby: '红宝石', sapphire: '蓝宝石', emerald: '绿宝石',
  firered: '火红', leafgreen: '叶绿',
  diamond: '钻石', pearl: '珍珠', platinum: '白金',
  heartgold: '心金', soulsilver: '魂银',
  black: '黑', white: '白', 'black-2': '黑 2', 'white-2': '白 2',
  x: 'X', y: 'Y', 'omega-ruby': '欧米伽红宝石', 'alpha-sapphire': '阿尔法蓝宝石',
  sun: '太阳', moon: '月亮', 'ultra-sun': '究极之日', 'ultra-moon': '究极之月',
  'lets-go-pikachu': "Let's Go 皮卡丘", 'lets-go-eevee': "Let's Go 伊布",
  sword: '剑', shield: '盾',
  'the-isle-of-armor-sword': '剑 · 铠之孤岛', 'the-isle-of-armor-shield': '盾 · 铠之孤岛',
  'the-crown-tundra-sword': '剑 · 冠之雪原', 'the-crown-tundra-shield': '盾 · 冠之雪原',
  'brilliant-diamond': '晶灿钻石', 'shining-pearl': '明亮珍珠',
  'legends-arceus': '传说 阿尔宙斯',
  scarlet: '朱', violet: '紫',
  'the-teal-mask': '朱紫 · 碧之假面', 'the-indigo-disk': '朱紫 · 蓝之圆盘',
  'the-teal-mask-scarlet': '朱 · 碧之假面', 'the-teal-mask-violet': '紫 · 碧之假面',
  'the-indigo-disk-scarlet': '朱 · 蓝之圆盘', 'the-indigo-disk-violet': '紫 · 蓝之圆盘',
};

const METHOD_ZH = {
  walk: '陆地',
  'tall-grass': '草丛',
  'dark-grass': '深色草丛',
  'grass-spots': '草丛（摇晃）',
  'cave-spots': '洞窟（尘土）',
  'bridge-spots': '桥上（阴影）',
  surf: '水面',
  'surfing': '水面',
  'old-rod': '旧钓竿',
  'good-rod': '好钓竿',
  'super-rod': '厉害钓竿',
  'rock-smash': '碎岩',
  gift: '游戏内赠送',
  'gift-egg': '游戏内获得蛋',
  'only-one': '仅有一只（剧情）',
  'sos-encounter': '呼唤同伴',
  'sos-from-encounter': '呼叫同伴',
  'island-scan': '岛屿扫描',
  'devon-scope': '得文侦测镜',
  'pokemon-mansion': '宝可梦屋',
  'wanderer': '四处游荡',
  'fishing': '钓鱼',
  'interior': '室内',
  'horde': '群战',
  'walking-in-the-tall-grass': '草丛',
};

Object.assign(METHOD_ZH, EXTRA_METHOD_ZH);

const VERSION_GEN = {
  red: 1, green: 1, blue: 1, yellow: 1, 'red-japan': 1, 'green-japan': 1, 'blue-japan': 1,
  gold: 2, silver: 2, crystal: 2,
  ruby: 3, sapphire: 3, emerald: 3, firered: 3, leafgreen: 3,
  diamond: 4, pearl: 4, platinum: 4, heartgold: 4, soulsilver: 4,
  black: 5, white: 5, 'black-2': 5, 'white-2': 5,
  x: 6, y: 6, 'omega-ruby': 6, 'alpha-sapphire': 6,
  sun: 7, moon: 7, 'ultra-sun': 7, 'ultra-moon': 7, 'lets-go-pikachu': 7, 'lets-go-eevee': 7,
  sword: 8, shield: 8, 'the-isle-of-armor-sword': 8, 'the-isle-of-armor-shield': 8,
  'the-crown-tundra-sword': 8, 'the-crown-tundra-shield': 8,
  'brilliant-diamond': 8, 'shining-pearl': 8, 'legends-arceus': 8,
  scarlet: 9, violet: 9, 'the-teal-mask': 9, 'the-indigo-disk': 9,
  'the-teal-mask-scarlet': 9, 'the-teal-mask-violet': 9,
  'the-indigo-disk-scarlet': 9, 'the-indigo-disk-violet': 9,
};

const prettifyArea = (slug) =>
  slug.replace(/-area$/, '').split('-').map(w => (w.length <= 2 && w !== 'of' ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'pokewiki-build/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  return null;
}

/** 把某一世代的多个地点合并成「版本 → 方式」的紧凑结构 */
function compress(id, locations) {
  const byVersion = new Map();
  for (const loc of locations) {
    const area = prettifyArea(loc.location_area?.name ?? '');
    for (const vd of loc.version_details ?? []) {
      const ver = vd.version?.name;
      if (!ver) continue;
      for (const ed of vd.encounter_details ?? []) {
        const method = ed.method?.name ?? 'walk';
        const key = `${ver}|${method}`;
        const entry = byVersion.get(key) ?? { ver, method, min: Infinity, max: 0, chance: 0, areas: new Set() };
        entry.min = Math.min(entry.min, ed.min_level ?? 0);
        entry.max = Math.max(entry.max, ed.max_level ?? 0);
        entry.chance = Math.max(entry.chance, ed.chance ?? 0);
        if (entry.areas.size < 3) entry.areas.add(area);
        byVersion.set(key, entry);
      }
    }
  }

  const perVersion = new Map();
  for (const entry of byVersion.values()) {
    const list = perVersion.get(entry.ver) ?? [];
    list.push({
      m: entry.method,
      mZh: METHOD_ZH[entry.method] ?? entry.method,
      lv: entry.min === entry.max ? `${entry.min}` : `${entry.min}-${entry.max}`,
      chance: entry.chance,
      areas: [...entry.areas],
    });
    perVersion.set(entry.ver, list);
  }

  const out = [];
  for (const [ver, methods] of perVersion) {
    methods.sort((a, b) => b.chance - a.chance);
    out.push({
      gen: VERSION_GEN[ver] ?? 0,
      ver,
      verZh: VERSION_ZH[ver] ?? ver,
      methods: methods.slice(0, 4),
      methodCount: methods.length,
    });
  }
  out.sort((a, b) => a.gen - b.gen || a.ver.localeCompare(b.ver));
  return out.length ? out : null;
}

const out = {};
let done = 0, failed = [];
const queue = POKEDEX.map(p => p.id);

async function worker() {
  while (queue.length) {
    const id = queue.shift();
    const data = await getJson(`${API}/pokemon/${id}/encounters`).catch(() => null);
    if (data === null) failed.push(id);
    else {
      const c = compress(id, data);
      if (c) out[id] = c;
    }
    done++;
    if (done % 50 === 0) {
      process.stdout.write(`  ${done}/${POKEDEX.length} · ${Object.keys(out).length} 条记录\n`);
      fs.writeFileSync(OUT, JSON.stringify(out));
    }
  }
}

console.log(`抓取 ${POKEDEX.length} 只宝可梦的遭遇数据…`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

fs.writeFileSync(OUT, JSON.stringify(out));
const withData = Object.keys(out).length;
const bytes = fs.statSync(OUT).size;
console.log(`完成：${withData} 只有野外遭遇记录，${POKEDEX.length - withData} 只没有；失败 ${failed.length} 个`);
console.log(`encounters.json ${(bytes / 1024 / 1024).toFixed(2)}MB，示例 #25：`, JSON.stringify(out[25]?.slice(0, 2)));
if (failed.length) console.log('失败 id：', failed.slice(0, 10).join(', '));