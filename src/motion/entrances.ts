// The five entrance types (spec §4.3). Initial states via gsap.set(),
// never CSS — "no opacity:0 / visibility:hidden on any content element in
// CSS, ever" (spec §5.4). If JS dies, everything is already visible.
//
// Elements opt in either by `data-enter="rise|settle|draw|latch|wake"`
// (for pieces built in later phases) or by matching a built-in default
// selector below, so index.html stays markup-and-copy-only for the
// content that already exists.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE_ENTRANCE } from './eases';
import { linesOf } from './split-lines';

gsap.registerPlugin(ScrollTrigger);

type EntranceType = 'rise' | 'settle' | 'draw' | 'latch' | 'wake';

const DEFAULT_SELECTORS: Record<EntranceType, string> = {
  rise: '.display',
  settle: '.lede, .col, .disclosure-note, .hero-foot',
  // Real rules/connectors are drawn by their own pieces (topology
  // connectors, Phase 6) — no generic DOM default yet.
  draw: '',
  // Readouts don't exist until the instrument (Phase 4) and the progress
  // rail (Phase 9) — no generic DOM default yet.
  latch: '',
  wake: '.throughline li, .quiet li, .method-list li, .facts > div, .clink',
};

function targetsFor(type: EntranceType, root: ParentNode): Element[] {
  const selectors = [`[data-enter="${type}"]`, DEFAULT_SELECTORS[type]].filter(Boolean).join(', ');
  return selectors ? Array.from(root.querySelectorAll(selectors)) : [];
}

function setInitialRise(el: Element): void {
  const lines = linesOf(el);
  gsap.set(lines.length ? lines : [el], { yPercent: 110 });
}
function revealRise(el: Element): void {
  const lines = linesOf(el);
  gsap.to(lines.length ? lines : [el], { yPercent: 0, duration: 1.15, ease: EASE_ENTRANCE, stagger: 0.09 });
}

function setInitialSettle(el: Element): void {
  gsap.set(el, { opacity: 0, y: 12 });
}
function revealSettle(el: Element): void {
  gsap.to(el, { opacity: 1, y: 0, duration: 1.05, ease: EASE_ENTRANCE });
}

function setInitialDraw(el: Element): void {
  gsap.set(el, { scaleX: 0, transformOrigin: 'left center' });
}
function revealDraw(el: Element, i: number): void {
  gsap.to(el, { scaleX: 1, duration: 1.05, ease: EASE_ENTRANCE, delay: i * 0.07 });
}

function setInitialLatch(el: Element): void {
  // Digit-roll-from-scrambled behaviour belongs to motion/counters.ts
  // (Phase 4/9, once real readouts exist). For now: present, no travel.
  gsap.set(el, { opacity: 1 });
}
function revealLatch(): void {
  /* no-op until counters.ts exists */
}

function setInitialWake(el: Element): void {
  gsap.set(el, { x: -3, opacity: 0 });
}
function revealWake(el: Element, i: number): void {
  gsap.to(el, { x: 0, opacity: 1, duration: 1.05, ease: EASE_ENTRANCE, delay: i * 0.07 });
}

const HANDLERS: Record<EntranceType, { init: (el: Element) => void; reveal: (el: Element, i: number) => void }> = {
  rise: { init: setInitialRise, reveal: revealRise },
  settle: { init: setInitialSettle, reveal: revealSettle },
  draw: { init: setInitialDraw, reveal: revealDraw },
  latch: { init: setInitialLatch, reveal: revealLatch },
  wake: { init: setInitialWake, reveal: revealWake },
};

const ALL_TYPES = Object.keys(HANDLERS) as EntranceType[];

export function buildEntrances(root: ParentNode = document): void {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    ALL_TYPES.forEach((type) => {
      targetsFor(type, root).forEach((el) => gsap.set(el, { clearProps: 'all' }));
    });
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    ALL_TYPES.forEach((type) => {
      const { init, reveal } = HANDLERS[type];
      const els = targetsFor(type, root);
      els.forEach((el) => init(el));
      ScrollTrigger.batch(els, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => batch.forEach((el, i) => reveal(el, i)),
      });
    });

    const sweep = () => sweepAboveFold(root);
    sweep();
    ScrollTrigger.addEventListener('refreshInit', sweep);
    return () => ScrollTrigger.removeEventListener('refreshInit', sweep);
  });
}

/** Anything already above the fold counts as entered — spec §5.4. */
function sweepAboveFold(root: ParentNode): void {
  ALL_TYPES.forEach((type) => {
    const { reveal } = HANDLERS[type];
    targetsFor(type, root).forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) reveal(el, i);
    });
  });
}
