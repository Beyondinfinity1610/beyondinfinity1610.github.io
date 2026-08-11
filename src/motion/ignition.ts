// Cold-start ignition — plays once at boot, before the hero's own rise/
// settle entrance (buildEntrances()) runs. "Blinking to life": the
// instrument grid (styles/atmosphere.css's .grid-field) flickers up
// through a few explicit steps, then the hero's own trace — already drawn
// every frame by TracePiece onto #world, active from boot since the hero
// sits at the top of the page — fades in behind it. Hero copy only starts
// its own entrance once this resolves (see main.ts's boot()), so the beat
// reads as: the instrument powers on, then the words arrive.
//
// Flicker is a short, EXPLICIT keyframe sequence — control points GSAP
// itself eases between — never per-frame Math.random(). A prior session on
// this exact "make it look uncertain/raw" problem found independent
// per-frame noise reads as broken, not deliberate ("the signal is very
// messy, I want a classy intro"); every step here is authored, not
// sampled, for the same reason.

import gsap from 'gsap';
import { EASE_INSTRUMENT } from './eases';

const GRID_EL_SELECTOR = '.grid-field';
const WORLD_CANVAS_SELECTOR = '#world';

export function playIgnition(): Promise<void> {
  const grid = document.querySelector<HTMLElement>(GRID_EL_SELECTOR);
  const canvas = document.querySelector<HTMLElement>(WORLD_CANVAS_SELECTOR);

  return new Promise((resolve) => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (grid) gsap.set(grid, { clearProps: 'opacity' });
      if (canvas) gsap.set(canvas, { clearProps: 'opacity' });
      resolve();
    });

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (!grid && !canvas) {
        resolve();
        return;
      }

      if (grid) gsap.set(grid, { opacity: 0 });
      if (canvas) gsap.set(canvas, { opacity: 0 });

      const tl = gsap.timeline({ onComplete: resolve });

      // Grid: a handful of authored flicker steps — a bright flash, two
      // uneven dips, then settle to full (the gradient's own baked-in
      // alpha is the real "faint hairline" look; this only ramps the
      // element's overall opacity from 0 to that).
      if (grid) {
        tl.to(grid, { opacity: 0.7, duration: 0.05 }, 0)
          .to(grid, { opacity: 0.08, duration: 0.09 }, 0.05)
          .to(grid, { opacity: 0.55, duration: 0.07 }, 0.2)
          .to(grid, { opacity: 0.15, duration: 0.12 }, 0.27)
          .to(grid, { opacity: 1, duration: 0.45, ease: EASE_INSTRUMENT }, 0.42);
      }

      // Trace: switches on clean right as the grid settles — the readout
      // catching up to the instrument, not competing with it.
      if (canvas) {
        tl.to(canvas, { opacity: 1, duration: 0.5, ease: EASE_INSTRUMENT }, grid ? 0.5 : 0);
      }
    });
  });
}
