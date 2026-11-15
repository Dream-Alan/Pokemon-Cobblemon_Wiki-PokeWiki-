/**
 * 能力值计算（第三世代起的公式，Cobblemon 的 CobblemonStatProvider 沿用同一套，并对脱壳忍者特判 HP=1）。
 * 全程整数运算：性格修正按 ⌊x × 110 / 100⌋ / ⌊x × 90 / 100⌋，与游戏一致，不用浮点 ×1.1。
 *
 *   HP   = ⌊(2B + IV + ⌊EV/4⌋) × L / 100⌋ + L + 10
 *   其他 = ⌊(⌊(2B + IV + ⌊EV/4⌋) × L / 100⌋ + 5) × N / 100⌋，N ∈ {90, 100, 110}
 *
 * 只依赖纯数值，客户端组件可以直接引入。
 */
import type { Pokemon } from './types';

export type StatKey = keyof Pokemon['stats'];

export const STAT_KEYS: StatKey[] = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

export const IV_MAX = 31;
export const EV_MAX = 252;
export const EV_TOTAL = 510;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 100;
const SHEDINJA = 292;

/** 性格修正：+1 提高（×1.1）、0 无修正、-1 降低（×0.9） */
export type NatureEffect = -1 | 0 | 1;

/** 25 种性格：up / down 为提高 / 降低的能力，平衡性格两者都为空 */
export const NATURES: { zh: string; up?: StatKey; down?: StatKey }[] = [
  { zh: '勤奋' }, { zh: '坦率' }, { zh: '认真' }, { zh: '害羞' }, { zh: '浮躁' },
  { zh: '怕寂寞', up: 'attack', down: 'defense' },
  { zh: '勇敢', up: 'attack', down: 'speed' },
  { zh: '固执', up: 'attack', down: 'special-attack' },
  { zh: '顽皮', up: 'attack', down: 'special-defense' },
  { zh: '大胆', up: 'defense', down: 'attack' },
  { zh: '悠闲', up: 'defense', down: 'speed' },
  { zh: '淘气', up: 'defense', down: 'special-attack' },
  { zh: '乐天', up: 'defense', down: 'special-defense' },
  { zh: '内敛', up: 'special-attack', down: 'attack' },
  { zh: '慢吞吞', up: 'special-attack', down: 'defense' },
  { zh: '冷静', up: 'special-attack', down: 'speed' },
  { zh: '马虎', up: 'special-attack', down: 'special-defense' },
  { zh: '温和', up: 'special-defense', down: 'attack' },
  { zh: '温顺', up: 'special-defense', down: 'defense' },
  { zh: '自大', up: 'special-defense', down: 'speed' },
  { zh: '慎重', up: 'special-defense', down: 'special-attack' },
  { zh: '胆小', up: 'speed', down: 'attack' },
  { zh: '急躁', up: 'speed', down: 'defense' },
  { zh: '爽朗', up: 'speed', down: 'special-attack' },
  { zh: '天真', up: 'speed', down: 'special-defense' },
];

export function natureEffect(nature: { up?: StatKey; down?: StatKey }, key: StatKey): NatureEffect {
  return nature.up === key ? 1 : nature.down === key ? -1 : 0;
}

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(Number.isFinite(v) ? v : lo)));

/** 单项能力值。输入会被夹到合法范围（等级 1–100、个体 0–31、努力 0–252） */
export function statValue(
  key: StatKey,
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: NatureEffect = 0,
  dex = 0,
): number {
  const L = clampInt(level, LEVEL_MIN, LEVEL_MAX);
  const I = clampInt(iv, 0, IV_MAX);
  const E = clampInt(ev, 0, EV_MAX);
  const B = Math.max(0, Math.floor(base));
  const core = Math.floor(((2 * B + I + Math.floor(E / 4)) * L) / 100);
  if (key === 'hp') return dex === SHEDINJA ? 1 : core + L + 10;
  const N = nature === 1 ? 110 : nature === -1 ? 90 : 100;
  return Math.floor(((core + 5) * N) / 100);
}

/**
 * 某等级下该能力值的可能范围：
 *   最低 = 个体 0、努力 0、降低性格（HP 无性格修正）
 *   最高 = 个体 31、努力 252、提高性格
 */
export function statRange(key: StatKey, base: number, level: number, dex = 0): [number, number] {
  return [statValue(key, base, 0, 0, level, -1, dex), statValue(key, base, IV_MAX, EV_MAX, level, 1, dex)];
}
