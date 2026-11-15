'use client';

import { useState } from 'react';
import { STAT_LABELS } from '@/lib/shared';
import { LEVEL_MAX, LEVEL_MIN, statRange, type StatKey } from '@/lib/stat-calc';
import type { Pokemon } from '@/lib/types';

/** 各能力的条形色（与常见图鉴一致：HP 绿、攻击黄、防御橙、特攻青、特防蓝、速度紫） */
const STAT_COLOR: Record<StatKey, string> = {
  hp: '#69c04a',
  attack: '#f2c936',
  defense: '#e2873a',
  'special-attack': '#58c4d2',
  'special-defense': '#5b8fd2',
  speed: '#a55bc8',
};
const BAR_MAX = 255;
const QUICK_LEVELS = [1, 50, 100];

/**
 * 种族值：种族值条 + 所选等级下的能力值范围（最低 = 个体 0 / 努力 0 / 降低性格，最高 = 个体 31 / 努力 252 / 提高性格），
 * 底部是被打倒后给出的基础点数（努力值）。计算统一走 @/lib/stat-calc。
 */
export function BaseStatsPanel({
  dex,
  stats,
  total,
  evYield,
  defaultLevel = 50,
}: {
  dex: number;
  stats: Pokemon['stats'];
  total: number;
  evYield?: Partial<Record<StatKey, number>> | null;
  defaultLevel?: number;
}) {
  const [level, setLevel] = useState(defaultLevel);
  const setLv = (v: number) => setLevel(Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, Math.floor(Number.isFinite(v) ? v : LEVEL_MIN))));
  const ranges = STAT_LABELS.map(({ key }) => statRange(key, stats[key] ?? 0, level, dex));
  const sum = ranges.reduce<[number, number]>((a, r) => [a[0] + r[0], a[1] + r[1]], [0, 0]);
  const fmt = ([lo, hi]: [number, number]) => (lo === hi ? String(lo) : `${lo} ~ ${hi}`);
  const yields = STAT_LABELS.map(({ key, label }) => ({ key, label, n: evYield?.[key] ?? 0 }));

  // 列宽：能力名 | 种族值 | 条形 | 能力值范围
  const row = 'grid grid-cols-[2.5rem_2.25rem_minmax(0,1fr)_6.5rem] items-center gap-x-3';

  return (
    <div>
      {/* 等级选择 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] text-muted">等级</span>
        <input
          type="range"
          min={LEVEL_MIN}
          max={LEVEL_MAX}
          value={level}
          onChange={e => setLv(Number(e.target.value))}
          aria-label="种族值换算等级"
          className="min-w-[8rem] flex-1 cursor-pointer"
          style={{ accentColor: 'var(--color-brand)' }}
        />
        <span className="flex items-center gap-2">
          <label className="flex items-baseline gap-1">
            <span className="text-[11px] text-muted">Lv</span>
            <input
              type="number"
              min={LEVEL_MIN}
              max={LEVEL_MAX}
              value={level}
              onChange={e => setLv(Number(e.target.value))}
              aria-label="种族值换算等级（输入）"
              className="num w-12 border border-line-soft bg-transparent px-1 py-0.5 text-right text-[12px] font-semibold text-ink outline-none focus:border-ink"
            />
          </label>
          {QUICK_LEVELS.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLv(l)}
              aria-pressed={level === l}
              className={`num border px-1.5 py-0.5 text-[10px] transition ${
                level === l ? 'border-ink bg-ink text-bg' : 'border-line-soft text-muted hover:border-ink hover:text-ink'
              }`}
            >
              {l}
            </button>
          ))}
        </span>
      </div>

      {/* 表头 */}
      <div className={`${row} mt-4 border-b border-line-soft pb-1.5`}>
        <span className="text-[10px] text-muted">能力</span>
        <span className="text-right text-[10px] text-muted">种族值</span>
        <span className="text-[10px] text-muted">分布（满 {BAR_MAX}）</span>
        <span className="text-right text-[10px] text-muted">Lv{level} 能力值</span>
      </div>

      <div className="divide-y divide-line-soft">
        {STAT_LABELS.map(({ key, label }, i) => {
          const v = stats[key] ?? 0;
          const pct = Math.max(1.5, Math.min(100, (v / BAR_MAX) * 100));
          return (
            <div key={key} className={`${row} py-2`} data-base-stat={key}>
              <span className="text-[12px] text-ink">{label}</span>
              <span className="num text-right text-[13px] font-semibold text-ink">{v}</span>
              <div className="h-[9px]" style={{ backgroundColor: `${STAT_COLOR[key]}38` }}>
                <div className="h-full" style={{ width: `${pct}%`, backgroundColor: STAT_COLOR[key] }} />
              </div>
              <span
                className="num whitespace-nowrap text-right text-[12px] text-ink"
                title={`Lv${level}：最低（个体 0 / 努力 0 / 降低性格）~ 最高（个体 31 / 努力 252 / 提高性格）`}
                data-range
              >
                {fmt(ranges[i])}
              </span>
            </div>
          );
        })}
      </div>

      {/* 合计 */}
      <div className={`${row} border-t border-line pt-2.5`}>
        <span className="text-[12px] text-ink">合计</span>
        <span className="num text-right text-[15px] font-semibold text-ink">{total}</span>
        <span className="label">Base Stat Total</span>
        <span className="num whitespace-nowrap text-right text-[12px] text-muted">{fmt(sum)}</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        能力值范围：最低 = 个体值 0、努力值 0、降低性格；最高 = 个体值 31、努力值 252、提高性格（HP 不受性格影响）。指定个体的精确数值见下方「个体能力值计算」。
      </p>

      {/* 取得基础点数 */}
      {evYield && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line-soft pt-3" data-ev-yield>
          <span className="text-[11px] text-muted">取得基础点数（努力值）</span>
          {yields.map(({ key, label, n }) => (
            <span key={key} className="flex items-baseline gap-1" data-ev={key}>
              <span className={`text-[11px] ${n ? 'text-ink' : 'text-muted'}`}>{label}</span>
              <span className={`num text-[12px] ${n ? 'font-semibold text-brand' : 'text-muted'}`}>{n ? `+${n}` : 0}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
