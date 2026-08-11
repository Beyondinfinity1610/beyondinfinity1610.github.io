// Movement 03 — the playable instrument (spec §2). Lazily mounted into
// #instrument-mount, self-contained: owns its own canvas, DOM controls and
// frame loop (still driven by the single shared ticker — see main.ts).

import { buildRoc, findAlarmOnsets, isNearAnySeizure } from '../../signal/roc';
import { createInitialState, WINDOW_OPTIONS, type InstrumentState } from './state';
import { computeLaneLayouts, drawLanes, LANES, type Lane, type LaneLayout } from './draw-trace';
import { wireControls, buildAutopilotStops, advanceAutopilot, type ControlsHandle } from './controls';
import { formatValueText, computeReadouts } from './readouts';
import { drawRocInset } from './roc-inset';
import { createRevealController, type RevealController } from './reveal';
import { playOneShot } from '../../audio/audio';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export class InstrumentInstance {
  readonly state: InstrumentState;
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rangeInput: HTMLInputElement;
  private valueTextEl: HTMLElement;
  private readoutFa: HTMLElement;
  private readoutCaught: HTMLElement;
  private readoutSens: HTMLElement;
  private rocCanvas: HTMLCanvasElement;
  private rocCtx: CanvasRenderingContext2D;
  private controls: ControlsHandle;
  private reveal: RevealController;
  private autopilotStops: number[];
  private autopilotElapsed = { t: 0 };
  private dpr = 1;
  // "A soft blip per false alarm" (spec §8 Phase 10) — cached per current
  // threshold (recomputed only when it changes, same O(day) cost the ROC
  // table itself already pays once at init) so frame() can cheaply notice
  // when the playhead (dayPositionS, which only autopilot advances) has
  // just crossed a false-alarm onset.
  private onsetCache: { threshold: number; onsets: number[] } | null = null;
  private lastDayPositionS: number;
  private labelGutter = 34;
  private colors: { bone: string; body: string; faint: string; phosphor: string; phosphorHi: string; alarm: string };

  constructor(mountEl: HTMLElement) {
    this.state = createInitialState(buildRoc());
    this.lastDayPositionS = this.state.dayPositionS;
    this.colors = {
      bone: cssVar('--bone', '#e9ede7'),
      body: cssVar('--body', '#aab3a8'),
      faint: cssVar('--faint', '#7d857c'),
      phosphor: cssVar('--phosphor', '#5fae7a'),
      phosphorHi: cssVar('--phosphor-hi', '#a8dfba'),
      alarm: cssVar('--alarm', '#d1533f'),
    };

    this.root = mountEl;
    this.root.innerHTML = '';
    this.root.classList.add('instrument-live');

    const { canvas, ctx, rangeInput, valueTextEl, readoutFa, readoutCaught, readoutSens, windowButtons, autopilotButton, rocCanvas, rocCtx } =
      buildDom(this.root);
    this.canvas = canvas;
    this.ctx = ctx;
    this.rangeInput = rangeInput;
    this.valueTextEl = valueTextEl;
    this.readoutFa = readoutFa;
    this.readoutCaught = readoutCaught;
    this.readoutSens = readoutSens;
    this.rocCanvas = rocCanvas;
    this.rocCtx = rocCtx;

    this.autopilotStops = buildAutopilotStops(this.state);

    this.reveal = createRevealController(() => {
      this.root.classList.add('instrument-revealed');
      this.renderRocInset();
    });

    this.controls = wireControls(
      this.canvas,
      this.rangeInput,
      windowButtons,
      autopilotButton,
      this.state,
      () => this.laneLayouts().detector,
      () => this.renderAll(),
      () => this.reveal.markInteraction(),
      () => void playOneShot('relay-click', { gain: 0.5 })
    );

    this.fit();
    this.renderAll();
  }

  private laneLayouts(): Record<Lane, LaneLayout> {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    return computeLaneLayouts(w, h, this.labelGutter);
  }

  fit(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const rocRect = this.rocCanvas.getBoundingClientRect();
    this.rocCanvas.width = Math.round(rocRect.width * this.dpr);
    this.rocCanvas.height = Math.round(rocRect.height * this.dpr);
    this.rocCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.renderAll();
  }

  frame(dtSeconds: number): void {
    if (this.state.autopilot) {
      advanceAutopilot(this.state, this.autopilotStops, dtSeconds, this.autopilotElapsed);
      this.renderAll();
      this.checkFalseAlarmCrossing();
    }
  }

  /** "A soft blip per false alarm" (spec §8 Phase 10) — fires when the
   *  playhead has just swept past an alarm onset, at the CURRENT
   *  threshold, that isn't near any real seizure. Onsets use the exact
   *  same definition roc.ts's own table sweep uses (spec §2.3's scoring
   *  rule), so this can never disagree with the readouts about what
   *  counts as a false alarm. */
  private checkFalseAlarmCrossing(): void {
    const { thresholdZ, dayPositionS, table } = this.state;
    if (!this.onsetCache || this.onsetCache.threshold !== thresholdZ) {
      this.onsetCache = { threshold: thresholdZ, onsets: findAlarmOnsets(table.z, thresholdZ) };
    }
    const lo = Math.min(this.lastDayPositionS, dayPositionS);
    const hi = Math.max(this.lastDayPositionS, dayPositionS);
    const crossed = this.onsetCache.onsets.some((o) => o > lo && o <= hi && !isNearAnySeizure(o, table.seizures));
    if (crossed) void playOneShot('blip', { gain: 0.45 });
    this.lastDayPositionS = dayPositionS;
  }

  private renderAll(): void {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, w, h);

    const layouts = this.laneLayouts();
    drawLanes(this.ctx, this.state, layouts, {
      trace: this.colors.bone,
      detector: this.colors.phosphor,
      ruleActive: this.colors.phosphorHi,
    });

    this.drawLaneLabels(layouts);
    this.drawWatermark(w, h);
    this.updateReadouts();

    if (this.reveal.isRevealed()) this.renderRocInset();
  }

  private drawLaneLabels(layouts: Record<Lane, LaneLayout>): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.colors.faint;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    const labels: Record<Lane, string> = { eeg: 'EEG', ecg: 'ECG', emg: 'EMG', acc: 'ACC', detector: 'Σ' };
    for (const lane of LANES) {
      const l = layouts[lane];
      ctx.fillText(labels[lane], 2, l.y0 + l.height / 2);
    }
    ctx.restore();
  }

  /** An on-canvas SYNTHETIC watermark, low alpha — spec §2.5 item 4:
   *  screenshots get cropped and shared out of context. */
  private drawWatermark(w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = this.colors.bone;
    ctx.font = `${Math.max(18, Math.min(w, h) * 0.08)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-0.35);
    ctx.fillText('SYNTHETIC', 0, 0);
    ctx.restore();
  }

  private renderRocInset(): void {
    const w = this.rocCanvas.width / this.dpr;
    const h = this.rocCanvas.height / this.dpr;
    this.rocCtx.clearRect(0, 0, w, h);
    const pad = 24;
    drawRocInset(
      this.rocCtx,
      this.state,
      { x: pad, y: pad, width: w - pad * 2, height: h - pad * 1.8 },
      { bone: this.colors.bone, phosphor: this.colors.phosphor, phosphorHi: this.colors.phosphorHi, faint: this.colors.faint }
    );
  }

  private updateReadouts(): void {
    const r = computeReadouts(this.state);
    this.rangeInput.setAttribute('aria-valuetext', formatValueText(this.state));
    this.valueTextEl.textContent = r.thresholdLabel;
    this.readoutFa.textContent = String(r.faPerDay);
    this.readoutCaught.textContent = `${r.caught} / ${r.totalEvents}`;
    this.readoutSens.textContent = `${Math.round(r.sensitivity * 100)}%`;
  }

  /** Test-only: set the threshold directly and re-render synchronously.
   *  Counts as a real interaction — moving the threshold by any means is
   *  what "interaction" means for the reveal (spec §8 Phase 4c). */
  setThresholdForTest(z: number): void {
    this.state.thresholdZ = z;
    this.rangeInput.value = String(z);
    this.renderAll();
    this.reveal.markInteraction();
  }

  isRevealed(): boolean {
    return this.reveal.isRevealed();
  }

  getTestState() {
    const r = computeReadouts(this.state);
    return {
      thresholdZ: this.state.thresholdZ,
      windowSeconds: this.state.windowSeconds,
      faPerDay: r.faPerDay,
      caught: r.caught,
      totalEvents: r.totalEvents,
      sensitivity: r.sensitivity,
      revealed: this.reveal.isRevealed(),
    };
  }

  destroy(): void {
    this.controls.destroy();
    this.reveal.dispose();
  }
}

interface DomRefs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  rangeInput: HTMLInputElement;
  valueTextEl: HTMLElement;
  readoutFa: HTMLElement;
  readoutCaught: HTMLElement;
  readoutSens: HTMLElement;
  windowButtons: HTMLButtonElement[];
  autopilotButton: HTMLButtonElement;
  rocCanvas: HTMLCanvasElement;
  rocCtx: CanvasRenderingContext2D;
}

function buildDom(root: HTMLElement): DomRefs {
  root.innerHTML = `
    <div class="instrument-transport">
      <div class="instrument-windowlen" role="group" aria-label="window length">
        ${WINDOW_OPTIONS.map(
          (w) =>
            `<button type="button" data-window-seconds="${w}" aria-pressed="${w === 60}">${w < 60 ? `${w}s` : w === 60 ? '60s' : '5min'}</button>`
        ).join('')}
      </div>
      <button type="button" class="instrument-autopilot" aria-pressed="false">autopilot</button>
    </div>
    <canvas class="instrument-canvas" aria-hidden="true"></canvas>
    <div class="instrument-readouts tnum" aria-hidden="true">
      <span><b class="ir-threshold"></b> σ</span>
      <span><b class="ir-fa"></b> false alarms / day</span>
      <span><b class="ir-caught"></b> caught</span>
      <span><b class="ir-sens"></b> sensitivity</span>
    </div>
    <label class="instrument-range-label" for="instrument-threshold">detection threshold</label>
    <input type="range" id="instrument-threshold" class="instrument-range" />
    <canvas class="instrument-roc-inset" aria-hidden="true"></canvas>
  `;

  const canvas = root.querySelector('.instrument-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const rangeInput = root.querySelector('.instrument-range') as HTMLInputElement;
  const readoutFa = root.querySelector('.ir-fa') as HTMLElement;
  const readoutCaught = root.querySelector('.ir-caught') as HTMLElement;
  const readoutSens = root.querySelector('.ir-sens') as HTMLElement;
  const valueTextEl = root.querySelector('.ir-threshold') as HTMLElement;
  const windowButtons = Array.from(root.querySelectorAll('.instrument-windowlen button')) as HTMLButtonElement[];
  const autopilotButton = root.querySelector('.instrument-autopilot') as HTMLButtonElement;
  const rocCanvas = root.querySelector('.instrument-roc-inset') as HTMLCanvasElement;
  const rocCtx = rocCanvas.getContext('2d')!;

  return { canvas, ctx, rangeInput, valueTextEl, readoutFa, readoutCaught, readoutSens, windowButtons, autopilotButton, rocCanvas, rocCtx };
}

export function mountInstrument(mountEl: HTMLElement): InstrumentInstance {
  return new InstrumentInstance(mountEl);
}
