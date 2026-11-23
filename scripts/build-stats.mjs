// 从 pokedex.json 抽出「种族值」紧凑表，供浏览器端计算器使用。
// 输出 src/data/stats.json: { "25": [hp, atk, def, spa, spd, spe] }
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src/data/pokedex.json");
const OUT = path.join(ROOT, "src/data/stats.json");

const dex = JSON.parse(fs.readFileSync(SRC, "utf8"));
const rows = {};
for (const p of dex) {
  const s = p.stats;
  rows[String(p.id)] = [
    s.hp,
    s.attack,
    s.defense,
    s["special-attack"],
    s["special-defense"],
    s.speed,
  ];
}

fs.writeFileSync(OUT, JSON.stringify(rows));
const n = Object.keys(rows).length;
console.log(`stats.json: ${n} 条 / ${(fs.statSync(OUT).size / 1024).toFixed(1)}KB`);