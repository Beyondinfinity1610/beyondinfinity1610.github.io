// Movement 06's instance data — spec §3.4. Pure, deterministic, no three.js
// import (so it's unit-testable directly, tests/ceiling-field.spec.ts) and
// no DOM. Every run's "closeness" (how near it came to the ceiling before
// being measured and rejected) is generated here; the WebGL piece only
// consumes it. mulberry32 + hash32 (core/rng.ts) are the only randomness in
// the app — no Math.random, CI-grep enforced (scripts/grep-invariants.mjs).

import { mulberry32, hash32 } from '../../core/rng';

// The seven levers named in index.html's #ceiling lede (data scale, fusion
// strategy, ensembling, false-alarm filtering, persistence, hand-crafted
// features, band selection) — spec §3.4's "lever category (the seven)".
// Categories are purely a per-instance colour-continuum index here; no
// label ever renders (spec: "no axes, no ticks, no numerals anywhere in
// this piece"), so they stay numbers, never strings.
export const LEVER_CATEGORY_COUNT = 7;

// World-space bounds, arbitrary but fixed — the ceiling is a hard plane at
// CEILING_Y that generation must never reach, let alone cross.
export const CEILING_Y = 1;
export const FLOOR_Y = -1;

// The vertex shader's settle spring has a bounded overshoot (piece.ts's
// SPRING_OVERSHOOT_CAP) of up to 15% of an instance's travel distance past
// its resting position. Keeping every generated Y at least this far below
// CEILING_Y means even a full-amplitude overshoot mid-settle still can't
// reach the plane — the "no instance's Y crosses the ceiling" guarantee
// holds for the animated scene, not just the resting dataset.
export const CEILING_MARGIN = 0.22;

// closeness >= this reads as a "near miss" — spec's "a few near-misses get
// thin vertical hairlines up to it". Chosen so the cubic skew below (most
// weight near closeness=0) leaves a small, non-empty tail at any field size
// from mobile's 700 instances up.
export const NEAR_MISS_THRESHOLD = 0.93;

export const CEILING_INSTANCE_COUNT_HIGH = 1800;
export const CEILING_INSTANCE_COUNT_MOBILE = 700;

// Exported for piece.ts — the hairline ceiling grid is drawn spanning the
// exact same XZ bounds the field itself is generated within.
export const FIELD_RADIUS_X = 6;
export const FIELD_RADIUS_Z = 6;
export const FIELD_DEPTH_BIAS = -2;

export interface CeilingInstance {
  x: number;
  y: number;
  z: number;
  category: number;
  closeness: number;
  seed: number;
  nearMiss: boolean;
}

export interface CeilingField {
  instances: CeilingInstance[];
  nearMissIndices: number[];
}

/** Cubic skew toward 0 — most runs land far below the ceiling; a shrinking
 *  minority land close to it. Still reaches 1 in the tail (r=1 -> 1). */
function closenessFor(r: () => number): number {
  return Math.pow(r(), 3);
}

/** Deterministic instance placement — same index always yields the same
 *  instance regardless of total count, mirroring plate-atlas.ts's
 *  per-cell `mulberry32(hash32(seed, key, index))` convention. */
export function buildCeilingField(count: number): CeilingField {
  const instances: CeilingInstance[] = [];
  const nearMissIndices: number[] = [];

  for (let i = 0; i < count; i++) {
    const r = mulberry32(hash32('ceiling-field', i));

    const angle = r() * Math.PI * 2;
    const radius = Math.sqrt(r()); // uniform-density disc, not a centre-heavy one
    const x = Math.cos(angle) * radius * FIELD_RADIUS_X;
    const z = Math.sin(angle) * radius * FIELD_RADIUS_Z + FIELD_DEPTH_BIAS;

    const closeness = closenessFor(r);
    const nearMiss = closeness >= NEAR_MISS_THRESHOLD;
    const usableHeight = CEILING_Y - CEILING_MARGIN - FLOOR_Y;
    const y = FLOOR_Y + closeness * usableHeight;

    const category = Math.floor(r() * LEVER_CATEGORY_COUNT) % LEVER_CATEGORY_COUNT;
    const seed = r();

    if (nearMiss) nearMissIndices.push(i);
    instances.push({ x, y, z, category, closeness, seed, nearMiss });
  }

  return { instances, nearMissIndices };
}
