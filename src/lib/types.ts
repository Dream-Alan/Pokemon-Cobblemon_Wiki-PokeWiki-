export interface PokemonName {
  zh: string;
  en: string;
  ja: string | null;
}

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  'special-attack': number;
  'special-defense': number;
  speed: number;
}

export interface PokemonAbility {
  id: number;
  name: string | null;
  hidden: boolean;
}

export interface Pokemon {
  id: number;
  name: PokemonName;
  genus: string | null;
  types: string[];
  stats: PokemonStats;
  total: number;
  height: number;
  weight: number;
  abilities: PokemonAbility[];
  gen: number;
  legendary: boolean;
  mythical: boolean;
  color: string | null;
  captureRate: number | null;
  hatchCounter: number | null;
  genderRate: number | null;
  evolvesFrom: number | null;
  evolutionChain: number | null;
  evolution: string | null;
  flavor: string | null;
  flavorVersion: string | null;
}

export interface PType {
  id: number;
  key: string;
  zh: string;
  en: string;
  color: string;
  doubleTo: string[];
  halfTo: string[];
  zeroTo: string[];
  weakTo: string[];
  resists: string[];
  immuneTo: string[];
}

export interface EvolutionEdge {
  from: number | null;
  to: number;
  detail: string | null;
}

export type EvolutionChains = Record<string, EvolutionEdge[]>;

export type IndexRow = [number, string, string, string[], number, number, 0 | 1];