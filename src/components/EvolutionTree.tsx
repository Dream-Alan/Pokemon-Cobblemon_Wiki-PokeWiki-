import Link from 'next/link';
import { asset } from '@/lib/asset';
import { dexNo } from '@/lib/shared';
import type { EvolutionNode } from '@/lib/data';

function Mini({ node, current }: { node: EvolutionNode; current: number }) {
  const p = node.pokemon;
  const isCurrent = p.id === current;
  return (
    <Link
      prefetch={false}
      href={`/pokedex/${p.id}/`}
      className={`group flex w-[76px] shrink-0 flex-col items-center border p-1.5 transition ${
        isCurrent ? 'border-ink bg-paper' : 'border-line-soft bg-paper hover:border-ink'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset(`/art/${dexNo(p.id)}.webp`)}
        alt={p.name.zh}
        width={52}
        height={52}
        loading="lazy"
        className="h-[52px] w-[52px] object-contain"
      />
      <span className={`mt-1 w-full truncate text-center text-[11px] ${isCurrent ? 'text-ink' : 'text-ink-dim'}`}>
        {p.name.zh}
      </span>
      <span className="num mt-0.5 text-[9px] text-muted">{dexNo(p.id)}</span>
    </Link>
  );
}

function Arrow({ label }: { label: string | null }) {
  return (
    <div className="flex w-[64px] shrink-0 flex-col items-center px-1">
      {label && (
        <span className="mb-1 w-full text-center text-[9px] leading-tight text-muted">{label}</span>
      )}
      <svg width="30" height="6" viewBox="0 0 30 6" className="text-ink">
        <path d="M0 3h24" stroke="currentColor" strokeWidth="1" />
        <path d="M24 0.5 29 3 24 5.5z" fill="currentColor" />
      </svg>
    </div>
  );
}

function Row({ node, current }: { node: EvolutionNode; current: number }) {
  return (
    <div className="flex items-center">
      <Mini node={node} current={current} />
      {node.children.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {node.children.map(c => (
            <div key={c.id} className="flex items-center">
              <Arrow label={c.detail} />
              <Row node={c} current={current} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EvolutionTree({ node, current }: { node: EvolutionNode; current: number }) {
  const stages = countStages(node);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-full items-center gap-1">
        <Row node={node} current={current} />
        <span className="label ml-auto shrink-0 self-start">{stages} 阶段</span>
      </div>
    </div>
  );
}

function countStages(n: EvolutionNode): number {
  if (!n.children.length) return 1;
  return 1 + Math.max(...n.children.map(countStages));
}