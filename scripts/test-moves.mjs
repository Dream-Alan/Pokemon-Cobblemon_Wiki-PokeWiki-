// Smoke-test the new move section + special forms on a few detail pages.
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3417';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--hide-scrollbars', '--no-sandbox'],
  protocolTimeout: 180000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  if (text.includes('404')) return; // thumbnails still rendering
  errors.push(text);
});

const checks = [];
const check = (name, ok, extra = '') => checks.push({ name, ok, extra });

await page.goto(`${BASE}/pokedex/6/`, { waitUntil: 'networkidle2', timeout: 60000 });
const heads = await page.$$eval('h2', (els) => els.map((e) => e.textContent.trim()));
check('详情页有「可学习技能」', heads.some((h) => h.includes('可学习技能')), heads.join(' | '));
check('详情页有「特殊形态」', heads.some((h) => h.includes('特殊形态')));

const formLinks = await page.$$eval('a[href*="/form/"]', (els) => els.map((e) => e.getAttribute('href')));
check('特殊形态链接存在', formLinks.length >= 3, `links=${formLinks.length}`);

// 技能块：两个来源的 tab 组
const groups = await page.$$eval('button[aria-pressed]', (els) =>
  els.map((e) => ({ text: e.textContent.replace(/\s+/g, ' ').trim(), on: e.getAttribute('aria-pressed') })),
);
check('有方可梦技能 tab', groups.some((g) => g.text.includes('等级')), `${groups.length} buttons`);

// 点第一个技能 chip，检查详情面板
const chip = await page.$('button[title*="威力"]');
if (!chip) {
  check('技能 chip 可点', false, 'no chip');
} else {
  const label = await page.evaluate((el) => el.textContent.trim(), chip);
  await chip.click();
  await new Promise((r) => setTimeout(r, 400));
  const text = await page.evaluate(() => document.body.innerText);
  check('技能 chip 可点', true, label);
  check('详情含威力', /威力/.test(text));
  check('详情含 PP', /PP/.test(text));
  check('详情含分类', /物理|特殊|变化/.test(text));
  check('详情含中文描述', /。/.test(text) && text.length > 2000);
}

// 技能属性色块
const dots = await page.$$eval('button[title*="威力"] span[aria-hidden]', (els) =>
  els.map((e) => getComputedStyle(e).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)'),
);
check('技能有属性颜色', new Set(dots).size >= 2, `distinct=${new Set(dots).size}`);

await page.goto(`${BASE}/pokedex/6/form/mega_x/`, { waitUntil: 'networkidle2', timeout: 60000 });
const formHeads = await page.$$eval('h2', (els) => els.map((e) => e.textContent.trim()));
check('形态页渲染', formHeads.some((h) => h.includes('种族值')), formHeads.join(' | '));
const art = await page.evaluate(() => {
  const img = document.querySelector('img[src*="/form-oa/"]');
  return img ? { src: img.getAttribute('src'), ok: img.complete && img.naturalWidth > 100 } : null;
});
check('形态页官方原画', !!art && art.ok, JSON.stringify(art));

// 切到建模 tab 再看 canvas
const modelTab = await page.$$eval('button[aria-pressed]', (els) => {
  const i = els.findIndex((e) => e.textContent.includes('方可梦建模'));
  return i;
});
if (modelTab >= 0) await page.evaluate((i) => document.querySelectorAll('button[aria-pressed]')[i].click(), modelTab);
await new Promise((r) => setTimeout(r, 1800));
const canvas = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return c ? { w: c.width, h: c.height } : null;
});
check('形态页 3D canvas', !!canvas && canvas.w > 100, JSON.stringify(canvas));
const total = await page.evaluate(() => document.body.innerText.match(/TOTAL\s*(\d+)/)?.[1]);
check('形态页种族值', total === '634', `total=${total}`);

// 官方原画的闪光切换
await page.goto(`${BASE}/pokedex/25/`, { waitUntil: 'networkidle2', timeout: 60000 });
const shinyBtn = await page.evaluateHandle(() =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('闪光')),
);
const hasShinyBtn = await shinyBtn.evaluate((el) => Boolean(el));
check('原画有闪光按钮', hasShinyBtn);
if (hasShinyBtn) {
  await shinyBtn.click();
  await new Promise((r) => setTimeout(r, 700));
  const shiny = await page.evaluate(() => {
    const img = document.querySelector('img[src*="/art-shiny/"]');
    return img ? { src: img.getAttribute('src'), ok: img.complete && img.naturalWidth > 100 } : null;
  });
  check('闪光原画已切换', !!shiny && shiny.ok, JSON.stringify(shiny));
  const back = await page.evaluateHandle(() =>
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('闪光')),
  );
  await back.click();
  await new Promise((r) => setTimeout(r, 500));
  const normal = await page.evaluate(() => {
    const img = document.querySelector('img[src*="/art/"]');
    return img ? img.getAttribute('src') : null;
  });
  check('可切回普通原画', !!normal && /\/art\/00\d\d\.webp$/.test(normal), String(normal));
}

// 形态页的闪光切换
await page.goto(`${BASE}/pokedex/6/form/mega_x/`, { waitUntil: 'networkidle2', timeout: 60000 });
const formShiny = await page.evaluateHandle(() =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('闪光')),
);
const hasFormShiny = await formShiny.evaluate((el) => Boolean(el));
check('形态页有闪光按钮', hasFormShiny);
if (hasFormShiny) {
  await formShiny.click();
  await new Promise((r) => setTimeout(r, 700));
  const shiny = await page.evaluate(() => {
    const img = document.querySelector('img[src*="/form-oa-shiny/"]');
    return img ? { src: img.getAttribute('src'), ok: img.complete && img.naturalWidth > 100 } : null;
  });
  check('形态闪光原画已切换', !!shiny && shiny.ok, JSON.stringify(shiny));
}

/* 特殊获取途径 */
await page.goto(`${BASE}/pokedex/150/`, { waitUntil: 'networkidle2', timeout: 60000 });
const special = await page.evaluate(() => {
  const heads = [...document.querySelectorAll('h2')].map((h) => h.textContent.trim());
  const sec = [...document.querySelectorAll('section')].find((s) =>
    [...s.querySelectorAll('h2')].some((h) => h.textContent.includes('特殊获取途径')),
  );
  const chips = sec ? [...sec.querySelectorAll('.chip')].map((c) => c.textContent.trim()) : [];
  const text = sec ? sec.textContent.replace(/\s+/g, ' ') : '';
  const dts = sec ? [...sec.querySelectorAll('dt')].map((d) => d.textContent.trim()) : [];
  const dds = sec ? [...sec.querySelectorAll('dd')].map((d) => d.textContent.trim()) : [];
  const labels = sec ? [...sec.querySelectorAll('p.label')].map((l) => l.textContent.trim()) : [];
  return { heads, chips, text, dts, dds, labels };
});
check('详情页有特殊获取途径', special.heads.some((h) => h.includes('特殊获取途径')), special.heads.join('|'));
check('特殊途径含分类徽标', special.chips.length > 0, special.chips.slice(0, 6).join(','));
check('正作特殊方式已写入', /定点|赠送|团体战|交换/.test(special.text), special.text.slice(0, 80));
check('特殊途径为结构化字段', special.dts.length >= 5 && special.dts.length === special.dds.length && special.dds.every((d) => d.length > 0), `dt=${special.dts.length} dd=${special.dds.length}`);
check('特殊途径分方可梦/正作两栏', special.labels.some((l) => l.includes('方可梦')) && special.labels.some((l) => l.includes('游戏')), special.labels.join(' | '));

await page.goto(`${BASE}/pokedex/138/`, { waitUntil: 'networkidle2', timeout: 60000 });
const fossil = await page.evaluate(() => {
  const sec = [...document.querySelectorAll('section')].find((s) =>
    [...s.querySelectorAll('h2')].some((h) => h.textContent.includes('特殊获取途径')),
  );
  return sec ? sec.textContent.replace(/\s+/g, ' ') : '';
});
check('化石复活也已收录', /化石/.test(fossil) && /贝壳化石/.test(fossil), fossil.slice(0, 90));

await page.goto(`${BASE}/pokedex/?q=charizard`, { waitUntil: 'networkidle2', timeout: 60000 });
const formToggle = await page.$$eval('button[aria-pressed]', (els) =>
  els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t.includes('特殊形态')),
);
check('图鉴有特殊形态开关', formToggle.length > 0, formToggle.join('|'));

await page.goto(`${BASE}/pokedex/`, { waitUntil: 'networkidle2', timeout: 60000 });
const toggle = await page.$$eval('button', (els) =>
  els.findIndex((e) => e.textContent.includes('特殊形态')),
);
if (toggle >= 0) {
  const buttons = await page.$$('button');
  await buttons[toggle].click();
  await new Promise((r) => setTimeout(r, 500));
  const cards = await page.$$eval('a[href*="/form/"]', (els) => els.length);
  check('形态卡片渲染', cards > 10, `cards=${cards}`);
  // 先把懒加载滚出来，再判断破图
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(async () => {
    // 懒加载图片可能还没解码，显式 decode 一次再判断
    await Promise.all(
      Array.from(document.querySelectorAll('a[href*="/form/"] img')).map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
      ),
    );
  });
  const broken = await page.$$eval('a[href*="/form/"] img', (els) =>
    els.filter((e) => !e.complete || e.naturalWidth === 0).map((e) => e.getAttribute('src')),
  );
  check('形态缩略图无破图', broken.length === 0, broken.slice(0, 3).join(','));
}

check('无 JS 报错', errors.length === 0, errors.slice(0, 3).join(' | '));

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.extra ? `  (${c.extra})` : ''}`);
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} 通过`);
await browser.close();
process.exit(checks.every((c) => c.ok) ? 0 : 1);