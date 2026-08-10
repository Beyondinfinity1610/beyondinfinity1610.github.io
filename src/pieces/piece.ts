// SetPiece: mount/unmount/fit/frame/renderOnce/active/target — spec §7.2.
//
// ScrollTrigger is a measuring device, not an animator, for anything on a
// canvas (spec §5.2). onUpdate writes a plain number to `target`; the piece
// runs its own frame-rate-independent damped follow toward it every frame:
//   p += (target - p) * (1 - exp(-8 * dt))
// Not `scrub` — see spec §5.2 for the four reasons. GSAP animates the DOM.
// Pieces animate themselves. Two domains, no overlap.

export interface SetPiece {
  readonly id: string;
  /** Written by a ScrollTrigger onUpdate — a plain number, never tweened directly. */
  target: number;
  /** The piece's own damped-follow position, advanced in frame(dt). */
  readonly p: number;
  /** Set by Director.setActive, driven by a ScrollTrigger onToggle only. */
  active: boolean;

  mount(): void;
  unmount(): void;
  fit(width: number, height: number): void;
  frame(dt: number): void;
  /** Render exactly one static frame — used under prefers-reduced-motion. */
  renderOnce(): void;
}

const FOLLOW_RATE = 8; // spec §5.2

export abstract class BasePiece implements SetPiece {
  target = 0;
  active = false;
  private _p = 0;

  constructor(public readonly id: string) {}

  get p(): number {
    return this._p;
  }

  mount(): void {}
  unmount(): void {}
  fit(_width: number, _height: number): void {}

  frame(dt: number): void {
    this._p += (this.target - this._p) * (1 - Math.exp(-FOLLOW_RATE * dt));
    this.draw();
  }

  renderOnce(): void {
    this._p = this.target;
    this.draw();
  }

  protected abstract draw(): void;
}
