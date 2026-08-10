// The single WebGLRenderer, context-loss handling, DPR — spec §7.2/§5.3.
// One renderer, one canvas — never the same canvas the 2D pieces use
// (a canvas is locked to whichever context type is first requested), so
// this owns its own dedicated element.

import { WebGLRenderer, SRGBColorSpace, NoToneMapping } from 'three';
import type { Tier } from '../core/tier';

export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

export function dprForTier(tier: Tier): number {
  const raw = window.devicePixelRatio || 1;
  const cap = tier === 'high' ? 2 : tier === 'mid' ? 1.5 : 1;
  return Math.min(raw, cap);
}

export interface RendererHandle {
  renderer: WebGLRenderer;
  canvas: HTMLCanvasElement;
  dispose(): void;
  onContextLost(fn: () => void): () => void;
  onContextRestored(fn: () => void): () => void;
  setSize(width: number, height: number, dpr: number): void;
}

export function createRenderer(canvas: HTMLCanvasElement): RendererHandle | null {
  if (!supportsWebGL2()) return null;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  // Author the colours directly — ACES crushes blacks and desaturates,
  // which fights a low-contrast dark palette (spec §6.2).
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;

  const lostListeners = new Set<() => void>();
  const restoredListeners = new Set<() => void>();

  const handleLost = (e: Event) => {
    e.preventDefault(); // required — without it the context never comes back
    lostListeners.forEach((fn) => fn());
  };
  const handleRestored = () => {
    restoredListeners.forEach((fn) => fn());
  };
  canvas.addEventListener('webglcontextlost', handleLost, false);
  canvas.addEventListener('webglcontextrestored', handleRestored, false);

  return {
    renderer,
    canvas,
    dispose() {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
      renderer.dispose();
    },
    onContextLost(fn) {
      lostListeners.add(fn);
      return () => lostListeners.delete(fn);
    },
    onContextRestored(fn) {
      restoredListeners.add(fn);
      return () => restoredListeners.delete(fn);
    },
    setSize(width, height, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
    },
  };
}
