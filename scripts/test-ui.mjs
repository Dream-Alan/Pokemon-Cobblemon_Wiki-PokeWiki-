// 交互功能回归测试（不依赖测试框架，直接驱动真实页面）
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4199';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

// 1. 首页 → 搜索快捷键（新版本用 / 聚焦，Ctrl+K 被浏览器地址栏抢占）
await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 800));
await page.keyboard.press('Slash');
await new Promise(r => setTimeout(r, 500));
const inputOpen = await page.evaluate(() => {
  const el = document.querySelector('#global-search');
  return !!el && document.activeElement === el;
});
check('「/」聚焦搜索框', inputOpen);
if (inputOpen) {
  await page.keyboard.type('皮卡', { delay: 40 });
  await new Promise(r => setTimeout(r, 700));
  const res = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/pokedex/"]'));
    return links.map(a => a.textContent.replace(/\s+/g, ' ').trim()).slice(0, 6);
  });
  check('搜索“皮卡”出结果', res.length > 0, JSON.stringify(res));
}

// 2. 图鉴筛选：按属性电 + 排序种族值
await page.goto(BASE + '/pokedex/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 800));
const countText = () =>
  page.evaluate(() => {
    const line = document.body.innerText.split('\n').map(s => s.trim()).find(s => /^共\s*\d+\s*只$/.test(s));
    return line ? Number(line.replace(/\D/g, '')) : -1;
  });

const beforeCount = await countText();
const clickedElec = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button[aria-pressed]')).find(x => x.textContent.replace(/\s/g, '') === '电');
  if (b) { b.click(); return true; }
  return false;
});
await new Promise(r => setTimeout(r, 900));
const afterElec = await countText();
const allElectric = await page.evaluate(() =>
  Array.from(document.querySelectorAll('a[href*="/pokedex/"]'))
    .filter(a => /\/pokedex\/\d+\/$/.test(a.getAttribute('href') || ''))
    .every(a => a.innerText.includes('电')),
);
check('属性「电」筛选生效', clickedElec && afterElec > 0 && afterElec < beforeCount && allElectric, `${beforeCount} → ${afterElec}`);

const hasFilterUi = await page.evaluate(() => document.body.innerText.includes('共'));
check('列表页显示总数', hasFilterUi);

// 3. 从列表点进详情
await page.goto(BASE + '/pokedex/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 700));
await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a[href*="/pokedex/"]')).find(x => /\/pokedex\/\d+\/$/.test(x.getAttribute('href') || ''));
  if (a) a.click();
});
await new Promise(r => setTimeout(r, 1500));
const detail = await page.evaluate(() => ({
  url: location.pathname,
  h1: (document.querySelector('h1') || {}).textContent || '',
  hasStat: document.body.innerText.includes('种族值'),
  hasEvo: document.body.innerText.includes('进化'),
  hasCobble: document.body.innerText.includes('Cobblemon'),
}));
check('列表进入详情页', /\/pokedex\/\d+\//.test(detail.url), `${detail.url} h1=${detail.h1}`);
check('详情页含种族值/进化/方可梦区块', detail.hasStat && detail.hasEvo && detail.hasCobble);

// 4. 3D 模型 + 闪光切换
const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
if (!hasCanvas) {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('方可梦建模'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2500));
}
const canvasNow = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return { w: c.width, h: c.height, gl: !!gl };
});
check('3D 画布创建成功', !!canvasNow && canvasNow.gl, JSON.stringify(canvasNow));

const shinyBtn = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find(x => /闪光|shiny|★/i.test(x.textContent));
  if (b) { b.click(); return b.textContent.trim(); }
  return null;
});
check('闪光切换按钮存在并可点击', !!shinyBtn, String(shinyBtn));

// 5. 属性页 focus 参数
await page.goto(BASE + '/types/?focus=fairy', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));
const fairy = await page.evaluate(() => {
  const txt = document.body.innerText;
  return { title: document.title, hasFairy: txt.includes('妖精'), tableRows: document.querySelectorAll('tbody tr').length };
});
check('属性页 focus=fairy 生效', fairy.hasFairy && fairy.tableRows === 18, JSON.stringify(fairy));

// 6. 攻略页 anchor 与表格
await page.goto(BASE + '/guides/spawning/', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 600));
const guide = await page.evaluate(() => ({
  tables: document.querySelectorAll('table').length,
  headings: document.querySelectorAll('h2, h3').length,
  chars: document.body.innerText.length,
}));
check('攻略页正文渲染', guide.headings >= 3 && guide.chars > 2000, JSON.stringify(guide));

check('无页面 JS 报错', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} 通过`);
process.exit(failed ? 1 : 0);