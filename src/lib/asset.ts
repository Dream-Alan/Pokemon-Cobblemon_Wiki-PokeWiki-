const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** 静态导出时 public/ 下的资源需要带上 basePath */
export function asset(path: string): string {
  if (!path.startsWith('/')) return path;
  return `${BASE}${path}`;
}