import Link from 'next/link';
import { asset } from '@/lib/asset';
import { dexNo, typeColor, typeZh } from '@/lib/shared';
import { TypeIcon } from './TypeIcon';

interface Props {
  id: number;
  nameZh: string;
  nameEn: string;
  types: string[];
  total?: number;
  gen?: number;
  legendary?: boolean;
  priority?: boolean;
}

export function PokemonCard({ id, nameZh, nameEn, types, total, legendary }: Props) {
  return (
    <Link
      prefetch={false}
      href={`/pokedex/${id}/`}
      className="group flex flex-col border border-line-soft bg-paper transition hover:border-ink"
    >
      <div className="flex items-center justify-between border-b border-line-soft px-2.5 py-1.5">
        <span className="num text-[10px] text-muted">{dexNo(id)}</span>
        {legendary ? <span className="label text-brand">Legend</span> : null}
      </div>

      <div className="relative aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset(`/art/${dexNo(id)}.webp`)}
          alt={nameZh}
          loading="lazy"
          width={200}
          height={200}
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.05]"
        />
      </div>

      <div className="border-t border-line-soft px-2.5 py-2">
        <div className="flex items-baseline justify-between gap-1.5">
          <h3 className="truncate text-[13px] font-medium text-ink">{nameZh}</h3>
          {total != null ? <span className="num shrink-0 text-[11px] text-muted">{total}</span> : null}
        </div>
        <div className="mt-0.5 truncate text-[9px] uppercase tracking-[0.14em] text-muted">{nameEn}</div>
      </div>

      <div className="flex items-center gap-1.5 border-t border-line-soft px-2.5 py-1">
        {types.map(t => (
          <span key={t} className="flex items-center gap-0.5 text-[10px] text-ink-dim">
            <TypeIcon type={t} size={11} color={typeColor(t)} />
            {typeZh(t)}
          </span>
        ))}
      </div>

      <div className="flex h-[3px]" aria-hidden>
        {types.map(t => (
          <span key={t} className="flex-1" style={{ backgroundColor: typeColor(t) }} />
        ))}
      </div>
    </Link>
  );
}