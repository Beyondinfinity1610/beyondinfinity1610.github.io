// Exactly three CustomEase curves, named once. Ad-hoc cubic-beziers
// scattered through the code is exactly what makes a site feel unauthored
// (spec §4.3). Every tween in src/motion and src/pieces references one of
// these three names — nothing else.

import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

/** Long tail — entrances (rise, settle, draw, wake). */
export const EASE_ENTRANCE = CustomEase.create('ease-entrance', 'M0,0 C0.16,1 0.3,1 1,1');

/** Short, snappy — UI feedback (hover, focus, toggle states). */
export const EASE_UI = CustomEase.create('ease-ui', 'M0,0 C0.65,0 0.35,1 1,1');

/** Near-linear with a settle — the instrument's readouts and drag response. */
export const EASE_INSTRUMENT = CustomEase.create('ease-instrument', 'M0,0 C0.9,0 0.98,0.98 1,1');
