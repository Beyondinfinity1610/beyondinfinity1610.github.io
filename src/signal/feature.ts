// The closed-form 4Hz feature stream — spec §2.3's key move. This is what
// the detector actually runs on: score(t) = baselineEnvelope(t) +
// Σ contribution(t), O(1) per sample, the whole day computed in
// milliseconds as a single Float32Array. The drawn waveform's amplitude
// envelope (Phase 3+) derives from the same events/schedule, so they agree
// by construction — that's done-test #4.

import { mulberry32, hash32 } from '../core/rng';
import { SEED, FEATURE_RATE_HZ, FEATURE_SAMPLES_PER_DAY } from './seed';
import { buildSchedule, stateAt, type DayState } from './schedule';
import { buildEvents, type SignalEvent } from './events';

// Ambient line-length baseline per state — quiet during sleep, higher
// wherever the body is doing something (spec: EMG/ACC "bursting on
// chew/talk/walk", baseline wander, mains bleed all read as line-length).
// Calibrated against waveform.ts's actual measured real (sample-domain)
// line length per state (tests/_calibrate.unit.spec.ts) — the wander,
// pops and mains terms are NOT state-gain-scaled, so they form a floor
// that keeps real line length much flatter across states than the EEG
// band's own state gain alone would suggest. These numbers are the
// measured means, not a hand-derived guess.
const STATE_BASELINE: Record<DayState, number> = {
  asleep: 0.0777,
  drowsy: 0.124,
  'quiet-wake': 0.1021,
  active: 0.113,
  walking: 0.1202,
  eating: 0.1103,
  talking: 0.1048,
};
const STATE_NOISE: Record<DayState, number> = {
  asleep: 0.012,
  drowsy: 0.018,
  'quiet-wake': 0.015,
  active: 0.016,
  walking: 0.018,
  eating: 0.016,
  talking: 0.015,
};

function raisedCosineEnvelope(t: number, start: number, end: number): number {
  if (t <= start || t >= end) return 0;
  const dur = end - start;
  const ramp = Math.max(dur * 0.2, 0.5);
  const tIn = t - start;
  const tOut = end - t;
  if (tIn < ramp) return 0.5 - 0.5 * Math.cos((Math.PI * tIn) / ramp);
  if (tOut < ramp) return 0.5 - 0.5 * Math.cos((Math.PI * tOut) / ramp);
  return 1;
}

let cachedScore: Float32Array | null = null;

export function buildFeatureStream(): Float32Array {
  if (cachedScore) return cachedScore;

  const schedule = buildSchedule();
  const events = buildEvents();
  const out = new Float32Array(FEATURE_SAMPLES_PER_DAY);
  const rng = mulberry32(hash32(SEED, 'feature-noise'));

  let eventCursor = 0;
  const active: SignalEvent[] = [];

  for (let i = 0; i < FEATURE_SAMPLES_PER_DAY; i++) {
    const t = i / FEATURE_RATE_HZ;

    while (eventCursor < events.length && events[eventCursor].start <= t) {
      active.push(events[eventCursor]);
      eventCursor++;
    }
    for (let k = active.length - 1; k >= 0; k--) {
      if (active[k].end < t) active.splice(k, 1);
    }

    const state = stateAt(schedule, t);
    // sum of three uniforms → cheap approx-Gaussian, zero mean, bounded
    const noise = (rng() + rng() + rng() - 1.5) / 1.5;

    let contribution = 0;
    for (const e of active) contribution += e.intensity * raisedCosineEnvelope(t, e.start, e.end);

    out[i] = Math.max(0, STATE_BASELINE[state] + STATE_NOISE[state] * noise + contribution);
  }

  cachedScore = out;
  return out;
}

export function scoreAt(stream: Float32Array, t: number): number {
  const i = Math.min(stream.length - 1, Math.max(0, Math.round(t * FEATURE_RATE_HZ)));
  return stream[i];
}

/** Mean score over [start, end) — the window-averaged counterpart to a
 *  single-instant scoreAt(), for comparing against a real sample-domain
 *  line length computed over the same window. */
export function meanScoreOver(stream: Float32Array, start: number, end: number): number {
  const i0 = Math.max(0, Math.floor(start * FEATURE_RATE_HZ));
  const i1 = Math.min(stream.length - 1, Math.ceil(end * FEATURE_RATE_HZ));
  let sum = 0;
  let n = 0;
  for (let i = i0; i <= i1; i++) {
    sum += stream[i];
    n++;
  }
  return n > 0 ? sum / n : 0;
}
