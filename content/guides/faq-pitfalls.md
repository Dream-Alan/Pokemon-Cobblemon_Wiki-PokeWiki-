---
title: 常见问题与踩坑：卡顿、报错、联机与同步
slug: faq-pitfalls
order: 7
summary: 性能怎么调、崩了怎么查、服务器和 PC 有哪些坑
tags: [FAQ, 优化, 联机, 避坑]
updated: 2026-11-11
sources:
  - https://wiki.cobblemon.com/index.php/Config
  - https://wiki.cobblemon.com/index.php/Pasture_Block
  - https://wiki.cobblemon.com/index.php/Pok%C3%A9dex
  - https://wiki.cobblemon.com/index.php/Guides/Installation
  - https://wiki.cobblemon.com/index.php/Spawn_Condition
  - https://modrinth.com/mod/cobblemon
---

> 适用版本：Cobblemon 1.8.x（MC 1.21.1），老包 1.6.x / 1.20.1 通用。配置文件在 `config/cobblemon/main.json`，**改完要重启**。

## 一、性能：先调这几个开关

Cobblemon 默认配置是「效果优先」，机器一般的话可以往下调。全部是服务端生效（单人存档=你的本地服务端）。

### 生成相关（最影响帧数/卡顿）

| 配置项 | 默认 | 调低会怎样 |
|---|---|---|
| `worldSliceDiameter` | 8 | 生成尝试范围变小，刷新变少，卡顿下降 |
| `worldSliceHeight` | 16 | 同上 |
| `ticksBetweenSpawnAttempts` | 20 | 调大 → 生成变慢但省性能 |
| `pokemonPerChunk` | 1.0 | 调低 → 每区块宝可梦更少 |
| `maxNearbyBlocksHorizontalRange` | 4 | 调低 → 判定更快（略省） |
| `maxNearbyBlocksVerticalRange` | 2 | 同上 |
| `maxVerticalCorrectionBlocks` | 64 | 调低 → 山地生成更少，省一点 |
| `maxVerticalSpace` | 8 | 找落点的检查高度 |

**推荐做法**：先只动 `ticksBetweenSpawnAttempts`（20 → 40）和 `pokemonPerChunk`（1.0 → 0.6），观察一天。还卡再动 `worldSlice*`。

### 实体与牧场

| 配置项 | 默认 | 说明 |
|---|---|---|
| `defaultPasturedPokemonLimit` | 16 | 一个牧场最多放 16 只 |
| `pastureMaxPerChunk` | 4.0 | 每区块最多 4 只放养的 |
| `pastureMaxWanderDistance` | 64 | 放养宝可梦最远走 64 格 |
| `pastureBlockUpdateTicks` | 40 | 牧场每 40 tick 更新一次 |

**别把一个牧场塞满 16 只还放在基地中央**——那是全服最卡的角落。展示用的放到远处，或者干脆收回球里。

### 其他

- **Fabric 比 NeoForge 快**（官方自己说的），配置允许就选 Fabric。
- 装了 Terralith / BYG / WWO 等群系 mod，世界生成开销会上一个台阶，属于正常。
- `autoUpdateShowdown` 默认 true，会尝试更新对战引擎；网络不好时可能拖慢启动，可以关。
- 客户端渲染距离、实体距离别拉满，比调 mod 配置更有效。

## 二、常见报错与处理

| 现象 | 可能原因 | 处理 |
|---|---|---|
| 启动崩，日志有 `Fabric API` | 只装了 Cobblemon | 补 Fabric API |
| 启动崩，日志有 `kotlin` | NeoForge 缺前置 | 补 Kotlin for Forge |
| 启动崩，日志有 `Incompatible mod set` | 版本/加载器不匹配 | 核对 MC 版本与 loader |
| 进游戏没宝可梦 | `enableSpawning=false` 或生成表被改 | 查配置与数据包 |
| 宝可梦全是紫色替身娃娃 | 该物种无模型 | 正常，等更新 |
| 服务器进得去但没怪 | 客户端装了服务端没有的生成 mod | 两端 mod 对齐 |
| 对战卡在加载 | Showdown 引擎更新失败 / 网络问题 | 关 `autoUpdateShowdown` 后重启 |
| 存档宝可梦丢失 | 存档时崩 / 存储格式问题 | 恢复备份，见下节 |
| Java 版本报错 | 1.21.1 需要 Java 21 | 换启动器的 Java 21 |

> 具体报错文本各版本不同，本文不贴「精确报错字符串」。**排查方法**：看 `logs/latest.log` 最后 50 行，找 `Caused by:`，再拿那一句去搜。

## 三、多人服务器注意事项

### 基本事实

- Cobblemon **没有官方服务器**；公共服列表在 https://cobblemon.com/en/servers 和 Discord `#server-listings`。
- 客户端/服务端**版本必须一致**，且服务端要装对应的 loader 版本。
- 很多服要求你装「他们的整合包」，不要裸装 Cobblemon 就进。

### 存档与数据

| 配置项 | 默认 | 说明 |
|---|---|---|
| `storageFormat` | nbt | 可选 `nbt` / `json` / `mongodb` |
| `defaultBoxCount` | 30 | 每人 PC 默认 30 个盒子 |
| `pokemonSaveIntervalSeconds` | 30 | 每 30 秒存一次队伍与 PC 数据 |
| `preventCompletePartyDeposit` | false | 开启后不能把最后一只存进 PC |
| `tradeMaxDistance` | 12 | 交易最远距离 |

**服务器运维建议**：

1. **每天备份**存档目录（`world/` + `config/`）；
2. 大服用 `mongodb` 存储格式，别用默认 nbt 硬扛；
3. `pokemonSaveIntervalSeconds` 别调太大，崩服会丢数据；
4. 限制牧场数量，或调低 `defaultPasturedPokemonLimit`；
5. PvP 规则、交易规则写进公告，避免纠纷。

### 防坑

- 别在服务器里用「刷物品」类附属 mod，大概率被封；
- 跨服迁移要看目标服是否接受 nbt 存档；
- 回档前先停服，别热备份。

## 四、PC / 牧场 / 图鉴的同步问题

### PC（电脑）

| 项目 | 说明 |
|---|---|
| 默认盒子数 | 30（`defaultBoxCount`，可 1–1000） |
| 队伍满时捕获 | 自动送进 PC |
| 数据保存 | 每 30 秒（`pokemonSaveIntervalSeconds`） |
| 最后一只不能存 | 可开 `preventCompletePartyDeposit` 防手滑 |

**常见问题**：抓完宝可梦立刻退游戏，结果 PC 里没有——因为还没到 30 秒保存点。**退游戏前等几秒，或手动触发保存**。

### 牧场（Pasture Block）

| 项目 | 说明 |
|---|---|
| 合成 | 3×3 木板，中心放 **PC**，底部中间放小麦/漏斗/小麦 |
| 容量 | 默认 16 只 |
| 功能 | 放养、展示、可开自动攻击、可水下方放置 |
| 破坏 | 破坏方块会自动收回宝可梦 |
| **没有**的功能 | **不繁殖、不生蛋** |

### 图鉴（Pokédex）

| 项目 | 说明 |
|---|---|
| 颜色 | 7 种，屏幕材料决定 |
| 记录方式 | 扫描（少量信息）/ 战斗过 / 捕获（完整信息） |
| 扫描 | 长按右键，可滚轮缩放，远程扫 |
| 排序/筛选 | 可按地区排序，按名字/特性/掉落筛选 |
| 放置 | 可放进雕纹书架，讲台上会发光 |
| 命令 | `/pokedex printcalculations`（管理员用） |

**同步坑**：

- 图鉴的「已捕获」和「已见过」是两个计数，别看到数字没涨就以为没记录；
- 换设备/换服，图鉴进度跟着**玩家数据**走，不跟存档走；
- 1.7 修过图鉴与玩家数据的保存性能，老版本可能更卡。

## 五、整合包冲突

| 冲突类型 | 表现 | 处理 |
|---|---|---|
| 多个生成 mod | 生成表互相覆盖，某只刷不出来/刷太多 | 只留一个，或用数据包覆盖 |
| 多个球类 mod | 球种重复、配方冲突 | JEI 里看实际生效的配方 |
| 群系 mod 与生成标签 | 新群系没被分类，导致空生成 | 等 mod 更新，或手动加标签 |
| 版本不一致 | 崩溃 / 功能缺失 | 统一到同一 MC 版本线 |
| 数据包覆盖 | 配方/生成被改 | 看 `datapacks` 与整合包说明 |
| 优化 mod 冲突 | 实体渲染异常 | 逐个禁用排查 |

**排查顺序**：先只留 Cobblemon + 前置 → 能跑 → 每次加一批 mod → 找到元凶。别一次装 200 个 mod 再问为什么崩。

## 六、其他高频问题

| 问题 | 答案 |
|---|---|
| 按了 Catch 怎么不投球 | Catch 只是进入投球状态，要自己瞄准扔 |
| 球扔空了能捡吗 | 能，落地可捡回 |
| 捕获失败球还在吗 | 不在，球消失 |
| 能繁殖吗 | 原版**不能**，没有蛋系统 |
| 闪光概率多少 | 默认 1/8192（`shinyRate`=8192），服务器常改 |
| 等级上限 | 100 |
| 亲密度上限 | 255 |
| 濒死多久复活 | 默认 300 秒，回 20% 血 |
| 治疗机几次 | 默认 6 次充能，1 次≈全满药+回 PP |
| Cherish 球哪来 | 生存拿不到 |
| 太晶属性 | 默认 1/20 概率属性不符 |
| 为什么没声音提示闪光 | `shinyNoticeParticlesDistance` 默认 24 格，超了不提示 |

## 七、本文没查证的部分（需要你人工确认）

为免误导，以下内容本文**没有给具体结论**，请以你自己的版本为准：

1. **各整合包的具体配置改动**——每个包都可能改 `shinyRate`、生成权重、球配方；
2. **精确报错文本与对应修复**——版本差异大，建议看日志原文搜；
3. **传说宝可梦的原版生成条件**——官方 Wiki 无此页面，见第 6 篇；
4. **EV/IV 的极端细节**（如 0 速玩法在 Cobblemon 里是否完全生效）——沿用 Showdown 规则，但未逐条验证；
5. **各启动器的逐步图文**——官方 Wiki 有 Modrinth / Prism / CurseForge 三篇专页，照那个走最稳。

> 本文配置默认值全部来自官方 Config 页面。你服里的数字如果不一样，那就是管理员改过，按管理员说的来。