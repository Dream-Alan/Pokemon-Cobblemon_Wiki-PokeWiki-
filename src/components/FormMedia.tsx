'use client';

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';
import { dexNo } from '@/lib/shared';
import CobblemonViewer from './CobblemonViewer';

export interface FormMediaProps {
  dex: number;
  formKey: string;
  nameZh: string;
  label: string;
  color: string;
  modelUrl: string;
  textureUrl: string;
  shinyUrl: string | null;
  animationUrl?: string | null;
  renderUrl?: string | null;
  hasModel: boolean;
  /** 是否已下载到闪光官方原画 */
  shinyArt?: boolean;
  source?: string;
}

export function FormMedia(props: FormMediaProps) {
  const [tab, setTab] = useState<'art' | 'model'>('art');
  const [shiny, setShiny] = useState(false);
  // let the thumbnail renderer (and deep links) open the model tab directly
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('view') === 'model' && props.hasModel) setTab('model');
  }, [props.hasModel]);
  // 官方原画 → 3D 缩略图 → 基础形态原画
  const [stage, setStage] = useState(0);
  const showShiny = Boolean(props.shinyArt) && shiny;
  const art = asset(
    showShiny
      ? `/form-oa-shiny/${props.dex}-${props.formKey}.webp`
      : stage === 0
        ? `/form-oa/${props.dex}-${props.formKey}.webp`
        : stage === 1
          ? `/form-art/${props.dex}-${props.formKey}.webp`
          : `/art/${dexNo(props.dex)}.webp`,
  );

  const tabs = [
    { key: 'art' as const, label: '官方原画', note: 'Official Artwork' },
    { key: 'model' as const, label: '方可梦建模', note: '3D Model' },
  ];

  return (
    <div className="overflow-hidden border border-line">
      <div className="grid grid-cols-2 border-b border-line bg-paper">
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`flex min-w-0 flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                active ? 'bg-ink text-bg' : 'text-ink-dim hover:bg-surface-2'
              }`}
            >
              <span className="truncate text-[12px] font-medium">{t.label}</span>
              <span
                className={`max-w-full truncate font-mono text-[9px] uppercase tracking-[0.16em] ${
                  active ? 'text-bg/70' : 'text-muted'
                }`}
              >
                {t.note}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'art' ? (
        <div className="relative aspect-square overflow-hidden bg-bg-soft">
          <div className="dotgrid absolute inset-0 opacity-60" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={showShiny ? 'shiny' : `art${stage}`}
            src={art}
            alt={`${props.nameZh} · ${props.label}${showShiny ? '闪光' : ''}官方原画`}
            width={720}
            height={720}
            className="relative z-10 h-full w-full object-contain p-5"
            onError={() => {
              if (showShiny) {
                setShiny(false);
                setStage(0);
              } else {
                setStage(s => (s < 2 ? s + 1 : s));
              }
            }}
          />
          {props.shinyArt && (
            <button
              onClick={() => setShiny(v => !v)}
              aria-pressed={shiny}
              title="切换闪光原画"
              className={`absolute right-3 top-3 z-20 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                shiny
                  ? 'border-line bg-lemon text-ink'
                  : 'border-line-soft bg-bg-soft/85 text-muted hover:border-line hover:text-ink'
              }`}
            >
              ✦ 闪光
            </button>
          )}
          <span className="label absolute left-3 top-3 z-20">#{dexNo(props.dex)} · {props.label}</span>
          <span className={`label absolute bottom-3 right-3 z-20 ${showShiny ? 'text-ink' : ''}`}>
            {showShiny ? 'Shiny · Official Artwork' : 'Official Artwork'}
          </span>
          <div className="absolute inset-x-0 bottom-0 z-20 h-[3px]" style={{ backgroundColor: props.color }} />
        </div>
      ) : props.hasModel ? (
        <CobblemonViewer
          modelUrl={props.modelUrl}
          textureUrl={props.textureUrl}
          shinyUrl={props.shinyUrl}
          animationUrl={props.animationUrl}
          renderUrl={props.renderUrl}
          nameZh={`${props.nameZh}（${props.label}）`}
          source={props.source}
        />
      ) : (
        <div className="flex aspect-square flex-col items-center justify-center gap-3 bg-bg-soft p-6 text-center">
          <span className="text-[32px] font-light text-muted">N/A</span>
          <p className="text-[12px] text-muted">这个形态暂无可方梦建模，只提供官方原画。</p>
        </div>
      )}
    </div>
  );
}