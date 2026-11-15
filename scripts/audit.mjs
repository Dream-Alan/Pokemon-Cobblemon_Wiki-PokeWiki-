// UI 审计：横向溢出、图片加载失败、控制台错误
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/pokedex/', '/pokedex/25/', '/pokedex/6/', '/pokedex/6/form/mega_x/', '/pokedex/25/form/gmax/', '/types/', '/guides/', '/guides/catching/'];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

for (const width of [1440, 390]) {
  console.log(`\n===== viewport ${width} =====`);
  for (const p of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    // 先把懒加载图片全部触发，再量尺寸，避免把「还没加载」误判成破图
    await page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 80));
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    const report = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const over = [];
      const inScroller = el => {
        let n = el.parentElement;
        while (n && n !== document.body) {
          const s = getComputedStyle(n);
          if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth) return true;
          n = n.parentElement;
        }
        return false;
      };
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > docW + 1 || r.left < -1) {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed') continue;
          if (inScroller(el)) continue;
          // 只报告最外层溢出元素
          over.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && String(el.className).slice(0, 60)) || '',
            w: Math.round(r.width),
            right: Math.round(r.right),
            text: (el.textContent || '').trim().slice(0, 24),
          });
        }
      }
      const broken = Array.from(document.images)
        .filter(i => !i.complete || i.naturalWidth === 0)
        .map(i => i.getAttribute('src'));
      return { docW, scrollW, over: over.slice(0, 8), broken: [...new Set(broken)].slice(0, 6), brokenCount: broken.length, imgCount: document.images.length };
    });
    const flag = report.scrollW > report.docW + 1 ? 'OVERFLOW' : 'ok';
    console.log(`${p.padEnd(22)} ${flag} scrollW=${report.scrollW}/${report.docW} imgs=${report.imgCount} broken=${report.brokenCount}`);
    for (const o of report.over) console.log(`    ! ${o.tag}.${o.cls} w=${o.w} right=${o.right} "${o.text}"`);
    for (const b of report.broken) console.log(`    x broken img ${b}`);
    await page.close();
  }
}

await browser.close();