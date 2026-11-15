'use client';

import Link from 'next/link';
import { useState } from 'react';
import { asset } from '@/lib/asset';
import { dexNo, typeColor, typeZh } from '@/lib/shared';
import { TypeIcon } from './TypeIcon';

export interface FormCardData {
  dex: number;
  key: string;
  label: string;
  nameZh: string;
  nameEn: string;
  types: string[];
  total: number;
}

export function FormCard({ form }: { form: FormCardData }) {
  // 官方原画 → 3D 模型渲染缩略图 → 基础形态原画
  const [stage, setStage] = useState(0);
  const src = asset(
    stage === 0
      ? `/form-oa/${form.dex}-${form.key}.webp`
      : stage === 1
        ? `/form-art/${form.dex}-${form.key}.webp`
        : `/art/${dexNo(form.dex)}.webp`,
  );

  return (
    <Link
      prefetch={false}
      href={`/pokedex/${form.dex}/form/${form.key}/`}
      className="card card-hover group flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-line-soft px-2.5 py-1.5">
        <span className="num text-[10px] text-muted">#{dexNo(form.dex)}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-brand">FORM</span>
      </div>
      <div className="relative aspect-square overflow-hidden bg-bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${form.nameZh} · ${form.label}`}
          width={320}
          height={320}
          loading="lazy"
          onError={() => setStage(s => (s < 2 ? s + 1 : s))}
          className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2 pt-2">
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate text-[13px] font-medium leading-tight">{form.nameZh}</span>
          <span className="num shrink-0 text-[10px] text-muted">{form.total}</span>
        </div>
        <div className="mt-0.5 truncate text-[10px] text-brand">{form.label}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {form.types.map(t => (
            <span key={t} className="flex items-center gap-1 text-[10px] text-ink-dim">
              <TypeIcon type={t} size={11} color={typeColor(t)} />
              {typeZh(t)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex h-[3px]" aria-hidden>
        {form.types.map(t => (
          <span key={t} className="flex-1" style={{ backgroundColor: typeColor(t) }} />
        ))}
      </div>
    </Link>
  );
}