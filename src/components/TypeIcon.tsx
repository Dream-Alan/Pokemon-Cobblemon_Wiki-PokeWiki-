import type { ReactNode } from 'react';

/**
 * 18 种属性的线性图标（24×24，1.5px 描边，方头端点）。
 * 统一几何语言：只用直线、圆、弧，不用渐变与填充块，与瑞士国际主义排版一致。
 */
const ICONS: Record<string, ReactNode> = {
  normal: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="9.3" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9.4 14.9h5.2" />
    </>
  ),
  fire: (
    <path d="M12 3.4c2.9 3.7 4.9 6 4.9 8.8a4.9 4.9 0 0 1-9.8 0c0-1.6.6-2.8 1.5-3.9.2 1.1.9 1.9 1.8 2.2-.2-2.9.3-5.1 1.6-7.1Z" />
  ),
  water: (
    <path d="M12 3.2c3.4 4 5.8 6.9 5.8 9.7a5.8 5.8 0 0 1-11.6 0c0-2.8 2.4-5.7 5.8-9.7Z" />
  ),
  electric: <path d="M13.5 2.6 5.7 13.2h5.1l-.8 8.2 7.9-11h-5.1l.7-7.8Z" />,
  grass: (
    <>
      <path d="M20.3 3.7c.5 9-4.6 14.5-13.6 14.5v-2.6C6.7 8.7 11.7 4.2 20.3 3.7Z" />
      <path d="M20.3 3.7 6.7 15.6" />
    </>
  ),
  ice: (
    <>
      <path d="M12 2.6v18.8M3.9 7.3l16.2 9.4M20.1 7.3 3.9 16.7" />
      <path d="M9.7 4.4 12 6.4l2.3-2M9.7 19.6 12 17.6l2.3 2" />
    </>
  ),
  fighting: (
    <path d="M6.6 19.6V10.2a2.2 2.2 0 0 1 4.4 0v-.7a2.2 2.2 0 0 1 4.4 0v.7a2.2 2.2 0 0 1 4.4 0v5.5a3.9 3.9 0 0 1-3.9 3.9H6.6Z" />
  ),
  poison: (
    <>
      <path d="M9.6 3h4.8M10.6 3v5.3L6.4 15a3.6 3.6 0 0 0 3.1 5.9h5a3.6 3.6 0 0 0 3.1-5.9l-4.2-6.7V3" />
      <circle cx="10.8" cy="16.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="14.2" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  ground: (
    <>
      <path d="M3 19.3h18" />
      <path d="M5.6 19.3c0-4.1 2.9-7.1 6.4-7.1s6.4 3 6.4 7.1" />
      <circle cx="9" cy="15.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.6" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15.5" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  flying: (
    <>
      <path d="M3 15.4c3.8 0 6.4-1.5 9-4.4 2.6 2.9 5.2 4.4 9 4.4-1.6 3.2-4.7 4.9-9 4.9s-7.4-1.7-9-4.9Z" />
      <path d="M12 11V4.6" />
    </>
  ),
  psychic: (
    <>
      <path d="M2.4 12S6.3 5.9 12 5.9 21.6 12 21.6 12 17.7 18.1 12 18.1 2.4 12 2.4 12Z" />
      <circle cx="12" cy="12" r="3.1" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  bug: (
    <>
      <ellipse cx="12" cy="13.6" rx="4.4" ry="6" />
      <circle cx="12" cy="6.4" r="2.1" />
      <path d="M12 8.4v11M7.8 9.6 4.2 6.8M16.2 9.6 19.8 6.8M7.6 13.4H4M16.4 13.4H20M8.4 17.6 5.4 20M15.6 17.6 18.6 20" />
    </>
  ),
  rock: (
    <>
      <path d="M3.6 13.9 6.4 7.2h11.2l2.8 6.7L12 20.4 3.6 13.9Z" />
      <path d="m6.4 7.2 5.6 6.7 5.6-6.7" />
    </>
  ),
  ghost: (
    <>
      <path d="M5 20.6V11a7 7 0 0 1 14 0v9.6l-2.8-2-2.1 2-2.1-2-2.1 2-2.1-2-2.8 2Z" />
      <circle cx="9.6" cy="10.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="10.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  dragon: (
    <>
      <path d="M6 20.5V9.2M12 20.5V5.6M18 20.5v-8.2" />
      <path d="M6 12.4 3.6 9.6M6 12.4l2.4-2.8M12 8.8 9.6 6M12 8.8l2.4-2.8M18 15.6l-2.4-2.8M18 15.6l2.4-2.8" />
    </>
  ),
  dark: (
    <>
      <path d="M15.6 3.4A8.8 8.8 0 1 0 20.6 16.4 6.9 6.9 0 0 1 15.6 3.4Z" />
      <path d="M18 5.2v3M16.5 6.7h3" />
    </>
  ),
  steel: (
    <>
      <path d="M12 2.6 20.1 7.1v9.8L12 21.4 3.9 16.9V7.1L12 2.6Z" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  fairy: (
    <>
      <path d="M12 3.2c.7 4.6 2.7 6.6 7.3 7.3-4.6.7-6.6 2.7-7.3 7.3-.7-4.6-2.7-6.6-7.3-7.3 4.6-.7 6.6-2.7 7.3-7.3Z" />
      <path d="M18.4 16.2c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z" />
    </>
  ),
};

interface Props {
  type: string;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
  title?: string;
}

export function TypeIcon({ type, size = 16, className, color, strokeWidth = 1.5, title }: Props) {
  // 数据里的属性 key 是首字母大写（Electric），图标表用小写
  const node = ICONS[type.toLowerCase()] || ICONS[type];
  if (!node) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {node}
    </svg>
  );
}