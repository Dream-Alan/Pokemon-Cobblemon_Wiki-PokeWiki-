// Client-safe move metadata: constants and types only, no JSON payloads.

export interface Move {
  /** 中文名 */
  n: string;
  /** 英文名 */
  e: string;
  /** 属性 key（小写） */
  t: string;
  c: 'status' | 'physical' | 'special';
  /** 分类中文：变化 / 物理 / 特殊 */
  cz: string;
  /** 威力，0 = 无 */
  p: number;
  /** PP */
  pp: number;
  /** 命中率，0 = 必中 */
  a: number;
  /** 优先级 */
  pr: number;
  d: string;
}

export type LearnEntry = [moveId: number, method: number, level: number];
export type LearnSource = 'cobblemon' | 'game';

export const MOVE_METHODS = [
  { code: 0, label: '等级', en: 'Level-up' },
  { code: 1, label: '招式机', en: 'TM/HM' },
  { code: 2, label: '遗传', en: 'Egg' },
  { code: 3, label: '教学', en: 'Tutor' },
  { code: 4, label: '遗留', en: 'Legacy' },
] as const;