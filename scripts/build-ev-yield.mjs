/**
 * 生成 src/data/ev-yield.json：每只宝可梦被打倒后给出的基础点数（努力值），
 * 详情页「种族值」模块底部「取得基础点数」一行用。
 *
 * 来源：PokeAPI pokemon_stats.csv 的 effort 列（pokemon_id 1–1025 即各物种的默认形态）。
 * 输出：{ "<dex>": [HP, 攻击, 防御, 特攻, 特防, 速度] }
 * 特殊形态的基础点数由 scripts/build-forms.mjs 从 Cobblemon 物种文件的 evYield 读取。
 */
import fs from 'node:fs';

const p = '.cache/csv/pokemon_stats.csv';
if (!fs.existsSync(p)) throw new Error(`缺少 ${p}，先运行 npm run sync`);
const STAT_ORDER = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 }; // stat_id：hp atk def spa spd spe

const out = {};
const [, ...rows] = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
for (const line of rows) {
  const [pid, sid, , effort] = line.split(',').map(Number);
  if (!(pid >= 1 && pid <= 1025) || !(sid in STAT_ORDER)) continue;
  (out[pid] ||= [0, 0, 0, 0, 0, 0])[STAT_ORDER[sid]] = effort || 0;
}
fs.writeFileSync('src/data/ev-yield.json', JSON.stringify(out));
const n = Object.keys(out).length;
const sample = [1, 6, 25, 113, 242].map(d => `#${d} ${out[d]?.join('/')}`).join('  ');
console.log(`基础点数：${n} 只  ${sample}`);
