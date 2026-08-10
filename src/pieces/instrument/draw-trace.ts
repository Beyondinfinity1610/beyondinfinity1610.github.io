// Multi-lane rendering — spec §2.7's min/max envelope decimation: per
// device-pixel column, emit exactly two vertices (column min and max).
// Five lanes (EEG, ECG, EMG, ACC, detector) ≈ 14k vertices at any zoom,
// under 2ms. One Path2D per lane, one stroke().

import { generateChannelWindow } from '../../signal/waveform';
import { SAMPLE_RATE_HZ, FEATURE_RATE_HZ } from '../../signal/seed';
import type { InstrumentState } from './state';

export const LANES = ['eeg', 'ecg', 'emg', 'acc', 'detector'] as const;
export type Lane = (typeof LANES)[number];

interface RawCache {
  dayPositionS: number;
  windowSeconds: number;
  samples: Record<Exclude<Lane, 'detector'>, Float32Array>;
}

let rawCache: RawCache | null = null;

function windowStart(state: InstrumentState): number {
  return state.dayPositionS - state.windowSeconds / 2;
}

function ensureRawData(state: InstrumentState): RawCache {
  if (rawCache && rawCache.dayPositionS === state.dayPositionS && rawCache.windowSeconds === state.windowSeconds) {
    return rawCache;
  }
  const start = Math.max(0, windowStart(state));
  const dur = state.windowSeconds;
  rawCache = {
    dayPositionS: state.dayPositionS,
    windowSeconds: state.windowSeconds,
    samples: {
      eeg: generateChannelWindow('eeg1', start, dur),
      ecg: generateChannelWindow('ecg', start, dur),
      emg: generateChannelWindow('emg', start, dur),
      acc: generateChannelWindow('acc', start, dur),
    },
  };
  return rawCache;
}

// Exported for reuse — audit/piece.ts (movement 05) draws the same
// instrument visual scrubbing backward and reuses this exact decimation
// technique rather than reinventing it (spec §2.7).
export function minMaxEnvelopePath(
  samples: Float32Array,
  cols: number,
  x0: number,
  y0: number,
  laneHeight: number,
  gMin: number,
  gMax: number
): Path2D {
  const path = new Path2D();
  const span = gMax - gMin || 1;
  const samplesPerCol = samples.length / cols;
  for (let c = 0; c < cols; c++) {
    const s0 = Math.floor(c * samplesPerCol);
    const s1 = Math.max(s0 + 1, Math.floor((c + 1) * samplesPerCol));
    let colMin = Infinity;
    let colMax = -Infinity;
    for (let i = s0; i < s1 && i < samples.length; i++) {
      const v = samples[i];
      if (v < colMin) colMin = v;
      if (v > colMax) colMax = v;
    }
    if (colMin === Infinity) continue;
    const x = x0 + c;
    const yTop = y0 + laneHeight - ((colMax - gMin) / span) * laneHeight;
    const yBot = y0 + laneHeight - ((colMin - gMin) / span) * laneHeight;
    path.moveTo(x, yTop);
    path.lineTo(x, Math.max(yTop + 1, yBot));
  }
  return path;
}

export interface LaneLayout {
  x0: number;
  width: number;
  y0: number;
  height: number;
}

export function computeLaneLayouts(canvasWidth: number, canvasHeight: number, labelGutter: number): Record<Lane, LaneLayout> {
  const x0 = labelGutter;
  const width = Math.max(1, canvasWidth - labelGutter);
  const gap = canvasHeight * 0.015;
  const laneHeight = (canvasHeight - gap * (LANES.length - 1)) / LANES.length;
  const out = {} as Record<Lane, LaneLayout>;
  LANES.forEach((lane, i) => {
    out[lane] = { x0, width, y0: i * (laneHeight + gap), height: laneHeight };
  });
  return out;
}

export function drawLanes(
  ctx: CanvasRenderingContext2D,
  state: InstrumentState,
  layouts: Record<Lane, LaneLayout>,
  colors: { trace: string; detector: string; ruleActive: string }
): void {
  const raw = ensureRawData(state);

  for (const lane of LANES) {
    const layout = layouts[lane];
    const cols = Math.max(1, Math.floor(layout.width));

    if (lane === 'detector') {
      const start = Math.max(0, windowStart(state));
      const i0 = Math.floor(start * FEATURE_RATE_HZ);
      const i1 = Math.min(state.table.z.length, i0 + Math.ceil(state.windowSeconds * FEATURE_RATE_HZ));
      const slice = state.table.z.subarray(i0, i1);
      const zMin = state.table.points[0].threshold;
      const zMax = state.table.points[state.table.points.length - 1].threshold;
      const path = minMaxEnvelopePath(slice, cols, layout.x0, layout.y0, layout.height, zMin, zMax);
      ctx.strokeStyle = colors.detector;
      ctx.lineWidth = 1;
      ctx.stroke(path);

      // The dashed threshold rule — pixel-snapped so a 1px-wide stroke
      // lands on exactly one device-pixel row instead of anti-aliasing
      // across two (the classic canvas hairline trick: a 1-unit-wide
      // stroke centred on an integer+0.5 coordinate). Spec §8 Phase 4a's
      // done-test reads this back at DPR 1.
      const span = zMax - zMin || 1;
      const rawRuleY = layout.y0 + layout.height - ((state.thresholdZ - zMin) / span) * layout.height;
      const ruleY = Math.floor(rawRuleY) + 0.5;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = colors.ruleActive;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(layout.x0, ruleY);
      ctx.lineTo(layout.x0 + layout.width, ruleY);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const samples = raw.samples[lane];
    let gMin = Infinity;
    let gMax = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < gMin) gMin = samples[i];
      if (samples[i] > gMax) gMax = samples[i];
    }
    const path = minMaxEnvelopePath(samples, cols, layout.x0, layout.y0, layout.height, gMin, gMax);
    ctx.strokeStyle = colors.trace;
    ctx.lineWidth = 1;
    ctx.stroke(path);
  }
}

export function invalidateRawCache(): void {
  rawCache = null;
}

export { SAMPLE_RATE_HZ };
