import { abilityInfo } from '@/lib/data';

/**
 * 特性列表：每一项是原生 <details>，点击展开效果说明（静态导出也能用，不需要客户端 JS）。
 * 说明来自 src/data/ability-info.json（scripts/sync-abilities.mjs）。
 */
export function AbilityList({ abilities }: { abilities: { id?: number | null; name: string | null; hidden: boolean }[] }) {
  if (!abilities.length) return <p className="py-2 text-[12px] text-muted">—</p>;
  return (
    <div className="divide-y divide-line-soft">
      {abilities.map((a, i) => {
        const info = a.id != null ? abilityInfo(a.id) : null;
        return (
          <details key={`${a.id ?? a.name}-${a.hidden}-${i}`} className="group">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 py-2 hover:bg-surface-2/40 [&::-webkit-details-marker]:hidden">
              <span className="flex items-baseline gap-2 text-[13px] text-ink">
                <span aria-hidden className="inline-block w-3 font-mono text-[11px] text-muted transition-transform group-open:rotate-90">
                  ›
                </span>
                {a.name || `特性 #${a.id}`}
              </span>
              <span className={`label shrink-0 ${a.hidden ? 'text-brand' : ''}`}>{a.hidden ? '隐藏特性' : '普通特性'}</span>
            </summary>
            <div className="space-y-1.5 pb-3 pl-5 text-[12px] leading-relaxed">
              {info && (info.desc || info.effectEn) ? (
                <>
                  {info.desc && <p className="text-ink">{info.desc}</p>}
                  {info.flavor && <p className="text-muted">正作说明：{info.flavor}</p>}
                  {info.effectEn && <p className="text-muted">{info.effectEn}</p>}
                </>
              ) : (
                <p className="text-muted">暂无该特性的效果说明。</p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
