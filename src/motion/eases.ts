// Exactly three CustomEase curves, named once. Ad-hoc cubic-beziers
// scattered through the code is exactly what makes a site feel unauthored
// (spec §4.3). Every tween in src/motion and src/pieces references one of
// these three names — nothing else.

import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

/** Entrances (rise, settle, draw, wake). Tightened for the Signal Lab
 *  direction (2026-08-11): the original curve front-loaded almost all its
 *  motion into the first 30% of the duration and then drifted for the
 *  remaining 70% — a soft editorial float. This keeps the same fast-start
 *  shape (still visibly distinct from ease-ui's snap and
 *  ease-instrument's near-linear-then-settle) but spreads more of the
 *  motion across the tween, so elements read as locking into place like a
 *  readout rather than settling like a caption. */
export const EASE_ENTRANCE = CustomEase.create('ease-entrance', 'M0,0 C0.22,0.86 0.34,1 1,1');

/** Short, snappy — UI feedback (hover, focus, toggle states). */
export const EASE_UI = CustomEase.create('ease-ui', 'M0,0 C0.65,0 0.35,1 1,1');

/** Near-linear with a settle — the instrument's readouts and drag response. */
export const EASE_INSTRUMENT = CustomEase.create('ease-instrument', 'M0,0 C0.9,0 0.98,0.98 1,1');
