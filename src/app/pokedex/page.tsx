import type { Metadata } from 'next';
import { PokedexBrowser } from '@/components/PokedexBrowser';
import { datasetMeta } from '@/lib/data';

export const metadata: Metadata = {
  title: '宝可梦图鉴 · 全部 1025 只',
  description:
    '按属性、世代、种族值筛选并搜索全部 1025 只宝可梦，查看中文名、英文名、属性、种族值与官方原画。',
};

export default function PokedexPage() {
  return (
    <div className="container-page py-8">
      <section className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="label">01 — Pokédex / 图鉴</span>
            <h1 className="display mt-2 text-[clamp(2rem,5vw,3.2rem)] text-ink">全部宝可梦</h1>
          </div>
          <div className="num text-[11px] leading-relaxed text-muted">
            <div>{datasetMeta.pokemon} ENTRIES</div>
            <div>GEN 1–9</div>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-dim">
          收录第 1–9 世代共 {datasetMeta.pokemon} 只宝可梦。
          {datasetMeta.withZhName} 只带官方中文名，{datasetMeta.withFlavor} 条中文图鉴描述。
        </p>
      </section>
      <PokedexBrowser />
    </div>
  );
}