export function Pokeball({ size = 26, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path d="M4 24a20 20 0 0 1 40 0Z" fill="currentColor" />
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M4 24h40" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="6.5" fill="var(--color-bg)" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}