// Esteller et al., 2001: smoothed line length, z-scored against a running
// baseline — spec §2.3. The visitor's threshold drives this statistic and
// nothing else. Causal (past-only) 5-minute trailing window, O(1)
// amortised per sample via a running sum / sum-of-squares.

import { FEATURE_RATE_HZ } from './seed';

export const BASELINE_WINDOW_SECONDS = 5 * 60;
export const BASELINE_WINDOW_SAMPLES = BASELINE_WINDOW_SECONDS * FEATURE_RATE_HZ; // 1200

export function computeZScore(score: Float32Array): Float32Array {
  const n = score.length;
  const z = new Float32Array(n);
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < n; i++) {
    const v = score[i];
    sum += v;
    sumSq += v * v;

    if (i >= BASELINE_WINDOW_SAMPLES) {
      const old = score[i - BASELINE_WINDOW_SAMPLES];
      sum -= old;
      sumSq -= old * old;
    }

    const windowSize = Math.min(i + 1, BASELINE_WINDOW_SAMPLES);
    const mean = sum / windowSize;
    const variance = Math.max(sumSq / windowSize - mean * mean, 1e-6);
    z[i] = (v - mean) / Math.sqrt(variance);
  }

  return z;
}
