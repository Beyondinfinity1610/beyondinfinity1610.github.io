// Input and transport — spec §2.6.
// - Drag the rule: Pointer Events, setPointerCapture, grab anywhere on the
//   canvas. On coarse pointers, canvas dragging is disabled entirely —
//   touch-action:none full-width would eat vertical page scroll.
// - A real <input type="range">, styled as a calibrated track but never
//   hidden — the keyboard/AT interface. Arrows ±0.05σ, PageUp/Down ±0.5σ,
//   Home/End to the range extremes (native <input type=range> behaviour).
// - No wheel handler. Window length is three buttons: 15s / 60s / 5min.
// - Autopilot: every true event plus the 8 strongest artefacts, ~8s dwell
//   each, a fast sprint between stops. Whole day in ~2 minutes.

import type { InstrumentState, WindowSeconds } from './state';
import { invalidateRawCache, type Lane, type LaneLayout } from './draw-trace';

const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

// "A relay click on threshold detents" — spec §8 Phase 10. There's no
// pre-existing notion of a discrete "detent" anywhere in the threshold
// model (it's a continuous z-score); this defines one purely for the
// audio feedback, splitting the drag range into a fixed number of evenly
// spaced clicks, the way a real calibrated dial has felt stops regardless
// of the underlying continuous quantity it's measuring.
const DETENT_COUNT = 24;

export interface ControlsHandle {
  destroy(): void;
}

export function wireControls(
  canvas: HTMLCanvasElement,
  rangeInput: HTMLInputElement,
  windowButtons: HTMLButtonElement[],
  autopilotButton: HTMLButtonElement | null,
  state: InstrumentState,
  getDetectorLayout: () => LaneLayout,
  onChange: () => void,
  onInteraction: () => void,
  onDetent?: () => void
): ControlsHandle {
  const zMin = state.table.points[0].threshold;
  const zMax = state.table.points[state.table.points.length - 1].threshold;
  const detentWidth = (zMax - zMin) / DETENT_COUNT || 1;

  rangeInput.min = String(zMin);
  rangeInput.max = String(zMax);
  rangeInput.step = '0.01';
  rangeInput.value = String(state.thresholdZ);

  let lastDetent = Math.floor((state.thresholdZ - zMin) / detentWidth);

  function setThreshold(z: number, fromInteraction: boolean): void {
    state.thresholdZ = Math.min(zMax, Math.max(zMin, z));
    rangeInput.value = String(state.thresholdZ);
    onChange();
    if (fromInteraction) onInteraction();
    if (fromInteraction && onDetent) {
      const detent = Math.floor((state.thresholdZ - zMin) / detentWidth);
      if (detent !== lastDetent) {
        lastDetent = detent;
        onDetent();
      }
    }
  }

  function handleRangeInput(): void {
    setThreshold(parseFloat(rangeInput.value), true);
  }
  rangeInput.addEventListener('input', handleRangeInput);

  // --- canvas drag (fine pointers only) ---
  let dragging = false;
  function yToThreshold(clientY: number): number {
    const rect = canvas.getBoundingClientRect();
    const layout = getDetectorLayout();
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
    const localY = (clientY - rect.top) * scaleY;
    const frac = 1 - (localY - layout.y0) / layout.height;
    return zMin + frac * (zMax - zMin);
  }

  function onPointerDown(e: PointerEvent): void {
    if (isCoarsePointer()) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    setThreshold(yToThreshold(e.clientY), true);
  }
  function onPointerMove(e: PointerEvent): void {
    if (!dragging) return;
    setThreshold(yToThreshold(e.clientY), true);
  }
  function onPointerUp(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(e.pointerId);
  }

  if (!isCoarsePointer()) {
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  }

  // --- window-length buttons ---
  function selectWindow(w: WindowSeconds): void {
    state.windowSeconds = w;
    invalidateRawCache();
    windowButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(Number(btn.dataset.windowSeconds) === w)));
    onChange();
    onInteraction();
  }
  const windowHandlers = windowButtons.map((btn) => {
    const w = Number(btn.dataset.windowSeconds) as WindowSeconds;
    const handler = () => selectWindow(w);
    btn.addEventListener('click', handler);
    return { btn, handler };
  });

  // --- autopilot ---
  function toggleAutopilot(): void {
    state.autopilot = !state.autopilot;
    autopilotButton?.setAttribute('aria-pressed', String(state.autopilot));
    onInteraction();
  }
  autopilotButton?.addEventListener('click', toggleAutopilot);

  return {
    destroy() {
      rangeInput.removeEventListener('input', handleRangeInput);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      windowHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
      autopilotButton?.removeEventListener('click', toggleAutopilot);
    },
  };
}

// Exported for the frame loop to advance dayPositionS during autopilot.
export function buildAutopilotStops(state: InstrumentState): number[] {
  const { table } = state;
  const seizureMids = table.seizures.map((e) => (e.start + e.end) / 2);
  const strongestArtefacts = [...table.artefacts]
    .map((e, i) => ({ e, peak: table.sortedArtefactPeaks[i] ?? -Infinity, mid: (e.start + e.end) / 2 }))
    .sort((a, b) => b.peak - a.peak)
    .slice(0, 8)
    .map((x) => x.mid);
  return [...seizureMids, ...strongestArtefacts].sort((a, b) => a - b);
}

const DWELL_S = 8;
const SPRINT_S = 2;

export function advanceAutopilot(state: InstrumentState, stops: number[], dtSeconds: number, elapsedRef: { t: number }): void {
  if (stops.length === 0) return;
  const cycle = DWELL_S + SPRINT_S;
  elapsedRef.t += dtSeconds;
  const totalCycle = cycle * stops.length;
  const tInCycle = elapsedRef.t % totalCycle;
  const stopIndex = Math.floor(tInCycle / cycle);
  const tInStop = tInCycle % cycle;
  const from = stops[stopIndex];
  const to = stops[(stopIndex + 1) % stops.length];

  if (tInStop < DWELL_S) {
    state.dayPositionS = from;
  } else {
    const sprintT = (tInStop - DWELL_S) / SPRINT_S;
    state.dayPositionS = from + (to - from) * sprintT;
  }
}

export type { Lane };
