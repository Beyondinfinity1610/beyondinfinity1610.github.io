// Registry, activation gating, canvas visibility, FPS monitor — spec §5.3.
//
// One WebGLRenderer on one canvas (from Phase 5), N independent pieces each
// with a local 0..1 progress. No shared depth axis, so nothing can bleed —
// this replaces `world.js`'s single 1500-unit depth corridor entirely.
//
// Each frame: collect actives; if zero → clear once, hide the canvas
// (the antidote to the canvas-retains-its-last-frame bug); if ≥1 → make
// visible and render in registration order. `active` is set by onToggle
// only — never by distance from a centre point, never by a depth band.

import type { SetPiece } from './piece';
import { FpsMonitor } from '../core/tier';

export class Director {
  private pieces: SetPiece[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private visible = false;
  readonly fps: FpsMonitor;

  constructor(canvas: HTMLCanvasElement, onDemote: () => void = () => {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fps = new FpsMonitor(onDemote);
  }

  register(piece: SetPiece): void {
    this.pieces.push(piece);
    piece.mount();
  }

  setActive(piece: SetPiece, active: boolean): void {
    piece.active = active;
  }

  fit(width: number, height: number, dpr = window.devicePixelRatio || 1): void {
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const piece of this.pieces) piece.fit(width, height);
  }

  frame(dt: number): void {
    const actives = this.pieces.filter((p) => p.active);

    if (actives.length === 0) {
      if (this.visible) {
        this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.visibility = 'hidden';
        this.visible = false;
      }
      return;
    }

    if (!this.visible) {
      this.canvas.style.visibility = 'visible';
      this.visible = true;
    }
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const piece of actives) piece.frame(dt);

    this.fps.sample(dt);
  }

  renderOnceAll(): void {
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const piece of this.pieces) {
      if (piece.active) piece.renderOnce();
    }
    this.canvas.style.visibility = this.pieces.some((p) => p.active) ? 'visible' : 'hidden';
  }

  get context(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  list(): readonly SetPiece[] {
    return this.pieces;
  }
}
