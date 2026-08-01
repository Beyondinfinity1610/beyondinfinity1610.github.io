import { ABLATIONS, CAMPAIGNS, STATUS_STYLE } from '../data/ablations.js';

/**
 * The Ablation Observatory.
 *
 * Thirty-three experiments, plotted in the three registers of evidence they
 * actually belong to — because collapsing them onto one axis would be a lie:
 *
 *   CLINICAL   event-level F1 under Any-Overlap scoring. What a neurologist reads.
 *   WINDOW     per-window false alarms against the baseline. What training optimises.
 *   VERIFY     deployment and statistics work that produces no F1 at all.
 */

const LANES = [
  { key: 'clinical', label: 'Clinical · event-level F1', y0: 0.06, y1: 0.30 },
  { key: 'window',   label: 'Window-level false alarms', y0: 0.34, y1: 0.80 },
  { key: 'verify',   label: 'Deployment & verification', y0: 0.84, y1: 0.965 },
];

const BASELINE_FP = 468;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function laneOf(a) {
  if (a.level === 'event') return 'clinical';
  if (a.fp === null || a.fp === undefined) return 'verify';
  return 'window';
}

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
      a,
      lane: laneOf(a),
      order: i,
      x: 0, y: 0, r: 0,
      appear: 0,
      pulse: Math.random(),
    }));

    this._layoutOrder();
    this._buildLegend();
    this._bind();
    this._show(null);
    this.resize();
    this.render(0);
  }

  _layoutOrder() {
    // within each lane, keep campaign order — the chart reads left to right as
    // the campaign actually unfolded
    const byLane = {};
    this.items.forEach((it) => (byLane[it.lane] ||= []).push(it));
    Object.values(byLane).forEach((list) => list.forEach((it, i) => { it.slot = i; it.slots = list.length; }));
  }

  _buildLegend() {
    if (!this.legend) return;
    this.legend.innerHTML = '';
    Object.values(CAMPAIGNS).forEach((c) => {
      const b = document.createElement('button');
      b.className = 'ab-key';
      b.type = 'button';
      b.innerHTML = `<i style="background:${c.color}"></i>${c.label}`;
      b.addEventListener('click', () => {
        if (this.hidden.has(c.key)) this.hidden.delete(c.key); else this.hidden.add(c.key);
        b.classList.toggle('off', this.hidden.has(c.key));
      });
      this.legend.appendChild(b);
    });

    const f = document.createElement('button');
    f.className = 'ab-key';
    f.type = 'button';
    f.innerHTML = `<i style="background:${STATUS_STYLE.failed.color}"></i>Failed`;
    f.title = 'Experiments that made things worse. Roughly a third of the campaign.';
    this.legend.appendChild(f);
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
      this.story = null;
    });

    if (this.storyBtn) {
      this.storyBtn.addEventListener('click', () => this._runStory());
    }
  }

  _pick() {
    let best = null, bd = 26 * 26;
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
    const path = ['B0_control', 'B6_eeg_only', 'B2_no_gate', 'B12_phase3_warm_restart', 'C6_se_gate', 'C3_tcn_encoder', 'C5_deep_mult', 'C13_high_aug_tcn', 'D1_winner_ensemble'];
    let k = 0;
    clearInterval(this._storyTimer);
    const step = () => {
      const it = this.items.find((i) => i.a.id === path[k]);
      if (it) { this.pinned = it; this._show(it); it.appear = 1; it.flash = 1; }
      k++;
      if (k >= path.length) clearInterval(this._storyTimer);
    };
    step();
    this._storyTimer = setInterval(step, 2600);
  }

  _show(it) {
    if (!this.detail) return;
    if (!it) {
      this.detail.innerHTML = `
        <span class="ab-id">33 experiments</span>
        <h4>Most of research is the graveyard.</h4>
        <div class="ab-field"><dd>Every point is one full training run of a four-modality network. Roughly a third of them made the model measurably worse — and those are the ones that determined the final architecture, because a component you cannot break is a component you have not tested.</dd></div>
        <div class="ab-field"><dt>Read the chart</dt><dd>Top lane is clinical event-level F1, the number a neurologist would actually read. Middle lane is per-window false alarms against the baseline of ${BASELINE_FP} — lower is higher. Bottom lane is deployment work that produces no F1 at all.</dd></div>
        <p class="ab-hint">Hover any point. Click to pin it. Or press <b>Walk the campaign</b> to follow the path that led to the final model.</p>`;
      return;
    }

    const a = it.a;
    const st = STATUS_STYLE[a.status];
    const camp = CAMPAIGNS[a.c];
    const metrics = [];
    if (a.level === 'event') {
      if (a.f1 != null && !a.pending) metrics.push(['Event F1', (a.f1 * 100).toFixed(2) + '%']);
      if (a.prec != null) metrics.push(['Precision', (a.prec * 100).toFixed(2) + '%']);
      if (a.fp != null && a.prec !== 0.9118) metrics.push(['False pos.', a.fp]);
      if (a.far != null) metrics.push(['FP / 24h', a.far]);
      if (a.brier != null) metrics.push(['Brier', a.brier]);
    } else {
      if (a.f1 != null) metrics.push(['Window F1', a.f1.toFixed(4)]);
      if (a.fp != null) metrics.push(['False pos.', a.fp]);
      if (a.sens != null) metrics.push(['Sensitivity', (a.sens * 100).toFixed(1) + '%']);
    }

    this.detail.innerHTML = `
      <span class="ab-id">${a.id}</span>
      <h4>${a.name}</h4>
      <span class="ab-badge" style="color:${st.color}">${st.label} · ${camp.label.split(' · ')[1]}</span>
      <dl class="ab-field"><dt>Hypothesis</dt><dd>${a.aim}</dd></dl>
      <dl class="ab-field"><dt>What was done</dt><dd>${a.did}</dd></dl>
      <dl class="ab-field"><dt>What it taught</dt><dd>${a.took}</dd></dl>
      ${metrics.length ? `<div class="ab-metrics">${metrics.map(([k, v]) => `<span class="ab-metric"><small>${k}</small> ${v}</span>`).join('')}</div>` : ''}
      ${a.pending ? '<p class="ab-hint">Full continuous-dataset evaluation in progress.</p>' : ''}`;
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

  _positions() {
    const padL = 78, padR = 34;
    const W = this.W, H = this.H;

    LANES.forEach((lane) => {
      const list = this.items.filter((i) => i.lane === lane.key);
      const yTop = H * lane.y0, yBot = H * lane.y1;

      list.forEach((it, i) => {
        const a = it.a;
        const fx = list.length === 1 ? 0.5 : i / (list.length - 1);
        it.x = padL + fx * (W - padL - padR);

        if (lane.key === 'clinical') {
          // 0.44 .. 0.55 event F1 mapped across the lane
          const v = a.prec === 0.9118 ? 0.55 : (a.f1 ?? 0.47);
          const n = (v - 0.44) / (0.56 - 0.44);
          it.y = yBot - Math.max(0, Math.min(1, n)) * (yBot - yTop);
          it.r = 9 + (a.status === 'champion' ? 4 : 0);
        } else if (lane.key === 'window') {
          // false alarms, inverted so "better" is up. C6 collapsed — park it at the floor.
          const fp = a.f1 === 0 ? 1000 : a.fp;
          const n = (Math.log(fp) - Math.log(400)) / (Math.log(1000) - Math.log(400));
          it.y = yTop + Math.max(0, Math.min(1, n)) * (yBot - yTop);
          it.r = 5 + (a.f1 ?? 0) * 22;
        } else {
          it.y = (yTop + yBot) / 2 + (i % 2 ? -9 : 9);
          it.r = 6.5;
        }
      });
    });

    // baseline reference line position
    const wl = LANES[1];
    const n = (Math.log(BASELINE_FP) - Math.log(400)) / (Math.log(1000) - Math.log(400));
    this.baselineY = H * wl.y0 + n * (H * wl.y1 - H * wl.y0);
  }

  render(dt) {
    const g = this.ctx, W = this.W, H = this.H;
    this.time += dt;
    // wall-clock, not accumulated dt: a throttled tab must not strand the
    // entrance animation half-drawn
    if (this.started) this.reveal = Math.min(1, (performance.now() - this.t0) / 1400);

    g.clearRect(0, 0, W, H);

    // --- lane chrome -------------------------------------------------------
    g.save();
    g.font = '400 9.5px "JetBrains Mono", monospace';
    g.textBaseline = 'top';
    LANES.forEach((lane, li) => {
      const yTop = H * lane.y0, yBot = H * lane.y1;
      g.fillStyle = li === 1 ? 'rgba(160,190,255,0.028)' : 'rgba(160,190,255,0.014)';
      g.fillRect(0, yTop - 14, W, yBot - yTop + 22);

      g.strokeStyle = 'rgba(160,190,255,0.10)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, yTop - 14.5); g.lineTo(W, yTop - 14.5); g.stroke();

      g.fillStyle = 'rgba(107,116,140,0.9)';
      g.letterSpacing = '1.6px';
      g.fillText(lane.label.toUpperCase(), 14, yTop - 9);
    });

    // baseline marker
    g.setLineDash([3, 5]);
    g.strokeStyle = 'rgba(255,196,107,0.34)';
    g.beginPath(); g.moveTo(0, this.baselineY); g.lineTo(W, this.baselineY); g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,196,107,0.75)';
    g.fillText(`BASELINE  ${BASELINE_FP} FP`, W - 128, this.baselineY - 13);
    g.restore();

    const visible = this.items.filter((it) => !this.hidden.has(it.a.c));

    // --- the discovery path ------------------------------------------------
    const path = ['B0_control', 'B11_pre_cached', 'B12_phase3_warm_restart', 'C3_tcn_encoder', 'C5_deep_mult', 'C13_high_aug_tcn', 'C14_unified_hybrid', 'D1_winner_ensemble']
      .map((id) => this.items.find((i) => i.a.id === id))
      .filter((i) => i && !this.hidden.has(i.a.c));

    if (path.length > 1) {
      g.save();
      const grad = g.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(77,219,255,0.10)');
      grad.addColorStop(0.6, 'rgba(157,123,255,0.24)');
      grad.addColorStop(1, 'rgba(92,232,176,0.34)');
      g.strokeStyle = grad;
      g.lineWidth = 1.2;
      g.setLineDash([2, 6]);
      g.lineDashOffset = -this.time * 22;
      g.beginPath();
      path.forEach((it, i) => (i ? g.lineTo(it.x, it.y) : g.moveTo(it.x, it.y)));
      g.stroke();
      g.restore();
    }

    // --- points ------------------------------------------------------------
    const active = this.hover || this.pinned;

    visible.forEach((it) => {
      const a = it.a;
      const stagger = (it.slot / Math.max(1, it.slots)) * 0.65;
      const local = clamp01((this.reveal - stagger) / 0.3);
      it.appear = local * local * (3 - 2 * local);
      if (it.flash) it.flash = Math.max(0, it.flash - dt * 0.8);

      const camp = CAMPAIGNS[a.c];
      const st = STATUS_STYLE[a.status];
      const isActive = active === it;
      const dim = active && !isActive ? 0.34 : 1;

      const bob = Math.sin(this.time * 0.9 + it.pulse * 6.28) * 1.6;
      const x = it.x, y = it.y + bob;
      const r = it.r * it.appear * (isActive ? 1.35 : 1);

      if (r < 0.3) return;

      // glow
      const glow = g.createRadialGradient(x, y, 0, x, y, r * (isActive ? 6 : 3.6));
      const gc = a.status === 'champion' ? st.color : camp.color;
      glow.addColorStop(0, this._rgba(gc, 0.5 * dim * (isActive ? 1 : 0.55) + (it.flash || 0) * 0.5));
      glow.addColorStop(1, this._rgba(gc, 0));
      g.fillStyle = glow;
      g.beginPath(); g.arc(x, y, r * (isActive ? 6 : 3.6), 0, 6.2832); g.fill();

      // failures render as a hollow ring — visible, but not celebrated
      if (a.status === 'failed') {
        g.strokeStyle = this._rgba(STATUS_STYLE.failed.color, 0.9 * dim);
        g.lineWidth = 1.6;
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke();
        g.strokeStyle = this._rgba(STATUS_STYLE.failed.color, 0.45 * dim);
        g.beginPath();
        g.moveTo(x - r * 0.55, y - r * 0.55); g.lineTo(x + r * 0.55, y + r * 0.55);
        g.moveTo(x + r * 0.55, y - r * 0.55); g.lineTo(x - r * 0.55, y + r * 0.55);
        g.stroke();
      } else {
        g.fillStyle = this._rgba(camp.color, (a.status === 'champion' ? 1 : 0.72) * dim);
        g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();

        if (a.status === 'champion') {
          g.strokeStyle = this._rgba(STATUS_STYLE.champion.color, 0.95 * dim);
          g.lineWidth = 1.4;
          g.beginPath(); g.arc(x, y, r + 5 + Math.sin(this.time * 2 + it.pulse * 6) * 1.2, 0, 6.2832); g.stroke();
        }
      }

      // label the champions permanently; everything else on hover
      if (a.status === 'champion' || isActive) {
        g.save();
        g.font = '400 9.5px "JetBrains Mono", monospace';
        g.letterSpacing = '0.6px';
        g.fillStyle = this._rgba(isActive ? '#ffffff' : gc, (isActive ? 1 : 0.72) * dim * it.appear);
        g.textAlign = x > W - 110 ? 'right' : 'left';
        const ox = x > W - 110 ? -r - 8 : r + 8;
        g.fillText(a.id.split('_')[0], x + ox, y + 3.5);
        g.restore();
      }
    });

    // crosshair readout
    if (this.hover) {
      g.save();
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 1;
      g.setLineDash([1, 4]);
      g.beginPath();
      g.moveTo(this.hover.x, 0); g.lineTo(this.hover.x, H);
      g.stroke();
      g.restore();
    }
  }

  _rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
  }
}
