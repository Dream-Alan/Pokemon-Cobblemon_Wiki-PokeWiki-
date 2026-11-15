/**
 * PokeAPI 遭遇方式（encounter method identifier）→ 中文
 * 只收录 fetch-encounters.mjs 里 METHOD_ZH 没覆盖到的英文 identifier，
 * 供抓取脚本与「补翻」脚本共用，避免两处表不一致。
 */
export const EXTRA_METHOD_ZH = {
  // 主世界 / 地表
  overworld: "主世界",
  "overworld-water": "水面（主世界）",
  "overworld-water-special": "水面（特殊）",
  "overworld-flying": "空中（主世界）",
  "overworld-flying-special": "空中（特殊）",
  "overworld-dirt": "沙地",
  "overworld-special": "主世界（特殊）",
  "rough-terrain": "崎岖地形",
  "roaming-grass": "草丛游荡",
  "roaming-water": "水面游荡",
  "wanderer-water": "水面游荡",
  horde: "群战",
  // 花丛
  "red-flowers": "红的花丛",
  "yellow-flowers": "黄的花丛",
  "purple-flowers": "紫的花丛",
  // 钓鱼
  "bubbling-spots": "泡沫钓点",
  "super-rod-spots": "厉害钓竿钓点",
  "surf-spots": "冲浪钓点",
  "feebas-tile-fishing": "丑丑鱼钓点",
  // 定点 / 特殊方式
  static: "定点遭遇",
  "npc-trade": "NPC 交换",
  snag: "暗影宝可梦（抢夺）",
  "snag-rematch": "暗影宝可梦再战",
  "max-raid": "极巨团体战",
  "dynamax-adventure": "极巨大冒险",
  // 道具 / 特殊地点
  "hidden-grotto": "隐藏洞穴",
  "berry-trees": "果树",
  "honey-tree": "蜂蜜树",
  "headbutt": "撞树",
  "headbutt-high": "撞树（高处）",
  "headbutt-low": "撞树（低处）",
  "headbutt-normal": "撞树",
  "pokespot": "宝可梦聚集点",
  "seaweed": "海藻",
  "trash-can-ambush": "垃圾桶伏击",
  "rustling-bush-ambush": "灌木丛伏击",
  "ceiling-ambush": "洞顶伏击",
  "sky-ambush": "空中伏击",
  "ground-ambush": "地面伏击",
  "chase-water": "水面追逐",
  pokeflute: "宝可梦笛",
  "squirt-bottle": "喷水壶",
  "wailmer-pail": "吼吼鲸喷壶",
  // 呼唤
  sos: "呼唤同伴",
  "sos-from-bubbling-spot": "泡沫点呼唤同伴",
  // 联动 / 配信
  "pokemon-ranger": "宝可梦巡护员联动",
  "pokemon-channel-pal": "宝可梦频道联动",
  "colosseum-bonus-disc-jpn": "圆形竞技场特典",
  "colosseum-bonus-disc-us": "圆形竞技场特典",
};