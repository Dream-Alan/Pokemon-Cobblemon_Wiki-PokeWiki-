/**
 * 生成 src/data/ability-info.json：特性的效果说明（详情页「特性」点击展开用）
 *
 * 来源（按优先级）：
 *   1. Cobblemon 本体 zh_cn 语言文件 cobblemon.ability.<id>.desc —— 模组内玩家实际看到的中文说明
 *   2. PokeAPI ability_flavor_text.csv 的简体中文（language_id=12），取最新版本组
 *   3. PokeAPI ability_prose.csv 的英文 short_effect（language_id=9），作为精确机制补充
 *
 * 输出：{ "<ability_id>": { key, zh, desc, flavor?, effectEn? } }，覆盖 abilities.csv 里所有有说明的特性（含只属于特殊形态的）。
 * 前置：.cache/csv/abilities.csv、ability_names.csv、ability_flavor_text.csv、ability_prose.csv（见 README「数据来源与更新」）
 */
import fs from 'node:fs';
import path from 'node:path';

const CSV_DIR = '.cache/csv';
const LANG_ZH_HANS = 12;
const LANG_EN = 9;

/** RFC 4180 风格的 CSV 解析（支持引号内的逗号与换行） */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.length > 1);
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const load = (name) => {
  const p = path.join(CSV_DIR, name);
  if (!fs.existsSync(p)) throw new Error(`缺少 ${p}，先下载 PokeAPI CSV`);
  return parseCsv(fs.readFileSync(p, 'utf8'));
};

/** 游戏文本里的换行 / 全角字母数字只是排版用：全角字母数字转半角（ＨＰ → HP，中文标点保留），换行合成一行 */
const clean = (s) =>
  String(s || '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\n\f\r]+/g, '')
    // 模组语言文件里中文标点后常带一个排版空格（「出场时， 会将…」），紧挨中日韩字符的空白都去掉
    .replace(/\s+(?=[　-鿿＀-￯])|(?<=[　-鿿＀-￯])\s+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const abilities = load('abilities.csv').map(r => ({ id: Number(r.id), key: r.identifier }));
const nameZh = new Map();
for (const r of load('ability_names.csv')) {
  if (Number(r.local_language_id) === LANG_ZH_HANS) nameZh.set(Number(r.ability_id), clean(r.name));
}
const lang = JSON.parse(fs.readFileSync('.cache/cobblemon/assets/cobblemon/lang/zh_cn.json', 'utf8'));
const cobbleDesc = new Map();
const cobbleName = new Map();
for (const [k, v] of Object.entries(lang)) {
  const m = k.match(/^cobblemon\.ability\.([a-z0-9_]+)(\.desc)?$/);
  if (!m) continue;
  (m[2] ? cobbleDesc : cobbleName).set(norm(m[1]), clean(v));
}

const flavor = new Map(); // id → { vg, text }
for (const r of load('ability_flavor_text.csv')) {
  if (Number(r.language_id) !== LANG_ZH_HANS) continue;
  const id = Number(r.ability_id);
  const vg = Number(r.version_group_id);
  const cur = flavor.get(id);
  if (!cur || vg > cur.vg) flavor.set(id, { vg, text: clean(r.flavor_text) });
}
const prose = new Map();
for (const r of load('ability_prose.csv')) {
  if (Number(r.local_language_id) === LANG_EN) prose.set(Number(r.ability_id), clean(r.short_effect));
}

const out = {};
const stats = { total: 0, cobblemon: 0, flavor: 0, en: 0, none: [] };
for (const a of abilities) {
  stats.total++;
  const desc = cobbleDesc.get(norm(a.key)) || null;
  const fl = flavor.get(a.id)?.text || null;
  const en = prose.get(a.id) || null;
  if (desc) stats.cobblemon++;
  if (fl) stats.flavor++;
  if (en) stats.en++;
  if (!desc && !fl && !en) { stats.none.push(a.key); continue; }
  const entry = { key: a.key, zh: nameZh.get(a.id) || cobbleName.get(norm(a.key)) || a.key };
  entry.desc = desc || fl || '';
  // 两个中文来源措辞不同时都保留（PokeAPI 是正作最新世代的说明）
  if (fl && fl !== entry.desc) entry.flavor = fl;
  if (en) entry.effectEn = en;
  out[a.id] = entry;
}

fs.writeFileSync('src/data/ability-info.json', JSON.stringify(out));
console.log(`特性 ${stats.total} 个：Cobblemon 中文说明 ${stats.cobblemon} / PokeAPI 中文 ${stats.flavor} / 英文效果 ${stats.en}；无任何说明 ${stats.none.length}`, stats.none.slice(0, 10).join(', '));
