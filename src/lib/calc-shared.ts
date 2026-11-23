// 对战计算器的纯函数层：性格 / 道具 / 能力值 / 伤害公式。
// 客户端安全：只依赖 shared.ts 里的 18 条属性数据，不引入 pokedex.json。

import { allTypes } from './shared';

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export interface Nature {
  zh: string;
  en: string;
  plus?: StatKey;
  minus?: StatKey;
}

/** 25 种性格，+10% / -10%。 */
export const NATURES: Nature[] = [
  { zh: '勤奋', en: 'Hardy' },
  { zh: '怕寂寞', en: 'Lonely', plus: 'atk', minus: 'def' },
  { zh: '勇敢', en: 'Brave', plus: 'atk', minus: 'spe' },
  { zh: '固执', en: 'Adamant', plus: 'atk', minus: 'spa' },
  { zh: '顽皮', en: 'Naughty', plus: 'atk', minus: 'spd' },
  { zh: '大胆', en: 'Bold', plus: 'def', minus: 'atk' },
  { zh: '坦率', en: 'Docile' },
  { zh: '悠闲', en: 'Relaxed', plus: 'def', minus: 'spe' },
  { zh: '淘气', en: 'Impish', plus: 'def', minus: 'spa' },
  { zh: '乐天', en: 'Lax', plus: 'def', minus: 'spd' },
  { zh: '胆小', en: 'Timid', plus: 'spe', minus: 'atk' },
  { zh: '急躁', en: 'Hasty', plus: 'spe', minus: 'def' },
  { zh: '认真', en: 'Serious' },
  { zh: '开朗', en: 'Jolly', plus: 'spe', minus: 'spa' },
  { zh: '天真', en: 'Naive', plus: 'spe', minus: 'spd' },
  { zh: '内敛', en: 'Modest', plus: 'spa', minus: 'atk' },
  { zh: '慢吞吞', en: 'Mild', plus: 'spa', minus: 'def' },
  { zh: '冷静', en: 'Quiet', plus: 'spa', minus: 'spe' },
  { zh: '害羞', en: 'Bashful' },
  { zh: '马虎', en: 'Rash', plus: 'spa', minus: 'spd' },
  { zh: '沉着', en: 'Calm', plus: 'spd', minus: 'atk' },
  { zh: '温和', en: 'Gentle', plus: 'spd', minus: 'def' },
  { zh: '自大', en: 'Sassy', plus: 'spd', minus: 'spe' },
  { zh: '慎重', en: 'Careful', plus: 'spd', minus: 'spa' },
  { zh: '浮躁', en: 'Quirky' },
];

export function natureMod(nature: string, stat: StatKey): number {
  const n = NATURES.find(x => x.zh === nature);
  if (!n || stat === 'hp') return 1;
  if (n.plus === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1;
}

export interface Item {
  key: string;
  zh: string;
  /** 对能力值的倍率 */
  atk?: number;
  spa?: number;
  def?: number;
  spd?: number;
  spe?: number;
  /** 伤害输出的倍率（生命宝珠） */
  dmg?: number;
  /** 击中弱点时的额外倍率（达人带） */
  seDmg?: number;
  /** 属性增强道具：强化的属性 key（首字母大写，如 Fire） */
  type?: string;
}

export const ITEMS: Item[] = [
  { key: '', zh: '无道具' },
  { key: 'choice-band', zh: '讲究头带', atk: 1.5 },
  { key: 'choice-specs', zh: '讲究眼镜', spa: 1.5 },
  { key: 'choice-scarf', zh: '讲究围巾', spe: 1.5 },
  { key: 'life-orb', zh: '生命宝珠', dmg: 1.3 },
  { key: 'expert-belt', zh: '达人带', seDmg: 1.2 },
  { key: 'assault-vest', zh: '突击背心', spd: 1.5 },
  { key: 'eviolite', zh: '进化奇石', def: 1.5, spd: 1.5 },
  { key: 'charcoal', zh: '木炭', type: 'Fire' },
  { key: 'mystic-water', zh: '神秘水滴', type: 'Water' },
  { key: 'magnet', zh: '磁铁', type: 'Electric' },
  { key: 'miracle-seed', zh: '奇迹种子', type: 'Grass' },
  { key: 'never-melt-ice', zh: '不融冰', type: 'Ice' },
  { key: 'black-belt', zh: '黑带', type: 'Fighting' },
  { key: 'poison-barb', zh: '毒针', type: 'Poison' },
  { key: 'soft-sand', zh: '软沙', type: 'Ground' },
  { key: 'sharp-beak', zh: '锐利鸟嘴', type: 'Flying' },
  { key: 'twisted-spoon', zh: '弯曲的汤匙', type: 'Psychic' },
  { key: 'silver-powder', zh: '银粉', type: 'Bug' },
  { key: 'hard-stone', zh: '硬石头', type: 'Rock' },
  { key: 'spell-tag', zh: '诅咒之符', type: 'Ghost' },
  { key: 'dragon-fang', zh: '龙之牙', type: 'Dragon' },
  { key: 'black-glasses', zh: '黑色眼镜', type: 'Dark' },
  { key: 'metal-coat', zh: '金属外套', type: 'Steel' },
  { key: 'fairy-feather', zh: '妖精之羽', type: 'Fairy' },
  { key: 'silk-scarf', zh: '丝绸围巾', type: 'Normal' },
];

export const TYPE_BOOST = 1.2;

export function itemByKey(key: string): Item {
  return ITEMS.find(i => i.key === key) ?? ITEMS[0];
}

/** HP 能力值（个体值默认 31）。 */
export function calcHP(base: number, ev: number, level: number, iv = 31): number {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

/** 其它五项能力值。 */
export function calcStat(
  base: number,
  ev: number,
  level: number,
  mod = 1,
  iv = 31,
): number {
  return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * mod);
}

/** 能力等级 ±1~±6 的倍率。 */
export function stageMul(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export type Weather = '' | 'sun' | 'rain' | 'sand' | 'snow';

export const WEATHERS: { key: Weather; zh: string }[] = [
  { key: '', zh: '无天气' },
  { key: 'sun', zh: '大晴天' },
  { key: 'rain', zh: '下雨' },
  { key: 'sand', zh: '沙暴' },
  { key: 'snow', zh: '下雪' },
];

/** 进攻属性对防守方（可能是双属性）的倍率。 */
export function typeMultiplier(atkType: string, defTypes: string[]): number {
  const t = allTypes.find(x => x.key === atkType);
  if (!t) return 1;
  let m = 1;
  for (const d of defTypes) {
    if (t.zeroTo.includes(d)) m *= 0;
    else if (t.doubleTo.includes(d)) m *= 2;
    else if (t.halfTo.includes(d)) m *= 0.5;
  }
  return m;
}

export interface DamageInput {
  level: number;
  power: number;
  category: 'physical' | 'special';
  attack: number;
  defense: number;
  attackType: string;
  defenderTypes: string[];
  stab: boolean;
  weather: Weather;
  crit: boolean;
  burn: boolean;
  /** 道具带来的最终伤害倍率（生命宝珠 / 达人带 / 属性增强道具） */
  itemMod: number;
  /** 防守方道具对防御端的影响已经算进 defense */
  roll?: number;
}

/** 返回 16 个随机数下的伤害值（未取整到上限）。 */
export function damageRolls(input: DamageInput): number[] {
  const { level, power, category, attack, defense, attackType, defenderTypes } = input;
  if (power <= 0 || defense <= 0) return [];
  const eff = typeMultiplier(attackType, defenderTypes);
  if (eff === 0) return [];

  // 天气
  let weather = 1;
  if (input.weather === 'sun') {
    if (attackType === 'Fire') weather = 1.5;
    else if (attackType === 'Water') weather = 0.5;
  } else if (input.weather === 'rain') {
    if (attackType === 'Water') weather = 1.5;
    else if (attackType === 'Fire') weather = 0.5;
  }

  const crit = input.crit ? 1.5 : 1;
  const stab = input.stab ? 1.5 : 1;
  const burn = input.burn && category === 'physical' ? 0.5 : 1;

  const base =
    Math.floor(
      Math.floor(Math.floor((2 * level) / 5 + 2) * power * attack) / Math.floor(defense),
    ) /
      50 +
    2;

  const rolls: number[] = [];
  for (let i = 0; i < 16; i += 1) {
    const random = (85 + i) / 100;
    let d = Math.floor(base);
    d = Math.floor(d * weather);
    d = Math.floor(d * crit);
    d = Math.floor(d * random);
    d = Math.floor(d * stab);
    d = Math.floor(d * eff);
    d = Math.floor(d * burn);
    d = Math.floor(d * input.itemMod);
    rolls.push(Math.max(1, d));
  }
  return rolls;
}

export interface DamageSummary {
  rolls: number[];
  min: number;
  max: number;
  effectiveness: number;
}

export function summarize(rolls: number[], effectiveness: number): DamageSummary | null {
  if (rolls.length === 0) return null;
  return {
    rolls,
    min: Math.min(...rolls),
    max: Math.max(...rolls),
    effectiveness,
  };
}

/** n 发击杀范围，如 [2, 3] 表示随机 2~3 发。 */
export function koRange(summary: DamageSummary, hp: number): [number, number] {
  return [Math.ceil(hp / summary.max), Math.ceil(hp / summary.min)];
}