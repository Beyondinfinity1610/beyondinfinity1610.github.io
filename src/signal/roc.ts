// Sweeps 200 thresholds at init into a lookup table; drag is then O(1) —
// spec §2.3. Also the home of the guaranteed-failure invariant: the
// third-strongest artefact of the day out-scores the strongest seizure,
// asserted here over the full table (tests/signal.spec.ts), never faked
// in the UI.
//
// Scoring: alarms are maximal runs above θ merged under a 10s refractory,
// one per onset; an event is caught if an onset lands in
// [start−30s, end+30s]; FA/day counts unmatched alarms over the full 24h;
// sensitivity is caught/7.

import { FEATURE_RATE_HZ } from './seed';
import { buildFeatureStream } from './feature';
import { computeZScore } from './detector';
import { buildEvents, type SignalEvent } from './events';

const REFRACTORY_SECONDS = 10;
const MATCH_WINDOW_SECONDS = 30;
const N_THRESHOLDS = 200;

export interface RocPoint {
  threshold: number;
  faPerDay: number;
  sensitivity: number;
  caught: number;
}

export interface RocTable {
  points: RocPoint[];
  z: Float32Array;
  events: SignalEvent[];
  seizures: SignalEvent[];
  artefacts: SignalEvent[];
  truePeakScores: number[];
  sortedArtefactPeaks: number[]; // descending
}

let cached: RocTable | null = null;

function peakScoreOver(z: Float32Array, start: number, end: number): number {
  const i0 = Math.max(0, Math.floor(start * FEATURE_RATE_HZ));
  const i1 = Math.min(z.length - 1, Math.ceil(end * FEATURE_RATE_HZ));
  let peak = -Infinity;
  for (let i = i0; i <= i1; i++) if (z[i] > peak) peak = z[i];
  return peak;
}

// Exported for src/pieces/instrument/piece.ts — spec §8 Phase 10's "a soft
// blip per false alarm" needs the same real-time definition of "alarm
// onset" the ROC table itself uses, not an approximation, so the sound and
// the readouts can never disagree about what counts as a false alarm.
export function findAlarmOnsets(z: Float32Array, threshold: number): number[] {
  const onsets: number[] = [];
  let inRun = false;
  let lastOnsetTime = -Infinity;

  for (let i = 0; i < z.length; i++) {
    if (z[i] >= threshold) {
      if (!inRun) {
        const t = i / FEATURE_RATE_HZ;
        if (t - lastOnsetTime >= REFRACTORY_SECONDS) {
          onsets.push(t);
          lastOnsetTime = t;
        }
        inRun = true;
      }
    } else {
      inRun = false;
    }
  }
  return onsets;
}

// Exported alongside findAlarmOnsets above, same reason.
export function isNearAnySeizure(onset: number, seizures: SignalEvent[]): boolean {
  return seizures.some((s) => onset >= s.start - MATCH_WINDOW_SECONDS && onset <= s.end + MATCH_WINDOW_SECONDS);
}

export function buildRoc(): RocTable {
  if (cached) return cached;

  const score = buildFeatureStream();
  const z = computeZScore(score);
  const events = buildEvents();
  const seizures = events.filter((e) => e.kind === 'seizure');
  const artefacts = events.filter((e) => e.kind === 'artefact');

  const truePeakScores = seizures.map((e) => peakScoreOver(z, e.start, e.end));
  const sortedArtefactPeaks = artefacts.map((e) => peakScoreOver(z, e.start, e.end)).sort((a, b) => b - a);

  // The z-distribution is heavily right-skewed: even at the *median*
  // threshold, FA/day is already in the thousands (roughly half of a
  // quiet baseline sits above its own median, and with only a 10s
  // refractory that alone alarms constantly). Empirically, FA/day doesn't
  // drop into a clinically-legible range until somewhere past p95 — a
  // linear or median-anchored sweep wastes nearly every point on a flat,
  // uninteresting "catches everything, drowns in noise" plateau. Anchor
  // the sweep at a high percentile floor and ease strongly toward p100,
  // so resolution concentrates exactly where the curve actually bends —
  // which is also where the guaranteed-failure invariant lives.
  const sortedZ = Float32Array.from(z).sort();
  const floorPct = 0.85;
  const thresholdAt = (k: number): number => {
    const frac = k / (N_THRESHOLDS - 1);
    const eased = 1 - Math.pow(1 - frac, 4); // concentrate density near frac=1
    const pct = floorPct + (1 - floorPct) * eased;
    const idx = Math.min(sortedZ.length - 1, Math.floor(pct * (sortedZ.length - 1)));
    return sortedZ[idx];
  };

  const points: RocPoint[] = [];
  for (let k = 0; k < N_THRESHOLDS; k++) {
    const threshold = thresholdAt(k);
    const onsets = findAlarmOnsets(z, threshold);

    let caught = 0;
    for (const s of seizures) {
      if (onsets.some((onset) => onset >= s.start - MATCH_WINDOW_SECONDS && onset <= s.end + MATCH_WINDOW_SECONDS)) caught++;
    }

    let unmatched = 0;
    for (const onset of onsets) {
      if (!isNearAnySeizure(onset, seizures)) unmatched++;
    }

    points.push({ threshold, faPerDay: unmatched, sensitivity: caught / seizures.length, caught });
  }

  cached = { points, z, events, seizures, artefacts, truePeakScores, sortedArtefactPeaks };
  return cached;
}

/**
 * O(log n) lookup: nearest of the 200 precomputed points to a given
 * threshold. Binary search, not linear interpolation — thresholds are
 * percentile-spaced (spec's ROC sweep is denser where the z-distribution's
 * mass actually is), not uniform, so an index computed by interpolating
 * between the first/last threshold would land on the wrong point.
 */
export function rocAt(table: RocTable, threshold: number): RocPoint {
  const { points } = table;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].threshold < threshold) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(points[lo - 1].threshold - threshold) < Math.abs(points[lo].threshold - threshold)) {
    return points[lo - 1];
  }
  return points[lo];
}

export function resetRocCacheForTests(): void {
  cached = null;
}
