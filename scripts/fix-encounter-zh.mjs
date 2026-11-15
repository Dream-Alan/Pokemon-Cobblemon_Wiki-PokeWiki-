/**
 * 给 src/data/encounters.json 补齐英文 encounter method 的中文名。
 * 与 fetch-encounters.mjs 共用 scripts/lib-method-zh.mjs，避免两处表漂移。
 */
import fs from "node:fs";
import { EXTRA_METHOD_ZH } from "./lib-method-zh.mjs";

const FILE = "src/data/encounters.json";
const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

let changed = 0;
const missed = new Set();
for (const versions of Object.values(data)) {
  for (const v of versions) {
    for (const m of v.methods || []) {
      const zh = EXTRA_METHOD_ZH[m.m] ?? EXTRA_METHOD_ZH[m.mZh];
      if (zh && m.mZh !== zh) {
        m.mZh = zh;
        changed++;
      }
      if (/^[a-z0-9-]+$/.test(String(m.mZh))) missed.add(m.mZh);
    }
  }
}

fs.writeFileSync(FILE, JSON.stringify(data));
console.log("updated methods:", changed);
console.log("still untranslated:", [...missed].join(", ") || "none");