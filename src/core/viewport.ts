// Size/DPR state, debounced resize, guarded refresh — spec §5.5.
//
// Resize: debounce 150ms, compare to last committed size. Width changed OR
// height by >120px → full (setSize + every fit() + ScrollTrigger.refresh()).
// Height by ≤120px (mobile URL bar) → fit() only, no refresh.
// orientationchange → always a full commit after a 300ms settle.

export type ResizeHandler = (width: number, height: number, full: boolean) => void;

const handlers = new Set<ResizeHandler>();
let committed = { w: window.innerWidth, h: window.innerHeight };
let debounceId: ReturnType<typeof setTimeout> | undefined;

export function onResize(fn: ResizeHandler): () => void {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

function commit(full: boolean): void {
  committed = { w: window.innerWidth, h: window.innerHeight };
  handlers.forEach((fn) => fn(committed.w, committed.h, full));
}

function handleResize(): void {
  clearTimeout(debounceId);
  debounceId = setTimeout(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const widthChanged = w !== committed.w;
    const heightDelta = Math.abs(h - committed.h);
    if (widthChanged || heightDelta > 120) {
      commit(true);
    } else if (heightDelta > 0) {
      commit(false);
    }
  }, 150);
}

function handleOrientationChange(): void {
  setTimeout(() => commit(true), 300);
}

export function initViewport(): void {
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleOrientationChange);
}

export function currentSize(): { w: number; h: number } {
  return { ...committed };
}
