'use client';

import { useEffect, useMemo, useState } from 'react';
import indexJson from '@/data/index.json';
import formsJson from '@/data/forms.json';
import { GENERATIONS, allTypes } from '@/lib/shared';
import type { IndexRow } from '@/lib/types';
import { FormCard, type FormCardData } from './FormCard';
import { PokemonCard } from './PokemonCard';
import { TypeIcon } from './TypeIcon';

const ROWS = indexJson as unknown as IndexRow[];
const PAGE = 48;

const FORMS: FormCardData[] = Object.entries(
  (formsJson as unknown as { forms: Record<string, { key: string; label: string; types: string[]; total: number }[]> })
    .forms,
).flatMap(([dex, list]) => {
  const id = Number(dex);
  const base = ROWS.find(r => r[0] === id);
  return list.map(f => ({
    dex: id,
    key: f.key,
    label: f.label,
    nameZh: base?.[1] || String(id),
    nameEn: base?.[2] || '',
    types: f.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    total: f.total,
  }));
});

type SortKey = 'id' | 'total' | 'name';

export function PokedexBrowser() {
  const [mode, setMode] = useState<'dex' | 'forms'>('dex');
  const [q, setQ] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [gen, setGen] = useState<number | 0>(0);
  const [sort, setSort] = useState<SortKey>('id');
  const [limit, setLimit] = useState(PAGE);
  const [legendaryOnly, setLegendaryOnly] = useState(false);

  // 支持 /pokedex/?type=fire&gen=1 这类外链
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('type');
    if (t) {
      const wanted = t.split(',').filter(Boolean).map(s => s.toLowerCase());
      const matched = allTypes
        .filter(x => wanted.includes(x.key.toLowerCase()))
        .map(x => x.key);
      if (matched.length) setTypes(matched);
    }
    const g = Number(sp.get('gen') || 0);
    if (g >= 1 && g <= 9) setGen(g);
    const s = sp.get('q');
    if (s) setQ(s);
    if (sp.get('legendary') === '1') setLegendaryOnly(true);
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const out = ROWS.filter(r => {
      if (
        kw &&
        !(
          r[1].toLowerCase().includes(kw) ||
          r[2].toLowerCase().includes(kw) ||
          r[0] === Number(kw) ||
          String(r[0]).padStart(4, '0') === kw
        )
      )
        return false;
      if (types.length && !types.every(t => r[3].includes(t))) return false;
      if (gen && r[4] !== gen) return false;
      if (legendaryOnly && !r[6]) return false;
      return true;
    });
    if (sort === 'total') out.sort((a, b) => b[5] - a[5] || a[0] - b[0]);
    else if (sort === 'name') out.sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'));
    else out.sort((a, b) => a[0] - b[0]);
    return out;
  }, [q, types, gen, sort, legendaryOnly]);

  const filteredForms = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const out = FORMS.filter(f => {
      if (kw && !(f.nameZh.toLowerCase().includes(kw) || f.nameEn.toLowerCase().includes(kw) || f.label.toLowerCase().includes(kw) || f.dex === Number(kw)))
        return false;
      if (types.length && !types.every(t => f.types.includes(t))) return false;
      if (gen && (ROWS.find(r => r[0] === f.dex)?.[4] ?? 0) !== gen) return false;
      return true;
    });
    if (sort === 'total') out.sort((a, b) => b.total - a.total || a.dex - b.dex);
    else if (sort === 'name') out.sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh-CN'));
    else out.sort((a, b) => a.dex - b.dex || a.label.localeCompare(b.label));
    return out;
  }, [q, types, gen, sort]);

  const list = mode === 'forms' ? filteredForms : filtered;
  const visible = list.slice(0, limit);

  const toggleType = (key: string) => {
    setLimit(PAGE);
    setTypes(prev => (prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]));
  };

  const reset = () => {
    setQ('');
    setTypes([]);
    setGen(0);
    setSort('id');
    setLegendaryOnly(false);
    setLimit(PAGE);
  };

  const active = q || types.length > 0 || gen > 0 || legendaryOnly;

  return (
    <div>
      {/* 筛选栏 */}
      <div className="sticky top-14 z-30 -mx-5 border-y border-line bg-bg/95 px-5 py-3 backdrop-blur-md md:-mx-10 md:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="名称 / 英文名 / 编号"
              aria-label="搜索图鉴"
              className="h-9 w-full border border-line-soft bg-paper pl-8 pr-3 text-[12px] text-ink outline-none transition placeholder:text-muted/80 focus:border-ink"
            />
          </div>

          <select
            value={gen}
            onChange={e => {
              setGen(Number(e.target.value));
              setLimit(PAGE);
            }}
            aria-label="世代筛选"
            className="h-9 border border-line-soft bg-paper px-2 text-[12px] text-ink-dim outline-none transition focus:border-ink"
          >
            <option value={0}>全部世代</option>
            {Object.entries(GENERATIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            aria-label="排序方式"
            className="h-9 border border-line-soft bg-paper px-2 text-[12px] text-ink-dim outline-none transition focus:border-ink"
          >
            <option value="id">按编号</option>
            <option value="total">按种族值</option>
            <option value="name">按名称</option>
          </select>

          <button
            onClick={() => setMode(m => (m === 'forms' ? 'dex' : 'forms'))}
            aria-pressed={mode === 'forms'}
            className={`h-9 border px-3 text-[11px] tracking-[0.08em] transition ${
              mode === 'forms'
                ? 'border-brand bg-brand text-white'
                : 'border-line-soft text-muted hover:border-ink hover:text-ink'
            }`}
            title="把超级进化、超极巨化、地区形态等特殊形态一起列出来"
          >
            ✦ 特殊形态 <span className="num">{FORMS.length}</span>
          </button>

          <button
            onClick={() => setLegendaryOnly(v => !v)}
            aria-pressed={legendaryOnly}
            className={`h-9 border px-3 text-[11px] tracking-[0.08em] transition ${
              legendaryOnly
                ? 'border-ink bg-ink text-bg'
                : 'border-line-soft text-muted hover:border-ink hover:text-ink'
            }`}
          >
            ★ 传说
          </button>

          {active && (
            <button
              onClick={reset}
              className="h-9 px-2 text-[11px] text-muted underline decoration-line-soft underline-offset-4 transition hover:text-ink"
            >
              重置
            </button>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1">
          {allTypes.map(t => {
            const on = types.includes(t.key);
            return (
              <button
                key={t.key}
                onClick={() => toggleType(t.key)}
                aria-pressed={on}
                className={`flex items-center gap-1 border px-1.5 py-1 text-[11px] transition ${
                  on
                    ? 'border-ink bg-ink text-bg'
                    : 'border-line-soft text-muted hover:border-ink hover:text-ink'
                }`}
              >
                <TypeIcon type={t.key} size={11} />
                {t.zh}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 mt-4 flex items-center justify-between">
        <span className="text-[12px] text-muted">
          共 <span className="num text-ink">{list.length}</span> {mode === 'forms' ? '种形态' : '只'}
          {types.length > 1 && <span className="ml-1">（同时具备所选属性）</span>}
        </span>
        <span className="num text-[11px] text-muted">
          {visible.length} / {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border border-line-soft bg-paper p-10">
          <span className="label">0 Results</span>
          <p className="text-[15px] text-ink">没有符合条件的宝可梦</p>
          <p className="text-[12px] text-muted">试试减少属性筛选，或换个关键词。</p>
          <button onClick={reset} className="btn mt-1">
            清空条件
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {mode === 'forms'
              ? (visible as FormCardData[]).map(f => <FormCard key={`${f.dex}-${f.key}`} form={f} />)
              : (visible as IndexRow[]).map(r => (
                  <PokemonCard
                    key={r[0]}
                    id={r[0]}
                    nameZh={r[1]}
                    nameEn={r[2]}
                    types={r[3]}
                    total={r[5]}
                    legendary={r[6] === 1}
                  />
                ))}
          </div>

          {limit < list.length && (
            <div className="mt-10 flex justify-center">
              <button onClick={() => setLimit(v => v + PAGE)} className="btn px-6">
                加载更多 · 还有 {list.length - limit} {mode === 'forms' ? '种' : '只'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}