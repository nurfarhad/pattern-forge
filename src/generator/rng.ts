// ─── Mulberry32 PRNG ─────────────────────────────────────────────────────────
// A fast, high-quality 32-bit seeded pseudo-random number generator.
// Returns floats in [0, 1). Fully deterministic: same seed → same sequence.
// Pure function — no external dependencies, no DOM, no Figma API.
// Satisfies FR-1 (deterministic generation).

/**
 * Hash a string to a 32-bit unsigned integer (for string seeds).
 * Uses a simple djb2-style hash.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // convert to 32-bit int
  }
  return hash >>> 0; // unsigned
}

/**
 * Create a seeded PRNG instance from a seed string or number.
 * Returns a function that produces the next float in [0, 1) each time it is called.
 */
export function createRng(seed: string | number): () => number {
  let state =
    typeof seed === 'string'
      ? hashString(seed)
      : (seed >>> 0) || 1; // ensure non-zero unsigned

  return function mulberry32(): number {
    state += 0x6d2b79f5;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convenience: pick a random integer in [min, max] inclusive.
 */
export function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Convenience: pick a random float in [min, max].
 */
export function rngFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/**
 * Convenience: pick a random element from an array.
 */
export function rngPick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Convenience: shuffle an array (Fisher-Yates) using the seeded rng.
 * Returns a new array — does not mutate the original.
 */
export function rngShuffle<T>(rng: () => number, arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
