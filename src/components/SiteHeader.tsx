'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';
import { typeColor, typeZh } from '@/lib/shared';
import type { IndexRow } from '@/lib/types';
import { Pokeball } from './Pokeball';
import { TypeIcon } from './TypeIcon';

const NAV = [
  { href: '/pokedex/', label: '图鉴', no: '01' },
  { href: '/types/', label: '属性', no: '02' },
  { href: '/guides/', label: '攻略', no: '03' },
];

export function SiteHeader() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      // 用「/」而不是 Ctrl+K：Chrome/Edge 会把 Ctrl+K 抢去搜索地址栏
      if (e.key === '/' && !typing) {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (e.key === 'Escape') setFocus(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const [index, setIndex] = useState<IndexRow[] | null>(null);

  const ensureIndex = () => {
    if (index) return;
    import('@/data/index.json').then(m => setIndex(m.default as unknown as IndexRow[]));
  };

  const kw = q.trim().toLowerCase();
  const results =
    kw && index
      ? index
          .filter(
            r =>
              r[1].toLowerCase().includes(kw) ||
              r[2].toLowerCase().includes(kw) ||
              String(r[0]) === kw,
          )
          .slice(0, 8)
      : [];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/92 backdrop-blur-md">
      <div className="container-page flex h-14 items-center gap-5">
        <Link prefetch={false} href="/" className="flex shrink-0 items-center gap-2 text-ink">
          <Pokeball size={20} />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">宝可梦百科</span>
          <span className="label ml-1 hidden lg:block">Pokédex 01—09</span>
        </Link>

        <nav className="hidden h-full items-stretch md:flex">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href.replace(/\/$/, ''));
            return (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 border-b-2 px-3 text-[13px] transition ${
                  active
                    ? 'border-ink font-medium text-ink'
                    : 'border-transparent text-muted hover:border-line-soft hover:text-ink'
                }`}
              >
                <span className="num text-[10px] text-muted/70">{item.no}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative ml-auto w-full max-w-[320px]">
          <input
            id="global-search"
            value={q}
            onChange={e => {
              setQ(e.target.value);
              ensureIndex();
            }}
            onFocus={() => {
              setFocus(true);
              ensureIndex();
            }}
            onBlur={() => setTimeout(() => setFocus(false), 150)}
            placeholder="搜索名称 / 编号 / 英文名"
            aria-label="搜索宝可梦"
            className="h-9 w-full border border-line-soft bg-paper px-2.5 pr-10 text-[12px] text-ink outline-none transition placeholder:text-muted/80 focus:border-ink"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center border border-line-soft px-1.5 font-mono text-[10px] leading-none text-muted sm:flex">
            /
          </kbd>

          {focus && results.length > 0 && (
            <div className="absolute inset-x-0 top-[calc(100%+6px)] border border-line bg-paper">
              <div className="flex items-center justify-between border-b border-line-soft px-2.5 py-1.5">
                <span className="label">Results</span>
                <span className="num text-[10px] text-muted">{results.length}</span>
              </div>
              {results.map(r => {
                const [id, zh, en, types] = r;
                return (
                  <Link
                    prefetch={false}
                    key={id}
                    href={`/pokedex/${id}/`}
                    className="flex items-center gap-2.5 border-b border-line-soft px-2.5 py-2 transition last:border-b-0 hover:bg-surface-2"
                  >
                    <span className="num w-9 shrink-0 text-[10px] text-muted">{String(id).padStart(4, '0')}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset(`/art/${String(id).padStart(4, '0')}.webp`)}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 object-contain"
                      loading="lazy"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-ink">{zh}</span>
                      <span className="block truncate text-[10px] uppercase tracking-[0.1em] text-muted">{en}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {types.slice(0, 2).map((t: string) => (
                        <span
                          key={t}
                          className="flex items-center gap-1 text-[10px] text-ink-dim"
                          title={typeZh(t)}
                        >
                          <TypeIcon type={t} size={11} color={typeColor(t)} />
                        </span>
                      ))}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setOpen(v => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-line-soft text-ink md:hidden"
          aria-label="打开菜单"
          aria-expanded={open}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d={open ? 'M5 5l14 14M19 5L5 19' : 'M3 7h18M3 12h18M3 17h18'} />
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-paper md:hidden">
          {[{ href: '/', label: '首页', no: '00' }, ...NAV].map(item => (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 border-b border-line-soft px-5 py-3 text-[13px] text-ink last:border-b-0"
            >
              <span className="num text-[10px] text-muted">{item.no}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}