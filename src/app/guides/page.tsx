import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllGuides, readingMinutes } from '@/lib/guides';

export const metadata: Metadata = {
  title: '方可梦攻略 · Cobblemon 整合包上手指南',
  description:
    '《我的世界》方可梦（Cobblemon）整合包攻略：怎么开始、如何捕捉、宝可梦刷新机制、繁殖与进化、战斗与队伍培养、闪光与传说获取，以及常见问题。',
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="container-page py-8">
      <section className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="label">03 — Guides / 攻略</span>
            <h1 className="display mt-2 text-[clamp(2rem,5vw,3.2rem)] text-ink">方可梦攻略</h1>
          </div>
          <div className="num text-[11px] leading-relaxed text-muted">
            <div>{String(guides.length).padStart(2, '0')} CHAPTERS</div>
            <div>COBBLEMON 1.8</div>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-dim">
          在《我的世界》里玩宝可梦：捕捉、培养、对战、孵蛋与刷闪。以下内容按上手顺序排列，
          数值与机制以 Cobblemon 1.8 版本为准，遇到整合包魔改的部分会单独说明。
        </p>
      </section>

      {guides.length === 0 ? (
        <div className="mt-6 border border-line-soft bg-paper p-8 text-[12px] text-muted">攻略整理中…</div>
      ) : (
        <div className="mt-2 divide-y divide-line-soft">
          {guides.map((g, i) => (
            <Link
              prefetch={false}
              key={g.slug}
              href={`/guides/${g.slug}/`}
              className="group grid grid-cols-[auto_1fr] items-start gap-x-5 gap-y-2 py-5 transition hover:bg-paper md:grid-cols-[auto_1fr_auto] md:px-3"
            >
              <span className="num text-[28px] font-extralight leading-none tracking-[-0.04em] text-surface-3 transition group-hover:text-brand">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold leading-snug text-ink">{g.title}</h2>
                <p className="mt-1.5 line-clamp-2 max-w-2xl text-[12px] leading-relaxed text-muted">{g.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {g.tags.slice(0, 3).map(t => (
                    <span key={t} className="chip text-[9px] text-muted">{t}</span>
                  ))}
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-4 md:col-span-1 md:flex-col md:items-end md:justify-start">
                <span className="num text-[10px] text-muted">{g.updated || '—'}</span>
                <span className="label transition group-hover:text-brand">
                  {readingMinutes(g.body)} MIN →&nbsp;
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}