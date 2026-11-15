import type { Metadata } from 'next';
import { Suspense } from 'react';
import indexJson from '@/data/index.json';
import { TypeMatrix } from '@/components/TypeMatrix';
import type { IndexRow } from '@/lib/types';

const ROWS = indexJson as unknown as IndexRow[];

export const metadata: Metadata = {
  title: '属性相克表 · 18 种属性完整倍率',
  description:
    '宝可梦 18 种属性的完整相克矩阵：攻击倍率、防守弱点、抵抗与免疫，支持单属性筛选查看。',
};

export default function TypesPage() {
  return (
    <div className="container-page py-8">
      <section className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="label">02 — Types / 属性</span>
            <h1 className="display mt-2 text-[clamp(2rem,5vw,3.2rem)] text-ink">属性相克</h1>
          </div>
          <div className="num text-[11px] leading-relaxed text-muted">
            <div>18 TYPES</div>
            <div>{ROWS.length} POKÉMON</div>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-dim">
          18 种属性的完整相克关系。点选任一属性，查看它作为
          <span className="mx-1 border-b border-line px-0.5">攻击方</span>与
          <span className="mx-1 border-b border-line px-0.5">防守方</span>
          时的倍率；下方矩阵可整体对照。
        </p>
      </section>

      <div className="mt-6">
        <Suspense fallback={<div className="border border-line-soft bg-paper p-8 text-[12px] text-muted">加载属性数据…</div>}>
          <TypeMatrix />
        </Suspense>
      </div>
    </div>
  );
}