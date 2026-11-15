import fs from "node:fs";
import path from "node:path";
const ROOT = "public/cobblemon";
const dexes = fs.readdirSync(ROOT).filter(d => fs.statSync(path.join(ROOT,d)).isDirectory());
let files=0, cubes=0, bones=0;
let mirrorCubes=0, rotCubes=0, inflateCubes=0, thinCubes=0;
const texSizes=new Map(); let multiGeo=0; let uvObj=0; let noAnim=0, withAnim=0;
const rotExamples=[];
for (const dex of dexes) {
  const dir = path.join(ROOT, dex);
  const fs2 = fs.readdirSync(dir);
  for (const f of fs2.filter(x=>x.endsWith(".geo.json"))) {
    files++;
    const j = JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));
    const geos = j["minecraft:geometry"] || [];
    if (geos.length > 1) multiGeo++;
    const g = geos[0]; if (!g) continue;
    const desc = g.description || {};
    const key = `${desc.texture_width}x${desc.texture_height}`;
    texSizes.set(key,(texSizes.get(key)||0)+1);
    for (const b of g.bones || []) {
      bones++;
      for (const c of b.cubes || []) {
        cubes++;
        if (c.mirror) mirrorCubes++;
        if (Array.isArray(c.rotation) && c.rotation.some(v=>v)) { rotCubes++; if (rotExamples.length<5) rotExamples.push(`${dex}/${f}:${b.name}${JSON.stringify(c.rotation)}`); }
        if (c.inflate) inflateCubes++;
        if (Array.isArray(c.size) && c.size.filter(v=>v===0).length>=2) thinCubes++;
        if (c.uv && !Array.isArray(c.uv)) uvObj++;
      }
    }
  }
  if (fs2.some(x=>x==="anim.json"||x.startsWith("anim_"))) withAnim++; else noAnim++;
}
console.log({ species: dexes.length, geoFiles: files, bones, cubes });
console.log({ mirrorCubes, rotCubes, inflateCubes, thinCubes, multiGeo, facesUvObjects: uvObj });
console.log("texture sizes:", [...texSizes.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8));
console.log("species with anim:", withAnim, "without anim:", noAnim);
console.log("rot examples:", rotExamples);
