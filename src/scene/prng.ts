import { BiomeArchetype, PlateCoordinate } from '../types/vignette';

export interface SeededRng {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  chance: (prob: number) => boolean;
}

/**
 * Deterministic 32-bit Mulberry32 PRNG so every (worldSeed, gx, gz) coordinate
 * generates the exact same art-directed diorama plate every time you visit it.
 */
export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (prob: number) => next() < prob,
  };
}

export function computePlateSeed(worldSeed: number, coord: PlateCoordinate): number {
  const h1 = Math.imul(coord.gx + 1024, 73856093);
  const h2 = Math.imul(coord.gz + 1024, 19349663);
  const h3 = Math.imul(worldSeed, 83492791);
  return ((h1 ^ h2 ^ h3) >>> 0) || 1;
}

const BIOME_LIST: readonly BiomeArchetype[] = [
  'crypt-courtyard',
  'apothecary-stall',
  'sunken-fen',
  'ossuary-belltower',
];

export const BIOME_TITLES: Record<BiomeArchetype, string> = {
  'crypt-courtyard': 'Crypt Courtyard & Lich-Gate',
  'apothecary-stall': 'Apothecary Relic Stall',
  'sunken-fen': 'Sunken Fen Jetty & Causeway',
  'ossuary-belltower': 'Ossuary Belltower Ruin',
};

export function resolvePlateBiome(
  worldSeed: number,
  coord: PlateCoordinate,
  forcedBiome: BiomeArchetype | 'auto'
): BiomeArchetype {
  if (forcedBiome !== 'auto') return forcedBiome;
  // Origin (0,0) defaults to the classic Gothic Crypt Courtyard on seed 4821
  if (coord.gx === 0 && coord.gz === 0 && worldSeed === 4821) {
    return 'crypt-courtyard';
  }
  const plateSeed = computePlateSeed(worldSeed, coord);
  const idx = Math.abs(plateSeed + coord.gx * 3 + coord.gz * 5) % BIOME_LIST.length;
  return BIOME_LIST[idx];
}

/**
 * Evaluates the polar-blob radius at angle theta for a given seedOffset so both the
 * 3D mesh generator and the player boundary collision match.
 */
export function evaluatePolarBlobRadius(
  theta: number,
  baseRadius: number,
  seedOffset: number,
  scallopAmp = 0.06
): number {
  return (
    baseRadius *
    (1.0 +
      0.075 * Math.sin(theta * 3 + seedOffset) +
      0.048 * Math.cos(theta * 5 - seedOffset * 1.3) +
      scallopAmp * Math.sin(theta * 11 + seedOffset * 2.1) +
      0.025 * Math.cos(theta * 17 + 0.7))
  );
}
