// 能力值计算回归：node scripts/test-stats.mjs（浏览器部分需要预览服务 node scripts/serve.mjs out 4199）
//   A. 公式层：直接引入 src/lib/stat-calc.ts，对照外部基准 + 独立实现 + 不变量，覆盖 1–100 全部等级
//   B. 页面层：驱动详情页的「种族值」与「个体能力值计算」两个模块，读出 DOM 数值与参考实现比对
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { statValue, statRange, NATURES, natureEffect, STAT_KEYS } from '../src/lib/stat-calc.ts';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/** 独立参考实现：BigInt 整数运算，与被测代码不共享任何代码 */
function ref(key, base, iv, ev, level, nat, dex) {
  const b = BigInt(base), i = BigInt(iv), e = BigInt(ev), L = BigInt(level);
  const inner = ((2n * b + i + e / 4n) * L) / 100n; // BigInt 除法即向零取整（全为非负 = 向下取整）
  if (key === 'hp') return dex === 292 ? 1 : Number(inner + L + 10n);
  const pct = nat === 1 ? 110n : nat === -1 ? 90n : 100n;
  return Number(((inner + 5n) * pct) / 100n);
}

const dexArr = (() => {
  const raw = JSON.parse(fs.readFileSync('src/data/pokedex.json', 'utf8'));
  return Array.isArray(raw) ? raw : Object.values(raw);
})();

// ── A1. 外部基准：Bulbapedia「Stat」条目的算例（烈咬陆鲨 Lv78 固执）──
{
  const base = { hp: 108, attack: 130, defense: 95, 'special-attack': 80, 'special-defense': 85, speed: 102 };
  const iv = [24, 12, 30, 16, 23, 5];
  const ev = [74, 190, 91, 48, 84, 23];
  const adamant = NATURES.find(n => n.zh === '固执');
  const got = STAT_KEYS.map((k, i) => statValue(k, base[k], iv[i], ev[i], 78, natureEffect(adamant, k), 445));
  const want = [289, 278, 193, 135, 171, 171];
  check('Bulbapedia 算例：烈咬陆鲨 Lv78 固执', got.join() === want.join(), `得到 ${got.join('/')}，应为 ${want.join('/')}`);
}

// ── A2. 外部基准：用户给出的截图（妙蛙种子 Lv3 范围）──
{
  const b = dexArr.find(p => p.id === 1).stats;
  const got = STAT_KEYS.map(k => statRange(k, b[k], 3, 1).join('~'));
  const want = ['15~18', '6~11', '6~11', '7~12', '7~12', '6~11'];
  check('截图基准：妙蛙种子 Lv3 能力值范围', got.join() === want.join(), `得到 ${got.join(' ')}，应为 ${want.join(' ')}`);
}

// ── A3. 全物种 × 全等级 × 多组个体/努力/性格，与独立实现逐项比对 ──
{
  const configs = [
    { iv: 0, ev: 0 }, { iv: 31, ev: 252 }, { iv: 31, ev: 0 }, { iv: 15, ev: 7 },
    { iv: 1, ev: 3 }, { iv: 30, ev: 251 }, { iv: 22, ev: 128 },
  ];
  let n = 0, bad = [];
  for (const p of dexArr) for (let L = 1; L <= 100; L++) for (const c of configs) for (const nat of [-1, 0, 1]) for (const k of STAT_KEYS) {
    const a = statValue(k, p.stats[k], c.iv, c.ev, L, nat, p.id);
    const r = ref(k, p.stats[k], c.iv, c.ev, L, nat, p.id);
    n++;
    if (a !== r && bad.length < 5) bad.push(`#${p.id} ${k} Lv${L} iv${c.iv} ev${c.ev} nat${nat}: ${a}≠${r}`);
  }
  check(`独立实现比对：${dexArr.length} 物种 × Lv1–100 × 7 组 × 3 性格 × 6 项`, bad.length === 0, `${n} 次比较${bad.length ? '；' + bad.join('; ') : ''}`);
}

// ── A4. 不变量 ──
{
  let mono = [], step = [], nat = [], hpNat = [], range = [];
  for (const p of dexArr) for (const k of STAT_KEYS) {
    const b = p.stats[k];
    for (let L = 2; L <= 100; L++) {
      // 等级提高能力值不降
      for (const [iv, ev, nt] of [[0, 0, -1], [31, 252, 1], [15, 100, 0]]) {
        if (statValue(k, b, iv, ev, L, nt, p.id) < statValue(k, b, iv, ev, L - 1, nt, p.id) && mono.length < 3) mono.push(`#${p.id} ${k} Lv${L}`);
      }
      const [lo, hi] = statRange(k, b, L, p.id);
      if (lo > hi && range.length < 3) range.push(`#${p.id} ${k} Lv${L}`);
    }
    // 努力值每 4 点一档：EV 4k..4k+3 结果相同
    for (let ev = 0; ev <= 248; ev += 4) {
      const v = statValue(k, b, 31, ev, 100, 0, p.id);
      for (let d = 1; d <= 3; d++) if (statValue(k, b, 31, ev + d, 100, 0, p.id) !== v && step.length < 3) step.push(`#${p.id} ${k} ev${ev + d}`);
    }
    // 性格：提高 = ⌊中性×1.1⌋、降低 = ⌊中性×0.9⌋；HP 不受性格影响
    for (const L of [1, 50, 100]) {
      const neutral = statValue(k, b, 31, 252, L, 0, p.id);
      if (k === 'hp') {
        if ((statValue(k, b, 31, 252, L, 1, p.id) !== neutral || statValue(k, b, 31, 252, L, -1, p.id) !== neutral) && hpNat.length < 3) hpNat.push(`#${p.id} Lv${L}`);
      } else if ((statValue(k, b, 31, 252, L, 1, p.id) !== Math.floor((neutral * 11) / 10) || statValue(k, b, 31, 252, L, -1, p.id) !== Math.floor((neutral * 9) / 10)) && nat.length < 3) nat.push(`#${p.id} ${k} Lv${L}`);
    }
  }
  check('不变量：等级提高能力值不降', !mono.length, mono.join(', '));
  check('不变量：努力值每 4 点一档', !step.length, step.join(', '));
  check('不变量：性格修正 = 中性值 ×1.1 / ×0.9 向下取整', !nat.length, nat.join(', '));
  check('不变量：HP 不受性格影响', !hpNat.length, hpNat.join(', '));
  check('不变量：范围下限 ≤ 上限', !range.length, range.join(', '));
  const shed = Array.from({ length: 100 }, (_, i) => statValue('hp', 1, 31, 252, i + 1, 0, 292));
  check('脱壳忍者 HP 在所有等级恒为 1', shed.every(v => v === 1));
  check('Lv1 下限：种族值 1 的非 HP 能力值为 5×0.9→4', statValue('attack', 1, 0, 0, 1, -1, 0) === 4, String(statValue('attack', 1, 0, 0, 1, -1, 0)));
}

// ── B. 页面层 ──
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

const setInput = (sel, v) =>
  page.evaluate(
    (sel, v) => {
      const el = document.querySelector(sel);
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, String(v));
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    },
    sel,
    v,
  );

// B1. 种族值模块：妙蛙种子拖到 Lv3，与截图一致；各等级与参考实现一致
await page.goto(`${BASE}/pokedex/1/`, { waitUntil: 'networkidle2' });
const readRanges = () =>
  page.evaluate(() => {
    const sl = document.querySelector('input[aria-label="种族值换算等级"]');
    const box = sl.closest('section');
    return [...box.querySelectorAll('[data-base-stat] [data-range]')].map(s => s.textContent.replace(/\s+/g, ''));
  });
{
  const b = dexArr.find(p => p.id === 1).stats;
  let bad = [];
  for (const L of [1, 2, 3, 10, 50, 99, 100]) {
    await setInput('input[aria-label="种族值换算等级"]', L);
    const got = await readRanges();
    const want = STAT_KEYS.map(k => {
      const lo = ref(k, b[k], 0, 0, L, -1, 1), hi = ref(k, b[k], 31, 252, L, 1, 1);
      return lo === hi ? String(lo) : `${lo}~${hi}`;
    });
    if (got.join() !== want.join()) bad.push(`Lv${L}: ${got.join(' ')} ≠ ${want.join(' ')}`);
    if (L === 3) check('页面：妙蛙种子 Lv3 与截图一致', got.join(' ') === '15~18 6~11 6~11 7~12 7~12 6~11', got.join(' '));
  }
  check('页面：种族值范围 Lv1/2/3/10/50/99/100 与参考实现一致', !bad.length, bad.join('; '));
  const ev = await page.evaluate(() => document.querySelector('[data-ev-yield] [data-ev="special-attack"] .num')?.textContent.replace('+', ''));
  check('页面：妙蛙种子取得基础点数 特攻 1', ev === '1', String(ev));
}

// B2. 个体能力值计算：烈咬陆鲨，按 Bulbapedia 算例设置，再扫各等级
await page.goto(`${BASE}/pokedex/445/`, { waitUntil: 'networkidle2' });
const readCalc = () =>
  page.evaluate(() => {
    const box = document.querySelector('input[aria-label="个体等级"]').closest('section');
    return [...box.querySelectorAll('[data-stat] [data-value]')].map(e => Number(e.textContent));
  });
{
  const g = dexArr.find(p => p.id === 445).stats;
  const iv = [24, 12, 30, 16, 23, 5];
  const ev = [74, 190, 91, 48, 84, 23];
  const labels = ['HP', '攻击', '防御', '特攻', '特防', '速度'];
  for (let i = 0; i < 6; i++) {
    await setInput(`input[aria-label="${labels[i]} 个体值"]`, iv[i]);
    await setInput(`input[aria-label="${labels[i]} 努力值"]`, ev[i]);
  }
  await setInput('select[aria-label="性格"]', NATURES.findIndex(n => n.zh === '固执'));
  await setInput('input[aria-label="个体等级"]', 78);
  const got = await readCalc();
  check('页面：烈咬陆鲨 Lv78 固执（Bulbapedia 算例）', got.join('/') === '289/278/193/135/171/171', got.join('/'));

  const adamant = NATURES.find(n => n.zh === '固执');
  let bad = [];
  for (let L = 1; L <= 100; L++) {
    await setInput('input[aria-label="个体等级"]', L);
    const v = await readCalc();
    const want = STAT_KEYS.map((k, i) => ref(k, g[k], iv[i], ev[i], L, natureEffect(adamant, k), 445));
    if (v.join() !== want.join() && bad.length < 5) bad.push(`Lv${L}: ${v.join('/')} ≠ ${want.join('/')}`);
  }
  check('页面：个体能力值 Lv1–100 全部等级与参考实现一致', !bad.length, bad.join('; '));

  // 努力值合计上限：再给速度填 252，应被截到 510 - 已用
  const used = ev.reduce((a, b) => a + b, 0);
  await setInput('input[aria-label="速度 努力值"]', 252);
  const spe = await page.$eval('input[aria-label="速度 努力值"]', e => Number(e.value));
  check('页面：努力值合计不超过 510', spe === Math.min(252, 510 - (used - 23)), `速度填 252 → ${spe}（其余已用 ${used - 23}）`);
  await setInput('input[aria-label="攻击 个体值"]', 99);
  const ivA = await page.$eval('input[aria-label="攻击 个体值"]', e => Number(e.value));
  check('页面：个体值被夹到 0–31', ivA === 31, String(ivA));
}

// B3. 脱壳忍者页面：所有等级 HP 显示 1
await page.goto(`${BASE}/pokedex/292/`, { waitUntil: 'networkidle2' });
{
  let ok = true;
  for (const L of [1, 50, 100]) {
    await setInput('input[aria-label="个体等级"]', L);
    if ((await readCalc())[0] !== 1) ok = false;
    await setInput('input[aria-label="种族值换算等级"]', L);
    if ((await readRanges())[0] !== '1') ok = false;
  }
  check('页面：脱壳忍者两个模块的 HP 都恒为 1', ok);
}
check('页面无 JS 报错', !errors.length, errors.join(' | '));
await browser.close();

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} 通过`);
process.exit(pass === results.length ? 0 : 1);
