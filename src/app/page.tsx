import Link from 'next/link';
import CobblemonViewer from '@/components/CobblemonViewer';
import { PokemonCard } from '@/components/PokemonCard';
import { TypeIcon } from '@/components/TypeIcon';
import { allTypes, cobblemonAssets, cobblemonMeta, datasetMeta, pokemonById, typeColor, typeZh } from '@/lib/data';
import { getAllGuides, readingMinutes } from '@/lib/guides';

const FEATURED = [1, 4, 7, 25, 6, 94, 133, 143, 150, 448, 658, 887];

export default function HomePage() {
  const featured = FEATURED.map(id => pokemonById.get(id)).filter(Boolean);
  const guides = getAllGuides().slice(0, 3);
  const modelled = cobblemonMeta.species;
  const showcase = cobblemonAssets(25);

  const stats = [
    { label: '宝可梦', en: 'Entries', value: datasetMeta.pokemon.toLocaleString() },
    { label: '属性', en: 'Types', value: String(datasetMeta.types) },
    { label: '进化链', en: 'Evolutions', value: String(datasetMeta.chains) },
    { label: '方可梦建模', en: '3D Models', value: String(modelled || 905) },
  ];

  const indexRows = [
    { no: '01', zh: '宝可梦图鉴', en: 'Pokédex', href: '/pokedex/', note: `${datasetMeta.pokemon} 条目 · 可筛选` },
    { no: '02', zh: '属性相克表', en: 'Type Chart', href: '/types/', note: '18 × 18 完整倍率' },
    { no: '03', zh: '方可梦攻略', en: 'Cobblemon', href: '/guides/', note: '整合包上手指南' },
  ];

  return (
    <>
      {/* ── 01 封面 ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="dotgrid pointer-events-none absolute right-0 top-0 h-64 w-1/2" />
        <div className="container-page relative grid gap-12 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-8">
            <div className="flex items-center gap-3">
              <span className="label">Pokédex</span>
              <span className="h-px w-8 bg-line" />
              <span className="label">Gen 1—9</span>
            </div>
            <h1 className="display mt-7 text-[clamp(3.2rem,8.6vw,7rem)] text-ink">
              宝可梦<span className="text-brand">百科</span>
            </h1>
            <p className="mt-6 max-w-lg text-[13px] leading-[1.9] text-ink-dim">
              种族值、属性相克、进化链、图鉴描述，一页看全。
              <br className="hidden sm:block" />
              每只宝可梦还能在
              <span className="marker font-medium"> 官方原画 </span>
              与
              <span className="marker font-medium"> 方可梦 3D 像素建模 </span>
              之间切换。
            </p>
            <div className="mt-9 flex flex-wrap gap-2">
              <Link prefetch={false} href="/pokedex/" className="btn btn-primary">
                进入图鉴 →
              </Link>
              <Link prefetch={false} href="/types/" className="btn">
                属性相克表
              </Link>
              <Link prefetch={false} href="/guides/" className="btn">
                方可梦攻略
              </Link>
            </div>
          </div>

          <dl className="md:col-span-4 md:border-l md:border-line-soft md:pl-8">
            {stats.map(s => (
              <div
                key={s.label}
                className="flex items-end justify-between border-b border-line-soft py-3 first:border-t first:border-line-soft md:first:border-t-0 md:first:pt-0"
              >
                <dt>
                  <span className="block text-[12px] text-ink">{s.label}</span>
                  <span className="label">{s.en}</span>
                </dt>
                <dd className="num text-[30px] font-light leading-none tracking-tight text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 02 目录条 ─────────────────────────────────────── */}
      <nav className="container-page" aria-label="主导航">
        {indexRows.map(r => (
          <Link
            prefetch={false}
            key={r.href}
            href={r.href}
            className="group flex items-center justify-between border-b border-line-soft py-6 transition hover:border-ink"
          >
            <span className="flex items-baseline gap-6">
              <span className="num text-[11px] text-muted">{r.no}</span>
              <span className="text-[24px] font-light tracking-[-0.02em] text-ink md:text-[30px]">
                {r.zh}
              </span>
              <span className="label hidden md:block">{r.en}</span>
            </span>
            <span className="flex items-center gap-4">
              <span className="text-[11px] text-muted">{r.note}</span>
              <span className="text-[18px] text-ink transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
      </nav>

      {/* ── 03 建模演示 ───────────────────────────────────── */}
      <section className="container-page py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="label">Cobblemon / 3D</span>
            <h2 className="mt-5 text-[26px] font-light leading-[1.25] tracking-[-0.02em] text-ink md:text-[32px]">
              把图鉴里的宝可梦
              <br />
              变成 Minecraft 里的
              <span className="text-brand"> 像素建模</span>
            </h2>
            <p className="mt-5 max-w-md text-[12px] leading-[1.9] text-muted">
              方可梦（Cobblemon）是《我的世界》上的宝可梦模组：在方块世界里遇到、捕捉、培养宝可梦。本站直接解析模组内的
              Bedrock 几何文件，在浏览器里就能 360° 查看模型并对照闪光配色。
            </p>
            <ul className="mt-7 border-t border-line-soft">
              {[
                ['01', '鼠标 / 手指拖拽旋转，松手后自动缓转'],
                ['02', '一键切换普通 / 闪光（Shiny）贴图'],
                ['03', '未收录建模的宝可梦会明确标注，不给假图'],
              ].map(([no, text]) => (
                <li key={no} className="flex gap-4 border-b border-line-soft py-2.5">
                  <span className="num text-[10px] text-muted">{no}</span>
                  <span className="text-[12px] text-ink-dim">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex gap-2">
              <Link prefetch={false} href="/guides/getting-started/" className="btn">
                怎么开始玩
              </Link>
              <Link prefetch={false} href="/pokedex/25/" className="btn">
                皮卡丘 →
              </Link>
            </div>
          </div>

          <div className="md:col-span-7 md:border-l md:border-line-soft md:pl-10">
            <CobblemonViewer
              modelUrl={showcase?.modelUrl ?? ''}
              textureUrl={showcase?.textureUrl ?? ''}
              shinyUrl={showcase?.shinyUrl ?? null}
              animationUrl={showcase?.animationUrl ?? null}
              renderUrl={showcase?.renderUrl ?? null}
              nameZh="皮卡丘"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="label">图 01 — 皮卡丘 / Pikachu</span>
              <span className="label">Drag to rotate</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 04 精选图鉴 ───────────────────────────────────── */}
      <section className="container-page">
        <div className="flex items-end justify-between border-b border-line pb-3">
          <h2 className="section-title">精选图鉴</h2>
          <Link prefetch={false} href="/pokedex/" className="label transition hover:text-brand">
            全部 {datasetMeta.pokemon} 只 →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {featured.map(p => (
            <PokemonCard
              key={p!.id}
              id={p!.id}
              nameZh={p!.name.zh}
              nameEn={p!.name.en}
              types={p!.types}
              total={p!.total}
              legendary={p!.legendary || p!.mythical}
            />
          ))}
        </div>
      </section>

      {/* ── 05 属性 ───────────────────────────────────────── */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between border-b border-line pb-3">
          <h2 className="section-title">18 种属性</h2>
          <Link prefetch={false} href="/types/" className="label transition hover:text-brand">
            完整相克矩阵 →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {allTypes.map(t => (
            <Link
              prefetch={false}
              key={t.key}
              href={`/types/?focus=${t.key}`}
              className="group flex flex-col items-center gap-2 border border-line-soft bg-paper py-4 transition hover:border-ink hover:bg-surface-2"
            >
              <TypeIcon type={t.key} size={22} color={typeColor(t.key)} strokeWidth={1.5} />
              <span className="text-[12px] font-medium text-ink">{typeZh(t.key)}</span>
              <span className="label text-[9px]">{t.en}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 06 攻略 ───────────────────────────────────────── */}
      <section className="container-page pb-20">
        <div className="flex items-end justify-between border-b border-line pb-3">
          <h2 className="section-title">方可梦整合包攻略</h2>
          <Link prefetch={false} href="/guides/" className="label transition hover:text-brand">
            全部攻略 →
          </Link>
        </div>
        {guides.length > 0 ? (
          <div>
            {guides.map((g, i) => (
              <Link
                prefetch={false}
                key={g.slug}
                href={`/guides/${g.slug}/`}
                className="group grid gap-3 border-b border-line-soft py-6 transition hover:border-ink md:grid-cols-12"
              >
                <span className="num text-[11px] text-muted md:col-span-1">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="md:col-span-7">
                  <h3 className="text-[17px] font-normal tracking-[-0.01em] text-ink group-hover:text-brand">
                    {g.title}
                  </h3>
                  <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-muted">{g.summary}</p>
                </div>
                <div className="flex items-start gap-2 md:col-span-4 md:justify-end">
                  <span className="label">{readingMinutes(g.body)} min</span>
                  <span className="label text-muted/60">/</span>
                  <span className="label">{g.tags.slice(0, 2).join(' · ')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-sm text-muted">攻略内容整理中，稍后刷新看看。</div>
        )}
      </section>
    </>
  );
}