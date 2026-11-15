'use client';

import { useMemo, useState } from 'react';
import { STAT_LABELS } from '@/lib/shared';
import {
  EV_MAX,
  EV_TOTAL,
  IV_MAX,
  LEVEL_MAX,
  LEVEL_MIN,
  NATURES,
  natureEffect,
  statValue,
  type StatKey,
} from '@/lib/stat-calc';
import type { Pokemon } from '@/lib/types';

const zero = () => Object.fromEntries(STAT_LABELS.map(s => [s.key, 0])) as Record<StatKey, number>;
const full = () => Object.fromEntries(STAT_LABELS.map(s => [s.key, IV_MAX])) as Record<StatKey, number>;
const labelOf = (k?: StatKey) => STAT_LABELS.find(s => s.key === k)?.label ?? '';

/**
 * 个体能力值计算：指定等级、性格、个体值、努力值，算出这一只的实际能力值。
 * 公式与取整全部在 @/lib/stat-calc（与「种族值」模块的范围换算共用一套）。
 */
export function StatCalculator({ id, stats }: { id: number; stats: Pokemon['stats'] }) {
  const [level, setLevel] = useState(50);
  const [natureIdx, setNatureIdx] = useState(0);
  const [evs, setEvs] = useState(zero);
  const [ivs, setIvs] = useState(full);

  const nature = NATURES[natureIdx];
  const evUsed = STAT_LABELS.reduce((a, s) => a + evs[s.key], 0);

  const values = useMemo(
    () => STAT_LABELS.map(({ key }) => statValue(key, stats[key] ?? 0, ivs[key], evs[key], level, natureEffect(nature, key), id)),
    [stats, ivs, evs, level, nature, id],
  );
  // 条形标尺：当前等级下种族值 180、满个体满努力、提高性格的数值（各等级下观感一致）
  const scale = Math.max(...values, statValue('attack', 180, IV_MAX, EV_MAX, level, 1, id), 1);
  const total = values.reduce((a, b) => a + b, 0);

  /** 努力值：单项 0–252，且六项合计不超过 510（超出部分截掉） */
  const setEv = (key: StatKey, raw: number) => {
    const others = evUsed - evs[key];
    const v = Math.max(0, Math.min(EV_MAX, EV_TOTAL - others, Math.floor(Number.isFinite(raw) ? raw : 0)));
    setEvs(e => ({ ...e, [key]: v }));
  };
  const setIv = (key: StatKey, raw: number) => {
    const v = Math.max(0, Math.min(IV_MAX, Math.floor(Number.isFinite(raw) ? raw : 0)));
    setIvs(e => ({ ...e, [key]: v }));
  };

  const inputCls =
    'num w-full border border-line-soft bg-transparent px-1.5 py-1 text-right text-[12px] text-ink outline-none focus:border-ink';

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="flex items-baseline justify-between">
            <span className="text-[11px] text-muted">等级</span>
            <span className="num text-[13px] font-semibold text-ink">Lv {level}</span>
          </span>
          <input
            type="range"
            min={LEVEL_MIN}
            max={LEVEL_MAX}
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
            aria-label="个体等级"
            className="mt-2 w-full cursor-pointer"
            style={{ accentColor: 'var(--color-brand)' }}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted">性格</span>
          <select
            value={natureIdx}
            onChange={e => setNatureIdx(Number(e.target.value))}
            aria-label="性格"
            className="mt-1 block w-full border border-line-soft bg-transparent px-1.5 py-1 text-[12px] text-ink outline-none focus:border-ink sm:w-44"
          >
            {NATURES.map((n, i) => (
              <option key={n.zh} value={i}>
                {n.zh}
                {n.up ? `（${labelOf(n.up)}↑ ${labelOf(n.down)}↓）` : '（无修正）'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 divide-y divide-line-soft border-t border-line-soft">
        {STAT_LABELS.map(({ key, label }, i) => {
          const v = values[i];
          const eff = natureEffect(nature, key);
          const pct = Math.max(1.5, Math.min(100, (v / scale) * 100));
          return (
            <div key={key} className="flex items-center gap-3 py-2" data-stat={key}>
              <span className={`w-10 shrink-0 text-[11px] tracking-[0.04em] ${eff > 0 ? 'text-brand' : eff < 0 ? 'text-muted' : 'text-ink'}`}>
                {label}
                {eff > 0 ? '↑' : eff < 0 ? '↓' : ''}
              </span>
              <div className="h-[7px] flex-1 bg-surface-2">
                <div
                  className="h-full transition-[width] duration-300"
                  style={{ width: `${pct}%`, backgroundColor: eff > 0 ? 'var(--color-brand)' : 'var(--color-ink)' }}
                />
              </div>
              <span className="num w-10 shrink-0 text-right text-[12px] font-semibold text-ink" data-value>
                {v}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
        <span className="label">Lv {level} 能力值合计</span>
        <span className="num text-[26px] font-light leading-none tracking-tight text-ink" data-total>
          {total}
        </span>
      </div>

      <div className="mt-5 border-t border-line-soft pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[11px] text-muted">
            努力值 EV（单项 ≤{EV_MAX}，合计 ≤{EV_TOTAL}）
          </span>
          <span className="flex items-baseline gap-3">
            <span className={`num text-[11px] ${evUsed >= EV_TOTAL ? 'text-brand' : 'text-muted'}`} data-ev-used>
              已用 {evUsed} / {EV_TOTAL}
            </span>
            <button
              type="button"
              onClick={() => setEvs(zero())}
              className="label border border-line-soft px-1.5 py-0.5 hover:border-ink hover:text-ink"
            >
              清空
            </button>
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STAT_LABELS.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="text-[10px] text-muted">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={EV_MAX}
                step={4}
                value={evs[key]}
                onChange={e => setEv(key, Number(e.target.value))}
                aria-label={`${label} 努力值`}
                className={inputCls}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[11px] text-muted">个体值 IV（0–{IV_MAX}）</span>
          <button
            type="button"
            onClick={() => setIvs(full())}
            className="label border border-line-soft px-1.5 py-0.5 hover:border-ink hover:text-ink"
          >
            全部 31
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STAT_LABELS.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="text-[10px] text-muted">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={IV_MAX}
                value={ivs[key]}
                onChange={e => setIv(key, Number(e.target.value))}
                aria-label={`${label} 个体值`}
                className={inputCls}
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          公式：HP = ⌊(2×种族值 + 个体值 + ⌊努力值/4⌋) × 等级/100⌋ + 等级 + 10；其余 = ⌊(⌊(2×种族值 + 个体值 + ⌊努力值/4⌋) × 等级/100⌋ + 5) × 性格修正⌋（提高 ×1.1、降低 ×0.9，均向下取整）。
          努力值每 4 点才增加 1 点能力值。
          {id === 292 ? ' 脱壳忍者的 HP 恒为 1。' : ''}
        </p>
      </div>
    </div>
  );
}
