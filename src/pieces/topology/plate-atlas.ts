// Draws to a plain 2D canvas — spec §3.2 — so the no-WebGL fallback
// (fallback-2d/topology-2d.ts) reuses it verbatim as a flat 2D row. One
// procedurally-drawn 2048² atlas: 16 cells, hairline border, mono stage
// index, and a row of black bars whose widths come from the seeded PRNG
// so they read as struck-out words of varying length. One plate — public
// SeizeIT2 dataset properties — is left legible; the contrast is the
// argument.

import { mulberry32, hash32 } from '../../core/rng';
import { LEGIBLE_PLATE_TEXT } from '../../content/strings';

export const ATLAS_SIZE = 2048;
export const PLATE_COUNT = 16;
export const CELLS_PER_ROW = 4;
export const CELL_W = ATLAS_SIZE / CELLS_PER_ROW; // 512
export const CELL_H = 256;
export const LEGIBLE_PLATE_INDEX = 7;

const ATLAS_SEED = 0xa17a5;

function cellOrigin(index: number): { x: number; y: number } {
  const col = index % CELLS_PER_ROW;
  const row = Math.floor(index / CELLS_PER_ROW);
  return { x: col * CELL_W, y: row * CELL_H };
}

function drawStruckBars(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, index: number): void {
  const rng = mulberry32(hash32(ATLAS_SEED, 'bars', index));
  const barCount = 3 + Math.floor(rng() * 3);
  const marginX = w * 0.12;
  const barHeight = h * 0.075;
  let by = y + h * 0.32;
  for (let b = 0; b < barCount; b++) {
    const bw = (0.3 + rng() * 0.5) * (w - marginX * 2);
    ctx.fillStyle = 'rgba(15, 17, 19, 0.92)';
    ctx.fillRect(x + marginX, by, bw, barHeight);
    by += barHeight + h * 0.09;
  }
}

function drawLegibleText(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#ece7de';
  ctx.font = `${Math.round(h * 0.11)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const parts = LEGIBLE_PLATE_TEXT.split(' · ');
  const lineHeight = h * 0.16;
  const startY = y + h / 2 - (lineHeight * (parts.length - 1)) / 2;
  parts.forEach((part, i) => {
    ctx.fillText(part, x + w / 2, startY + i * lineHeight, w * 0.82);
  });
}

function drawCell(ctx: CanvasRenderingContext2D, index: number): void {
  const { x, y } = cellOrigin(index);
  const w = CELL_W;
  const h = CELL_H;

  ctx.fillStyle = '#0c0f11';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = 'rgba(214, 224, 226, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

  ctx.fillStyle = 'rgba(79, 176, 168, 0.65)';
  ctx.font = `${Math.round(h * 0.09)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(index + 1).padStart(2, '0'), x + w * 0.08, y + h * 0.08);

  if (index === LEGIBLE_PLATE_INDEX) drawLegibleText(ctx, x, y, w, h);
  else drawStruckBars(ctx, x, y, w, h, index);
}

/** Draws all 16 cells into the given canvas at full atlas resolution. */
export function drawPlateAtlas(canvas: HTMLCanvasElement): void {
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#06080a';
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  for (let i = 0; i < PLATE_COUNT; i++) drawCell(ctx, i);
}

/**
 * Draws the same 16 cells as a flat single-row strip — the free no-WebGL
 * fallback (spec §3.2: "the no-WebGL fallback reuses it verbatim as a flat
 * 2D row"). One canvas, one draw pass, reusing drawCell's exact output.
 */
export function drawPlateRow(canvas: HTMLCanvasElement, cellWidth: number, cellHeight: number): void {
  canvas.width = cellWidth * PLATE_COUNT;
  canvas.height = cellHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const atlas = document.createElement('canvas');
  drawPlateAtlas(atlas);

  for (let i = 0; i < PLATE_COUNT; i++) {
    const { x, y } = cellOrigin(i);
    ctx.drawImage(atlas, x, y, CELL_W, CELL_H, i * cellWidth, 0, cellWidth, cellHeight);
  }
}

export function cellUV(index: number): { offsetX: number; offsetY: number; repeatX: number; repeatY: number } {
  const { x, y } = cellOrigin(index);
  return {
    offsetX: x / ATLAS_SIZE,
    // Canvas Y grows downward; texture V grows upward, so flip.
    offsetY: 1 - (y + CELL_H) / ATLAS_SIZE,
    repeatX: CELL_W / ATLAS_SIZE,
    repeatY: CELL_H / ATLAS_SIZE,
  };
}
