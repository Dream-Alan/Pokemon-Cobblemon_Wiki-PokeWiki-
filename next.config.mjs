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
};

export default nextConfig;