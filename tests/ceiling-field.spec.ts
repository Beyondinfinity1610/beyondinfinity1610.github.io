import { describe, test, expect } from 'vitest';
import {
  buildCeilingField,
  CEILING_Y,
  FLOOR_Y,
  CEILING_MARGIN,
  NEAR_MISS_THRESHOLD,
  LEVER_CATEGORY_COUNT,
  CEILING_INSTANCE_COUNT_HIGH,
  CEILING_INSTANCE_COUNT_MOBILE,
} from '../src/pieces/ceiling/field';

// Movement 06 — the ceiling, spec §8 Phase 8's done-test item 2: "a unit
// test proves no instance's Y crosses the ceiling." This is the pure,
// deterministic half of that guarantee — the generation function's own
// resting positions. (The other half — that the vertex shader's bounded-
// overshoot settle spring can't push an animated instance past CEILING_Y
// either — is a property of field.vert.ts's clamp and CEILING_MARGIN's
// sizing, not something a vitest unit test can observe; see field.ts's own
// comment on why CEILING_MARGIN is set to cover exactly that overshoot.)

describe('the ceiling field — spec §8 Phase 8', () => {
  for (const count of [CEILING_INSTANCE_COUNT_MOBILE, CEILING_INSTANCE_COUNT_HIGH, 1, 0]) {
    test(`no instance's Y crosses the ceiling (count=${count})`, () => {
      const { instances } = buildCeilingField(count);
      expect(instances).toHaveLength(count);
      for (const inst of instances) {
        expect(inst.y, `instance y=${inst.y} must stay strictly below CEILING_Y=${CEILING_Y}`).toBeLessThan(CEILING_Y);
        // Not just below the plane, but below it with the full margin the
        // shader's bounded settle-spring overshoot needs (field.ts's own
        // comment on CEILING_MARGIN).
        expect(inst.y).toBeLessThanOrEqual(CEILING_Y - CEILING_MARGIN + 1e-9);
      }
    });
  }

  test('every instance stays at or above the floor', () => {
    const { instances } = buildCeilingField(CEILING_INSTANCE_COUNT_HIGH);
    for (const inst of instances) {
      expect(inst.y).toBeGreaterThanOrEqual(FLOOR_Y - 1e-9);
    }
  });

  test('category is always one of the seven levers (spec §3.4)', () => {
    const { instances } = buildCeilingField(CEILING_INSTANCE_COUNT_HIGH);
    for (const inst of instances) {
      expect(Number.isInteger(inst.category)).toBe(true);
      expect(inst.category).toBeGreaterThanOrEqual(0);
      expect(inst.category).toBeLessThan(LEVER_CATEGORY_COUNT);
    }
  });

  test('nearMiss is exactly the set of instances at or above NEAR_MISS_THRESHOLD closeness', () => {
    const field = buildCeilingField(CEILING_INSTANCE_COUNT_HIGH);
    const expectedIndices = field.instances
      .map((inst, i) => ({ inst, i }))
      .filter(({ inst }) => inst.closeness >= NEAR_MISS_THRESHOLD)
      .map(({ i }) => i);
    expect(field.nearMissIndices).toEqual(expectedIndices);
    for (const inst of field.instances) {
      expect(inst.nearMiss).toBe(inst.closeness >= NEAR_MISS_THRESHOLD);
    }
  });

  test('near misses exist but are a small minority — "a few", not many (spec §3.4)', () => {
    const field = buildCeilingField(CEILING_INSTANCE_COUNT_HIGH);
    expect(field.nearMissIndices.length).toBeGreaterThan(0);
    expect(field.nearMissIndices.length).toBeLessThan(field.instances.length * 0.15);
  });

  test('deterministic: same count always yields the same field (core/rng.ts, no Math.random)', () => {
    const a = buildCeilingField(400);
    const b = buildCeilingField(400);
    expect(a.instances).toEqual(b.instances);
    expect(a.nearMissIndices).toEqual(b.nearMissIndices);
  });

  test('instance identity is index-stable: growing the field never changes an earlier instance', () => {
    const small = buildCeilingField(CEILING_INSTANCE_COUNT_MOBILE);
    const large = buildCeilingField(CEILING_INSTANCE_COUNT_HIGH);
    for (let i = 0; i < small.instances.length; i++) {
      expect(large.instances[i]).toEqual(small.instances[i]);
    }
  });
});
