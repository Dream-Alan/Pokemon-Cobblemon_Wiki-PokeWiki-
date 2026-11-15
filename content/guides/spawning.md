---
title: 生成机制：为什么你总刷不到想要的宝可梦
slug: spawning
order: 3
summary: 群系、昼夜、光照、Y 轴与稀有度，教你有针对性地刷
tags: [机制, 刷怪, 进阶]
updated: 2026-11-11
sources:
  - https://wiki.cobblemon.com/index.php/Pok%C3%A9mon/Spawning
  - https://wiki.cobblemon.com/index.php/Spawn_Condition
  - https://wiki.cobblemon.com/index.php/Pok%C3%A9mon/Spawning/Spawn_Definitions
  - https://wiki.cobblemon.com/index.php/Config
---

> 适用版本：Cobblemon 1.8.x（MC 1.21.1）。生成表按版本发布，1.6.x 的条件字段基本一致，但具体条目不同。

## 一、生成是怎么运作的

每只宝可梦能不能刷，取决于两件事：

1. **生成条目（spawn entry）**：写在模组/数据包的 JSON 里，规定了「在什么条件下、以多大权重刷出这只」。
2. **玩家周围的生成循环**：服务器每隔一段时间在玩家附近抽一个位置、抽一个条目，检查条件全过才刷。

关键配置（`Cobblemon.config`，服务端生效）：

| 配置项 | 默认值 | 含义 |
|---|---|---|
| `enableSpawning` | true | 总开关 |
| `ticksBetweenSpawnAttempts` | 20 | 每 20 tick（约 1 秒）尝试一次 |
| `minimumSliceDistanceFromPlayer` | 16 | 最近 16 格 |
| `maximumSliceDistanceFromPlayer` | 64 | 最远 64 格 |
| `minimumDistanceBetweenEntities` | 8.0 | 两只宝可梦至少隔 8 格，防止扎堆 |
| `pokemonPerChunk` | 1.0 | 每个区块允许的宝可梦数量 |
| `worldSliceDiameter` | 8 | 以玩家为中心的水平切片直径 |
| `worldSliceHeight` | 16 | 切片高度 |
| `maxVerticalCorrectionBlocks` | 64 | 地形起伏时最多上下修正 64 格找落点 |
| `teraTypeRate` | 20.0 | **1/20** 概率刷出「属性不符的太晶属性」 |

**看懂这张表就明白为什么「站着不动等」效率低**：生成只发生在你 **16–64 格**范围内，超出就不会刷，所以想刷某只，应该是「在合适的群系里边走边等」，而不是原地挂机。

## 二、生成条件都有哪些

Cobblemon 的生成条件字段很细，空白字段 = 不检查。常用字段：

| 字段 | 作用 | 可选值 / 说明 |
|---|---|---|
| `dimensions` | 维度 | 主世界 / 下界 / 末地 |
| `biomes` | 生物群系 | 支持标签，如 `#cobblemon:is_arid` |
| `structures` | 结构 | 只在特定结构附近刷 |
| `timeRange` | 时间 | `day` / `night` / `morning`，或 tick 区间 `0-1200,2000-3000` |
| `minLight` / `maxLight` | 方块光照 | 0–15 |
| `minSkyLight` / `maxSkyLight` | 天空光照 | 0–15，山洞里通常是 0 |
| `canSeeSky` | 能否看到天空 | 洞穴 / 室内为 false |
| `minY` / `maxY` | Y 轴高度 | 整型 |
| `minX/maxX`、`minZ/maxZ` | 水平范围 | 一般用于结构内部 |
| `isRaining` / `isThundering` | 天气 | 雷雨会改变生成池 |
| `moonPhase` | 月相 | 0–7 |
| `isSlimeChunk` | 史莱姆区块 | 少数物种专用 |
| `labels` + `labelMode` | 自定义标签 | `ANY` / `ALL`，配合数据包用 |

**按生成位置还分子类型**，各自多几个字段：

| 子类型 | 额外字段 | 典型用途 |
|---|---|---|
| `area` | `minWidth/maxWidth`、`minHeight/maxHeight`、`neededNearbyBlocks` | 需要周围有特定方块（如花、岩浆） |
| `grounded` | `neededBaseBlocks` | 必须站在特定方块上（沙、雪、石头） |
| `submerged` | `minDepth/maxDepth`、`fluidIsSource`、`fluid` | 完全在水下 |
| `fishing` | `minLureLevel/maxLureLevel`、`bobber`、`bait` | 钓鱼时刷出，受鱼竿诱饵等级影响 |

### 一个示意条目（结构参考，不是真实数据）

```json
{
  "pokemon": "pikachu",
  "type": "pokemon",
  "weight": 10,
  "condition": {
    "biomes": ["#cobblemon:is_forest"],
    "timeRange": "day",
    "minLight": 8,
    "isRaining": false,
    "minY": 60,
    "maxY": 120
  }
}
```

> 字段名以官方 Spawn Condition 文档为准；不同版本可能新增字段，改数据包前先看整合包自带的生成文件。

## 三、生物群系是被「分类」过的

Cobblemon 不直接认「森林」，而是把各种群系（含 Terralith、BYG、WWO 等群系 mod）映射成一套**分类标签**。常见分类：

`Arid` `Badlands` `Beach` `Cave` `Coast` `Cold` `Deep Dark` `Deep Ocean` `Desert` `Dripstone` `Floral` `Forest` `Freezing` `Freshwater` `Frozen Ocean` `Glacial` `Grassland` `Highlands` `Hills` `Island` `Jungle` `Lukewarm Ocean` `Lush` `Magical` `Mountain` `Mushroom` `Ocean` `Peak` `Plains` `Plateau` `River` `Salt` `Sandy` `Savanna` `Sky` `Snowy Forest` `Spooky` `Swamp` `Taiga` `Temperate` `Thermal` `Tropical Island` `Tundra` `Volcanic` `Warm Ocean` `Overworld` `End` `Nether*`（多个子类）`Bumblezone`，以及季节分类 `Autumn` `Spring` `Summer` `Winter` 和 `Dense` / `Sparse`。

**这对刷怪的意义**：

- 一个 `#cobblemon:is_forest` 条件，在原版森林、樱花林、Terralith 的 Lavender Forest 里**都算数**。
- 装了群系 mod 后，同一条生成条目可能在你没想到的群系生效——这就是「明明在森林却刷出沙漠怪」的原因（该群系同时被归进了 Arid）。
- 想知道具体某只在哪些群系：看官方按版本发布的**生成表**（Wiki 的 Spawning 页只给 Google Drive 外链），或整合包里的 `spawn_pool_world` 数据。

## 四、稀有度与权重

生成条目里每条都有一个 **weight（权重）**，同一条件下权重越高越常见。社区常说的 common / uncommon / rare / ultra-rare 就是权重分档的俗称。

**注意**：不同版本、不同整合包会重排权重，**没有一份「永久有效」的稀有度表**。判断某只是否稀有，最靠谱的是：

1. 查整合包对应版本的生成表；
2. 游戏内看它出现的频率；
3. 看它是否要求苛刻条件（特定结构、月相、雷雨、极低 Y）。

## 五、针对性刷某只宝可梦

### 步骤

1. **确认条件**：查生成表，记下群系、时间、光照、Y 范围、天气、结构。
2. **造环境**：把地面清平、光照调到区间内（火把/萤石/遮光），需要水的就挖水池。
3. **卡高度**：很多物种的 Y 区间很窄，站在区间中段最稳。
4. **连续移动**：在 16–64 格范围内来回走，让生成循环不断抽新位置。
5. **清杂鱼**：附近宝可梦太多会触发 8 格最小间距，抓掉或打掉能提高目标出现率。
6. **等时间**：`/time set day` 或 `night` 切换（单人/有权限时）。

### 按条件反查的思路

| 你想刷的类型 | 该去的地方 |
|---|---|
| 电系、飞行系 | 高空 / Peak / 雷雨天气 |
| 水系、钓鱼 | 河、湖、海边；用鱼竿触发 `fishing` 生成 |
| 洞穴专属（如石系、蝙蝠类） | Y < 0 的洞穴，`maxSkyLight` 通常为 0 |
| 稀有 / 传说级条件 | 特定结构、月相、深夜、雷雨 |
| 季节限定 | 只在 Autumn / Winter 等季节分类里（多见于季节 mod 整合包） |

### 钓鱼是独立生成通道

`fishing` 子类型不受普通生成循环的频率限制，你**每抛一次竿就是一次判定**，而且受鱼竿**诱饵等级（Lure Level）**影响。想刷水生宝可梦，钓鱼往往比在岸边等快得多。

另外两个固定概率值得记住：

| 事件 | 概率 |
|---|---|
| 钓鱼 / Poké Snack 刷出 **Alpha** | **1/100** |
| 化石复活出 **Alpha** | **1/20**（Hopo Berry 当调味料再 +2%） |

## 六、常见误解

| 误解 | 事实 |
|---|---|
| 「挂机就能刷」 | 生成只在玩家 16–64 格内，必须移动 |
| 「火把插满就不刷怪」 | 只影响 `minLight/maxLight` 条件，很多物种反而要求低光 |
| 「同一只不会连续刷」 | 1.8 修复了「稀有宝可梦在同一生成周期重复出现」的问题，但重复刷出仍可能 |
| 「群系 mod 不影响生成」 | 影响很大，分类标签会把新群系并进旧分类 |
| 「服务器刷得慢是 bug」 | 多半是 `ticksBetweenSpawnAttempts`、`pokemonPerChunk` 被调低，见第 7 篇 |

> 生成表与权重以你所用版本/整合包为准。本文的配置默认值来自官方 Config 页面，服务器管理员可能全部改过。