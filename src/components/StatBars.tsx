import { STAT_LABELS } from '@/lib/shared';
import type { Pokemon } from '@/lib/types';

const SCALE = 180;

export function StatBars({ stats, total }: { stats: Pokemon['stats']; total: number }) {
  return (
    <div>
      <div className="divide-y divide-line-soft border-t border-line-soft">
        {STAT_LABELS.map(({ key, label }) => {
          const v = stats[key] ?? 0;
          const pct = Math.max(1.5, Math.min(100, (v / SCALE) * 100));
          const strong = v >= 110;
          return (
            <div key={key} className="flex items-center gap-3 py-2">
              <span className="w-10 shrink-0 text-[11px] tracking-[0.04em] text-muted">{label}</span>
              <div className="h-[7px] flex-1 bg-surface-2">
                <div
                  className="h-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, backgroundColor: strong ? 'var(--color-brand)' : 'var(--color-ink)' }}
                />
              </div>
              <span className="num w-8 shrink-0 text-right text-[12px] font-semibold text-ink">{v}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
        <span className="label">Base Stat Total</span>
        <span className="num text-[26px] font-light leading-none tracking-tight text-ink">{total}</span>
      </div>
    </div>
  );
}