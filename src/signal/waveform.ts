// The lazy, block-addressed raw-sample generator — spec §2.2. Any window
// generates in O(window) with no history, identical regardless of visit
// order: every component (EEG band sinusoids, slow envelopes, electrode
// pops, ECG beats) is a deterministic function of absolute time, built
// fresh from (SEED, channel) on every call rather than carried block to
// block — so blocks are continuous by construction and don't need an
// explicit cross-fade to avoid a seam.

import { mulberry32, hash32 } from '../core/rng';
import { SEED, SAMPLE_RATE_HZ, DAY_SECONDS, type Channel } from './seed';
import { buildSchedule, stateAt, type DayState } from './schedule';
import { buildEvents, type SignalEvent } from './events';

interface Sinusoid {
  freq: number;
  phase: number;
  amp: number;
  band: number;
}

// δ θ α β γ
const EEG_BANDS: [number, number][] = [
  [0.5, 4],
  [4, 8],
  [8, 13],
  [13, 30],
  [30, 45],
];
const ALPHA_BAND_INDEX = 2;
const COMPONENTS_PER_BAND = 12;

// Posterior alpha rises during drowsy, eyes-closed-adjacent states — a
// real, well-known EEG effect, and the plausibility check Phase 2's test
// suite looks for (spec §8 done-test 3).
const ALPHA_STATE_BOOST: Record<DayState, number> = {
  asleep: 1.3,
  drowsy: 3.2,
  'quiet-wake': 1.2,
  active: 0.45,
  walking: 0.4,
  eating: 0.7,
  talking: 0.6,
};

function buildEegComponents(channel: Channel): Sinusoid[] {
  const rng = mulberry32(hash32(SEED, 'eeg-components', channel));
  const components: Sinusoid[] = [];
  EEG_BANDS.forEach(([lo, hi], band) => {
    for (let k = 0; k < COMPONENTS_PER_BAND; k++) {
      const freq = lo + rng() * (hi - lo);
      // 1/f^1.2 power law — this is what makes it read as EEG (spec §2.2).
      components.push({ freq, phase: rng() * Math.PI * 2, amp: 1 / Math.pow(freq, 1.2), band });
    }
  });
  return components;
}

function buildSlowComponents(channel: Channel, tag: string, freqLo: number, freqHi: number, n: number): Sinusoid[] {
  const rng = mulberry32(hash32(SEED, tag, channel));
  const out: Sinusoid[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ freq: freqLo + rng() * (freqHi - freqLo), phase: rng() * Math.PI * 2, amp: 1, band: -1 });
  }
  return out;
}

function evalEnvelope(components: Sinusoid[], t: number): number {
  let sum = 0;
  for (const c of components) sum += Math.sin(2 * Math.PI * c.freq * t + c.phase);
  const norm = sum / components.length; // in [-1, 1]
  return 0.65 + 0.35 * norm; // never fully zero — always some baseline
}

function evalSum(components: Sinusoid[], t: number): number {
  let sum = 0;
  for (const c of components) sum += c.amp * Math.sin(2 * Math.PI * c.freq * t + c.phase);
  return sum;
}

/** Same as evalSum, but boosts the alpha band's contribution by `alphaBoost`. */
function evalSumWithAlphaBoost(components: Sinusoid[], t: number, alphaBoost: number): number {
  let sum = 0;
  for (const c of components) {
    const boost = c.band === ALPHA_BAND_INDEX ? alphaBoost : 1;
    sum += boost * c.amp * Math.sin(2 * Math.PI * c.freq * t + c.phase);
  }
  return sum;
}

const STATE_GAIN: Record<DayState, number> = {
  asleep: 0.55,
  drowsy: 0.75,
  'quiet-wake': 0.9,
  active: 1.15,
  walking: 1.3,
  eating: 1.1,
  talking: 1.05,
};

interface Pop {
  time: number;
  amplitude: number;
  tau: number;
}

function buildPops(channel: Channel): Pop[] {
  const rng = mulberry32(hash32(SEED, 'pops', channel));
  const n = 30 + Math.floor(rng() * 20); // 30-50 pops/day
  const pops: Pop[] = [];
  for (let i = 0; i < n; i++) {
    pops.push({
      time: rng() * DAY_SECONDS,
      amplitude: (rng() < 0.5 ? -1 : 1) * (3 + rng() * 6),
      tau: 0.2 + rng() * 0.2,
    });
  }
  return pops.sort((a, b) => a.time - b.time);
}

function evalPops(pops: Pop[], t: number): number {
  let sum = 0;
  for (const p of pops) {
    const d = t - p.time;
    if (d < -0.05 || d > 2) continue; // decays away fast, cheap early-out
    sum += d < 0 ? 0 : p.amplitude * Math.exp(-d / p.tau);
  }
  return sum;
}

const ECG_RATE_BPM: Record<DayState, number> = {
  asleep: 58,
  drowsy: 65,
  'quiet-wake': 72,
  active: 85,
  walking: 105,
  eating: 75,
  talking: 78,
};

interface BeatTable {
  times: Float64Array;
}
let cachedBeats: BeatTable | null = null;

function buildBeatTable(): BeatTable {
  if (cachedBeats) return cachedBeats;
  const rng = mulberry32(hash32(SEED, 'ecg-beats'));
  const schedule = buildSchedule();
  const times: number[] = [];
  let t = 0.4;
  while (t < DAY_SECONDS) {
    const state = stateAt(schedule, t);
    const rr = 60 / ECG_RATE_BPM[state];
    const rsa = 1 + 0.04 * Math.sin(2 * Math.PI * 0.25 * t); // ~4% respiratory sinus arrhythmia
    const jitter = 1 + (rng() - 0.5) * 0.02;
    t += rr * rsa * jitter;
    times.push(t);
  }
  cachedBeats = { times: Float64Array.from(times) };
  return cachedBeats;
}

function nearestBeatIndex(beats: Float64Array, t: number): number {
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// P, Q, R, S, T — [offset from R-peak, width, amplitude]
const ECG_WAVES: [number, number, number][] = [
  [-0.2, 0.025, 0.15],
  [-0.05, 0.008, -0.15],
  [0, 0.008, 1.0],
  [0.04, 0.012, -0.25],
  [0.3, 0.06, 0.3],
];

function ecgAt(beats: Float64Array, t: number): number {
  const idx = nearestBeatIndex(beats, t);
  let sum = 0;
  for (let bi = Math.max(0, idx - 1); bi <= Math.min(beats.length - 1, idx + 1); bi++) {
    const tRel = t - beats[bi];
    if (Math.abs(tRel) > 0.4) continue;
    for (const [off, width, amp] of ECG_WAVES) {
      const d = tRel - off;
      sum += amp * Math.exp(-(d * d) / (2 * width * width));
    }
  }
  return sum;
}

function burstEnvelope(t: number, start: number, end: number): number {
  if (t <= start || t >= end) return 0;
  const dur = end - start;
  const ramp = Math.max(dur * 0.2, 0.5);
  const tIn = t - start;
  const tOut = end - t;
  if (tIn < ramp) return 0.5 - 0.5 * Math.cos((Math.PI * tIn) / ramp);
  if (tOut < ramp) return 0.5 - 0.5 * Math.cos((Math.PI * tOut) / ramp);
  return 1;
}

/** Instantaneous frequency for a seizure's evolving sweep (held for artefacts). */
function burstFrequency(e: SignalEvent, t: number): number {
  if (e.freqStart === e.freqEnd) return e.freqStart;
  const frac = Math.min(1, Math.max(0, (t - e.start) / (e.end - e.start)));
  return e.freqStart + (e.freqEnd - e.freqStart) * frac;
}

function eventsNear(events: SignalEvent[], t0: number, t1: number): SignalEvent[] {
  // events are sorted by start; linear scan is fine at block scale (a
  // handful of events can plausibly straddle a 4s window)
  const out: SignalEvent[] = [];
  for (const e of events) {
    if (e.end < t0) continue;
    if (e.start > t1) break;
    out.push(e);
  }
  return out;
}

export function generateChannelWindow(channel: Channel, startSeconds: number, durationSeconds: number): Float32Array {
  const n = Math.round(durationSeconds * SAMPLE_RATE_HZ);
  const out = new Float32Array(n);
  const schedule = buildSchedule();

  if (channel === 'ecg') {
    const beats = buildBeatTable();
    for (let i = 0; i < n; i++) {
      const t = startSeconds + i / SAMPLE_RATE_HZ;
      out[i] = ecgAt(beats.times, t);
    }
    return out;
  }

  if (channel === 'emg') {
    const noiseRng = mulberry32(hash32(SEED, 'emg-noise', Math.floor(startSeconds)));
    const events = buildEvents();
    const relevant = eventsNear(events, startSeconds, startSeconds + durationSeconds);
    for (let i = 0; i < n; i++) {
      const t = startSeconds + i / SAMPLE_RATE_HZ;
      const state = stateAt(schedule, t);
      const gain = STATE_GAIN[state] - 0.55; // ~0 at rest, rises with activity
      let burst = 0;
      for (const e of relevant) burst += burstEnvelope(t, e.start, e.end);
      const env = Math.max(0.02, gain + burst * 0.8);
      out[i] = env * (noiseRng() * 2 - 1) * 6;
    }
    return out;
  }

  if (channel === 'acc') {
    for (let i = 0; i < n; i++) {
      const t = startSeconds + i / SAMPLE_RATE_HZ;
      const state = stateAt(schedule, t);
      let motion = 0;
      if (state === 'walking') motion = Math.sin(2 * Math.PI * 2.0 * t) + 0.3 * Math.sin(2 * Math.PI * 4.0 * t);
      else if (state === 'eating') motion = 0.3 * Math.sin(2 * Math.PI * 1.5 * t);
      else motion = 0.03 * Math.sin(2 * Math.PI * 0.1 * t);
      out[i] = 1 + motion; // 1g gravity baseline + posture/motion
    }
    return out;
  }

  // eeg1 / eeg2
  const components = buildEegComponents(channel);
  const envelopeComponents = buildSlowComponents(channel, 'envelope', 0.02, 0.1, 4);
  const wanderComponents = buildSlowComponents(channel, 'wander', 0.05, 0.5, 3);
  const pops = buildPops(channel);
  const beats = buildBeatTable();
  const events = buildEvents();
  const relevant = eventsNear(events, startSeconds, startSeconds + durationSeconds);

  for (let i = 0; i < n; i++) {
    const t = startSeconds + i / SAMPLE_RATE_HZ;
    const state = stateAt(schedule, t);
    const gain = STATE_GAIN[state];
    const envelope = evalEnvelope(envelopeComponents, t);

    let burst = 0;
    for (const e of relevant) {
      const env = burstEnvelope(t, e.start, e.end);
      if (env === 0) continue;
      const f = burstFrequency(e, t);
      // `intensity` is defined in feature.ts's units — a target line-length
      // contribution, not an amplitude. A sinusoid's average line length is
      // ≈ 4·A·f/fs (total variation per period is 4A, f periods/sec, /fs
      // samples/sec), so derive the amplitude that makes this burst's real,
      // sample-domain line length equal `intensity·env` by construction —
      // that correspondence is exactly what done-test 4 checks.
      const amplitude = (e.intensity * env) / ((4 * f) / SAMPLE_RATE_HZ);
      burst += amplitude * Math.sin(2 * Math.PI * f * t);
    }

    const mains = 0.05 * Math.sin(2 * Math.PI * 50 * t);
    const ecgBleed = 0.1 * ecgAt(beats.times, t);

    out[i] =
      gain * envelope * evalSumWithAlphaBoost(components, t, ALPHA_STATE_BOOST[state]) +
      0.3 * evalSum(wanderComponents, t) +
      evalPops(pops, t) +
      mains +
      ecgBleed +
      burst;
  }

  return out;
}

/** Real (sample-domain) line length over a window, for calibration/tests. */
export function lineLength(samples: Float32Array): number {
  let sum = 0;
  for (let i = 1; i < samples.length; i++) sum += Math.abs(samples[i] - samples[i - 1]);
  return sum / samples.length;
}
