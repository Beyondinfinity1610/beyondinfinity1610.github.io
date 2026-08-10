// mulberry32 + hash32 — the ONLY randomness in the app (spec §7.2). Every
// other module needing a random number derives it from a seed through
// these two functions, so the whole site is deterministic from one
// SEED constant (src/signal/seed.ts, from Phase 2).

/** xmur3 string hash — used to turn a seed key into a 32-bit integer. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Combine a seed and any number of key parts into one deterministic 32-bit integer. */
export function hash32(...parts: (number | string)[]): number {
  return xmur3(parts.join(':'))();
}

/** mulberry32 PRNG — given a 32-bit seed, returns a generator of floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: a deterministic [0,1) generator seeded from arbitrary key parts. */
export function rngFor(...parts: (number | string)[]): () => number {
  return mulberry32(hash32(...parts));
}
