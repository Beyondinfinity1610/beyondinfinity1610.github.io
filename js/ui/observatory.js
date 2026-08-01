import { ABLATIONS, CAMPAIGNS, STATUS_STYLE, BASELINES } from '../data/ablations.js';

/**
 * The Ablation Observatory.
 *
 * Four registers, because flattening them onto one axis is the exact mistake
 * this project is about. The middle lane is deliberately labelled as the metric
 * that misled me — the superseded results stay on the chart.
 */

const LANES = [
  { key: 'auroc',  label: 'Official split · continuous AUROC · the fair test', y0: 0.055, y1: 0.30, lo: 0.695, hi: 0.795 },
  { key: 'event',  label: 'Held-out continuous · event-level F1',              y0: 0.355, y1: 0.53, lo: 0.13,  hi: 0.35 },
  { key: 'window', label: 'Balanced-split window F1 · the metric that misled me', y0: 0.585, y1: 0.775, lo: 0.15, hi: 0.245, muted: true },
  { key: 'verify', label: 'Diagnosis & verification · no score, most value',    y0: 0.83,  y1: 0.955 },
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class Observatory {
  constructor({ canvas, detail, legend, storyBtn }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.detail = detail;
    this.legend = legend;
    this.storyBtn = storyBtn;

    this.hidden = new Set();
    this.hover = null;
    this.pinned = null;
    this.time = 0;
    this.reveal = 0;
    this.started = false;
    this.mouse = { x: -1e4, y: -1e4 };

    this.items = ABLATIONS.map((a, i) => ({
      a, lane: a.lane, order: i, x: 0, y: 0, r: 0, appear: 0,
      pulse: (i * 0.37) % 1,
    }));

    const byLane = {};
    this.items.forEach((it) => (byLane[it.lane] ||= []).push(it));
    Object.values(byLane).forEach((list) => list.forEach((it, i) => { it.slot = i; it.slots = list.length; }));

    this._buildLegend();
    this._bind();
    this._show(null);
    this.resize();
    this.render(0);
  }

  _buildLegend() {
    if (!this.legend) return;
    this.legend.innerHTML = '';
    Object.values(CAMPAIGNS).forEach((c) => {
      const b = document.createElement('button');
      b.className = 'ab-key';
      b.type = 'button';
      b.innerHTML = `<i style="background:${c.color}"></i>${c.label}`;
      b.title = c.blurb;
      b.addEventListener('click', () => {
        if (this.hidden.has(c.key)) this.hidden.delete(c.key); else this.hidden.add(c.key);
        b.classList.toggle('off', this.hidden.has(c.key));
      });
      this.legend.appendChild(b);
    });
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this._pick();
    });
    c.addEventListener('pointerleave', () => {
      this.mouse.x = this.mouse.y = -1e4;
      this.hover = null;
      this._show(this.pinned);
    });
    c.addEventListener('click', () => {
      this.pinned = this.hover;
      this._show(this.pinned);
      clearInterval(this._storyTimer);
    });
    if (this.storyBtn) this.storyBtn.addEventListener('click', () => this._runStory());
  }

  _pick() {
    let best = null, bd = 28 * 28;
    for (const it of this.items) {
      if (this.hidden.has(it.a.c)) continue;
      const dx = this.mouse.x - it.x, dy = this.mouse.y - it.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = it; }
    }
    if (best !== this.hover) {
      this.hover = best;
      this.canvas.style.cursor = best ? 'pointer' : 'crosshair';
      this._show(best || this.pinned);
    }
  }

  _runStory() {
    const path = [
      'C5_deep_mult', 'E3_time_ordered_eval', 'E2_inert_fusion', 'E1_window_bottleneck',
      'E4_hr_biomarker', 'F0_evidence_model', 'F1_official_split', 'F6_handcrafted', 'E6_human_ceiling',
    ];
    let k = 0;
    clearInterval(this._storyTimer);
    const step = () => {
      const it = this.items.find((i) => i.a.id === path[k]);
      if (it) { this.pinned = it; this._show(it); it.flash = 1; }
      if (++k >= path.length) clearInterval(this._storyTimer);
    };
    step();
    this._storyTimer = setInterval(step, 3200);
  }

  _show(it) {
    if (!this.detail) return;
    if (!it) {
      this.detail.innerHTML = `
        <span class="ab-id">${ABLATIONS.length} experiments · 5 campaigns</span>
        <h4>I spent months optimising a number that turned out to be meaningless.</h4>
        <div class="ab-field"><dd>Every point is a real run. The middle lane is the metric I trusted for most of a year — a balanced validation set that flattered the model. The top lane is the honest one: the official published split, scored on the full continuous recording. The gap between those two lanes is the whole story.</dd></div>
        <div class="ab-field"><dt>Read the chart</dt><dd>Top: continuous AUROC against the published SVM and ChronoNet baselines. Second: event-level F1 on held-out patients. Third: the superseded window metric, kept on the chart on purpose. Bottom: findings that produce no score at all — which is where the real work is.</dd></div>
        <p class="ab-hint">Hover any point. Click to pin. Or press <b>Walk the campaign</b> to follow it in the order it actually happened.</p>`;
      return;
    }

    const a = it.a;
    const st = STATUS_STYLE[a.status];
    const camp = CAMPAIGNS[a.c];
    const m = [];
    if (a.auroc != null) m.push(['AUROC', a.auroc.toFixed(3) + (a.best ? ` (best ${a.best.toFixed(3)})` : '')]);
    if (a.f1 != null && a.lane === 'event') m.push(['Event F1', a.f1.toFixed(3)]);
    if (a.lopo != null) m.push(['LOPO F1', a.lopo.toFixed(3)]);
    if (a.recall != null) m.push(['Recall', Math.round(a.recall * 100) + '%']);
    if (a.prec != null) m.push(['Precision', Math.round(a.prec * 100) + '%']);
    if (a.farh != null) m.push(['FA / hour', a.farh]);
    if (a.farday != null) m.push(['FA / day', a.farday]);
    if (a.f1 != null && a.lane === 'window') m.push(['Window F1', a.f1.toFixed(4)]);
    if (a.fp != null && a.lane === 'window') m.push(['False pos.', a.fp]);

    this.detail.innerHTML = `
      <span class="ab-id">${a.id}</span>
      <h4>${a.name}</h4>
      <span class="ab-badge" style="color:${st.color}">${st.label} · ${camp.label.split(' · ')[1]}</span>
      <dl class="ab-field"><dt>Why</dt><dd>${a.aim}</dd></dl>
      <dl class="ab-field"><dt>What I did</dt><dd>${a.did}</dd></dl>
      <dl class="ab-field"><dt>What it taught</dt><dd>${a.took}</dd></dl>
      ${m.length ? `<div class="ab-metrics">${m.map(([k, v]) => `<span class="ab-metric"><small>${k}</small> ${v}</span>`).join('')}</div>` : ''}`;
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.t0 = performance.now();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
    this._positions();
  }

  _laneY(lane, v) {
    const yTop = this.H * lane.y0, yBot = this.H * lane.y1;
    const n = clamp01((v - lane.lo) / (lane.hi - lane.lo));
    return yBot - n * (yBot - yTop);
  }

  _positions() {
    const padL = 62, padR = 140;   // right gutter reserved for the baseline labels
    const W = this.W;

    LANES.forEach((lane) => {
      const list = this.items.filter((i) => i.lane === lane.key);
      const yTop = this.H * lane.y0, yBot = this.H * lane.y1;

      list.forEach((it, i) => {
        const a = it.a;
        const fx = list.length === 1 ? 0.5 : i / (list.length - 1);
        it.x = padL + fx * (W - padL - padR);

        if (lane.key === 'auroc') {
          // experiments that produced no measurable gain sit on the lane floor
          it.y = a.auroc != null ? this._laneY(lane, a.auroc) : yBot + 6;
          it.noValue = a.auroc == null;
          it.r = a.auroc != null ? 8 : 5.5;
        } else if (lane.key === 'event') {
          it.y = this._laneY(lane, a.f1 ?? 0.15);
          it.r = 7 + (a.f1 ?? 0) * 16;
        } else if (lane.key === 'window') {
          it.y = this._laneY(lane, a.f1 ?? 0.16);
          it.r = 4.5 + (a.f1 ?? 0) * 14;
        } else {
          it.y = (yTop + yBot) / 2 + (i % 2 ? -10 : 10);
          it.r = 6.5;
        }
      });
    });

    this.baseY = BASELINES.map((b) => ({ ...b, y: this._laneY(LANES[0], b.auroc) }));
  }

  render(dt) {
    const g = this.ctx, W = this.W, H = this.H;
    this.time += dt;
    if (this.started) this.reveal = Math.min(1, (performance.now() - this.t0) / 1500);

    g.clearRect(0, 0, W, H);
    g.font = '400 9.5px "JetBrains Mono", monospace';
    g.textBaseline = 'top';

    // --- lane chrome -------------------------------------------------------
    LANES.forEach((lane) => {
      const yTop = H * lane.y0, yBot = H * lane.y1;
      g.fillStyle = lane.muted ? 'rgba(154,143,132,0.035)' : 'rgba(255,170,100,0.028)';
      g.fillRect(0, yTop - 15, W, yBot - yTop + 24);

      g.strokeStyle = 'rgba(255,170,100,0.12)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, yTop - 15.5); g.lineTo(W, yTop - 15.5); g.stroke();

      g.fillStyle = lane.muted ? 'rgba(154,143,132,0.85)' : 'rgba(185,175,163,0.9)';
      g.letterSpacing = '1.6px';
      g.fillText(lane.label.toUpperCase(), 12, yTop - 10);
    });

    // --- published baselines, drawn as the bar to clear ---------------------
    this.baseY.forEach((b) => {
      g.save();
      g.setLineDash([3, 5]);
      g.strokeStyle = b.auroc > 0.75 ? 'rgba(255,59,92,0.42)' : 'rgba(255,196,77,0.38)';
      g.beginPath(); g.moveTo(0, b.y); g.lineTo(W - 134, b.y); g.stroke();
      g.setLineDash([]);
      g.fillStyle = b.auroc > 0.75 ? 'rgba(255,59,92,0.9)' : 'rgba(255,196,77,0.85)';
      g.textAlign = 'left';
      g.fillText(`${b.name.split(' ')[0].toUpperCase()}  ${b.auroc.toFixed(3)}`, W - 128, b.y - 5);
      g.restore();
    });

    const visible = this.items.filter((it) => !this.hidden.has(it.a.c));
    const active = this.hover || this.pinned;

    visible.forEach((it) => {
      const a = it.a;
      const stagger = (it.slot / Math.max(1, it.slots)) * 0.6;
      const local = clamp01((this.reveal - stagger) / 0.35);
      it.appear = local * local * (3 - 2 * local);
      if (it.flash) it.flash = Math.max(0, it.flash - dt * 0.7);

      const camp = CAMPAIGNS[a.c];
      const st = STATUS_STYLE[a.status];
      const isActive = active === it;
      const laneMuted = LANES.find((l) => l.key === it.lane)?.muted;
      const dim = (active && !isActive ? 0.3 : 1) * (laneMuted && !isActive ? 0.65 : 1);

      const bob = Math.sin(this.time * 0.9 + it.pulse * 6.28) * 1.5;
      const x = it.x, y = it.y + bob;
      const r = it.r * it.appear * (isActive ? 1.35 : 1);
      if (r < 0.3) return;

      const gc = a.status === 'champion' ? st.color : camp.color;

      const glow = g.createRadialGradient(x, y, 0, x, y, r * (isActive ? 6 : 3.6));
      glow.addColorStop(0, this._rgba(gc, 0.5 * dim * (isActive ? 1 : 0.5) + (it.flash || 0) * 0.5));
      glow.addColorStop(1, this._rgba(gc, 0));
      g.fillStyle = glow;
      g.beginPath(); g.arc(x, y, r * (isActive ? 6 : 3.6), 0, 6.2832); g.fill();

      if (a.status === 'failed') {
        g.strokeStyle = this._rgba(STATUS_STYLE.failed.color, 0.9 * dim);
        g.lineWidth = 1.6;
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke();
        g.beginPath();
        g.moveTo(x - r * 0.5, y - r * 0.5); g.lineTo(x + r * 0.5, y + r * 0.5);
        g.moveTo(x + r * 0.5, y - r * 0.5); g.lineTo(x - r * 0.5, y + r * 0.5);
        g.strokeStyle = this._rgba(STATUS_STYLE.failed.color, 0.5 * dim);
        g.stroke();
      } else if (a.status === 'superseded') {
        // struck through — the number was real, the meaning was not
        g.fillStyle = this._rgba(STATUS_STYLE.superseded.color, 0.4 * dim);
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
        g.strokeStyle = this._rgba(STATUS_STYLE.superseded.color, 0.95 * dim);
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(x - r - 3, y + r + 3); g.lineTo(x + r + 3, y - r - 3); g.stroke();
      } else {
        g.fillStyle = this._rgba(camp.color, (a.status === 'champion' ? 1 : 0.7) * dim);
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
        if (a.status === 'champion') {
          g.strokeStyle = this._rgba(STATUS_STYLE.champion.color, 0.95 * dim);
          g.lineWidth = 1.4;
          g.beginPath(); g.arc(x, y, r + 5 + Math.sin(this.time * 2 + it.pulse * 6) * 1.1, 0, 6.2832); g.stroke();
        }
      }

      if (a.status === 'champion' || a.status === 'superseded' || isActive) {
        g.save();
        g.font = '400 9.5px "JetBrains Mono", monospace';
        g.letterSpacing = '0.6px';
        g.fillStyle = this._rgba(isActive ? '#f5efe6' : gc, (isActive ? 1 : 0.7) * dim * it.appear);
        const right = x > W - 190;
        g.textAlign = right ? 'right' : 'left';
        g.fillText(a.id.split('_')[0], x + (right ? -r - 8 : r + 8), y + 3.5);
        g.restore();
      }
    });

    if (this.hover) {
      g.save();
      g.strokeStyle = 'rgba(245,239,230,0.12)';
      g.lineWidth = 1;
      g.setLineDash([1, 4]);
      g.beginPath(); g.moveTo(this.hover.x, 0); g.lineTo(this.hover.x, H); g.stroke();
      g.restore();
    }
  }

  _rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
  }
}
