import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormMedia } from '@/components/FormMedia';
import { MoveList } from '@/components/MoveList';
import { BaseStatsPanel } from '@/components/BaseStatsPanel';
import { StatCalculator } from '@/components/StatCalculator';
import { AbilityList } from '@/components/AbilityList';
import { TypeBadge } from '@/components/TypeBadge';
import {
  allForms,
  dexNo,
  formAssets,
  formFor,
  evYieldFor,
  getPokemon,
  hasShinyFormArt,
  learnsetFor,
  learnsetStats,
  MOVE_METHODS,
  typeColor,
  typeZh,
} from '@/lib/data';

export const dynamicParams = false;

export function generateStaticParams() {
  return allForms.map(f => ({ id: String(f.dex), key: f.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; key: string }>;
}): Promise<Metadata> {
  const { id, key } = await params;
  const base = getPokemon(Number(id));
  const form = formFor(Number(id), key);
  if (!base || !form) return {};
  const types = form.types.map(typeZh).join(' / ');
  return {
    title: `${base.name.zh} · ${form.label}`,
    description: `${base.name.zh}（${base.name.en}）的${form.label}：${types}，种族值 ${form.total}，出自 Cobblemon。`,
  };
}

export default async function FormPage({ params }: { params: Promise<{ id: string; key: string }> }) {
  const { id: rawId, key } = await params;
  const base = getPokemon(Number(rawId));
  const form = formFor(Number(rawId), key);
  if (!base || !form) notFound();

  const assets = formAssets(base.id, form);
  const siblings = allForms.filter(f => f.dex === base.id && f.key !== form.key);
  const cobbleMoves = learnsetFor(base.id, 'cobblemon', form.key);
  const gameMoves = learnsetFor(base.id, 'game');
  const summary = (list: ReturnType<typeof learnsetFor>) => {
    const counts = learnsetStats(list);
    return MOVE_METHODS.filter(m => counts[m.code])
      .map(m => `${m.label} ${counts[m.code]}`)
      .join(' · ');
  };

  const facts: { k: string; v: string }[] = [
    { k: '形态', v: form.label },
    { k: '属性', v: form.types.map(typeZh).join(' / ') },
    { k: '种族值', v: String(form.total) },
    { k: '分类', v: form.battleOnly ? '对战形态（道具/特性触发）' : '固定形态' },
    { k: '身高', v: form.height ? `${(form.height / 10).toFixed(1)} m` : '—' },
    { k: '体重', v: form.weight ? `${(form.weight / 10).toFixed(1)} kg` : '—' },
    { k: '模型', v: form.model },
    { k: '来源', v: form.source || 'Cobblemon' },
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-10">
      <nav className="label mb-8 flex flex-wrap items-center gap-2">
        <Link prefetch={false} href="/pokedex/" className="hover:text-ink">
          POKÉDEX
        </Link>
        <span>/</span>
        <Link prefetch={false} href={`/pokedex/${base.id}/`} className="hover:text-ink">
          {base.name.zh}
        </Link>
        <span>/</span>
        <span className="text-ink">{form.label}</span>
      </nav>

      <header className="grid grid-cols-12 items-end gap-4 border-b border-line pb-6">
        <div className="col-span-12 lg:col-span-9">
          <div className="label mb-3 flex items-center gap-3">
            <span className="num">#{dexNo(base.id)}</span>
            <span className="border border-brand px-1.5 py-0.5 text-brand">形态</span>
          </div>
          <h1 className="display text-[clamp(40px,7vw,88px)]">
            {base.name.zh}
            <span className="ml-3 align-middle text-[0.32em] font-light tracking-[0.08em] text-muted">
              {form.label}
            </span>
          </h1>
          <p className="label mt-3">{base.name.en} · {form.label}</p>
        </div>
        <div className="col-span-12 flex flex-wrap gap-1.5 lg:col-span-3 lg:justify-end">
          {form.types.map(t => (
            <TypeBadge key={t} type={t} asLink />
          ))}
        </div>
      </header>

      <div className="mt-10 grid grid-cols-12 gap-8">
        <div className="col-span-12 min-w-0 space-y-6 lg:col-span-5">
          <FormMedia
            dex={base.id}
            formKey={form.key}
            nameZh={base.name.zh}
            label={form.label}
            color={typeColor(form.types[0])}
            modelUrl={assets.modelUrl}
            textureUrl={assets.textureUrl}
            shinyUrl={assets.shinyUrl}
            animationUrl={assets.animationUrl}
            renderUrl={assets.renderUrl}
            hasModel={Boolean(form.model)}
            source={form.source}
            shinyArt={hasShinyFormArt(base.id, form.key)}
          />

          <dl className="grid grid-cols-2 gap-px border border-line bg-line">
            {facts.map(f => (
              <div key={f.k} className="min-w-0 bg-paper px-3 py-2.5">
                <dt className="label">{f.k}</dt>
                <dd className="mt-0.5 truncate text-[13px]">{f.v}</dd>
              </div>
            ))}
          </dl>

          {siblings.length > 0 && (
            <div className="border border-line bg-paper">
              <div className="label border-b border-line px-3 py-2">其他形态</div>
              <div className="divide-y divide-line-soft">
                {siblings.map(s => (
                  <Link
                    key={s.key}
                    prefetch={false}
                    href={`/pokedex/${base.id}/form/${s.key}/`}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] transition hover:bg-surface-2"
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="num shrink-0 text-[11px] text-muted">{s.total}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 min-w-0 space-y-10 lg:col-span-7">
          <section>
            <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="label">种族值 / Base Stats</h2>
              <span className="num label">TOTAL {form.total}</span>
            </div>
            <div className="mt-4">
              <BaseStatsPanel dex={base.id} stats={form.stats} total={form.total} evYield={form.evYield ?? evYieldFor(base.id)} />
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between border-b border-line pb-2">
              <h2 className="label">个体能力值计算 / Stat Calculator</h2>
              <span className="label">等级 · 性格 · 个体值 · 努力值</span>
            </div>
            <div className="mt-4">
              <StatCalculator id={base.id} stats={form.stats} />
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between border-b border-line pb-2">
              <h2 className="label">特性 / Abilities</h2>
              <span className="label">点击展开效果</span>
            </div>
            <AbilityList abilities={form.abilities} />
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="label">可学习技能 / Moves</h2>
              <span className="label">{cobbleMoves.length + gameMoves.length} 条记录</span>
            </div>
            <div className="mt-4 space-y-6">
              <MoveList
                entries={cobbleMoves}
                label={`方可梦整合包可学习技能 / Cobblemon Moves`}
                note={summary(cobbleMoves)}
              />
              <MoveList entries={gameMoves} label="宝可梦游戏可学习技能 / Game Moves" note={summary(gameMoves)} />
            </div>
          </section>

          <p className="border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
            形态数据来自整合包内的 Cobblemon 物种文件（{form.source || 'Cobblemon'}），种族值、属性、特性均为该形态的原始数值。
            <Link prefetch={false} href={`/pokedex/${base.id}/`} className="ml-1 underline hover:text-ink">
              返回 {base.name.zh} 主页面
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}