# 任务：让 Cobblemon 3D 模型按数据渲染（不按官方原画调参）

## 原则（最重要，先读这段）
**数据保真，不做美术对齐。** 模型的形状、贴图、朝向、姿态，一律以 `geo.json` / `resolver` / `posers` / `animation` 里的数值为准。禁止为了“看起来像官方插画”去加特例：不改朝向取景、不给骨骼加手工俯仰、不按像素猜眼睛位置、不把贴片往外推、不按物种写 if。

判断标准从“像不像官图”换成三条可验证的不变量：
1. **同一模型同一参数，渲染结果可复现**（不受截图时机影响，不自转漂移）
2. **几何/UV 映射与 Bedrock 规范逐条对应**（East→+X、North→-Z、West→-X、South→+Z；`mirror` 生效）
3. **像素/几何度量可回归**（下面「验收」里的数字）

## 仓库与环境
- 工作目录：`C:\Users\DREAM\DeepSeekHarness\workspace2\Pokemon Wiki`（Next 16 静态导出）
- 包管理 **npm**，装包要 `npm i --cache .\.npm-cache`（pnpm 在 Node 26 崩栈）
- `npm run build`（~10s，1237 页）→ `out/`；`npx tsc --noEmit`
- 预览 `node scripts/serve.mjs out 4199`；dev `npm run dev`（3417）
- 截图 `node scripts/canshot.mjs <dex> "<query>"`；回归 `node scripts/test-ui.mjs`、`node scripts/test-moves.mjs`、`node scripts/audit.mjs`

## 现状
- 数据：**1025/1025 物种 / 1500 形态 / 1494 geo / 111063 立方体 / 2720 贴图 / 1486 动画**，清单 `src/data/cobblemon.json`、`src/data/cobblemon-meta.json`
- 渲染器 `src/components/CobblemonViewer.tsx`（869 行）：`parseGeo` ~L100-230、材质 **L168**、`applyTracks` **L313**、`addCube` **L724**、`buildBoxGeometry` **L759**
- 已正确：骨骼层级与 pivot、`inflate`、cube 级 `rotation`（ZYX）、`texture_width/height`、box-uv 六面默认映射（+X←east、-X←west、-Z←north、+Z←south）、闪光贴图、molang（度制）、`ground_idle` 连播

## 一、先删掉之前的美术对齐补丁（必做）
| 位置 | 现有 hack | 处理 |
|---|---|---|
| L129–161 | `eyeSampler`：扫描贴图像素猜眼睛区域 | **删除**，眼睛按普通 cube 的 UV 走 |
| L206 | `addCube(..., /^eye/i.test(b.name), eyeSampler)` | 删掉这两个参数 |
| L237 | `xSign`（默认 -1，凭观感定） | **删除**，角度按原值应用 |
| L238 | `rotY = Math.PI * 1.22`（转 180° 再偏 40° 好看） | 改为**单一常量朝向**：相机放到模型 -Z 侧（`camera.position.z = -5.4`）看正面；或 group 固定 `rotation.y = Math.PI`。不要带“偏 40°”的美术角度 |
| L338 | `mixedEuler.set(xSign*v0*DEG, v1*DEG, -v2*DEG, 'ZYX')` | 改为 `Euler(v0, v1, v2, 'ZYX')`（Minecraft 与 three 都是右手系 Y-up，角度直接用） |
| L351–357 | 头部俯仰 `hp` 默认 -8° + `head_angle` 手工修正 | **删除**，头朝哪由 poser/animation 决定 |
| L383–402 | `__headDir()` 调试钩子 | 删除 |
| L733–737 | 零厚度贴片往外推 0.12 | **删除**，位置以 geo 为准（贴片被盖住应由 poser 抬升解决） |
| L769–778 | `mirrorPanel` 实验开关 | 删除，默认映射就是标准映射 |
- 眼睑（`eyelid*`）默认 `visible=false` 可以**保留**：这是模组用 poser 缩放的既有约定，不是美术调参。
- 删除后先跑一遍 `npm run build` + 3 张 `canshot`（6 / 25 / 493），确认没有结构性崩坏（缺面、黑块、NaN），再继续下一步。

## 二、补三处数据能力
### 1. resolver layers（949/1025 物种，最直观）
resolver 结构：
```json
"layers": [{ "name":"flame", "emissive":true, "translucent":true,
  "texture": { "fps":10, "loop":true, "frames":["cobblemon:textures/pokemon/0006_charizard/charizard_flame1.png", "..."] } }]
```
共 2314 条 layer / 2455 帧 / 49 组动画层。当前完全不渲染（喷火龙尾巴没有火、阿尔宙斯无辉光、小陨星无色层、图图犬无颜料）。
- 抽取：`scripts/extract-cobblemon.mjs` 的 `readResolvers`（L113 起）已能读 `variations[].layers`；贴图拷成 `public/cobblemon/{dex}/layer_{name}.png`（多帧 `layer_{name}_{i}.png`），form 增加 `layers:[{name,emissive,translucent,fps,loop,frames[]}]`；**跳过 `name==="alpha_eyes"`**。
- 渲染：几何只建一次，每层克隆 Mesh 共享 geometry：emissive → `MeshBasicMaterial({map,toneMapped:false,depthWrite:false})`；其余 → Lambert + `polygonOffset:{factor:-1,units:-1}`。挂到对应 bone group；多帧按 fps 在 rAF 里换 `map`（换帧才 `needsUpdate`），`NearestFilter`。
- 体积：实测层贴图约 774 张 / 2MB（预计 ≤4MB），可接受；layers 不进首屏。

### 2. cube `mirror`（18842/111063 个立方体）
`"mirror": true` = 该立方体贴图在 YZ 平面镜像。当前忽略。**只改 UV**：`buildBoxGeometry` 里把 `+X↔-X`、`+Z↔-Z` 的面板矩形互换（L773-778），不动顶点、不动索引。

### 3. poser `transformedParts`（143 个 poser）
`assets/cobblemon/bedrock/pokemon/posers/{dex}_{name}/{name}.json` 里 `transformedParts` 给了部件位移（超极巨化 body `[0,22,0]` 之类）。只做 **position 偏移**：按 part 名匹配骨骼，叠加到该 bone group 的 position；`poses`/`namedAnimations` 等其余语义不要碰。

> 这三项做完，模型“自然”就来自数据本身——喷火龙有火、超极巨化尺寸正确、镜像部件不再左右反，不需要任何按物种的特例。

## 不要做的事
- 不按官方原画比对调整（官图是插画，不是渲染基准）
- 不重写动画系统、不改 `ground_idle` 播放策略
- 不从 `@/lib/data` 给客户端组件传运行时值（会把 2.27MB learnsets 打进 bundle）
- 不用 PowerShell 改写源码（会写 BOM / 破坏 UTF-8）；用 edit/write 工具
- 不写 `node -e "..."` 里的 `&&`/`${}`/中文注释（PowerShell 解析失败），一律写 `scripts/*.mjs`
- 不引入新依赖（three 已有）

## 验收（贴数字，不贴观感）
1. `npx tsc --noEmit` 零错误；`npm run build` 成功且 ≥1237 页
2. **可复现性**：`canshot <dex> "still=1"` 连拍两张，canvas 像素差 <0.5%
3. **朝向一致性**：`?faces=1`（六面顶点色调试，保留该参数）+ 相机固定后，`-Z`（青）像素占比最高（正脸朝镜头）
4. **layers 生效**：喷火龙 #6 开关图层前后像素差 >2%；`493` 有辉光；`alpha_eyes` 未出现（眼睛不被遮）
5. **mirror 生效**：随机抽 5 个含 `mirror` 的模型，`+X/-X` 面板贴图平均色不相等（说明没被对称化）
6. **poser**：`#6 gmax` 部件无悬空/错位（与 `#6 male` 对比整体高度比 >1.2）
7. `test-ui` 11/11、`test-moves` 23/23、`audit` 全部 `scrollW==docW`、`broken=0`
8. `public/cobblemon` ≤ 50MB；首屏 JS 不因 layers 增长

## 交付
README 增「渲染以数据为准」小节（列出已删除的美术补丁、layers/mirror/poser 三项能力）；版本 +0.1.0；打包
`Push-Location out; tar -a -c -f ..\release\pokewiki-<version>-static.zip *`（`Compress-Archive` 会写反斜杠，禁用）。