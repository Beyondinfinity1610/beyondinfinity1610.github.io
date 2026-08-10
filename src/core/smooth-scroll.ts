// Lenis ↔ ScrollTrigger bridge — spec §5.4.
//
// Do NOT call ScrollTrigger.scrollerProxy(). Lenis v1 with default
// `wrapper: window` drives the real document scroll; ScrollTrigger's
// default scroller already reads it correctly. A proxy double-maps and
// produces the classic wrong-position-after-refresh bug.
//
// Never instantiated under prefers-reduced-motion — native scroll,
// ScrollTrigger unchanged, no Lenis smoothing to fight the OS setting.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { isReducedMotion } from './reduced-motion';
import { setLenis } from './ticker';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function initSmoothScroll(): Lenis | null {
  if (isReducedMotion()) {
    setLenis(null);
    return null;
  }

  lenis = new Lenis({
    autoRaf: false, // we own the loop — see core/ticker.ts
    duration: 1.05,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    syncTouch: false, // never smooth native touch — it fights momentum
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);
  setLenis(lenis);

  history.scrollRestoration = 'manual';
  bindAnchors(lenis);

  return lenis;
}

function bindAnchors(l: Lenis): void {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest('a[href^="#"]');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href || href === '#') return;
    const el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    l.scrollTo(el as HTMLElement, { duration: 1.1 });
  });
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Honour location.hash after fonts are ready — spec §5.4. */
export function honourHash(): void {
  if (!location.hash) return;
  const el = document.querySelector(location.hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { immediate: true });
  else el.scrollIntoView();
}
