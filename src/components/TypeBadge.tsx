import Link from 'next/link';
import { typeColor, typeZh } from '@/lib/shared';
import { TypeIcon } from './TypeIcon';

export function TypeBadge({
  type,
  size = 'md',
  asLink = true,
}: {
  type: string;
  size?: 'sm' | 'md';
  asLink?: boolean;
}) {
  const color = typeColor(type);
  const sm = size === 'sm';

  const content = (
    <span
      className={`inline-flex items-center gap-1 border border-line-soft bg-paper font-medium tracking-[0.04em] text-ink-dim ${
        sm ? 'px-1 py-0 text-[10px]' : 'px-1.5 py-[3px] text-[11px]'
      }`}
    >
      <TypeIcon type={type} size={sm ? 11 : 13} color={color} strokeWidth={sm ? 1.9 : 1.6} />
      {typeZh(type)}
    </span>
  );

  if (!asLink) return content;
  return (
    <Link prefetch={false} href={`/types/?focus=${type}`} className="transition hover:bg-surface-2">
      {content}
    </Link>
  );
}