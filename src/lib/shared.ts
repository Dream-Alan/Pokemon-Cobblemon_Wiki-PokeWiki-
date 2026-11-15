import typesJson from '@/data/types.json';
import type { Pokemon, PType } from './types';

/** 只依赖 18 条属性数据，可安全地被打包进客户端组件 */
export const allTypes = typesJson as unknown as PType[];
export const typeByKey = new Map<string, PType>(allTypes.map(t => [t.key, t]));
const typeByLower = new Map<string, PType>(allTypes.map(t => [t.key.toLowerCase(), t]));

/** types.json 的 key 是首字母大写（Fire），招式数据里是小写（fire），这里统一兜住 */
export function findType(key: string): PType | undefined {
  return typeByKey.get(key) || typeByLower.get(key.toLowerCase());
}

export const TYPE_ZH: Record<string, string> = Object.fromEntries(allTypes.map(t => [t.key, t.zh]));

export function dexNo(id: number): string {
  return String(id).padStart(4, '0');
}

export function typeZh(key: string): string {
  return findType(key)?.zh || key;
}

export function typeColor(key: string): string {
  return findType(key)?.color || '#7f8db0';
}

export const STAT_LABELS: { key: keyof Pokemon['stats']; label: string; short: string }[] = [
  { key: 'hp', label: 'HP', short: 'HP' },
  { key: 'attack', label: '攻击', short: '攻击' },
  { key: 'defense', label: '防御', short: '防御' },
  { key: 'special-attack', label: '特攻', short: '特攻' },
  { key: 'special-defense', label: '特防', short: '特防' },
  { key: 'speed', label: '速度', short: '速度' },
];

export const GENERATIONS: Record<number, string> = {
  1: '第一世代 · 关都',
  2: '第二世代 · 城都',
  3: '第三世代 · 丰缘',
  4: '第四世代 · 神奥',
  5: '第五世代 · 合众',
  6: '第六世代 · 卡洛斯',
  7: '第七世代 · 阿罗拉',
  8: '第八世代 · 伽勒尔',
  9: '第九世代 · 帕底亚',
};