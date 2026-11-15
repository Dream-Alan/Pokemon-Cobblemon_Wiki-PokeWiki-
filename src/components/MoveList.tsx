'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LearnEntry, Move } from '@/lib/moves-shared';
import { MOVE_METHODS } from '@/lib/moves-shared';
import { typeColor, typeZh } from '@/lib/shared';

interface Props {
  entries: LearnEntry[];
  /** 来源标题，例如「方可梦整合包」 */
  label: string;
  /** 右上角的补充说明 */
  note?: string;
}

type MoveMap = Record<string, Move>;

let cache: MoveMap | null = null;
let pending: Promise<MoveMap> | null = null;

function loadMoves(): Promise<MoveMap> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = import('@/data/moves.json').then((m) => {
      cache = (m.default as unknown as { moves: MoveMap }).moves;
      return cache;
    });
  }
  return pending;
}

export function MoveList({ entries, label, note }: Props) {
  const [moves, setMoves] = useState<MoveMap | null>(cache);
  const [method, setMethod] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!moves) loadMoves().then(setMoves);
  }, [moves]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const [, m] of entries) c[m] = (c[m] || 0) + 1;
    return c;
  }, [entries]);

  const methods = MOVE_METHODS.filter((m) => counts[m.code]);
  const current = method ?? methods[0]?.code ?? 0;

  const list = useMemo(() => {
    const filtered = entries.filter(([, m]) => m === current);
    const withInfo = filtered.map((e) => ({ entry: e, move: moves?.[String(e[0])] }));
    withInfo.sort((a, b) => {
      if (current === 0 && a.entry[2] !== b.entry[2]) return a.entry[2] - b.entry[2];
      return (a.move?.n || '').localeCompare(b.move?.n || '', 'zh-Hans-CN');
    });
    return withInfo;
  }, [entries, current, moves]);

  const activeMove = active != null ? moves?.[String(active)] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="label">{label}</div>
        {note && <div className="text-[11px] text-muted">{note}</div>}
      </div>

      <div className="mb-3 flex flex-wrap gap-px border border-line bg-line">
        {methods.map((m) => {
          const on = m.code === current;
          return (
            <button
              key={m.code}
              type="button"
              aria-pressed={on}
              onClick={() => setMethod(m.code)}
              className={
                'flex-1 px-2 py-2 text-[11px] tracking-[.12em] transition-colors ' +
                (on ? 'bg-ink text-bg' : 'bg-paper text-ink-dim hover:bg-surface-2')
              }
            >
              {m.label}
              <span className={'num ml-1.5 ' + (on ? 'text-bg/60' : 'text-muted')}>{counts[m.code]}</span>
            </button>
          );
        })}
      </div>

      {!moves ? (
        <div className="label py-4">加载技能数据…</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {list.map(({ entry, move }) => {
            if (!move) return null;
            const color = typeColor(move.t);
            const isActive = active === entry[0];
            return (
              <button
                key={`${entry[0]}-${entry[1]}`}
                type="button"
                onClick={() => setActive(isActive ? null : entry[0])}
                title={`${move.n} · ${typeZh(move.t)} · 威力 ${move.p || '—'} · PP ${move.pp}`}
                className={
                  'group flex items-center gap-1.5 border px-2 py-1 text-[12px] transition-colors ' +
                  (isActive ? 'border-ink bg-ink text-bg' : 'border-line-soft bg-paper text-ink hover:border-ink')
                }
              >
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0"
                  style={{ background: isActive ? '#fff' : color }}
                />
                <span className="whitespace-nowrap">{move.n}</span>
                {current === 0 && entry[2] > 0 && (
                  <span className={'num text-[10px] ' + (isActive ? 'text-bg/60' : 'text-muted')}>Lv{entry[2]}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeMove && (
        <div className="mt-3 border border-ink bg-paper">
          <div className="flex items-start justify-between gap-3 border-b border-line-soft px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span aria-hidden className="inline-block h-3 w-3" style={{ background: typeColor(activeMove.t) }} />
                <span className="text-[15px] font-semibold">{activeMove.n}</span>
                <span className="text-[11px] text-muted">{activeMove.e}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="label shrink-0 hover:text-ink"
              aria-label="关闭技能详情"
            >
              关闭 ✕
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-line-soft sm:grid-cols-4">
            <Cell k="属性" v={typeZh(activeMove.t)} color={typeColor(activeMove.t)} />
            <Cell k="分类" v={activeMove.cz} />
            <Cell k="威力" v={activeMove.p ? String(activeMove.p) : '—'} />
            <Cell k="PP" v={activeMove.pp ? String(activeMove.pp) : '—'} />
            <Cell k="命中" v={activeMove.a ? `${activeMove.a}%` : '必中'} />
            <Cell k="优先级" v={activeMove.pr > 0 ? `+${activeMove.pr}` : String(activeMove.pr)} />
            <Cell k="招式 ID" v={`#${active}`} num />
            <Cell k="来源" v={label.replace('可学习技能', '')} span />
          </dl>
          <p className="border-t border-line-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-dim">
            {activeMove.d || '暂无中文说明。'}
          </p>
        </div>
      )}
    </div>
  );
}

function Cell({
  k,
  v,
  color,
  num,
  span,
}: {
  k: string;
  v: string;
  color?: string;
  num?: boolean;
  span?: boolean;
}) {
  return (
    <div className={'min-w-0 bg-paper px-3 py-2 ' + (span ? 'col-span-2 sm:col-span-4' : '')}>
      <div className="label">{k}</div>
      <div className={'mt-0.5 break-words text-[12.5px] ' + (num ? 'num' : '')} style={color ? { color } : undefined}>
        {v}
      </div>
    </div>
  );
}