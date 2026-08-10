// The day schedule — spec §2.2. 300–600 segments over seven states, flat
// typed arrays, binary-searched. Deterministic from SEED; no history, no
// Math.random.

import { rngFor } from '../core/rng';
import { SEED, DAY_SECONDS } from './seed';

export const DAY_STATES = ['asleep', 'drowsy', 'quiet-wake', 'active', 'walking', 'eating', 'talking'] as const;
export type DayState = (typeof DAY_STATES)[number];

interface StateProfile {
  /** Typical segment duration range, in seconds. */
  duration: [number, number];
}

// Tuned so the day totals 300-600 segments (spec §2.2) — a ~192s average
// segment length across 86,400s.
const PROFILE: Record<DayState, StateProfile> = {
  asleep: { duration: [180, 700] },
  drowsy: { duration: [40, 150] },
  'quiet-wake': { duration: [40, 300] },
  active: { duration: [30, 200] },
  walking: { duration: [20, 120] },
  eating: { duration: [60, 250] },
  talking: { duration: [30, 200] },
};

/** Hour-of-day (0–24) weighted likelihood of each state — a loose circadian bias. */
function weightsAtHour(hour: number): Record<DayState, number> {
  const night = hour < 6 || hour >= 23;
  const earlyMorning = hour >= 6 && hour < 8;
  const evening = hour >= 21 && hour < 23;

  if (night) return { asleep: 14, drowsy: 2, 'quiet-wake': 0.5, active: 0.1, walking: 0.1, eating: 0.05, talking: 0.1 };
  if (earlyMorning) return { asleep: 1, drowsy: 5, 'quiet-wake': 3, active: 1, walking: 1.5, eating: 2, talking: 1 };
  if (evening) return { asleep: 0.5, drowsy: 3, 'quiet-wake': 3, active: 1, walking: 1, eating: 1.5, talking: 2 };
  // daytime
  return { asleep: 0.05, drowsy: 0.8, 'quiet-wake': 3, active: 3, walking: 2.5, eating: 1.2, talking: 2.5 };
}

function pickState(rng: () => number, hour: number): DayState {
  const weights = weightsAtHour(hour);
  const total = DAY_STATES.reduce((sum, s) => sum + weights[s], 0);
  let r = rng() * total;
  for (const s of DAY_STATES) {
    r -= weights[s];
    if (r <= 0) return s;
  }
  return 'quiet-wake';
}

export interface Schedule {
  /** Segment start times, seconds since midnight, ascending. */
  starts: Float64Array;
  /** Segment state, index into DAY_STATES, parallel to `starts`. */
  states: Uint8Array;
}

let cached: Schedule | null = null;

export function buildSchedule(): Schedule {
  if (cached) return cached;

  const rng = rngFor(SEED, 'schedule');
  const starts: number[] = [];
  const states: number[] = [];

  let t = 0;
  let guard = 0;
  while (t < DAY_SECONDS && guard < 10_000) {
    guard++;
    const hour = (t / 3600) % 24;
    const state = pickState(rng, hour);
    const [lo, hi] = PROFILE[state].duration;
    const dur = lo + rng() * (hi - lo);

    starts.push(t);
    states.push(DAY_STATES.indexOf(state));
    t += dur;
  }

  cached = { starts: Float64Array.from(starts), states: Uint8Array.from(states) };
  return cached;
}

/** Binary search: the state active at time t (seconds since midnight). */
export function stateAt(schedule: Schedule, t: number): DayState {
  const { starts, states } = schedule;
  let lo = 0;
  let hi = starts.length - 1;
  if (t <= starts[0]) return DAY_STATES[states[0]];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return DAY_STATES[states[lo]];
}
