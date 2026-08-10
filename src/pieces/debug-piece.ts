// The 11 debug pieces registered in Phase 1 — each just draws its own
// id and progress, proving the scroll spine and activation gating before
// any real piece exists. Phase 3/4/6/7 replace these one movement at a
// time as each piece is actually built.

import { BasePiece } from './piece';
import type { Director } from './director';

export class DebugPiece extends BasePiece {
  private w = 0;
  private h = 0;

  constructor(id: string, private director: Director) {
    super(id);
  }

  fit(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  protected draw(): void {
    const ctx = this.director.context;
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = 'rgba(79, 176, 168, 0.55)';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.id} — ${this.p.toFixed(3)}`, this.w / 2, this.h / 2);
    ctx.restore();
  }
}
