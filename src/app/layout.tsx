import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { Pokeball } from '@/components/Pokeball';
import { datasetMeta } from '@/lib/data';

const SITE = '宝可梦百科';

export const metadata: Metadata = {
  title: {
    default: `${SITE} · 中文宝可梦图鉴与方可梦攻略`,
    template: `%s · ${SITE}`,
  },
  description:
    '中文宝可梦百科：1025 只宝可梦的官方原画、种族值、属性相克、进化链与图鉴描述，并提供《我的世界》方可梦（Cobblemon）像素建模查看与整合包攻略。',
  keywords: ['宝可梦', '图鉴', 'Pokémon', '方可梦', 'Cobblemon', '属性相克', '种族值', '进化链'],
  applicationName: SITE,
  authors: [{ name: SITE }],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#f4f3ef',
  colorScheme: 'light',
};

const FOOTER_LINKS = [
  { href: '/pokedex/', label: '宝可梦图鉴', no: '01' },
  { href: '/types/', label: '属性相克表', no: '02' },
  { href: '/guides/', label: '方可梦攻略', no: '03' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className="min-h-dvh">
        <SiteHeader />
        <main>{children}</main>

        <footer className="mt-24 border-t border-line">
          <div className="container-page py-12">
            <div className="grid gap-10 md:grid-cols-12">
              <div className="md:col-span-5">
                <div className="flex items-center gap-2 text-ink">
                  <Pokeball size={22} />
                  <span className="text-[15px] font-semibold tracking-[-0.02em]">宝可梦百科</span>
                </div>
                <p className="mt-4 max-w-sm text-[11px] leading-relaxed text-muted">
                  收录第 1–9 世代共 {datasetMeta.pokemon} 只宝可梦的中文资料、官方原画与方可梦像素建模，以及《我的世界》Cobblemon
                  整合包的上手指南。数据来自 PokeAPI 与 Cobblemon 官方模组资源；宝可梦相关名称与形象版权归 Nintendo /
                  Creatures Inc. / GAME FREAK inc. 所有，本站仅作非商业性的资料整理与学习用途。
                </p>
              </div>

              <div className="md:col-span-3 md:col-start-7">
                <h3 className="label border-b border-line-soft pb-2">站点 / Index</h3>
                <ul className="mt-3 space-y-2">
                  {FOOTER_LINKS.map(l => (
                    <li key={l.href} className="flex items-baseline gap-2 text-[13px]">
                      <span className="num text-[10px] text-muted">{l.no}</span>
                      <Link prefetch={false} href={l.href} className="text-ink-dim transition hover:text-brand">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-3">
                <h3 className="label border-b border-line-soft pb-2">数据 / Source</h3>
                <ul className="mt-3 space-y-2 text-[11px] text-muted">
                  <li>PokeAPI · CC BY-SA 4.0</li>
                  <li>Cobblemon · 官方模组资源</li>
                  <li className="num">Build {datasetMeta.generatedAt.slice(0, 10)}</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-2 border-t border-line-soft pt-4 md:flex-row md:items-center md:justify-between">
              <span className="label">© 2026 宝可梦百科 · 非商业资料整理</span>
              <span className="label">
                1025 Pokémon · 18 Types · {datasetMeta.chains} Evolution Chains
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}