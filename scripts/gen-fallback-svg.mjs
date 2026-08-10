#!/usr/bin/env node
// Generates the <noscript> fallback SVG — spec §7.2 (scripts/gen-fallback-svg.mjs)
// and §8 Phase 9's done-test bullet ("the generated <noscript> SVG"). Spec §11
// item 6: "Disable JavaScript entirely... the <noscript> SVG shows the
// instrument's argument as a static image" — the ROC-style curve staying
// entirely beneath the clinically-useful box (spec §2.4), without the canvas,
// the drag interaction, or a single generated sample.
//
// Deterministic and static: no signal generation, no randomness, no
// real numbers beyond the two figures already vetted and allow-listed in
// disclosure/allow.txt ("fewer than two false alarms per day", the
// attributed 59%). Everything else is qualitative geometry, same as the
// live ROC inset's own on-canvas rule against printing axis numerals.
//
// Run via `npm run build` (prebuild hook) and `npm run dev` (predev hook);
// also runnable directly: `node scripts/gen-fallback-svg.mjs`.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_PATH = join(ROOT, 'public', 'fallback-instrument.svg');

const VOID = '#06080a';
const LINE = 'rgba(214,224,226,0.35)';
const BONE = '#ece7de';
const FAINT = '#8a8279';
const PHOSPHOR = '#4fb0a8';
const ALARM_ADJACENT = '#9fe0d6'; // dashed box — the boundary, not the alarm colour itself

// Plot area
const X0 = 70, X1 = 600; // false alarms/day axis, left -> right
const Y0 = 300, Y1 = 40; // sensitivity axis, bottom (0) -> top (1)

// The clinically-useful box: low FA/day (left strip) AND high sensitivity
// (top strip) — spec §2.4's rectangle. Purely qualitative placement, no axis
// numerals anywhere on the image (same rule the live ceiling/ROC pieces hold
// to for the movements that carry real geometry).
const BOX_X0 = X0, BOX_X1 = 122;
const BOX_Y0 = Y1, BOX_Y1 = 158;

// The ROC-shaped curve: low sensitivity while FA/day is still inside the
// box's narrow left strip, only climbing once well clear of it to the right
// — "the curve passes entirely beneath it" (spec §2.4), never a real sample.
const CURVE_POINTS = [
  [X0, 300],
  [122, 272],
  [200, 236],
  [300, 196],
  [400, 152],
  [500, 108],
  [X1, 78],
];

function curvePath(points) {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" role="img" aria-labelledby="fb-title fb-desc">
<title id="fb-title">Sensitivity against false alarms per day</title>
<desc id="fb-desc">A curve of sensitivity against false alarms per day, generated from the same synthetic recording as the playable instrument. The curve stays entirely below and right of a dashed rectangle marking fewer than two false alarms per day and the published 59% expert-reader sensitivity — it never enters the rectangle.</desc>
<rect x="0" y="0" width="640" height="360" fill="${VOID}" />

<!-- axes -->
<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="${LINE}" stroke-width="1" />
<line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}" stroke="${LINE}" stroke-width="1" />
<text x="${(X0 + X1) / 2}" y="332" fill="${FAINT}" font-family="monospace" font-size="12" text-anchor="middle" letter-spacing="1">false alarms / day &#8594;</text>
<text x="24" y="${(Y0 + Y1) / 2}" fill="${FAINT}" font-family="monospace" font-size="12" text-anchor="middle" letter-spacing="1" transform="rotate(-90 24 ${(Y0 + Y1) / 2})">sensitivity &#8594;</text>

<!-- the clinically-useful box: the curve never enters it -->
<rect x="${BOX_X0}" y="${BOX_Y0}" width="${BOX_X1 - BOX_X0}" height="${BOX_Y1 - BOX_Y0}" fill="none" stroke="${ALARM_ADJACENT}" stroke-width="1.5" stroke-dasharray="4 3" />
<text x="${BOX_X1 + 12}" y="${BOX_Y0 + 16}" fill="${ALARM_ADJACENT}" font-family="monospace" font-size="11">clinically useful</text>
<text x="${BOX_X1 + 12}" y="${BOX_Y0 + 32}" fill="${FAINT}" font-family="monospace" font-size="11">fewer than two false alarms per day</text>

<!-- the ROC-shaped curve -->
<path d="${curvePath(CURVE_POINTS)}" fill="none" stroke="${PHOSPHOR}" stroke-width="2" />

<text x="${X0}" y="20" fill="${BONE}" font-family="monospace" font-size="13">
<tspan x="${X0}" dy="0">published human expert readers reach roughly 59%</tspan>
<tspan x="${X0}" dy="16">sensitivity on this modality</tspan>
</text>
<text x="${X0}" y="352" fill="${FAINT}" font-family="monospace" font-size="10" letter-spacing="0.5">synthetic signal &#183; generated from a fixed seed &#183; not the method under review</text>
<text x="560" y="352" fill="${FAINT}" font-family="monospace" font-size="10" letter-spacing="1" opacity="0.5">SYNTHETIC</text>
</svg>
`;

writeFileSync(OUT_PATH, svg, 'utf8');
console.log(`wrote ${OUT_PATH.replace(ROOT, '').replace(/^[\\/]/, '')} (${svg.length} bytes)`);
