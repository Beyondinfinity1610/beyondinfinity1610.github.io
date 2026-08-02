/* ============================================================
   instrument.js — the two canvas-2D layers that thread the page.

   1. The montage: a stack of recording channels receding toward a
      vanishing point, behind the hero. Canvas rather than WebGL so
      the page is drawn on the first frame — there is no preloader.
   2. The rail: one continuous hairline running down the left margin
      for the whole document, like paper feeding through a chart
      recorder. Its character is set by whichever section is on
      screen, so the page reads as a single uninterrupted recording.

   Nothing here is measured data. It is generated geometry.
   ============================================================ */

const TAU = Math.PI * 2;

/* Deterministic value noise — smooth, cheap, and identical every load. */
function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u - 0.5;
}

/* A plausible-looking biosignal: a few oscillatory components, a slow
   baseline wander, and occasional bursts. `k` decorrelates channels. */
function signal(x, k, busy) {
  let v =
    0.42 * Math.sin(x * 0.9 + k * 2.1) +
    0.24 * Math.sin(x * 2.3 + k * 5.7) +
    0.14 * Math.sin(x * 5.1 + k * 1.3);
  v += 0.9 * noise(x * 1.7 + k * 40);
  v += 0.5 * noise(x * 7.3 + k * 91) * (0.35 + busy);

  /* bursts — rhythmic runs that come and go */
  const env = noise(x * 0.11 + k * 17) + 0.5;
  if (env > 0.62) {
    const g = (env - 0.62) / 0.38;
    v += g * busy * 1.5 * Math.sin(x * 11.5 + k);
  }
  return v * 0.55;
}

/* ---------------------------------------------------------------- */

export class Instrument {
  constructor(montageCanvas, railCanvas) {
    this.mc = montageCanvas;
    this.rc = railCanvas;
    this.mx = montageCanvas.getContext('2d');
    this.rx = railCanvas.getContext('2d');

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0; this.h = 0;

    this.heroP = 0;      // 0 at top of page, 1 once the hero has left
    this.scroll = 0;
    this.busy = 0.25;    // signal agitation, per section
    this.redact = 0;     // 0 → 1, rail becomes a redacted line
    this.montageDrawn = false;

    this.channels = 7;
    this.resize();
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [this.mc, this.rc]) {
      c.width = Math.round(this.w * this.dpr);
      c.height = Math.round(this.h * this.dpr);
      c.style.width = this.w + 'px';
      c.style.height = this.h + 'px';
    }
    this.mx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.rx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.montageDrawn = false;

    /* The rail hides below the width where the left gutter disappears. */
    this.railX = this.w < 760 ? -100 : Math.max(26, Math.min(58, this.w * 0.035));
  }

  /* ---------------------------------------------------------- montage */

  drawMontage(t) {
    const x = this.mx;
    const p = this.heroP;

    if (p >= 1) {
      /* Wipe once when it stops updating, or the last painted frame
         sits over the rest of the page forever. */
      if (this.montageDrawn) {
        x.clearRect(0, 0, this.w, this.h);
        this.montageDrawn = false;
      }
      return;
    }

    x.clearRect(0, 0, this.w, this.h);
    this.montageDrawn = true;

    const W = this.w, H = this.h;
    const cx = W * 0.5;
    const horizon = H * 0.16;
    const fade = Math.pow(1 - p, 1.35);

    x.save();
    x.translate(0, -p * H * 0.22);

    for (let i = this.channels - 1; i >= 0; i--) {
      const d = i / (this.channels - 1);        // 0 = nearest
      const s = 1 / (1 + d * 2.6);              // perspective scale
      const base = horizon + (H * 0.78) * s;
      const half = W * 0.62 * s;
      const amp = H * 0.075 * s;
      const near = Math.pow(s, 1.35);

      const step = Math.max(3, 7 - Math.round(near * 4));
      x.beginPath();
      for (let px = -half; px <= half; px += step) {
        const u = (px / (W * 0.6)) * 5.2 + t * 0.42 + i * 0.9;
        const y = base + signal(u, i * 3.7, this.busy) * amp;
        const sx = cx + px;
        if (px === -half) x.moveTo(sx, y); else x.lineTo(sx, y);
      }

      /* Edges of each trace dissolve rather than stopping abruptly. */
      const grad = x.createLinearGradient(cx - half, 0, cx + half, 0);
      const a = 0.85 * near * fade;
      grad.addColorStop(0, 'rgba(142,197,240,0)');
      grad.addColorStop(0.18, `rgba(142,197,240,${a * 0.55})`);
      grad.addColorStop(0.52, `rgba(233,238,244,${a})`);
      grad.addColorStop(0.85, `rgba(142,197,240,${a * 0.5})`);
      grad.addColorStop(1, 'rgba(142,197,240,0)');

      x.strokeStyle = grad;
      x.lineWidth = Math.max(0.65, 1.5 * near);
      x.lineJoin = 'round';

      if (i === 0) {
        x.shadowColor = 'rgba(142,197,240,0.5)';
        x.shadowBlur = 18 * fade;
      }
      x.stroke();
      x.shadowBlur = 0;
    }

    /* A single travelling marker on the nearest channel — the pen. */
    const s0 = 1;
    const base0 = horizon + H * 0.78;
    const travel = ((t * 0.11) % 1);
    const mx = cx - W * 0.6 + travel * W * 1.2;
    const u = ((mx - cx) / (W * 0.6)) * 5.2 + t * 0.42;
    const my = base0 + signal(u, 0, this.busy) * H * 0.075 * s0;
    x.beginPath();
    x.arc(mx, my, 1.9, 0, TAU);
    x.fillStyle = `rgba(255,190,140,${0.9 * fade})`;
    x.shadowColor = 'rgba(255,170,110,0.9)';
    x.shadowBlur = 14 * fade;
    x.fill();
    x.shadowBlur = 0;

    x.restore();

    /* Clear ground under the hero footer — the nearest channel is the
       brightest and would otherwise cross the line of type. */
    const cut = x.createLinearGradient(0, H * 0.80, 0, H);
    cut.addColorStop(0, 'rgba(0,0,0,0)');
    cut.addColorStop(1, 'rgba(0,0,0,1)');
    x.save();
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = cut;
    x.fillRect(0, H * 0.80, W, H * 0.20);
    x.restore();
  }

  /* ------------------------------------------------------------- rail */

  drawRail() {
    const x = this.rx;
    x.clearRect(0, 0, this.w, this.h);

    if (this.railX < 0) return;
    const appear = Math.min(1, Math.max(0, (this.heroP - 0.25) / 0.5));
    if (appear <= 0.001) return;

    const H = this.h;
    const X = this.railX;
    const amp = 13 + this.busy * 16;
    const sc = this.scroll;

    /* Scale ticks every 120 document pixels, so they travel with the page. */
    x.save();
    x.globalAlpha = appear * 0.5;
    x.strokeStyle = 'rgba(142,197,240,0.22)';
    x.lineWidth = 1;
    const first = Math.floor(sc / 120) * 120;
    for (let d = first; d < sc + H + 120; d += 120) {
      const y = Math.round(d - sc) + 0.5;
      const major = (d / 120) % 5 === 0;
      x.beginPath();
      x.moveTo(X - (major ? 9 : 4), y);
      x.lineTo(X - 1, y);
      x.stroke();
    }
    x.restore();

    /* The trace itself. Deflection is a function of document position,
       so the line is anchored to the page rather than to the screen. */
    const r = this.redact;
    x.save();
    x.globalAlpha = appear;

    if (r < 0.98) {
      x.beginPath();
      for (let y = -4; y <= H + 4; y += 4) {
        const u = (y + sc) * 0.012;
        const v = signal(u, 11.3, this.busy) * (1 - r);
        const px = X + v * amp;
        if (y === -4) x.moveTo(px, y); else x.lineTo(px, y);
      }
      const g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(142,197,240,0.10)');
      g.addColorStop(0.35, 'rgba(233,238,244,0.44)');
      g.addColorStop(0.65, 'rgba(233,238,244,0.44)');
      g.addColorStop(1, 'rgba(142,197,240,0.10)');
      x.strokeStyle = g;
      x.lineWidth = 1.15;
      x.lineJoin = 'round';
      x.stroke();
    }

    /* Under redaction the recording continues, struck out. */
    if (r > 0.02) {
      x.globalAlpha = appear * r;
      x.fillStyle = 'rgba(233,238,244,0.32)';
      const start = Math.floor((sc - 60) / 26) * 26;
      for (let d = start; d < sc + H + 60; d += 26) {
        const y = d - sc;
        const len = 8 + Math.floor(hash(d * 0.037) * 12);
        x.fillRect(X - 1, y, 2.5, len);
      }
    }

    /* The present moment — a fixed reference mark at eye level. */
    x.globalAlpha = appear;
    const my = H * 0.5;
    x.strokeStyle = 'rgba(255,157,77,0.8)';
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(X - 14, my + 0.5);
    x.lineTo(X - 5, my + 0.5);
    x.stroke();
    x.restore();
  }

  frame(t) {
    this.drawMontage(t);
    this.drawRail();
  }
}
