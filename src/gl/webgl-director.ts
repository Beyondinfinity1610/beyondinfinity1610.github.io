// Registry for the WebGL pieces (movements 04, 06) — the same antidote to
// the canvas-retains-its-last-frame bug as pieces/director.ts (spec §5.3),
// applied to the WebGL canvas instead of the 2D one. Only two pieces ever
// exist and they're never simultaneously active (non-overlapping
// sections), but the registry doesn't assume that — same "collect actives,
// render in registration order" shape as the 2D Director.

import type { WebGLRenderer } from 'three';
import { createRenderer, type RendererHandle } from './renderer';

export interface WebglPiece {
  readonly id: string;
  active: boolean;
  target: number;
  mount(renderer: WebGLRenderer): void;
  fit(width: number, height: number): void;
  frame(dtSeconds: number): void;
  render(renderer: WebGLRenderer): void;
  renderOnce(renderer: WebGLRenderer): void;
}

export class WebglDirector {
  private pieces: WebglPiece[] = [];
  private handle: RendererHandle | null = null;
  private visible = false;
  private lastSize = { w: 0, h: 0, dpr: 1 };

  constructor(private canvas: HTMLCanvasElement) {}

  /** Returns null if WebGL2 isn't available or context creation fails. */
  init(): boolean {
    if (this.handle) return true;
    this.handle = createRenderer(this.canvas);
    return this.handle !== null;
  }

  get rendererHandle(): RendererHandle | null {
    return this.handle;
  }

  register(piece: WebglPiece): void {
    this.pieces.push(piece);
    if (this.handle) piece.mount(this.handle.renderer);
  }

  setActive(piece: WebglPiece, active: boolean): void {
    piece.active = active;
  }

  fit(width: number, height: number, dpr: number): void {
    this.lastSize = { w: width, h: height, dpr };
    this.handle?.setSize(width, height, dpr);
    for (const p of this.pieces) p.fit(width, height);
  }

  frame(dt: number): void {
    if (!this.handle) return;
    const actives = this.pieces.filter((p) => p.active);

    if (actives.length === 0) {
      if (this.visible) {
        // Visibility first: a lost WebGL context can make renderer calls
        // throw, and if that happened before this line the canvas would
        // never actually hide — exactly the frozen-black-canvas failure
        // mode spec §6.3 calls out. Hiding is the antidote; it must not
        // depend on the renderer still working.
        this.canvas.style.visibility = 'hidden';
        this.visible = false;
        this.safeClear();
      }
      return;
    }

    if (!this.visible) {
      this.canvas.style.visibility = 'visible';
      this.visible = true;
    }
    this.safeClear();
    for (const p of actives) {
      p.frame(dt);
      this.safeRender(() => p.render(this.handle!.renderer));
    }
  }

  private safeClear(): void {
    try {
      this.handle?.renderer.clear();
    } catch {
      // context is gone — nothing to clear, and the caller has already
      // hidden the canvas by the time this can throw.
    }
  }

  private safeRender(fn: () => void): void {
    try {
      fn();
    } catch {
      // a piece's render() can throw mid-frame if the context drops
      // between the isActive check and this call; swallow it rather than
      // let one bad frame break the shared ticker for every other piece.
    }
  }

  renderOnceAll(): void {
    if (!this.handle) return;
    this.handle.renderer.clear();
    let any = false;
    for (const p of this.pieces) {
      if (p.active) {
        p.renderOnce(this.handle.renderer);
        any = true;
      }
    }
    this.canvas.style.visibility = any ? 'visible' : 'hidden';
  }

  currentSize() {
    return this.lastSize;
  }

  list(): readonly WebglPiece[] {
    return this.pieces;
  }

  dispose(): void {
    this.handle?.dispose();
    this.handle = null;
  }
}
