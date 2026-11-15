'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { allTypes, typeColor, typeZh } from '@/lib/shared';
import { TypeIcon } from './TypeIcon';

const MULT: Record<string, number> = { '2': 2, '0.5': 0.5, '0': 0, '1': 1 };

/** 属性 key 在数据里是首字母大写的（Fire/Dragon…），URL 里允许小写 */
function findType(key: string | null | undefined) {
  if (!key) return undefined;
  const lower = key.toLowerCase();
  return allTypes.find(t => t.key === key) || allTypes.find(t => t.key.toLowerCase() === lower);
}

function cellColor(m: number): { bg: string; fg: string } {
  if (m === 2) return { bg: 'var(--color-brand)', fg: '#fff' };
  if (m === 0.5) return { bg: 'var(--color-surface-3)', fg: 'var(--color-ink-dim)' };
  if (m === 0) return { bg: 'var(--color-ink)', fg: 'var(--color-bg)' };
  return { bg: 'transparent', fg: 'var(--color-muted)' };
}

export function TypeMatrix() {
  const sp = useSearchParams();
  const router = useRouter();
  const focus = sp.get('focus') || 'Fire';
  const t = findType(focus) || allTypes[0];

  const chart = useMemo(() => {
    const m = new Map<string, number>();
    for (const atk of allTypes) {
      for (const def of allTypes) {
        let v = 1;
        if (atk.doubleTo.includes(def.key)) v = 2;
        else if (atk.halfTo.includes(def.key)) v = 0.5;
        else if (atk.zeroTo.includes(def.key)) v = 0;
        m.set(`${atk.key}>${def.key}`, v);
      }
    }
    return m;
  }, []);

  const pick = (key: string) => router.replace(`/types/?focus=${key}`, { scroll: false });

  return (
    <div>
      {/* 属性选择器 */}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-9">
        {allTypes.map(x => {
          const on = x.key === t.key;
          return (
            <button
              key={x.key}
              onClick={() => pick(x.key)}
              aria-pressed={on}
              className={`flex items-center justify-between gap-1 border px-2 py-2 text-[12px] transition ${
                on
                  ? 'border-ink bg-ink text-bg'
                  : 'border-line-soft text-ink-dim hover:border-ink hover:bg-paper'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <TypeIcon type={x.key} size={13} />
                {x.zh}
              </span>
              <span className="num text-[9px] opacity-60">×{x.doubleTo.length}</span>
            </button>
          );
        })}
      </div>

      {/* 当前属性双向面板 */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="border border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="label">作为攻击方 / Offense</span>
            <span className="flex items-center gap-1.5 text-[12px] text-ink">
              <TypeIcon type={t.key} size={13} />
              {t.zh}
            </span>
          </div>
          <div className="divide-y divide-line-soft">
            <Line label="效果拔群" mult="×2" items={t.doubleTo} />
            <Line label="效果一般" mult="×1" items={t.halfTo} dim />
            <Line label="无效" mult="×0" items={t.zeroTo} />
          </div>
        </div>

        <div className="border border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="label">作为防守方 / Defense</span>
            <span className="flex items-center gap-1.5 text-[12px] text-ink">
              <TypeIcon type={t.key} size={13} />
              {t.zh}
            </span>
          </div>
          <div className="divide-y divide-line-soft">
            <Line label="被克制" mult="×2" items={t.weakTo} />
            <Line label="抵抗" mult="×0.5" items={t.resists} />
            <Line label="免疫" mult="×0" items={t.immuneTo} />
          </div>
        </div>
      </div>

      {/* 完整矩阵 */}
      <div className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
          <h2 className="label">完整倍率表 / Full Chart</h2>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted">
            <Legend label="×2" bg="var(--color-brand)" />
            <Legend label="×0.5" bg="var(--color-surface-3)" />
            <Legend label="×0" bg="var(--color-ink)" />
            <span className="num">行 = 攻击方 · 列 = 防守方</span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-bg p-0">
                  <div className="flex h-9 w-9 items-center justify-center border-b border-r border-line">
                    <span className="label">攻\守</span>
                  </div>
                </th>
                {allTypes.map(d => (
                  <th key={d.key} className="p-0">
                    <div
                      className={`flex flex-col items-center justify-center gap-0.5 border-b border-line py-1 ${
                        d.key === t.key ? 'bg-surface-2' : ''
                      }`}
                      title={d.zh}
                    >
                      <TypeIcon type={d.key} size={13} color={typeColor(d.key)} />
                      <span className="text-[8px] leading-none text-muted">{d.zh}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allTypes.map(a => (
                <tr key={a.key} className={a.key === t.key ? 'bg-surface-2' : ''}>
                  <th className="sticky left-0 z-10 bg-bg p-0">
                    <div
                      className="flex h-9 w-11 flex-col items-center justify-center gap-0.5 border-b border-r border-line-soft"
                      title={a.zh}
                    >
                      <TypeIcon type={a.key} size={12} color={typeColor(a.key)} />
                      <span className="text-[8px] leading-none text-muted">{a.zh}</span>
                    </div>
                  </th>
                  {allTypes.map(d => {
                    const v = chart.get(`${a.key}>${d.key}`) ?? 1;
                    const c = cellColor(v);
                    return (
                      <td
                        key={d.key}
                        title={`${a.zh} → ${d.zh}：×${v}`}
                        className="border-b border-r border-line-soft p-0 text-center"
                        style={{ backgroundColor: c.bg }}
                      >
                        <span
                          className="num flex h-8 items-center justify-center text-[10px]"
                          style={{ color: c.fg }}
                        >
                          {v === 1 ? '' : v}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          单元格为空表示 ×1。属性图标缺失时以颜色标注；点击上方属性可切换重点属性。
        </p>
      </div>
    </div>
  );
}

function Line({ label, mult, items, dim }: { label: string; mult: string; items: string[]; dim?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2.5">
      <span className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-[11px] text-ink-dim">{label}</span>
        <span className="num text-[10px] text-muted">{mult}</span>
      </span>
      <span className="flex flex-wrap justify-end gap-1">
        {items.length === 0 && <span className="text-[11px] text-muted">—</span>}
        {items.map(k => (
          <span
            key={k}
            className={`flex items-center gap-1 border px-1.5 py-0.5 text-[11px] ${
              dim ? 'border-line-soft text-muted' : 'border-line-soft text-ink-dim'
            }`}
          >
            <TypeIcon type={k} size={11} color={typeColor(k)} />
            {typeZh(k)}
          </span>
        ))}
      </span>
    </div>
  );
}

function Legend({ label, bg }: { label: string; bg: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-3 w-3 border border-line-soft" style={{ backgroundColor: bg }} />
      <span className="num">{label}</span>
    </span>
  );
}