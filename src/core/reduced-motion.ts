// Single source of truth for the prefers-reduced-motion flag (spec §6.3).
// Plain matchMedia here; motion/entrances.ts and core/smooth-scroll.ts each
// wrap their own gsap.matchMedia() context against the same query so both
// re-evaluate live if the OS setting changes mid-session.

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const mql = window.matchMedia(REDUCED_MOTION_QUERY);
let current = mql.matches;
const listeners = new Set<(reduced: boolean) => void>();

mql.addEventListener('change', (e) => {
  current = e.matches;
  listeners.forEach((fn) => fn(current));
});

export function isReducedMotion(): boolean {
  return current;
}

export function onReducedMotionChange(fn: (reduced: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
