import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAllGuides, getGuide, readingMinutes } from '@/lib/guides';
import { asset } from '@/lib/asset';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllGuides().map(g => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: '未找到该攻略' };
  return { title: g.title, description: g.summary };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const all = getAllGuides();
  const idx = all.findIndex(x => x.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <div className="container-page py-6">
      <nav className="flex items-center gap-2 text-[11px] text-muted" aria-label="面包屑">
        <Link prefetch={false} href="/" className="transition hover:text-ink">首页</Link>
        <span className="text-line-soft">/</span>
        <Link prefetch={false} href="/guides/" className="transition hover:text-ink">方可梦攻略</Link>
        <span className="text-line-soft">/</span>
        <span className="num text-ink-dim">CH.{String(idx + 1).padStart(2, '0')}</span>
      </nav>

      <div className="mt-5 grid gap-10 lg:grid-cols-12">
        <article className="min-w-0 lg:col-span-9">
          <header className="border-b border-line pb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="label">Cobblemon · 方可梦</span>
              <span className="num text-[10px] text-muted">
                {readingMinutes(g.body)} MIN READ{g.updated ? ` · ${g.updated}` : ''}
              </span>
            </div>
            <h1 className="display mt-2 max-w-4xl text-[clamp(1.8rem,4vw,2.9rem)] leading-[1.05] text-ink">
              {g.title}
            </h1>
            {g.summary && (
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-dim">{g.summary}</p>
            )}
            {g.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {g.tags.map(t => (
                  <span key={t} className="chip text-[9px] text-muted">{t}</span>
                ))}
              </div>
            )}
          </header>

          <div className="prose-poke mt-7 max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  const external = href?.startsWith('http');
                  return (
                    <a
                      href={href && !external ? asset(href) : href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noreferrer noopener' : undefined}
                    >
                      {children}
                    </a>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {g.body}
            </ReactMarkdown>
          </div>

          {g.sources.length > 0 && (
            <section className="mt-12 border-t border-line pt-4">
              <h2 className="label">参考来源 / Sources</h2>
              <ol className="mt-3 space-y-1.5">
                {g.sources.map((s, i) => {
                  const url = /^https?:\/\//.test(s);
                  return (
                    <li key={s} className="flex gap-2 break-all text-[11px] leading-relaxed text-muted">
                      <span className="num shrink-0">[{String(i + 1).padStart(2, '0')}]</span>
                      {url ? (
                        <a href={s} target="_blank" rel="noreferrer noopener" className="text-brand hover:underline">
                          {s}
                        </a>
                      ) : (
                        <span>{s}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <div className="mt-10 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
            {prev ? (
              <Link
                prefetch={false}
                href={`/guides/${prev.slug}/`}
                className="flex min-w-0 flex-col overflow-hidden border border-line-soft p-3 transition hover:border-ink"
              >
                <span className="label">← 上一篇</span>
                <span className="mt-1 truncate text-[13px] text-ink">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                prefetch={false}
                href={`/guides/${next.slug}/`}
                className="flex min-w-0 flex-col items-end overflow-hidden border border-line-soft p-3 text-right transition hover:border-ink"
              >
                <span className="label">下一篇 →</span>
                <span className="mt-1 truncate text-[13px] text-ink">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </article>

        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-20">
            <h2 className="label border-b border-line pb-2">目录 / Contents</h2>
            <ol className="mt-2 divide-y divide-line-soft">
              {all.map((x, i) => {
                const on = x.slug === slug;
                return (
                  <li key={x.slug}>
                    <Link
                      prefetch={false}
                      href={`/guides/${x.slug}/`}
                      className={`flex items-baseline gap-2 py-2 text-[12px] leading-snug transition ${
                        on ? 'text-ink' : 'text-muted hover:text-ink-dim'
                      }`}
                    >
                      <span className={`num shrink-0 text-[10px] ${on ? 'text-brand' : 'text-muted'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{x.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}