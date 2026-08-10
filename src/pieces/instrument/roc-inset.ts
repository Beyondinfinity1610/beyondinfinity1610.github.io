// The payoff — spec §2.4. FA/day on x, sensitivity on y, the full ROC
// curve, the visitor's operating point as a moving dot. The rectangle
// FA/day ≤ 2 ∧ sensitivity ≥ 59% (the 59% attributed on the axis label).
// The curve passes entirely beneath it by construction (spec §2.3's
// invariant) — no copy is needed to make the argument, only to name it.

import { rocAt } from '../../signal/roc';
import type { InstrumentState } from './state';

export interface RocInsetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CLINICAL_FA_MAX = 2;
const CLINICAL_SENSITIVITY_MIN = 0.59;

export function drawRocInset(
  ctx: CanvasRenderingContext2D,
  state: InstrumentState,
  rect: RocInsetRect,
  colors: { bone: string; phosphor: string; phosphorHi: string; faint: string }
): void {
  const { table } = state;
  const maxFA = Math.max(...table.points.map((p) => p.faPerDay), 1);
  const toX = (fa: number) => rect.x + Math.min(1, fa / maxFA) * rect.width;
  const toY = (sens: number) => rect.y + (1 - sens) * rect.height;

  ctx.save();

  // clinically-useful box
  const boxX = rect.x;
  const boxW = Math.min(rect.width, (CLINICAL_FA_MAX / maxFA) * rect.width);
  const boxY = toY(1);
  const boxH = toY(CLINICAL_SENSITIVITY_MIN) - toY(1);
  ctx.strokeStyle = colors.phosphor;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.globalAlpha = 1;

  // the ROC curve
  ctx.strokeStyle = colors.bone;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  table.points.forEach((p, i) => {
    const x = toX(p.faPerDay);
    const y = toY(p.sensitivity);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // the visitor's operating point
  const current = rocAt(table, state.thresholdZ);
  const dotX = toX(current.faPerDay);
  const dotY = toY(current.sensitivity);
  ctx.fillStyle = colors.phosphorHi;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
  ctx.fill();

  // axis labels
  ctx.fillStyle = colors.faint;
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText('FA/day →', rect.x, rect.y + rect.height + 14);
  ctx.save();
  ctx.translate(rect.x - 8, rect.y + rect.height);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`sensitivity ↑ (59% — published human readers)`, 0, 0);
  ctx.restore();

  ctx.restore();
}
