// Movement 05 — the audit (spec §3.3). Canvas 2D on the shared #world
// surface — same Director/BasePiece pattern as trace-piece.ts and the 2D
// debug pieces, NOT the WebGL pipeline. Lazily loaded in the same chunk
// as the instrument (spec §6.1's budget table groups "signal generator,
// instrument, audit" under one ≤22KB lazy chunk; vite.config.ts forces
// this directory into that same manual chunk).
//
// Scroll forward through the section and the SAME instrument visual
// scrubs backward through the recording: a de-derivation. A mono
// transport counts down, a state chip reads REWIND, and the derived
// layers — decisions, then alarms, then scores — peel off in that order
// until only the raw multi-channel trace remains and the last word on
// screen is "raw". Once the reversal completes, a short wall-clock
// (not scroll-linked) settle plays and the state chip reads SETTLED —
// "re-derives forward, fast, and settles on a quieter score expressed
// without a single number" (spec §3.3 item 3).
//
// Reuses signal/'s real generators — the same recording the instrument
// plays (spec §3.1's "one generator serves movements 01, 02, 03, 05") —
// and draw-trace.ts's min/max envelope decimation technique (spec §2.7)
// rather than reinventing waveform rendering.

import { BasePiece } from '../piece';
import type { Director } from '../director';
import { startLoop, stopLoop } from '../../audio/audio';
import { buildFeatureStream } from '../../signal/feature';
import { computeZScore } from '../../signal/detector';
import { buildEvents, type SignalEvent } from '../../signal/events';
import { generateChannelWindow } from '../../signal/waveform';
import { FEATURE_RATE_HZ } from '../../signal/seed';
import { minMaxEnvelopePath } from '../instrument/draw-trace';
import {
  AUDIT_STATE_REWIND,
  AUDIT_STATE_DERIVE,
  AUDIT_STATE_SETTLED,
  AUDIT_LAYER_LABELS,
  AUDIT_RAW_LABEL,
  AUDIT_INTENT_LINE,
  AUDIT_SETTLED_LABEL,
  AUDIT_TRANSPORT_PREFIX,
  AUDIT_DAYBAR_LABEL,
  type AuditLayer,
} from '../../content/strings';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// One threshold per entry in AUDIT_LAYER_LABELS (spec §8 Phase 7's
// done-test: at p = 0/0.33/0.66/1.0 the stack has lost exactly one layer
// per third). Three checkpoints after p=0 means exactly three removable
// layers, spaced comfortably inside each third so damped-follow settling
// error never straddles a checkpoint.
const LAYER_THRESHOLDS: readonly number[] = [0.3, 0.6, 0.9];
const FADE_SPAN = 0.06; // p-units over which a removed layer's trace fades out

const WINDOW_SECONDS = 100;
const TOTAL_SCRUB_SECONDS = 2 * 3600 + 41 * 60 + 18; // spec §3.3's own example: t −02:41:18
const SETTLE_TRIGGER_P = 0.97;
const SETTLE_DURATION_S = 0.7;
const FOLLOW_RATE = 8; // spec §5.2 — the same rate BasePiece uses

// "A tape whirr for 05" (spec §8 Phase 10) — a looping bed while the
// REWIND state is showing (the scrub is actually running), silent once it
// settles. One key per instance would be pointless (only one AuditPiece
// ever exists), so a fixed string key into audio.ts's loop registry is
// fine — mirrors how the DOM HUD itself is a single element, not per-
// instance.
const TAPE_WHIRR_LOOP_KEY = 'audit-tape-whirr';

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}

function formatCountdown(secondsRemaining: number): string {
  const s = Math.max(0, Math.round(secondsRemaining));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${AUDIT_TRANSPORT_PREFIX} -${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

interface RowRect {
  y0: number;
  height: number;
}

type RowKey = 'decisions' | 'alarms' | 'scores' | 'eeg' | 'ecg';

export interface AuditTestState {
  p: number;
  layersRemaining: number;
  removedLayers: string[];
  transportSeconds: number;
  stateLabel: string;
  settled: boolean;
}

export class AuditPiece extends BasePiece {
  private w = 0;
  private h = 0;
  private settleT = 0;

  // The piece's own local progress, advanced every tick regardless of
  // canvas ownership — see simulate()'s doc comment for why this can't
  // be BasePiece's inherited (Director-gated) `p`.
  private localP = 0;

  get p(): number {
    return this.localP;
  }

  // Data — one representative window, the same recording the instrument
  // plays (built once in mount(), never per-frame).
  private windowStart = 0;
  private eeg: Float32Array = new Float32Array(0);
  private ecg: Float32Array = new Float32Array(0);
  private zSlice: Float32Array = new Float32Array(0);
  private zMin = 0;
  private zMax = 1;
  private event: SignalEvent | null = null;
  private alarmFracs: number[] = []; // 0..1 positions within the window

  private colorBone = '#ece7de';
  private colorPhosphor = '#4fb0a8';
  private colorPhosphorHi = '#9fe0d6';
  private colorAlarm = '#d1533f';

  private hud: HTMLElement;
  private hudLayerEls: Record<AuditLayer, HTMLElement> = {} as Record<AuditLayer, HTMLElement>;
  private hudRawEl!: HTMLElement;
  private hudTransportEl!: HTMLElement;
  private hudStateEl!: HTMLElement;
  private hudDaybarHeadEl!: HTMLElement;
  private hudIntentEl!: HTMLElement;
  private hudSettledEl!: HTMLElement;

  constructor(private director: Director) {
    super('audit');
    this.hud = document.createElement('div');
    this.hud.className = 'audit-hud';
    this.hud.setAttribute('aria-hidden', 'true');
    this.buildHud();
    document.body.appendChild(this.hud);
  }

  private buildHud(): void {
    this.hud.innerHTML = `
      <p class="audit-hud-intent"></p>
      <div class="audit-hud-row audit-hud-state"><span class="audit-chip"></span><span class="audit-transport tnum"></span></div>
      <p class="audit-hud-settled"></p>
      <ol class="audit-hud-stack">
        ${AUDIT_LAYER_LABELS.map((l) => `<li class="audit-layer" data-layer="${l}">${l}</li>`).join('')}
        <li class="audit-layer audit-layer-raw" data-layer="raw">${AUDIT_RAW_LABEL}</li>
      </ol>
      <div class="audit-daybar" aria-label="${AUDIT_DAYBAR_LABEL}">
        <div class="audit-daybar-track"><div class="audit-daybar-head"></div></div>
      </div>
    `;
    this.hudIntentEl = this.hud.querySelector('.audit-hud-intent')!;
    this.hudIntentEl.textContent = AUDIT_INTENT_LINE;
    this.hudStateEl = this.hud.querySelector('.audit-chip')!;
    this.hudTransportEl = this.hud.querySelector('.audit-transport')!;
    this.hudDaybarHeadEl = this.hud.querySelector('.audit-daybar-head')!;
    this.hudSettledEl = this.hud.querySelector('.audit-hud-settled')!;
    this.hudSettledEl.textContent = AUDIT_SETTLED_LABEL;
    for (const layer of AUDIT_LAYER_LABELS) {
      this.hudLayerEls[layer] = this.hud.querySelector(`.audit-layer[data-layer="${layer}"]`)!;
    }
    this.hudRawEl = this.hud.querySelector('.audit-layer-raw')!;
  }

  mount(): void {
    this.colorBone = cssVar('--bone', this.colorBone);
    this.colorPhosphor = cssVar('--phosphor', this.colorPhosphor);
    this.colorPhosphorHi = cssVar('--phosphor-hi', this.colorPhosphorHi);
    this.colorAlarm = cssVar('--alarm', this.colorAlarm);
    this.buildData();
  }

  private buildData(): void {
    const events = buildEvents();
    const seizure = events.find((e) => e.kind === 'seizure') ?? null;
    this.event = seizure;

    const center = seizure ? (seizure.start + seizure.end) / 2 : 3 * 3600;
    this.windowStart = Math.max(0, center - WINDOW_SECONDS / 2);

    this.eeg = generateChannelWindow('eeg1', this.windowStart, WINDOW_SECONDS);
    this.ecg = generateChannelWindow('ecg', this.windowStart, WINDOW_SECONDS);

    const stream = buildFeatureStream();
    const z = computeZScore(stream);
    const i0 = Math.floor(this.windowStart * FEATURE_RATE_HZ);
    const i1 = Math.min(z.length, i0 + Math.ceil(WINDOW_SECONDS * FEATURE_RATE_HZ));
    this.zSlice = z.subarray(Math.max(0, i0), i1);

    let zMin = Infinity;
    let zMax = -Infinity;
    for (let i = 0; i < this.zSlice.length; i++) {
      if (this.zSlice[i] < zMin) zMin = this.zSlice[i];
      if (this.zSlice[i] > zMax) zMax = this.zSlice[i];
    }
    this.zMin = Number.isFinite(zMin) ? zMin : 0;
    this.zMax = Number.isFinite(zMax) ? zMax : 1;

    // A purely illustrative, window-relative threshold — not the day's
    // real calibrated threshold (that belongs to the instrument, spec
    // §2.3), just enough to place a few plausible "alarm" ticks for this
    // narrative visual.
    const sorted = Float32Array.from(this.zSlice).sort();
    const demoThreshold = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.8)] : 0;
    this.alarmFracs = [];
    let wasAbove = false;
    for (let i = 0; i < this.zSlice.length; i++) {
      const above = this.zSlice[i] >= demoThreshold;
      if (above && !wasAbove) this.alarmFracs.push(i / this.zSlice.length);
      wasAbove = above;
    }
  }

  fit(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  /** Explicit activation notification — spec §5.3's active flag is only
   *  read from inside frame(dt), which the Director only calls for active
   *  pieces (the same shape as topology/piece.ts's captionEl). That means
   *  a transition to inactive is never observed from inside frame(), so
   *  the HUD would stay visible after scrolling away. main.ts calls this
   *  directly from the activation ScrollTrigger's onToggle instead of
   *  relying on the next frame() to notice. */
  setSectionActive(active: boolean): void {
    this.active = active;
    this.hud.classList.toggle('audit-hud-on', active);
    // Sync the DOM immediately on entry — simulate() only writes it while
    // active (see that method's doc comment), so without this the very
    // first visible frame would show whatever was last written, possibly
    // several minutes and scroll-pages stale.
    if (active) this.updateHud();
    // The tape-whirr loop is only ever started from inside updateHud(),
    // which (by the same doc comment) never runs while inactive — so a
    // transition TO inactive has to stop it explicitly here, or a loop
    // started while REWIND was showing would keep playing indefinitely
    // after scrolling away.
    else stopLoop(TAPE_WHIRR_LOOP_KEY);
  }

  private rows(): Record<RowKey, RowRect> {
    const bandY0 = this.h * 0.6;
    const bandHeight = Math.min(this.h * 0.32, 260);
    const weights: [RowKey, number][] = [
      ['decisions', 0.5],
      ['alarms', 0.5],
      ['scores', 1.6],
      ['eeg', 1.6],
      ['ecg', 1.6],
    ];
    const totalWeight = weights.reduce((s, [, w]) => s + w, 0);
    const gap = bandHeight * 0.02;
    const usable = bandHeight - gap * (weights.length - 1);
    let y = bandY0;
    const out = {} as Record<RowKey, RowRect>;
    for (const [key, weight] of weights) {
      const height = (usable * weight) / totalWeight;
      out[key] = { y0: y, height };
      y += height + gap;
    }
    return out;
  }

  /** How much of layer `index` (0-based into AUDIT_LAYER_LABELS) is still
   *  present, 1 → 0 over a short fade window once its threshold is
   *  crossed — the visual "peel". */
  private presence(index: number): number {
    const threshold = LAYER_THRESHOLDS[index];
    if (this.p < threshold) return 1;
    return clamp01(1 - (this.p - threshold) / FADE_SPAN);
  }

  private layersRemaining(): number {
    return LAYER_THRESHOLDS.filter((t) => this.p < t).length;
  }

  /** --alarm is reserved for exactly two places on the whole site (spec
   *  §4.1): the false-alarm budget breach in movement 03, and "the
   *  struck-through invalidated figures" in movement 05 — this is that
   *  second place. A layer mid-fade gets a brief strike through its row,
   *  echoing the HUD stack's own struck-through treatment (audit.css's
   *  .audit-layer.gone) on the canvas itself. */
  private strikeIfPeeling(
    ctx: CanvasRenderingContext2D,
    x0: number,
    x1: number,
    row: RowRect,
    presence: number,
    fade: number,
  ): void {
    if (presence <= 0.03 || presence >= 0.97) return;
    const strikeAlpha = Math.sin(Math.PI * (1 - presence)) * 0.9 * fade;
    ctx.save();
    ctx.globalAlpha = strikeAlpha;
    ctx.strokeStyle = this.colorAlarm;
    ctx.lineWidth = 1.5;
    const y = row.y0 + row.height / 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.restore();
  }

  private advanceSettle(dt: number): void {
    if (this.p >= SETTLE_TRIGGER_P) {
      this.settleT = Math.min(SETTLE_DURATION_S, this.settleT + dt);
    } else {
      this.settleT = 0;
    }
  }

  /** Advances the piece's own local progress and HUD every tick,
   *  independent of shared-canvas ownership. Movement 05's canvas trace
   *  is only drawn while this section owns the shared canvas (Director
   *  gates frame()/draw() on `active`, spec §5.3's exclusivity rule) —
   *  but the narrower "top center"→"bottom center" activation window
   *  that gates canvas ownership can, by construction of main.ts's own
   *  dual-trigger geometry (activation start = V/2 into the wide
   *  progress range, end = V/2 before it, for viewport height V — never
   *  0 or 1 for any finite section), never include the wide progress
   *  trigger's true p=0/p=1 endpoints. Phase 7's done-test samples
   *  exactly those endpoints, and a real visitor's transport readout
   *  shouldn't silently freeze mid-count the instant the section is no
   *  longer centred either — so simulation (this method, called
   *  unconditionally from main.ts's shared ticker, mirroring how
   *  `instrument` already runs outside the Director) and canvas
   *  rendering (frame()/draw(), still Director-gated) are kept as two
   *  separate concerns. Both are driven by the exact same k=8 damped
   *  follow (spec §5.2) — only *when* it runs differs.
   *
   *  The math (localP/settleT) always advances — cheap, and it's what
   *  keeps getTestState() accurate at any progress, active or not. The
   *  DOM write (updateHud()) is gated on `active`: the HUD is opacity:0
   *  and non-interactive whenever it isn't (setSectionActive), so an
   *  invisible write is pure waste — and left ungated, it's a real cost
   *  paid on every frame for the rest of the page's life once this piece
   *  has ever loaded, long after the visitor has scrolled elsewhere. */
  simulate(dt: number): void {
    this.localP += (this.target - this.localP) * (1 - Math.exp(-FOLLOW_RATE * dt));
    this.advanceSettle(dt);
    if (this.active) this.updateHud();
  }

  renderOnce(): void {
    this.localP = this.target;
    this.advanceSettle(0);
    this.updateHud();
    this.draw();
  }

  /** Not DOM — pure function of settleT, so getTestState() can report an
   *  accurate label even while `active` is false and updateHud() (the
   *  DOM write) hasn't run recently, per simulate()'s doc comment. */
  private stateLabel(): string {
    const settled = this.settleT >= SETTLE_DURATION_S;
    const deriving = this.settleT > 0 && !settled;
    return settled ? AUDIT_STATE_SETTLED : deriving ? AUDIT_STATE_DERIVE : AUDIT_STATE_REWIND;
  }

  private updateHud(): void {
    const remaining = this.layersRemaining();
    const settled = this.settleT >= SETTLE_DURATION_S;
    const label = this.stateLabel();
    this.hudStateEl.textContent = label;
    this.hudStateEl.classList.toggle('audit-chip-settled', settled);

    // Tape whirr plays while the scrub is actually running (REWIND),
    // silent during RE-DERIVE/SETTLED — startLoop/stopLoop are both
    // idempotent, so calling them every frame the state hasn't changed is
    // harmless (audio.ts no-ops once the loop already matches).
    if (label === AUDIT_STATE_REWIND) void startLoop('tape-whirr', TAPE_WHIRR_LOOP_KEY, { gain: 0.4 });
    else stopLoop(TAPE_WHIRR_LOOP_KEY);
    this.hudTransportEl.textContent = formatCountdown(TOTAL_SCRUB_SECONDS * (1 - this.p));
    this.hudSettledEl.classList.toggle('audit-hud-settled-on', settled);

    AUDIT_LAYER_LABELS.forEach((layer, i) => {
      this.hudLayerEls[layer].classList.toggle('gone', this.p >= LAYER_THRESHOLDS[i]);
    });
    this.hudRawEl.classList.toggle('audit-layer-revealed', remaining === 0);

    // Day-bar playhead travels right-to-left as p increases — the
    // juxtaposition against the page's own (downward/forward) scroll
    // progress rail is the effect spec §3.3 item 2 calls for.
    const headFrac = clamp01(1 - this.p);
    this.hudDaybarHeadEl.style.left = `${(headFrac * 100).toFixed(2)}%`;
  }

  protected draw(): void {

    const ctx = this.director.context;
    if (!ctx || this.w === 0 || this.eeg.length === 0) return;

    const bandX0 = this.w * 0.08;
    const bandWidth = Math.min(this.w * 0.8, this.w - bandX0 * 1.2);
    const rows = this.rows();
    const settled = this.settleT >= SETTLE_DURATION_S;
    const quiet = settled ? 0.55 : 1; // "settles on a quieter score" — amplitude, not a number
    // Below ~760px the section's own prose reflows to occupy most of the
    // viewport height (unlike desktop, where it clears rows.decisions'
    // y0 = h*0.6 with room to spare), so the full-bleed band ends up
    // drawn across body copy rather than beside it. trace-piece.ts avoids
    // this by measuring and clamping around the hero's own rect; doing
    // the same per-paragraph here (arbitrary prose length, not one fixed
    // element) is real scope, so this reads as background texture behind
    // the text instead — dimmed, not repositioned.
    const mobileFade = this.w < 760 ? 0.4 : 1;
    ctx.save();

    // decisions — a bracket over the matched event's span
    const decisionsPresence = this.presence(0);
    if (decisionsPresence > 0.01 && this.event) {
      const row = rows.decisions;
      const x0 = bandX0 + bandWidth * clamp01((this.event.start - this.windowStart) / WINDOW_SECONDS);
      const x1 = bandX0 + bandWidth * clamp01((this.event.end - this.windowStart) / WINDOW_SECONDS);
      ctx.globalAlpha = decisionsPresence * mobileFade;
      ctx.strokeStyle = this.colorPhosphorHi;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, row.y0 + row.height);
      ctx.lineTo(x0, row.y0);
      ctx.lineTo(Math.max(x0 + 2, x1), row.y0);
      ctx.lineTo(Math.max(x0 + 2, x1), row.y0 + row.height);
      ctx.stroke();
    }
    this.strikeIfPeeling(ctx, bandX0, bandX0 + bandWidth, rows.decisions, decisionsPresence, mobileFade);

    // alarms — tick marks
    const alarmsPresence = this.presence(1);
    if (alarmsPresence > 0.01) {
      const row = rows.alarms;
      ctx.globalAlpha = alarmsPresence * mobileFade;
      ctx.strokeStyle = this.colorPhosphor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const frac of this.alarmFracs) {
        const x = Math.floor(bandX0 + bandWidth * frac) + 0.5;
        ctx.moveTo(x, row.y0 + row.height);
        ctx.lineTo(x, row.y0);
      }
      ctx.stroke();
    }
    this.strikeIfPeeling(ctx, bandX0, bandX0 + bandWidth, rows.alarms, alarmsPresence, mobileFade);

    // scores — the z-scored feature stream lane
    const scoresPresence = this.presence(2);
    if (scoresPresence > 0.01) {
      const row = rows.scores;
      const cols = Math.max(1, Math.floor(bandWidth));
      const path = minMaxEnvelopePath(this.zSlice, cols, bandX0, row.y0, row.height, this.zMin, this.zMax);
      ctx.globalAlpha = scoresPresence * mobileFade;
      ctx.strokeStyle = this.colorPhosphor;
      ctx.lineWidth = 1;
      ctx.stroke(path);
    }
    this.strikeIfPeeling(ctx, bandX0, bandX0 + bandWidth, rows.scores, scoresPresence, mobileFade);

    // raw — eeg + ecg, the substrate. Always present; quieter once settled.
    ctx.globalAlpha = quiet * mobileFade;
    ctx.strokeStyle = this.colorBone;
    ctx.lineWidth = 1;
    {
      const row = rows.eeg;
      const cols = Math.max(1, Math.floor(bandWidth));
      let gMin = Infinity, gMax = -Infinity;
      for (let i = 0; i < this.eeg.length; i++) {
        if (this.eeg[i] < gMin) gMin = this.eeg[i];
        if (this.eeg[i] > gMax) gMax = this.eeg[i];
      }
      const path = minMaxEnvelopePath(this.eeg, cols, bandX0, row.y0, row.height, gMin, gMax);
      ctx.stroke(path);
    }
    {
      const row = rows.ecg;
      const cols = Math.max(1, Math.floor(bandWidth));
      let gMin = Infinity, gMax = -Infinity;
      for (let i = 0; i < this.ecg.length; i++) {
        if (this.ecg[i] < gMin) gMin = this.ecg[i];
        if (this.ecg[i] > gMax) gMax = this.ecg[i];
      }
      const path = minMaxEnvelopePath(this.ecg, cols, bandX0, row.y0, row.height, gMin, gMax);
      ctx.stroke(path);
    }

    ctx.restore();
  }

  unmount(): void {
    stopLoop(TAPE_WHIRR_LOOP_KEY);
    this.hud.remove();
  }

  // --- test-only surface ---

  getTestState(): AuditTestState {
    const removed: string[] = [];
    AUDIT_LAYER_LABELS.forEach((layer, i) => {
      if (this.p >= LAYER_THRESHOLDS[i]) removed.push(layer);
    });
    return {
      p: this.p,
      layersRemaining: this.layersRemaining(),
      removedLayers: removed,
      transportSeconds: TOTAL_SCRUB_SECONDS * (1 - this.p),
      stateLabel: this.stateLabel(),
      settled: this.settleT >= SETTLE_DURATION_S,
    };
  }

  /** Test-only: set `target` directly, bypassing scroll/Lenis entirely —
   *  for isolating a single damped-follow step deterministically (spec §7.5's
   *  freeze()+tick() pattern only controls the frame clock; goTo() still
   *  goes through a real, asynchronous Lenis scroll animation to get
   *  there, which is exactly the timing this needs to NOT depend on). */
  setTargetForTest(p: number): void {
    this.target = p;
  }
}
