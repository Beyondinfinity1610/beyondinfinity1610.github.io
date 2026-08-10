// THE single rAF for the entire site — spec §5.1. Everything else
// (Lenis, the Director, any per-frame monitor) is driven from here.
// Enforced by CI grep: zero `requestAnimationFrame` and zero
// `renderer.setAnimationLoop` anywhere else in src/.

import gsap from 'gsap';
import type Lenis from 'lenis';

export type FrameCallback = (dtSeconds: number) => void;

let lenisInstance: Lenis | null = null;
const callbacks = new Set<FrameCallback>();

export function setLenis(lenis: Lenis | null): void {
  lenisInstance = lenis;
}

export function onFrame(fn: FrameCallback): () => void {
  callbacks.add(fn);
  return () => callbacks.delete(fn);
}

let started = false;

export function startTicker(): void {
  if (started) return;
  started = true;

  gsap.ticker.lagSmoothing(0); // mandatory with Lenis

  gsap.ticker.add((time /* seconds, gsap.ticker's own clock */) => {
    lenisInstance?.raf(time * 1000); // advance scroll → ScrollTrigger.update fires synchronously
    const dt = gsap.ticker.deltaRatio(60) / 60;
    callbacks.forEach((fn) => fn(dt));
  });
}

/** Test-only: freeze the real clock and step frames manually at a fixed dt. */
export function freezeTicker(): void {
  gsap.ticker.sleep();
}

export function tickFrames(n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) callbacks.forEach((fn) => fn(dt));
}
