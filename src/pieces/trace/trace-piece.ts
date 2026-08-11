// Movements 01–02 — the trace (spec §3.1). Canvas 2D, part of the eager
// entry bundle: this must paint on the first frame, before three.js has
// begun downloading. One continuous piece spanning both movements:
//
//   p 0 → 0.35   one line, born at the left edge, drifting, warm-neutral
//   p 0.35 → 0.9 it splits — truth in bone, as-reported in phosphor teal,
//                divergence = smoothstep(0.35, 0.9, p), residual fills
//   p 0.75 → 1   the pair drifts down and out, handing to movement 03
//
// The data is src/signal/'s feature stream at coarse resolution — the
// hero literally shows the same recording the instrument later plays.
// "As reported" = truth + drift + gain error + slow bias; the thesis is
// the geometry, not a caption.

import { BasePiece } from '../piece';
import type { Director } from '../director';
import { buildFeatureStream } from '../../signal/feature';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export interface TraceBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const POINTS = 220;
// A representative few-hour slice, not the full 24h — at this point count,
// downsampling the whole day would alias into visual noise. This window
// covers a state transition (quiet-wake into drowsy), so the line has real
// shape rather than a flat mush.
const WINDOW_START_S = 3 * 3600;
const WINDOW_END_S = 9 * 3600;

export class TracePiece extends BasePiece {
  private w = 0;
  private h = 0;
  private truth: number[] = [];
  private reported: number[] = [];
  private colorBone = '#e9ede7';
  private colorPhosphor = '#5fae7a';
  private bounds: TraceBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  private centerYHero = 0;
  private centerYStage = 0;
  private stageBlendCenter = 0.35;

  constructor(private director: Director) {
    super('trace');
  }

  mount(): void {
    this.colorBone = cssVar('--bone', this.colorBone);
    this.colorPhosphor = cssVar('--phosphor', this.colorPhosphor);
    this.buildData();
  }

  private buildData(): void {
    const stream = buildFeatureStream();
    const raw: number[] = [];
    for (let i = 0; i < POINTS; i++) {
      const t = WINDOW_START_S + (WINDOW_END_S - WINDOW_START_S) * (i / (POINTS - 1));
      const idx = Math.min(stream.length - 1, Math.round(t * 4));
      raw.push(stream[idx]);
    }
    const min = Math.min(...raw);
    const max = Math.max(...raw);
    const span = max - min || 1;
    this.truth = raw.map((v) => ((v - min) / span) * 2 - 1);

    // "As reported" — the instrument's lie: a gain error plus a slow bias
    // that drifts further from truth across the window.
    const GAIN_ERROR = 1.3;
    this.reported = this.truth.map((v, i) => v * GAIN_ERROR + (i / POINTS) * 0.6);
  }

  fit(width: number, height: number): void {
    this.w = width;
    this.h = height;

    // Two different safe-Y strategies for two different stages, blended
    // across the p=0.35 boundary in draw(). A single fixed percentage
    // can't work for both: the hero and the conviction section's
    // two-column intro have completely different content layouts, so no
    // one Y value clears both. Measuring once here (on mount/resize, not
    // per-frame — the historical "getBoundingClientRect() per frame is
    // layout thrash" bug) and blending is what actually clears text.
    const ampScale = Math.min(this.h * 0.16, 90);
    const maxSplit = Math.min(this.h * 0.1, 60);
    const defaultCenterY = this.h * 0.52;

    // Hero stage (p < ~0.35): below every element in the hero block, not
    // just the h1 — the lede and the tag row sit under it too.
    const heroFoot = document.querySelector('.hero-foot');
    if (heroFoot) {
      const rect = heroFoot.getBoundingClientRect();
      const margin = 40;
      const minCenterY = rect.bottom + margin + ampScale + maxSplit / 2;
      this.centerYHero = Math.min(Math.max(defaultCenterY, minCenterY), this.h * 0.9);
    } else {
      this.centerYHero = defaultCenterY;
    }

    // Split stage: the drift-stage div (movement 02) is deliberately empty
    // of copy for its entire scroll distance, so any fixed viewport
    // percentage is safe here regardless of exact scroll position within
    // it. What isn't safe to hardcode is *when* p crosses into that
    // stage — content height (and so the fraction of total scroll it
    // consumes) varies a lot by viewport: the two-column intro on desktop
    // is much shorter than the same text stacked single-column on narrow.
    // Measure where the stage actually falls within the combined trigger's
    // own scroll range, in document coordinates, rather than guess a p
    // threshold that only happened to work at one width.
    this.centerYStage = this.h * 0.5;
    this.stageBlendCenter = this.computeStageBlendCenter(height);
  }

  private computeStageBlendCenter(viewportHeight: number): number {
    const driftEl = document.getElementById('drift');
    const lieEl = document.getElementById('lie');
    const stageEl = document.querySelector('.drift-stage');
    if (!driftEl || !lieEl || !stageEl) return 0.35;

    const scrollY = window.scrollY;
    const driftTopDoc = driftEl.getBoundingClientRect().top + scrollY;
    const lieBottomDoc = lieEl.getBoundingClientRect().bottom + scrollY;
    const stageRect = stageEl.getBoundingClientRect();
    const stageMidDoc = stageRect.top + scrollY + stageRect.height / 2;

    // Matches the "top bottom" / "bottom top" ScrollTrigger convention
    // main.ts drives this piece's `target` with.
    const scrollStart = driftTopDoc - viewportHeight;
    const scrollEnd = lieBottomDoc;
    const scrollAtStageMid = stageMidDoc - viewportHeight / 2;

    const span = scrollEnd - scrollStart || 1;
    return Math.min(0.95, Math.max(0.05, (scrollAtStageMid - scrollStart) / span));
  }

  getBounds(): TraceBounds {
    return this.bounds;
  }

  protected draw(): void {
    const ctx = this.director.context;
    if (!ctx || this.truth.length === 0 || this.w === 0) return;

    const p = this.p;
    const revealFrac = Math.min(1, Math.max(0, p / 0.35));
    if (revealFrac <= 0) {
      this.bounds = { left: 0, right: 0, top: 0, bottom: 0 };
      return;
    }
    const divergence = smoothstep(0.35, 0.9, p);
    const exitT = Math.min(1, Math.max(0, (p - 0.75) / 0.25));
    const alpha = 1 - exitT;

    const marginX = this.w * 0.12;
    const plotW = this.w - marginX * 2;
    const blendHalfWidth = 0.08;
    const stageBlend = smoothstep(this.stageBlendCenter - blendHalfWidth, this.stageBlendCenter + blendHalfWidth, p);
    const centerY = this.centerYHero + (this.centerYStage - this.centerYHero) * stageBlend;
    const ampScale = Math.min(this.h * 0.16, 90);
    const splitDist = Math.min(this.h * 0.1, 60) * divergence;
    const exitDrop = exitT * this.h * 0.32;

    const n = this.truth.length;
    const visibleN = Math.max(2, Math.floor(n * revealFrac));

    const truthPts: [number, number][] = [];
    const reportedPts: [number, number][] = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < visibleN; i++) {
      const x = marginX + (plotW * i) / (n - 1);
      const truthY = centerY - splitDist / 2 + this.truth[i] * ampScale * (1 - divergence * 0.3) + exitDrop;
      const reportedY =
        centerY + splitDist / 2 + this.reported[i] * ampScale * divergence + this.truth[i] * ampScale * (1 - divergence) + exitDrop;
      truthPts.push([x, truthY]);
      reportedPts.push([x, reportedY]);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, truthY, reportedY);
      maxY = Math.max(maxY, truthY, reportedY);
    }

    this.bounds = { left: minX, right: maxX, top: minY, bottom: maxY };

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (divergence > 0.02 && truthPts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(truthPts[0][0], truthPts[0][1]);
      for (const [x, y] of truthPts) ctx.lineTo(x, y);
      for (let i = reportedPts.length - 1; i >= 0; i--) ctx.lineTo(reportedPts[i][0], reportedPts[i][1]);
      ctx.closePath();
      ctx.fillStyle = this.colorPhosphor;
      ctx.globalAlpha = alpha * 0.08 * divergence;
      ctx.fill();
      ctx.globalAlpha = alpha;
    }

    ctx.strokeStyle = this.colorBone;
    ctx.beginPath();
    truthPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    if (divergence > 0.01) {
      ctx.strokeStyle = this.colorPhosphor;
      ctx.beginPath();
      reportedPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }

    ctx.restore();
  }
}
