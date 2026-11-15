import pokedexJson from '@/data/pokedex.json';
import chainsJson from '@/data/chains.json';
import abilitiesJson from '@/data/abilities.json';
import abilityInfoJson from '@/data/ability-info.json';
import evYieldJson from '@/data/ev-yield.json';
import indexJson from '@/data/index.json';
import metaJson from '@/data/meta.json';
import cobblemonJson from '@/data/cobblemon.json';
import cobblemonMetaJson from '@/data/cobblemon-meta.json';
import spawnsJson from '@/data/spawns.json';
import encountersJson from '@/data/encounters.json';
import movesJson from '@/data/moves.json';
import learnsetsJson from '@/data/learnsets.json';
import formsJson from '@/data/forms.json';
import shinyArtJson from '@/data/shiny-art.json';
import specialJson from '@/data/special.json';
import type { EvolutionChains, IndexRow, Pokemon, PType } from './types';
import { allTypes, typeByKey } from './shared';

export * from './shared';

export interface CobblemonForm {
  key: string;
  label: string;
  model: string;
  texture: string;
  shiny: string | null;
  /** 该形态自己的待机动画文件（同一目录下），没有则为 null */
  animation?: string | null;
  /** 渲染附加数据 sidecar（resolver layers + poser transformedParts），没有则为 null */
  render?: string | null;
  /** 模型来源：Cobblemon 本体 / Mega Showdown / Z-A Megas */
  source?: string;
}

export interface CobblemonEntry {
  species: string;
  /** 待机动画文件名（在同一个目录下），没有则为 null */
  animation?: string | null;
  forms: CobblemonForm[];
}

export const cobblemon = cobblemonJson as unknown as Record<string, CobblemonEntry>;
export const cobblemonCount = Object.keys(cobblemon).length;

export const cobblemonMeta = cobblemonMetaJson as unknown as {
  version: string;
  species: number;
  forms: number;
  models: number;
  textures: number;
  animations?: number;
  implementedFalse: number;
  bySource?: Record<string, { forms: number; models: number }>;
};

export function cobblemonFor(id: number): CobblemonEntry | null {
  return cobblemon[String(id)] || null;
}

/** 取某个形态的 3D 资源路径（相对 basePath，交给 asset() 处理） */
export function cobblemonAssets(id: number, formKey = 'male') {
  const entry = cobblemonFor(id);
  if (!entry) return null;
  const form = entry.forms.find(f => f.key === formKey) ?? entry.forms[0];
  if (!form) return null;
  return {
    species: entry.species,
    form,
    forms: entry.forms,
    modelUrl: `/cobblemon/${id}/${form.model}`,
    textureUrl: `/cobblemon/${id}/${form.texture}`,
    shinyUrl: form.shiny ? `/cobblemon/${id}/${form.shiny}` : null,
    animationUrl: form.animation ? `/cobblemon/${id}/${form.animation}` : null,
    renderUrl: form.render ? `/cobblemon/${id}/${form.render}` : null,
    source: form.source ?? 'Cobblemon',
  };
}

/** ---- 方可梦（Cobblemon）生成条件 ---- */
export interface SpawnRule {
  bucket: string;
  bucketZh: string;
  lv: string;
  weight: number | null;
  where: string[];
  when: string[];
  presets: string[];
  aspects: string;
}

export const spawns = spawnsJson as unknown as Record<string, { species: string; rules: SpawnRule[] }>;

export function spawnFor(species: string): { species: string; rules: SpawnRule[] } | null {
  return spawns[species] ?? null;
}

/** ---- 宝可梦正统作的野外遭遇 ---- */
export interface EncounterMethod {
  m: string;
  mZh: string;
  lv: string;
  chance: number;
  areas: string[];
}

export interface EncounterVersion {
  gen: number;
  ver: string;
  verZh: string;
  methods: EncounterMethod[];
  methodCount: number;
}

export const encounters = encountersJson as unknown as Record<string, EncounterVersion[]>;

export function encountersFor(id: number): EncounterVersion[] {
  return encounters[String(id)] ?? [];
}

/** ---- 特殊获取途径（限定结构 / 特殊地图 / 道具 / 化石 / 召唤） ---- */
export interface SpecialFact {
  k: string;
  v: string;
}

export interface SpecialEntry {
  kind: string;
  title: string;
  facts: SpecialFact[];
  source?: string;
}

export interface SpecialMethods {
  cobblemon?: SpecialEntry[];
  game?: SpecialEntry[];
}

export const specialMethods = specialJson as unknown as Record<string, SpecialMethods>;

export function specialFor(id: number): SpecialMethods | null {
  return specialMethods[String(id)] ?? null;
}

export const allPokemon = pokedexJson as unknown as Pokemon[];
export const chains = chainsJson as unknown as EvolutionChains;
export const allAbilities = abilitiesJson as { id: number; key: string; zh: string }[];

/** 特性效果说明（scripts/sync-abilities.mjs 生成）：desc 为模组内中文说明，flavor 为正作最新世代措辞（不同时才有） */
export interface AbilityInfo {
  desc: string;
  flavor?: string;
  effectEn?: string;
}
const abilityInfoMap = abilityInfoJson as unknown as Record<string, AbilityInfo>;
export function abilityInfo(id: number): AbilityInfo | null {
  return abilityInfoMap[String(id)] ?? null;
}

/** 被打倒后给出的基础点数（scripts/build-ev-yield.mjs 生成，顺序 HP/攻/防/特攻/特防/速度） */
const evYieldMap = evYieldJson as unknown as Record<string, number[]>;
export function evYieldFor(id: number): Record<'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed', number> | null {
  const v = evYieldMap[String(id)];
  if (!v) return null;
  const [hp, attack, defense, spa, spd, speed] = v;
  return { hp, attack, defense, 'special-attack': spa, 'special-defense': spd, speed };
}
export const searchIndex = indexJson as unknown as IndexRow[];
export const datasetMeta = metaJson as unknown as {
  generatedAt: string;
  pokemon: number;
  types: number;
  abilities: number;
  chains: number;
  withFlavor: number;
  withZhName: number;
};

export const pokemonById = new Map<number, Pokemon>(allPokemon.map(p => [p.id, p]));

export function getPokemon(id: number): Pokemon | undefined {
  return pokemonById.get(id);
}

/** 防守端：这只宝可梦被打时的倍率 */
export function defensiveMultipliers(p: Pokemon): { weak: [string, number][]; resist: [string, number][]; immune: string[] } {
  const mult = new Map<string, number>();
  for (const atk of allTypes) {
    let m = 1;
    if (atk.zeroTo.some(t => p.types.includes(t))) m = 0;
    else {
      for (const def of p.types) {
        if (atk.doubleTo.includes(def)) m *= 2;
        if (atk.halfTo.includes(def)) m *= 0.5;
      }
    }
    if (m !== 1) mult.set(atk.key, m);
  }
  const entries = [...mult.entries()];
  return {
    weak: entries.filter(([, m]) => m > 1).sort((a, b) => b[1] - a[1]),
    resist: entries.filter(([, m]) => m > 0 && m < 1).sort((a, b) => a[1] - b[1]),
    immune: entries.filter(([, m]) => m === 0).map(([k]) => k),
  };
}

/** 攻击端：这个属性打出去对每个属性的倍率 */
export function offensiveMultipliers(typeKey: string): Map<string, number> {
  const t = typeByKey.get(typeKey);
  const m = new Map<string, number>();
  for (const def of allTypes) {
    let v = 1;
    if (t?.doubleTo.includes(def.key)) v = 2;
    else if (t?.halfTo.includes(def.key)) v = 0.5;
    else if (t?.zeroTo.includes(def.key)) v = 0;
    m.set(def.key, v);
  }
  return m;
}

export interface EvolutionNode {
  id: number;
  pokemon: Pokemon;
  detail: string | null;
  children: EvolutionNode[];
}

export function evolutionTreeFor(id: number): EvolutionNode | null {
  const p = pokemonById.get(id);
  if (!p || !p.evolutionChain) return null;
  const edges = chains[String(p.evolutionChain)] || [];
  if (!edges.length) return null;

  const byFrom = new Map<number | 'root', typeof edges>();
  for (const e of edges) {
    const key = e.from ?? 'root';
    if (!byFrom.has(key)) byFrom.set(key, []);
    byFrom.get(key)!.push(e);
  }

  const rootEdge = edges.find(e => e.from === null);
  const rootId = rootEdge?.to ?? edges[0].to;

  const build = (sid: number, detail: string | null, depth: number): EvolutionNode | null => {
    const pk = pokemonById.get(sid);
    if (!pk || depth > 4) return null;
    const kids = (byFrom.get(sid) || []).map(e => build(e.to, e.detail, depth + 1)).filter(Boolean) as EvolutionNode[];
    return { id: sid, pokemon: pk, detail, children: kids };
  };

  return build(rootId, null, 0);
}

export function genderRatio(rate: number | null): { male: number; female: number } | null {
  if (rate == null || rate < 0) return null;
  const female = (rate / 8) * 100;
  return { male: 100 - female, female };
}

// ---------------------------------------------------------------- moves
import type { LearnEntry, LearnSource, Move } from './moves-shared';
import { MOVE_METHODS } from './moves-shared';

export type { LearnEntry, LearnSource, Move };
export { MOVE_METHODS };

export const moves = (movesJson as { moves: Record<string, Move> }).moves;

const learnData = learnsetsJson as unknown as {
  cobblemon: Record<string, LearnEntry[]>;
  game: Record<string, LearnEntry[]>;
  cobblemonForms: Record<string, Record<string, LearnEntry[]>>;
};

export function learnsetFor(id: number, source: LearnSource, formKey?: string): LearnEntry[] {
  if (source === 'cobblemon' && formKey) {
    const formSet = learnData.cobblemonForms[String(id)]?.[formKey];
    if (formSet?.length) return formSet;
  }
  return learnData[source][String(id)] || [];
}

export function learnsetStats(list: LearnEntry[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [, method] of list) out[method] = (out[method] || 0) + 1;
  return out;
}

// ------------------------------------------------------------- special forms
export interface SpecialForm {
  key: string;
  label: string;
  types: string[];
  stats: Record<'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed', number>;
  total: number;
  abilities: { id?: number | null; name: string; hidden: boolean }[];
  evYield?: Record<'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed', number> | null;
  battleOnly: boolean;
  height?: number;
  weight?: number;
  model: string;
  texture: string;
  shiny: string | null;
  source?: string;
  animation?: string | null;
  render?: string | null;
}

const rawForms = (formsJson as unknown as { forms: Record<string, SpecialForm[]> }).forms;

const capType = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const formsByDex: Record<number, SpecialForm[]> = {};
export const allForms: (SpecialForm & { dex: number })[] = [];

for (const [dex, list] of Object.entries(rawForms)) {
  const id = Number(dex);
  formsByDex[id] = list.map(f => ({ ...f, types: f.types.map(capType) }));
  for (const f of formsByDex[id]) allForms.push({ ...f, dex: id });
}

export function formsFor(id: number): SpecialForm[] {
  return formsByDex[id] || [];
}

export function formFor(id: number, key: string): SpecialForm | null {
  return formsFor(id).find(f => f.key === key) || null;
}

/** 形态页的 3D 资源（相对 basePath，交给 asset() 处理） */
export function formAssets(id: number, form: SpecialForm) {
  const base = `/cobblemon/${id}`;
  return {
    modelUrl: `${base}/${form.model}`,
    textureUrl: `${base}/${form.texture}`,
    shinyUrl: form.shiny ? `${base}/${form.shiny}` : null,
    animationUrl: form.animation ? `${base}/${form.animation}` : null,
    renderUrl: form.render ? `${base}/${form.render}` : null,
  };
}

/* ---------- 闪光官方原画（由 scripts/fetch-shiny-art.mjs 生成清单） ---------- */
const shinyBaseSet = new Set<number>(shinyArtJson.base);
const shinyFormSet = new Set<string>(shinyArtJson.forms);

export const shinyArtMeta = { base: shinyBaseSet.size, forms: shinyFormSet.size };

export function hasShinyArt(id: number): boolean {
  return shinyBaseSet.has(id);
}

export function hasShinyFormArt(id: number, key: string): boolean {
  return shinyFormSet.has(`${id}-${key}`);
}