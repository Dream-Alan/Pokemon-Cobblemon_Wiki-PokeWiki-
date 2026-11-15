// 打印贴图某区域的像素字符画（默认按 alpha/亮度分类）
// 用法：node scripts/texmap.mjs public/cobblemon/5/charmeleon.png 40 22 20 14
import sharp from 'sharp';

const [file, x0, y0, w, h] = process.argv.slice(2);
const X = +x0, Y = +y0, W = +w, H = +h;
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
const px = (x, y) => {
  const o = (y * info.width + x) * ch;
  return [data[o], data[o + 1], data[o + 2], ch === 4 ? data[o + 3] : 255];
};
// 分类：透明 .  黑 K  白 W  灰 g  蓝 b  红 r  黄 y  绿 e  其他 ?
const cls = ([r, g, b, a]) => {
  if (a < 20) return '.';
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 60) return 'K';
  if (mx - mn < 22) return mx > 200 ? 'W' : mx > 120 ? 'g' : 'K';
  if (b > r && b > g) return 'b';
  if (g > r && g > b) return 'e';
  if (r > 200 && g > 180 && b < 120) return 'y';
  if (r > g && r > b) return 'r';
  return '?';
};
const hex = ([r, g, b, a]) => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}${a < 255 ? ' a' + a : ''}`;

console.log('    ' + Array.from({ length: W }, (_, i) => (X + i) % 10).join(''));
for (let y = Y; y < Y + H; y++) {
  let row = String(y).padStart(3, ' ') + ' ';
  for (let x = X; x < X + W; x++) row += cls(px(x, y));
  console.log(row);
}
console.log('\nlegend: . 透明  K 黑  W 白  g 灰  b 蓝  e 绿  r 红  y 黄  ? 其他');
// 采样几个关键点
for (const [x, y] of [[46, 26], [47, 27], [48, 28], [19, 32], [20, 33], [23, 17], [24, 18]]) {
  if (x < info.width && y < info.height) console.log(`(${x},${y}) ${cls(px(x, y))} ${hex(px(x, y))}`);
}