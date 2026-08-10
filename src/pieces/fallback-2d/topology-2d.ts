// The free no-WebGL fallback for movement 04 — spec §3.2/§6.3. Reuses
// plate-atlas.ts's exact cell drawing verbatim, laid out as a flat row
// instead of a 3D S-curve. Used when WebGL2 is unavailable, ?nogl=1,
// saveData, low tier, or after an unrecovered context loss.

import { BasePiece } from '../piece';
import type { Director } from '../director';
import { drawPlateRow, PLATE_COUNT, LEGIBLE_PLATE_INDEX } from '../topology/plate-atlas';
import { PLATE_ROLES, LEGIBLE_PLATE_ROLE } from '../../content/strings';

export class Topology2DPiece extends BasePiece {
  private w = 0;
  private h = 0;
  private rowCanvas = document.createElement('canvas');
  private cellCssWidth = 140;
  private cellCssHeight = 70;

  constructor(private director: Director) {
    super('withheld');
  }

  mount(): void {
    drawPlateRow(this.rowCanvas, this.cellCssWidth * 2, this.cellCssHeight * 2); // 2x for crisp downscale
  }

  fit(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  roleFor(index: number): string {
    if (index === LEGIBLE_PLATE_INDEX) return LEGIBLE_PLATE_ROLE;
    return PLATE_ROLES[index % PLATE_ROLES.length];
  }

  protected draw(): void {
    const ctx = this.director.context;
    if (!ctx || this.w === 0) return;

    const totalWidth = PLATE_COUNT * this.cellCssWidth;
    const x0 = (this.w - totalWidth) / 2;
    const y0 = this.h / 2 - this.cellCssHeight / 2;
    const alpha = 0.4 + 0.6 * this.p;

    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(this.rowCanvas, 0, 0, this.rowCanvas.width, this.rowCanvas.height, x0, y0, totalWidth, this.cellCssHeight);
    ctx.restore();
  }
}
