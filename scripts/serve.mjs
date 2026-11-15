// 零依赖静态服务器：用于本地预览 out/ 目录
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(process.argv[2] || 'out');
const PORT = Number(process.argv[3] || 4199);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(url.parse(req.url).pathname);
  let file = path.join(ROOT, pathname);
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // 尝试 xxx/index.html
      const alt = path.join(file, 'index.html');
      if (fs.existsSync(alt)) {
        file = alt;
      } else {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<h1>404</h1>');
        return;
      }
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`serving ${ROOT} at http://127.0.0.1:${PORT}/`);
});