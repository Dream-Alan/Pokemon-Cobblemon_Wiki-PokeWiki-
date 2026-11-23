/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  // Next 16 默认阻断跨源 dev 资源（HMR/RSC），导致局域网 IP 访问时客户端组件不 hydration，
  // 表现为搜索无下拉、tab 点不动。允许本机与局域网访问。
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.5.10', '192.168.5.*', '*.local'],
  // 静态生成默认用子进程（jest-worker fork）并行处理 1238 个页面，
  // 在受限环境里会被拒绝（spawn EPERM）。改用 worker_threads 可在单进程内完成。
  experimental: { workerThreads: true },
  // 本机构建时 Next 会 fork 一个 tsc 子进程做类型检查，在受限环境里同样被拒；
  // 此时可用 `SKIP_TYPE_CHECK=1 npm run build` 跳过，类型检查改由 `npm run typecheck` 单独执行。
  typescript: { ignoreBuildErrors: !!process.env.SKIP_TYPE_CHECK },
};

export default nextConfig;