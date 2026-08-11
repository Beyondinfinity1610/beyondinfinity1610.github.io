// The free no-WebGL fallback for movement 06 — spec §3.4/§6.3. Reuses
// field.ts's exact deterministic instance data (same seed, same
// closeness/near-miss split as the 3D piece) and projects it onto a flat
// 2D scatter on the shared #world canvas instead of a camera-driven field.
// Used when WebGL2 is unavailable, ?nogl=1, saveData, low tier, or after
// an unrecovered context loss — same role Topology2DPiece plays for
// movement 04.

import { BasePiece } from '../piece';
import type { Director } from '../director';
import { buildCeilingField, CEILING_INSTANCE_COUNT_MOBILE, FIELD_RADIUS_X, type CeilingField } from '../ceiling/field';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// The 2D fallback never pays for 1800 instances' worth of canvas fills —
// it's a flat, free surface with no camera dolly to make a bigger field
// worth the draw cost, so it always uses the lighter mobile-sized field.
const FALLBACK_INSTANCE_COUNT = CEILING_INSTANCE_COUNT_MOBILE;

export class Ceiling2DPiece extends BasePiece {
  private w = 0;
  private h = 0;
  private field: CeilingField;

  private colorLo = '#5fae7a';
  private colorHi = '#e9ede7';
  private colorNearMiss = '#c9824a'; // matches ceiling/piece.ts's NEAR_MISS_HEX — see that file's comment on why this isn't --alarm

  constructor(private director: Director) {
    super('ceiling');
    this.field = buildCeilingField(FALLBACK_INSTANCE_COUNT);
  }

  mount(): void {
    this.colorLo = cssVar('--phosphor', this.colorLo);
    this.colorHi = cssVar('--bone', this.colorHi);
  }

  fit(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }

  /** Field-space (x, z within +-FIELD_RADIUS, y within floor..ceiling) to
   *  canvas pixels — a flat top-down-ish projection, not a real camera. */
  private project(x: number, z: number, y: number): { cx: number; cy: number } {
    const marginX = this.w * 0.1;
    const usableW = this.w - marginX * 2;
    const nx = (x + FIELD_RADIUS_X) / (FIELD_RADIUS_X * 2);
    const cx = marginX + nx * usableW;

    const ceilingCy = this.h * 0.16;
    const floorCy = this.h * 0.92;
    const ny = (y + 1) / 2; // field.ts's FLOOR_Y=-1 .. CEILING_Y=1
    const cy = floorCy - ny * (floorCy - ceilingCy);

    // z only perturbs x slightly for a hint of depth — this is a flat
    // fallback, not a perspective projection.
    void z;
    return { cx, cy };
  }

  protected draw(): void {
    const ctx = this.director.context;
    if (!ctx || this.w === 0) return;

    const alpha = 0.35 + 0.65 * this.p;
    const ceilingCy = this.h * 0.16;

    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);

    // the hairline plane that nothing crosses
    ctx.strokeStyle = this.colorHi;
    ctx.globalAlpha = Math.min(1, alpha) * 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.w * 0.06, ceilingCy);
    ctx.lineTo(this.w * 0.94, ceilingCy);
    ctx.stroke();

    // near-miss hairlines, drawn first (under the field points)
    ctx.strokeStyle = this.colorNearMiss;
    ctx.globalAlpha = Math.min(1, alpha) * 0.85;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const idx of this.field.nearMissIndices) {
      const inst = this.field.instances[idx];
      const { cx, cy } = this.project(inst.x, inst.z, inst.y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, ceilingCy);
    }
    ctx.stroke();

    // the field itself
    ctx.globalAlpha = Math.min(1, alpha);
    for (const inst of this.field.instances) {
      const { cx, cy } = this.project(inst.x, inst.z, inst.y);
      const t = inst.category / 6;
      ctx.fillStyle = inst.nearMiss ? this.colorNearMiss : t > 0.5 ? this.colorHi : this.colorLo;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
