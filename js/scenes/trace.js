/**
 * The Quiet Signal.
 *
 * A single recording pen crosses the page. Where it has passed, the name is
 * legible; ahead of it, nothing. Behind it, a slow field of older traces
 * receding into the dark.
 *
 * Deliberately canvas 2D rather than WebGL: one hairline drawn precisely is
 * more elegant than a hundred thousand points, and it costs nothing to start.
 */

const TAU = Math.PI * 2;

export class QuietSignal {
  constructor(canvas, { onProgress, reduced = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onProgress = onProgress;
    this.reduced = reduced;

    this.t = 0;
    this.pen = reduced ? 1 : 0;       // 0..1 — how far the pen has crossed
    this.scroll = 0;
    this.pointer = { x: -1, y: -1, on: 0 };

    // Layered traces. Depth 0 is the pen; the rest sit further back and dimmer.
    this.layers = Array.from({ length: 7 }, (_, i) => ({
      depth: i,
      y: 0,
      amp: 0,
      phase: i * 1.7 + 0.4,
      speed: 0.055 + i * 0.011,
      seed: i * 37.7,
    }));

    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;

    // The stack sits below the copy, not through it. Text legibility beats
    // any amount of atmosphere.
    this.layers.forEach((l, i) => {
      l.y = h * (0.705 + i * 0.052);
      l.amp = h * (0.020 - i * 0.0018);
    });
  }

  setPointer(x, y, on) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.tgt = on ? 1 : 0;
  }

  setScroll(v) { this.scroll = v; }

  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }

  /** Deterministic band-limited noise — the trace must look measured, not random. */
  _sample(l, x, t) {
    const n = x / this.W;
    let v = 0;
    v += Math.sin(n * 5.2 + t * l.speed * 6.0 + l.phase) * 1.00;
    v += Math.sin(n * 11.7 + t * l.speed * 9.5 + l.phase * 2.1) * 0.42;
    v += Math.sin(n * 23.1 + t * l.speed * 14.0 + l.phase * 3.3) * 0.17;
    v += Math.sin(n * 47.0 + t * l.speed * 21.0 + l.phase * 4.7) * 0.06;

    // one slow, rare event per trace — the reason any of this exists
    const cyc = (t * 0.045 + l.seed * 0.13) % 1;
    const front = cyc * 1.5 - 0.25;
    const env = Math.exp(-Math.pow((n - front) * 5.5, 2)) *
                Math.min(1, cyc * 6) * Math.max(0, 1 - Math.max(0, cyc - 0.75) * 4);
    v += env * Math.sin(n * 78) * 1.25;

    return { v, env };
  }

  update(dt) {
    if (!this.reduced) {
      this.t += dt;
      // the pen crosses once, unhurried, and never again
      if (this.pen < 1) {
        this.pen = Math.min(1, this.pen + dt * 0.42);
        this.onProgress?.(this.pen);
      }
    } else {
      this.t += dt;
    }

    this.pointer.on += ((this.pointer.tgt ?? 0) - this.pointer.on) * Math.min(1, dt * 4);

    const g = this.ctx, W = this.W, H = this.H;
    g.clearRect(0, 0, W, H);

    // ease the pen so it decelerates into the right margin
    const p = this.pen < 1 ? 1 - Math.pow(1 - this.pen, 2.4) : 1;
    const penX = p * W;

    // scroll lifts and fades the whole field rather than moving it
    const lift = this.scroll * H * 0.10;
    const fade = Math.max(0, 1 - this.scroll * 1.35);
    if (fade <= 0.002) return;

    const STEP = 2;

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i];

      // atmospheric falloff — the back of the stack is almost gone
      const depth = 1 - i / this.layers.length;
      const alpha = Math.pow(depth, 2.1) * 0.5 * fade;
      if (alpha < 0.004) continue;

      // trailing layers lag behind the pen, so the field fills in after it
      const reach = i === 0 ? penX : penX * (1 - i * 0.06);

      g.beginPath();
      let started = false;

      for (let x = 0; x <= Math.min(W, reach + 1); x += STEP) {
        const { v, env } = this._sample(l, x, this.t + i * 3.1);

        // a faint lens under the cursor: the trace leans toward it
        let py = l.y - lift * (i * 0.3 + 1);
        if (this.pointer.on > 0.01) {
          const dx = (x - this.pointer.x) / (W * 0.13);
          const pull = Math.exp(-dx * dx) * this.pointer.on;
          py += (this.pointer.y - py) * pull * 0.16;
        }

        const y = py + v * l.amp * (1 + env * 0.5);
        if (!started) { g.moveTo(x, y); started = true; } else { g.lineTo(x, y); }
      }

      g.strokeStyle = i === 0
        ? `rgba(228, 214, 194, ${alpha * 0.95})`
        : `rgba(190, 150, 106, ${alpha * 0.62})`;
      g.lineWidth = i === 0 ? 1.05 : 0.8;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.stroke();
    }

    // the nib: a small, precise point of light while it is still travelling
    if (this.pen < 1) {
      const l = this.layers[0];
      const { v, env } = this._sample(l, penX, this.t);
      const y = l.y - lift + v * l.amp * (1 + env * 0.5);

      const halo = g.createRadialGradient(penX, y, 0, penX, y, 46);
      halo.addColorStop(0, 'rgba(220, 170, 110, 0.30)');
      halo.addColorStop(1, 'rgba(220, 170, 110, 0)');
      g.fillStyle = halo;
      g.beginPath(); g.arc(penX, y, 46, 0, TAU); g.fill();

      g.fillStyle = 'rgba(246, 240, 230, 0.95)';
      g.beginPath(); g.arc(penX, y, 1.7, 0, TAU); g.fill();
    }
  }
}
