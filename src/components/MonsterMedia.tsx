'use client';

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';
import { dexNo, typeColor } from '@/lib/shared';
import CobblemonViewer from './CobblemonViewer';

export interface FormAsset {
  key: string;
  label: string;
  modelUrl: string;
  textureUrl: string;
  shinyUrl: string | null;
  animationUrl?: string | null;
  renderUrl?: string | null;
  source?: string;
}

export function MonsterMedia({
  dex,
  nameZh,
  types,
  forms,
  missingHint,
  shinyArt = false,
}: {
  dex: number;
  nameZh: string;
  types: string[];
  forms: FormAsset[];
  missingHint?: string;
  /** 是否已下载到闪光官方原画 */
  shinyArt?: boolean;
}) {
  const [tab, setTab] = useState<'art' | 'model'>('art');
  const [shiny, setShiny] = useState(false);
  const [formKey, setFormKey] = useState<string>(forms[0]?.key ?? 'male');

  // Deep links: ?view=model&form=mega_x opens straight to a form (used by form pages
  // and by the screenshot tooling). Applied after mount to keep hydration stable.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('form');
    if (wanted && forms.some(f => f.key === wanted)) setFormKey(wanted);
    if (params.get('view') === 'model' || wanted) setTab('model');
  }, [forms]);
  const active = forms.find(f => f.key === formKey) ?? forms[0] ?? null;
  const has3d = forms.length > 0;

  const tabs = [
    { key: 'art' as const, label: '官方原画', note: 'Official' },
    {
      key: 'model' as const,
      label: '方可梦建模',
      note: has3d ? `${forms.length} 形态` : 'N/A',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 overflow-hidden border border-line">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`flex min-w-0 items-center justify-center gap-1.5 px-1 py-2.5 text-[11px] tracking-[0.04em] transition sm:gap-2 sm:text-[12px] sm:tracking-[0.06em] ${
              i === 0 ? 'border-r border-line' : ''
            } ${tab === t.key ? 'bg-ink font-medium text-bg' : 'bg-paper text-muted hover:text-ink'}`}
          >
            <span className="truncate">{t.label}</span>
            <span
              className={`hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] sm:inline ${
                tab === t.key ? 'text-white/45' : 'text-muted/70'
              }`}
            >
              {t.note}
            </span>
          </button>
        ))}
      </div>

      {tab === 'art' ? (
        <div className="relative aspect-square w-full overflow-hidden border border-t-0 border-line bg-paper">
          <div className="dotgrid pointer-events-none absolute inset-0" />
          <span className="label absolute left-3 top-3">#{dexNo(dex)}</span>
          {shinyArt && (
            <button
              onClick={() => setShiny(v => !v)}
              aria-pressed={shiny}
              title="切换闪光原画"
              className={`absolute right-3 top-3 z-20 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                shiny
                  ? 'border-line bg-lemon text-ink'
                  : 'border-line-soft bg-paper/85 text-muted hover:border-line hover:text-ink'
              }`}
            >
              ✦ 闪光
            </button>
          )}
          <span className={`label absolute bottom-3 right-3 ${shiny ? 'text-ink' : ''}`}>
            {shiny ? 'Shiny · Official Artwork' : 'Official Artwork'}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={shiny ? 'shiny' : 'normal'}
            src={asset(shiny ? `/art-shiny/${dexNo(dex)}.webp` : `/art/${dexNo(dex)}.webp`)}
            alt={`${nameZh}${shiny ? '闪光' : ''}官方原画`}
            width={512}
            height={512}
            className="relative z-10 h-full w-full object-contain p-8"
            onError={() => {
              if (shiny) setShiny(false);
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex h-[3px]" aria-hidden>
            {types.map(t => (
              <span key={t} className="flex-1" style={{ backgroundColor: typeColor(t) }} />
            ))}
          </div>
        </div>
      ) : has3d && active ? (
        <div className="border border-t-0 border-line">
          <CobblemonViewer
            modelUrl={active.modelUrl}
            textureUrl={active.textureUrl}
            shinyUrl={active.shinyUrl}
            animationUrl={active.animationUrl ?? null}
            renderUrl={active.renderUrl ?? null}
            nameZh={`${nameZh}（${active.label}）`}
            source={active.source}
            missingHint={missingHint}
          />
          {forms.length > 1 && (
            <div className="flex flex-wrap items-center gap-px border-t border-line bg-line">
              {forms.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFormKey(f.key)}
                  aria-pressed={f.key === formKey}
                  className={`min-w-0 px-2.5 py-2 text-[11px] transition ${
                    f.key === formKey
                      ? 'bg-ink font-medium text-bg'
                      : 'bg-paper text-muted hover:text-ink'
                  }`}
                  title={`切换到${f.label}${f.source && f.source !== 'Cobblemon' ? `（${f.source}）` : ''}`}
                >
                  <span className="truncate">{f.label}</span>
                  {f.source && f.source !== 'Cobblemon' && (
                    <span className="ml-1 font-mono text-[9px] uppercase tracking-[0.12em] opacity-60">+</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex aspect-square w-full flex-col justify-end border border-t-0 border-line bg-paper p-6">
          <div className="dotgrid pointer-events-none absolute inset-0" />
          <span className="num absolute right-4 top-3 text-[64px] font-extralight leading-none text-surface-3">
            N/A
          </span>
          <p className="relative text-[13px] font-medium text-ink">暂无方可梦建模</p>
          <p className="relative mt-1.5 max-w-[76%] text-[11px] leading-relaxed text-muted">
            {missingHint ??
              '这一只没有对应的方可梦建模，暂时只能用官方原画参考。'}
          </p>
          <button
            onClick={() => setTab('art')}
            className="relative mt-4 self-start border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink transition hover:bg-ink hover:text-bg"
          >
            查看原画
          </button>
        </div>
      )}
    </div>
  );
}