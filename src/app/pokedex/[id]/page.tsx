import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EvolutionTree } from '@/components/EvolutionTree';
import { MonsterMedia } from '@/components/MonsterMedia';
import { MoveList } from '@/components/MoveList';
import { BaseStatsPanel } from '@/components/BaseStatsPanel';
import { StatCalculator } from '@/components/StatCalculator';
import { AbilityList } from '@/components/AbilityList';
import { TypeBadge } from '@/components/TypeBadge';
import { asset } from '@/lib/asset';
import {
  GENERATIONS,

  allPokemon,
  cobblemonAssets,
  cobblemonMeta,
  dexNo,
  defensiveMultipliers,
  encountersFor,
  evolutionTreeFor,
  formsFor,
  genderRatio,
  evYieldFor,
  getPokemon,
  hasShinyArt,
  learnsetFor,
  learnsetStats,
  MOVE_METHODS,
  pokemonById,
  spawnFor,
  specialFor,
  typeZh,
  type SpecialEntry,
} from '@/lib/data';

/** 特殊途径分类 → 短标签 */
const SPECIAL_KIND_ZH: Record<string, string> = {
  map: '特殊地图',
  structure: '限定结构',
  dimension: '专属维度',
  item: '道具',
  fossil: '化石',
  summon: '召唤',
  feature: '形态道具',
  raid: '团体战',
  boss: '首领战',
};

/** 正作分类的中文徽标（与 special.json 里的 kind 对齐） */
function SpecialBlock({
  label,
  entries,
  empty,
}: {
  label: string;
  entries?: SpecialEntry[];
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <p className="label">{label}</p>
      {entries && entries.length > 0 ? (
        <ul className="mt-1 divide-y divide-line-soft">
          {entries.map((e, i) => (
            <li key={`${e.kind}-${i}`} className="py-3">
              <div className="flex items-baseline gap-2">
                <span className="chip shrink-0 whitespace-nowrap">
                  {SPECIAL_KIND_ZH[e.kind] ?? e.kind}
                </span>
                <p className="min-w-0 truncate text-[12px] leading-snug text-ink">{e.title}</p>
                {e.source ? (
                  <span className="num ml-auto shrink-0 text-[10px] text-muted">{e.source}</span>
                ) : null}
              </div>
              <dl className="mt-1.5 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1">
                {e.facts.map((f, j) => (
                  <div key={`${f.k}-${j}`} className="contents">
                    <dt className="num text-[10px] leading-relaxed text-muted">{f.k}</dt>
                    <dd className="text-[11px] leading-relaxed text-ink-dim">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] leading-relaxed text-muted">{empty}</p>
      )}
    </div>
  );
}

const COLOR_ZH: Record<string, string> = {
  black: '黑',
  blue: '蓝',
  brown: '棕',
  gray: '灰',
  green: '绿',
  pink: '粉',
  purple: '紫',
  red: '红',
  white: '白',
  yellow: '黄',
};

export const dynamicParams = false;

export function generateStaticParams() {
  return allPokemon.map(p => ({ id: String(p.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = getPokemon(Number(id));
  if (!p) return { title: '未找到该宝可梦' };
  const types = p.types.map(typeZh).join(' / ');
  const desc =
    p.flavor?.slice(0, 110) ||
    `${p.name.zh}（${p.name.en}）是${p.genus || '宝可梦'}，${types}属性，种族值 ${p.total}。`;
  return {
    title: `${p.name.zh} #${dexNo(p.id)} · ${types}`,
    description: desc,
    openGraph: {
      title: `${p.name.zh} ${p.name.en}`,
      description: desc,
    },
  };
}

export default async function PokemonDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const p = getPokemon(Number(raw));
  if (!p) notFound();

  const prev = pokemonById.get(p.id - 1);
  const next = pokemonById.get(p.id + 1);
  const eff = defensiveMultipliers(p);
  const tree = evolutionTreeFor(p.id);
  const gender = genderRatio(p.genderRate);
  const cobble = cobblemonAssets(p.id);
  const spawnData = cobble ? spawnFor(cobble.species) : null;
  const wildEncounters = encountersFor(p.id);
  const special = specialFor(p.id);
  const specialForms = formsFor(p.id);
  const cobbleMoves = learnsetFor(p.id, 'cobblemon');
  const gameMoves = learnsetFor(p.id, 'game');
  const methodSummary = (list: ReturnType<typeof learnsetFor>) => {
    const counts = learnsetStats(list);
    return MOVE_METHODS.filter(m => counts[m.code])
      .map(m => `${m.label} ${counts[m.code]}`)
      .join(' · ');
  };

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: '分类', value: p.genus || '—' },
    { label: '属性', value: p.types.map(t => typeZh(t)).join(' / ') },
    { label: '身高', value: `${(p.height / 10).toFixed(1)} m` },
    { label: '体重', value: `${(p.weight / 10).toFixed(1)} kg` },
    { label: '捕获率', value: p.captureRate == null ? '—' : `${p.captureRate} / 255` },
    {
      label: '孵化',
      value:
        p.hatchCounter == null
          ? '—'
          : `${p.hatchCounter} 圈 · ${(p.hatchCounter * 255).toLocaleString()} 步`,
    },
    { label: '世代', value: GENERATIONS[p.gen] || `第 ${p.gen} 世代` },
    { label: '颜色', value: p.color ? COLOR_ZH[p.color] || p.color : '—' },
  ];

  return (
    <div className="container-page py-6">
      <nav className="flex items-center gap-2 text-[11px] text-muted" aria-label="面包屑">
        <Link prefetch={false} href="/" className="transition hover:text-ink">
          首页
        </Link>
        <span className="text-line-soft">/</span>
        <Link prefetch={false} href="/pokedex/" className="transition hover:text-ink">
          图鉴
        </Link>
        <span className="text-line-soft">/</span>
        <span className="num text-ink-dim">{dexNo(p.id)}</span>
      </nav>

      {/* 标题区 */}
      <header className="mt-5 grid gap-6 border-b border-line pb-6 md:grid-cols-12 md:items-end">
        <div className="min-w-0 md:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-[11px] text-muted">No.{dexNo(p.id)}</span>
            {p.legendary && <span className="chip text-brand">传说</span>}
            {p.mythical && <span className="chip text-brand">幻之宝可梦</span>}
            {cobble && <span className="chip text-ink-dim">Cobblemon 已建模</span>}
          </div>
          <h1 className="display mt-3 flex flex-wrap items-baseline gap-x-4 text-[clamp(2.4rem,5.4vw,3.8rem)] text-ink">
            {p.name.zh}
            <span className="label text-[11px] tracking-[0.24em]">{p.name.en}</span>
            {p.name.ja && <span className="text-[12px] text-muted">{p.name.ja}</span>}
          </h1>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.types.map(t => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 md:col-span-4 md:justify-end">
          <div className="flex gap-1.5">
            {prev ? (
              <Link
                prefetch={false}
                href={`/pokedex/${prev.id}/`}
                className="flex h-9 w-9 items-center justify-center border border-line-soft text-muted transition hover:border-ink hover:text-ink"
                title={prev.name.zh}
                aria-label={`上一只：${prev.name.zh}`}
              >
                ←
              </Link>
            ) : null}
            {next ? (
              <Link
                prefetch={false}
                href={`/pokedex/${next.id}/`}
                className="flex h-9 w-9 items-center justify-center border border-line-soft text-muted transition hover:border-ink hover:text-ink"
                title={next.name.zh}
                aria-label={`下一只：${next.name.zh}`}
              >
                →
              </Link>
            ) : null}
          </div>
          <span className="num hidden text-[64px] font-extralight leading-[0.8] tracking-[-0.05em] text-surface-3 md:block">
            {dexNo(p.id)}
          </span>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        {/* 左栏：媒体 + 基础资料 */}
        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-20">
            <MonsterMedia
              dex={p.id}
              nameZh={p.name.zh}
              types={p.types}
              forms={
                cobble
                  ? cobble.forms.map(f => ({
                      key: f.key,
                      label: f.label,
                      modelUrl: `/cobblemon/${p.id}/${f.model}`,
                      textureUrl: `/cobblemon/${p.id}/${f.texture}`,
                      shinyUrl: f.shiny ? `/cobblemon/${p.id}/${f.shiny}` : null,
                      animationUrl: f.animation ? `/cobblemon/${p.id}/${f.animation}` : null,
                      renderUrl: f.render ? `/cobblemon/${p.id}/${f.render}` : null,
                      source: f.source,
                    }))
                  : []
              }
              missingHint={
                p.legendary || p.mythical
                  ? `本站已收录 ${cobblemonMeta.species} / 1025 只宝可梦的方可梦建模，这只传说宝可梦尚未覆盖。`
                  : `本站已收录 ${cobblemonMeta.species} / 1025 只宝可梦的方可梦建模，这一只尚未覆盖。`
              }
              shinyArt={hasShinyArt(p.id)}
            />

            <div className="mt-8">
              <h2 className="label border-b border-line pb-2">基础资料 / Data</h2>
              <dl className="divide-y divide-line-soft">
                {facts.map(f => (
                  <div key={f.label} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="shrink-0 text-[11px] text-muted">{f.label}</dt>
                    <dd className="truncate text-right text-[12px] text-ink">{f.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted">性别比例</span>
                  <span className="num text-[11px] text-ink">
                    {gender
                      ? `♂ ${gender.male.toFixed(0)}% · ♀ ${gender.female.toFixed(0)}%`
                      : '无性别 / 未知'}
                  </span>
                </div>
                {gender ? (
                  <div className="mt-1.5 flex h-[5px] bg-surface-2">
                    <div className="h-full bg-ink" style={{ width: `${gender.male}%` }} />
                    <div
                      className="h-full"
                      style={{ width: `${gender.female}%`, backgroundColor: 'var(--color-brand)' }}
                    />
                  </div>
                ) : (
                  <div className="mt-1.5 h-[5px] bg-surface-2" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右栏：数据 */}
        <div className="min-w-0 space-y-10 lg:col-span-7">
          <section>
            <div className="flex items-end justify-between border-b border-line pb-2">
              <h2 className="label">种族值 / Base Stats</h2>
              <span className="label">拖动等级看能力值范围</span>
            </div>
            <div className="mt-4">
              <BaseStatsPanel dex={p.id} stats={p.stats} total={p.total} evYield={evYieldFor(p.id)} />
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between border-b border-line pb-2">
              <h2 className="label">个体能力值计算 / Stat Calculator</h2>
              <span className="label">等级 · 性格 · 个体值 · 努力值</span>
            </div>
            <div className="mt-4">
              <StatCalculator id={p.id} stats={p.stats} />
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between border-b border-line pb-2">
              <h2 className="label">特性 / Abilities</h2>
              <span className="label">点击展开效果</span>
            </div>
            <AbilityList abilities={p.abilities} />
          </section>

          <section>
            <h2 className="label border-b border-line pb-2">属性相克 / Defense</h2>
            <div className="divide-y divide-line-soft">
              <EffRow label="弱点" items={eff.weak} tone="weak" />
              <EffRow label="抵抗" items={eff.resist} tone="resist" />
              <EffRow
                label="免疫"
                items={eff.immune.map(t => [t, 0] as [string, number])}
                tone="immune"
              />
            </div>
            {eff.weak.length === 0 && eff.resist.length === 0 && eff.immune.length === 0 && (
              <p className="py-3 text-[12px] text-muted">无特殊相克关系</p>
            )}
          </section>

          {specialForms.length > 0 && (
            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                <h2 className="label">特殊形态 / Special Forms</h2>
                <span className="label">{specialForms.length} 形态</span>
              </div>
              <div className="mt-px grid gap-px bg-line-soft sm:grid-cols-2">
                {specialForms.map(form => (
                  <Link
                    key={form.key}
                    prefetch={false}
                    href={`/pokedex/${p.id}/form/${form.key}/`}
                    className="group flex items-center gap-3 bg-paper px-3 py-2.5 transition hover:bg-surface-2"
                  >
                    <img
                      src={asset(`/form-oa/${p.id}-${form.key}.webp`)}
                      alt={`${p.name.zh} · ${form.label}`}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 border border-line-soft bg-bg-soft object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{form.label}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {form.types.map(t => (
                          <TypeBadge key={t} type={t} size="sm" asLink={false} />
                        ))}
                      </div>
                    </div>
                    <div className="num shrink-0 text-right text-[11px] text-muted">
                      <div className="text-[15px] font-light text-ink">{form.total}</div>
                      种族值
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="label border-b border-line pb-2">图鉴描述 / Pokédex Entry</h2>
            {p.flavor ? (
              <>
                <p className="mt-4 text-[15px] leading-[1.9] text-ink-dim">{p.flavor}</p>
                {p.flavorVersion && <p className="label mt-3">— 《宝可梦 {p.flavorVersion}》</p>}
              </>
            ) : (
              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                这只宝可梦暂无中文图鉴描述（多见于第九世代新增条目）。可以切换查看官方原画与建模。
              </p>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="label">进化链 / Evolution</h2>
              {p.evolvesFrom && (
                <Link
                  prefetch={false}
                  href={`/pokedex/${p.evolvesFrom}/`}
                  className="label transition hover:text-brand"
                >
                  由 {pokemonById.get(p.evolvesFrom)?.name.zh || '未知'} 进化而来
                </Link>
              )}
            </div>
            <div className="mt-4">
              {tree ? (
                <>
                  <EvolutionTree node={tree} current={p.id} />
                  {p.evolution && (
                    <p className="mt-3 border-t border-line-soft pt-2.5 text-[11px] text-muted">
                      进化条件：<span className="text-ink-dim">{p.evolution}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-muted">该宝可梦不参与进化（或为独立进化链的起点）。</p>
              )}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="label">可学习技能 / Moves</h2>
              <span className="label">{cobbleMoves.length + gameMoves.length} 条记录</span>
            </div>
            <div className="mt-4 space-y-6">
              <MoveList
                entries={cobbleMoves}
                label="方可梦整合包可学习技能 / Cobblemon Moves"
                note={methodSummary(cobbleMoves)}
              />
              <MoveList
                entries={gameMoves}
                label="宝可梦游戏可学习技能 / Game Moves"
                note={methodSummary(gameMoves)}
              />
            </div>
            <p className="mt-3 border-t border-line-soft pt-2.5 text-[11px] leading-relaxed text-muted">
              方可梦一侧直接取自整合包内 Cobblemon 的招式表（含等级、招式机、遗传、教学与遗留）；
              游戏一侧汇总 PokeAPI 记录的历代可学招式。点击任意技能查看威力、PP、分类与说明。
            </p>
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="label">在方可梦中获取 / Cobblemon</h2>
              <span className="label">
                {cobble ? `${cobble.forms.length} 形态 · 已实装` : '未实装'}
              </span>
            </div>

            {spawnData ? (
              <div className="mt-1 divide-y divide-line-soft">
                {spawnData.rules.map((r, i) => (
                  <div key={i} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[13px] text-ink">
                        {r.where.join(' · ')}
                      </span>
                      <span
                        className={`label shrink-0 ${r.bucket === 'ultra-rare' ? 'text-brand' : ''}`}
                      >
                        {r.bucketZh}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span className="num">Lv {r.lv}</span>
                      {r.weight != null && <span className="num">权重 {r.weight}</span>}
                      {r.presets.length > 0 && <span>{r.presets.join(' / ')}</span>}
                      {r.when.map(w => (
                        <span key={w}>{w}</span>
                      ))}
                      {r.aspects && <span className="text-brand">{r.aspects}</span>}
                    </div>
                  </div>
                ))}
                <p className="pb-1 pt-2.5 text-[11px] leading-relaxed text-muted">
                  以上为 {cobblemonMeta.version.split('+')[0]} 的 spawn_pool 原始条件（生物群系、光照、时间、结构、权重）。
                  所有已实装宝可梦都可以通过繁殖或进化获得，稀有度不同的只是野外遭遇概率。
                </p>
              </div>
            ) : cobble ? (
              <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-muted">
                <p>
                  {p.legendary || p.mythical
                    ? '传说 / 幻之宝可梦：在方可梦（Cobblemon）中不会自然生成，需要通过特殊事件、专属结构或活动获取。'
                    : p.evolvesFrom
                      ? `不会自然生成，由${
                          pokemonById.get(p.evolvesFrom)?.name.zh ?? '前形态'
                        }进化而来（前形态的生成条件见其详情页）。`
                      : '没有自然生成记录，通常来自繁殖、化石复活或特殊事件。'}
                </p>
                <p>建模已实装，可以在游戏里通过繁殖 / 交换获得。</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-muted">
                <p>
                  本项目已收录 {cobblemonMeta.species} / 1025 只宝可梦的方可梦建模（Cobblemon 本体 905 只 + Mega Showdown、
                  JoStar 大集合等扩展补齐的传说与形态），这一只暂时不在其中——模组数据里
                  <span className="text-ink-dim">没有模型、没有生成池、也没有图鉴条目</span>
                  ，因此在方可梦中不会出现。
                </p>
                <p>如果你在整合包里见过它，说明那个整合包加载了本站尚未收录的扩展模组；可以告诉我模组名，我再补一版数据。</p>
              </div>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="label">在宝可梦游戏中获取 / Encounters</h2>
              <span className="label">{wildEncounters.length} 个版本</span>
            </div>

            {wildEncounters.length > 0 ? (
              <div className="mt-1 divide-y divide-line-soft">
                {wildEncounters.map(v => (
                  <div key={v.ver} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[12px] text-ink">
                        <span className="num mr-2 text-[10px] text-muted">GEN {v.gen}</span>
                        {v.verZh}
                      </span>
                      <span className="num shrink-0 text-[10px] text-muted">
                        {v.methods.length < v.methodCount ? `${v.methodCount} 种方式` : ''}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                      {v.methods.map(m => (
                        <span key={m.m} title={m.areas.join(' / ')}>
                          {m.mZh}
                          <span className="num ml-1 text-ink-dim">Lv {m.lv}</span>
                          {m.chance ? <span className="num ml-1">· {m.chance}%</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="pb-1 pt-2.5 text-[11px] leading-relaxed text-muted">
                  数据来自 PokeAPI 的野外遭遇记录，只统计有明确等级 / 概率的遭遇；剧情赠送、交换、团体战等活动方式见下方「特殊获取途径」。悬停某一行可查看示例地点。
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-muted">
                <p>
                  {p.legendary || p.mythical
                    ? '传说 / 幻之宝可梦：没有野外遭遇记录，通常通过剧情固定遭遇、活动配送或特殊道具获得。'
                    : p.evolvesFrom
                      ? `没有野外遭遇记录，主要通过进化获得（由${
                          pokemonById.get(p.evolvesFrom)?.name.zh ?? '前形态'
                        }进化）。`
                      : 'PokeAPI 没有收录这只的野外遭遇数据，可能是交换、赠送、化石复活或活动专属。'}
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="label">特殊获取途径 / Special Methods</h2>
              <span className="label">
                {(special?.cobblemon?.length ?? 0) + (special?.game?.length ?? 0)} 条
              </span>
            </div>
            {special ? (
              <div className="mt-3 grid gap-8 lg:grid-cols-2">
                <SpecialBlock
                  label="方可梦整合包 / Cobblemon"
                  entries={special.cobblemon}
                  empty={
                    spawnData && spawnData.rules.length > 0
                      ? '只有普通野外刷新（规则见上方「在方可梦中获取」），没有额外的地图或道具限制。'
                      : p.legendary || p.mythical
                        ? '不会自然生成 —— 需要召唤道具、专属结构或特殊事件。'
                        : cobble
                          ? '不会自然生成 —— 需要通过进化、繁殖或化石复活获得。'
                          : '这一只没有对应的方可梦建模，也就没有生成数据。'
                  }
                />
                <SpecialBlock
                  label="宝可梦游戏 / Games"
                  entries={special.game}
                  empty={
                    wildEncounters.length > 0
                      ? '只有普通野外遭遇（见上方「在宝可梦游戏中获取」），没有剧情或活动专属方式。'
                      : 'PokeAPI 没有记录特殊方式，可能通过进化、交换或配信获得。'
                  }
                />
              </div>
            ) : (
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                没有记录到额外的特殊途径 —— 通过正常刷新、进化或繁殖即可获得。
              </p>
            )}
          </section>

          <section>
            <h2 className="label border-b border-line pb-2">建模与来源 / Model</h2>
            {cobble ? (
              <div className="mt-3">
                <dl className="divide-y divide-line-soft">
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="shrink-0 text-[11px] text-muted">实装形态</dt>
                    <dd className="min-w-0 truncate text-right text-[11px] text-ink">
                      {cobble.forms.map(f => f.label).join(' / ')}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="shrink-0 text-[11px] text-muted">模型文件</dt>
                    <dd className="num truncate text-[11px] text-ink">{cobble.form.model}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="shrink-0 text-[11px] text-muted">闪光贴图</dt>
                    <dd className="text-[12px] text-ink">
                      {cobble.forms.some(f => f.shiny) ? '已收录（右上角 ✦ 切换）' : '未见独立闪光贴图'}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="shrink-0 text-[11px] text-muted">待机动画</dt>
                    <dd className="text-[12px] text-ink">
                      {cobble.animationUrl ? '已收录（自动循环播放）' : '无独立动画'}
                    </dd>
                  </div>
                  {cobble.forms.some(f => f.source && f.source !== 'Cobblemon') && (
                    <div className="flex items-baseline justify-between gap-4 py-2">
                      <dt className="shrink-0 text-[11px] text-muted">扩展来源</dt>
                      <dd className="min-w-0 text-right text-[11px] text-ink">
                        {[...new Set(cobble.forms.map(f => f.source).filter(s => s && s !== 'Cobblemon'))].join(' / ')}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  {cobblemonMeta.version}（共 {cobblemonMeta.forms} 个形态、{cobblemonMeta.textures} 张贴图）。
                  网页端用 three.js 解析 Bedrock 几何、像素贴图与待机动画，建模可在「方可梦建模」里拖拽旋转、切换形态与闪光。
                </p>
              </div>
            ) : (
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                暂无模型可展示，上方可用官方原画参考外观。
              </p>
            )}
          </section>
        </div>
      </div>

      {/* 上下篇 */}
      <div className="mt-14 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
        {prev ? (
          <Link
            prefetch={false}
            href={`/pokedex/${prev.id}/`}
            className="group flex min-w-0 items-center gap-3 border border-line-soft p-3 transition hover:border-ink"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset(`/art/${dexNo(prev.id)}.webp`)}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              loading="lazy"
            />
            <span className="min-w-0">
              <span className="num block text-[10px] text-muted">← {dexNo(prev.id)}</span>
              <span className="block truncate text-[13px] text-ink">{prev.name.zh}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            prefetch={false}
            href={`/pokedex/${next.id}/`}
            className="group flex min-w-0 items-center justify-end gap-3 border border-line-soft p-3 text-right transition hover:border-ink"
          >
            <span className="min-w-0">
              <span className="num block text-[10px] text-muted">{dexNo(next.id)} →</span>
              <span className="block truncate text-[13px] text-ink">{next.name.zh}</span>
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset(`/art/${dexNo(next.id)}.webp`)}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              loading="lazy"
            />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function EffRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: [string, number][];
  tone: 'weak' | 'resist' | 'immune';
}) {
  if (!items.length) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="flex shrink-0 items-baseline gap-2">
        <span className="text-[11px] text-ink">{label}</span>
        <span className="num text-[10px] text-muted">
          {tone === 'weak' ? '×2' : tone === 'resist' ? '×0.5' : '×0'}
        </span>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        {items.map(([t]) => (
          <TypeBadge key={t} type={t} size="sm" />
        ))}
      </div>
    </div>
  );
}