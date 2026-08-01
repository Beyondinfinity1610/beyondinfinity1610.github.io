import { NeuralField } from './scenes/field.js';
import { Teardown } from './scenes/teardown.js';
import { Topology } from './scenes/topology.js';
import { Observatory } from './ui/observatory.js';
import { BANDS } from './data/eeg.js';

/* ------------------------------------------------------------------ *
 * Environment
 * ------------------------------------------------------------------ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCED) document.documentElement.classList.add('no-motion');

function deviceTier() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (REDUCED) return 'low';
  if (coarse || small) return mem >= 6 && cores >= 6 ? 'mid' : 'low';
  if (mem >= 8 && cores >= 8) return 'high';
  if (mem >= 4 && cores >= 4) return 'mid';
  return 'low';
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

const TIER = hasWebGL() ? deviceTier() : null;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------ *
 * Preloader — an EEG trace drawing itself while the scenes compile
 * ------------------------------------------------------------------ */

/**
 * The ignition sequence.
 *
 * A tachometer self-test: the needle sweeps the full range, hits the redline,
 * settles to idle, and the montage comes alive underneath it. Loading progress
 * drives the sweep, so the animation is honest about what it is waiting for.
 */

const CX = 180, CY = 178, RAD = 126;
const A0 = 210, SPAN = 240;                     // degrees, clockwise from lower-left
const polar = (t, r) => {
  const a = ((A0 - t * SPAN) * Math.PI) / 180;
  return [CX + Math.cos(a) * r, CY - Math.sin(a) * r];
};
const arcPath = (t0, t1, r) => {
  const [x0, y0] = polar(t0, r);
  const [x1, y1] = polar(t1, r);
  const large = (t1 - t0) * SPAN > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const ign = {
  el: document.getElementById('preloader'),
  fill: document.getElementById('ign-fill'),
  needle: document.getElementById('ign-needle'),
  read: document.getElementById('ign-read'),
  trace: document.getElementById('ign-trace-path'),
  log: document.getElementById('ign-log'),
  value: 0,
  shown: 0,
  done: false,
};

const BOOT_LOG = [
  'Montage · 19 channels',
  'Sample rate · 250 Hz',
  'Bandpass · 0.5–45 Hz',
  'Modalities · EEG / ECG / EMG / motion',
  'Split · patient-level, seeded',
  'Renderer · WebGL',
  'Ignition',
];

function ignTrace(t, alive) {
  const pts = [];
  for (let x = 0; x <= 360; x += 3) {
    const n = x / 360;
    let y = 27;
    y += Math.sin(n * 7 + t * 6) * 8 * alive;
    y += Math.sin(n * 19 + t * 11) * 4.5 * alive;
    y += Math.sin(n * 41 + t * 3) * 2 * alive;
    const burst = Math.exp(-Math.pow((n - t) * 7, 2));
    y += burst * Math.sin(n * 90) * 15 * alive;
    pts.push(`${x} ${y.toFixed(2)}`);
  }
  return 'M' + pts.join(' L');
}

function buildGauge() {
  const NS = 'http://www.w3.org/2000/svg';
  const ticks = document.getElementById('ign-ticks');
  if (!ticks) return;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const major = i % 4 === 0;
    const red = t > 0.8;
    const [x0, y0] = polar(t, RAD - (major ? 15 : 8));
    const [x1, y1] = polar(t, RAD - 1);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x0.toFixed(2)); l.setAttribute('y1', y0.toFixed(2));
    l.setAttribute('x2', x1.toFixed(2)); l.setAttribute('y2', y1.toFixed(2));
    l.setAttribute('class', `ign-tick${major ? ' maj' : ''}${red ? ' red' : ''}`);
    ticks.appendChild(l);

    if (major) {
      const [lx, ly] = polar(t, RAD - 30);
      const tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', lx.toFixed(2));
      tx.setAttribute('y', (ly + 3).toFixed(2));
      tx.setAttribute('class', 'ign-tick-lbl');
      tx.textContent = String(i * 5);
      ticks.appendChild(tx);
    }
  }
  document.getElementById('ign-arc-bg')?.setAttribute('d', arcPath(0, 0.8, RAD));
  document.getElementById('ign-arc-red')?.setAttribute('d', arcPath(0.8, 1, RAD));
}

function setProgress(v) {
  ign.value = Math.max(ign.value, clamp01(v));
}

function drawIgnition(now) {
  if (!ign.el || ign.done) return;

  // the needle chases loading, but never snaps — it has mass
  ign.shown += (ign.value - ign.shown) * 0.07;
  const t = ign.shown;

  if (t > 0.004) ign.fill?.setAttribute('d', arcPath(0, Math.max(0.004, t), RAD));
  const [nx, ny] = polar(t, RAD - 22);
  const [bx, by] = polar(t, -16);
  ign.needle?.setAttribute('x1', bx.toFixed(2));
  ign.needle?.setAttribute('y1', by.toFixed(2));
  ign.needle?.setAttribute('x2', nx.toFixed(2));
  ign.needle?.setAttribute('y2', ny.toFixed(2));

  if (ign.read) ign.read.textContent = String(Math.round(t * 100)).padStart(2, '0');
  ign.trace?.setAttribute('d', ignTrace(t, Math.min(1, t * 1.3)));

  const li = Math.min(BOOT_LOG.length - 1, Math.floor(t * BOOT_LOG.length));
  if (ign.log && ign.log.dataset.i !== String(li)) {
    ign.log.dataset.i = String(li);
    ign.log.innerHTML = li === BOOT_LOG.length - 1 ? `<b>${BOOT_LOG[li]}</b>` : BOOT_LOG[li];
  }
}

function finishIgnition() {
  ign.done = true;
  ign.el?.classList.add('done');
  document.body.classList.remove('is-loading');
}

buildGauge();
setProgress(0.02);

/* ------------------------------------------------------------------ *
 * Reveal on scroll
 * ------------------------------------------------------------------ */

/**
 * Everything that enters on scroll is driven from one pass in `onScroll`
 * rather than from IntersectionObserver. IO callbacks are suspended in
 * throttled or background tabs, and a suspended callback here means content
 * that never becomes visible at all — too high a price for the convenience.
 */

const enterQueue = [];

function onEnter(el, fraction, fn) {
  enterQueue.push({ el, fraction, fn, done: false });
}

function checkEnters() {
  if (!enterQueue.length) return;
  let fired = false;
  for (const it of enterQueue) {
    // No lower bound: anything already above the viewport has been passed, so
    // it must resolve immediately. Otherwise a restored scroll position or a
    // deep link leaves headings invisible and counters reading zero.
    const r = it.el.getBoundingClientRect();
    if (r.top < vh * it.fraction) {
      it.done = true;
      fired = true;
      it.fn(it.el);
    }
  }
  if (fired) {
    for (let i = enterQueue.length - 1; i >= 0; i--) {
      if (enterQueue[i].done) enterQueue.splice(i, 1);
    }
  }
}

function initReveals() {
  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
    onEnter(el, 0.92, (e) => e.classList.add('revealed'));
  });
}

/* ------------------------------------------------------------------ *
 * Counters
 * ------------------------------------------------------------------ */

function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const decimals = (el.dataset.count.split('.')[1] || '').length;
  const write = (v) => { el.innerHTML = v.toFixed(decimals) + (suffix ? `<em>${suffix}</em>` : ''); };

  if (REDUCED) { write(target); return; }

  const dur = 1500;
  const t0 = performance.now();
  let settled = false;
  const tick = (now) => {
    if (settled) return;
    const p = clamp01((now - t0) / dur);
    write(target * (1 - Math.pow(1 - p, 3.2)));
    if (p < 1) requestAnimationFrame(tick); else settled = true;
  };
  requestAnimationFrame(tick);

  // A stalled frame loop must never leave a headline number reading zero.
  setTimeout(() => { settled = true; write(target); }, dur + 150);
}

function initCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => onEnter(el, 0.8, countUp));
}

/* ------------------------------------------------------------------ *
 * Sparklines in the problem panels
 * ------------------------------------------------------------------ */

function sparkPath(kind) {
  const W = 300, H = 42, mid = H / 2;
  const pts = [];
  for (let i = 0; i <= 150; i++) {
    const n = i / 150, x = n * W;
    let y = mid;
    if (kind === 'nonstationary') {
      // frequency and amplitude both drift across the window
      const f = 6 + n * 26;
      const a = 13 * (0.35 + 0.65 * Math.sin(n * 3.1));
      y = mid + Math.sin(n * f) * a * (n > 0.68 ? 1.5 : 1);
    } else if (kind === 'shift') {
      // two subjects: same underlying process, displaced distribution
      y = mid + Math.sin(n * 15) * 8 - (n * n) * 15 + 7;
    } else {
      // two visually identical bursts — one artifact, one event
      const b1 = Math.exp(-Math.pow((n - 0.3) * 12, 2));
      const b2 = Math.exp(-Math.pow((n - 0.72) * 12, 2));
      y = mid + Math.sin(n * 120) * 16 * (b1 + b2) + Math.sin(n * 20) * 1.6;
    }
    pts.push(`${x.toFixed(1)} ${y.toFixed(2)}`);
  }
  return 'M' + pts.join(' L');
}

function sparkPathB() {
  const W = 300, H = 42, mid = H / 2;
  const pts = [];
  for (let i = 0; i <= 150; i++) {
    const n = i / 150, x = n * W;
    const y = mid + Math.sin(n * 15 + 1.3) * 8 + (n * n) * 15 - 7;
    pts.push(`${x.toFixed(1)} ${y.toFixed(2)}`);
  }
  return 'M' + pts.join(' L');
}

function initSparks() {
  document.querySelectorAll('[data-spark]').forEach((p) => {
    const kind = p.dataset.spark;
    p.setAttribute('d', sparkPath(kind));
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;

    if (kind === 'shift') {
      // second trace: the same generator on a different subject
      const twin = p.cloneNode();
      twin.setAttribute('d', sparkPathB());
      twin.setAttribute('stroke', 'rgba(157,123,255,0.38)');
      twin.style.strokeDasharray = twin.style.strokeDashoffset = '';
      p.parentNode.insertBefore(twin, p);
    }

    onEnter(p, 0.8, () => {
      p.style.transition = 'stroke-dashoffset 2.4s cubic-bezier(0.16,1,0.3,1)';
      requestAnimationFrame(() => { p.style.strokeDashoffset = 0; });
    });
  });
}

/* ------------------------------------------------------------------ *
 * DANN diagram
 * ------------------------------------------------------------------ */

function initDann() {
  const svg = document.getElementById('dann-svg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const nodesG = svg.querySelector('#dann-nodes');
  const flowsG = svg.querySelector('#dann-flows');

  const nodes = [
    { x: 4,   y: 44, w: 74,  h: 30, l: 'EEG window' },
    { x: 96,  y: 44, w: 100, h: 30, l: 'Shared encoder' },
    { x: 346, y: 6,  w: 110, h: 28, l: 'ADHD head' },
    { x: 214, y: 80, w: 96,  h: 28, l: 'GRL  −λ∂' },
    { x: 346, y: 80, w: 110, h: 28, l: 'Subject head' },
  ];

  nodes.forEach((n) => {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', n.x); r.setAttribute('y', n.y);
    r.setAttribute('width', n.w); r.setAttribute('height', n.h);
    r.setAttribute('rx', 3);
    r.setAttribute('class', 'd-node');
    nodesG.appendChild(r);

    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', n.x + n.w / 2);
    t.setAttribute('y', n.y + n.h / 2 + 3);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', 'd-lbl');
    t.textContent = n.l;
    nodesG.appendChild(t);
  });

  const routes = [
    { d: 'M78 59 L96 59', rev: false },
    { d: 'M196 55 C250 55 260 20 346 20', rev: false },
    { d: 'M196 64 C214 64 200 94 214 94', rev: false },
    { d: 'M310 94 L346 94', rev: false },
    { d: 'M346 94 C320 94 236 94 214 94', rev: true },
    { d: 'M214 94 C198 94 210 66 196 66', rev: true },
  ];

  const pulses = [];
  routes.forEach((r, i) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', r.d);
    p.setAttribute('class', `d-flow ${r.rev ? 'd-rev' : 'd-fwd'}`);
    flowsG.appendChild(p);

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', r.rev ? 2.6 : 2.2);
    dot.setAttribute('class', r.rev ? 'd-pulse-rev' : 'd-pulse');
    flowsG.appendChild(dot);
    pulses.push({ path: p, dot, len: p.getTotalLength(), off: i * 0.17, rev: r.rev });
  });

  // arrowheads on the forward path
  const marker = document.createElementNS(NS, 'text');
  marker.setAttribute('x', 262); marker.setAttribute('y', 118);
  marker.setAttribute('class', 'd-lbl');
  marker.setAttribute('fill', '#ff6f85');
  marker.textContent = 'gradient flows back inverted';
  flowsG.appendChild(marker);

  return (t) => {
    pulses.forEach((p) => {
      const u = (t * 0.32 + p.off) % 1;
      const pt = p.path.getPointAtLength(u * p.len);
      p.dot.setAttribute('cx', pt.x);
      p.dot.setAttribute('cy', pt.y);
      p.dot.setAttribute('opacity', Math.sin(u * Math.PI) * (p.rev ? 1 : 0.85));
    });
  };
}

/* ------------------------------------------------------------------ *
 * Work index accordion
 * ------------------------------------------------------------------ */

function initIndex() {
  const rows = [...document.querySelectorAll('.idx-row')];
  const toggle = (row) => {
    const open = row.getAttribute('aria-expanded') === 'true';
    // one at a time keeps the index scannable
    rows.forEach((r) => r.setAttribute('aria-expanded', 'false'));
    row.setAttribute('aria-expanded', open ? 'false' : 'true');
  };
  rows.forEach((row) => {
    row.addEventListener('click', () => toggle(row));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(row); }
    });
  });
  rows[0]?.setAttribute('aria-expanded', 'true');
}

/* ------------------------------------------------------------------ *
 * Card tilt
 * ------------------------------------------------------------------ */

function initTilt() {
  if (REDUCED || window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * 4.5}deg) rotateX(${(0.5 - py) * 4.5}deg) translateZ(0)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

const scenes = [];
let field = null, teardown = null, topology = null, observatory = null;
let dannTick = null;

/** Scenes default to visible: a broken observer should cost frame time, not
 *  a blank canvas. */
function registerScene(obj, el) {
  const rec = { obj, el, visible: true };
  try {
    const io = new IntersectionObserver((e) => { rec.visible = e[0].isIntersecting; }, { rootMargin: '20% 0px' });
    io.observe(el);
  } catch { /* no observer support — keep rendering */ }
  scenes.push(rec);
  return rec;
}

function initTopologyUI() {
  const picker = document.getElementById('band-picker');
  const note = document.getElementById('band-note');
  const readout = document.getElementById('topo-readout');
  let current = 'gamma';
  let hovered = null;

  const paint = (edgeCount) => {
    const b = BANDS.find((x) => x.key === current);
    readout.innerHTML = hovered
      ? `Electrode <b>${hovered.name}</b><br>${hovered.lobe} · degree <b>${hovered.degree}</b><br>node strength <b>${hovered.strength.toFixed(2)}</b>`
      : `Band <b>${b.label}</b> · ${b.hz}<br>${edgeCount} edges above threshold<br>19 nodes · wPLI adjacency`;
    note.innerHTML = `<strong style="color:${b.color};font-weight:400">${b.label} — ${b.hz}.</strong> ${b.note}`;
  };

  let lastCount = 0;
  topology = new Topology(document.getElementById('topo-canvas'), TIER, (node) => {
    hovered = node;
    paint(lastCount);
  });

  BANDS.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'band-btn' + (b.key === current ? ' on' : '');
    btn.innerHTML = `<i style="background:${b.color};color:${b.color}"></i>${b.label} <small>${b.hz}</small>`;
    btn.addEventListener('click', () => {
      current = b.key;
      picker.querySelectorAll('.band-btn').forEach((x) => x.classList.remove('on'));
      btn.classList.add('on');
      const r = topology.setBand(b.key);
      lastCount = r.edges;
      paint(lastCount);
    });
    picker.appendChild(btn);
  });

  lastCount = topology.edgeList.length;
  paint(lastCount);
  return topology;
}

async function boot() {
  setProgress(0.12);

  initReveals();
  initSparks();
  initCounters();
  initIndex();
  initTilt();
  dannTick = initDann();

  setProgress(0.28);

  if (TIER) {
    field = new NeuralField(document.getElementById('field-canvas'), TIER);
    registerScene(field, document.body);
    setProgress(0.55);

    teardown = new Teardown(document.getElementById('td-canvas'), TIER);
    registerScene(teardown, document.getElementById('teardown'));
    setProgress(0.74);

    initTopologyUI();
    registerScene(topology, document.getElementById('topology'));
  } else {
    document.getElementById('field-canvas').style.display = 'none';
    document.querySelector('.td-stage')?.style.setProperty('background', 'radial-gradient(circle at 50% 40%, #0d1424, #04050a 70%)');
  }
  setProgress(0.88);

  observatory = new Observatory({
    canvas: document.getElementById('ab-canvas'),
    detail: document.getElementById('ab-detail'),
    legend: document.getElementById('ab-legend'),
    storyBtn: document.getElementById('ab-story'),
  });
  onEnter(document.getElementById('ab-canvas'), 0.85, () => observatory.start());

  setProgress(1);

  // let the needle actually reach the stop before the curtain lifts
  await new Promise((r) => setTimeout(r, REDUCED ? 60 : 1250));
  finishIgnition();
  playHero();
}

/* ------------------------------------------------------------------ *
 * Hero intro
 * ------------------------------------------------------------------ */

function playHero() {
  const lines = document.querySelectorAll('#hero-title .ln > span');
  lines.forEach((l, i) => {
    l.style.transform = 'translateY(105%)';
    l.style.opacity = '0';
    requestAnimationFrame(() => {
      l.style.transition = `transform 1.15s cubic-bezier(0.16,1,0.3,1) ${i * 0.1 + 0.05}s, opacity 0.8s ease ${i * 0.1 + 0.05}s`;
      l.style.transform = 'translateY(0)';
      l.style.opacity = '1';
    });
  });
}

/* ------------------------------------------------------------------ *
 * Scroll engine
 * ------------------------------------------------------------------ */

const nav = document.getElementById('nav');
const bar = document.getElementById('scroll-progress');
const fieldCanvas = document.getElementById('field-canvas');
const veil = document.querySelector('.hero-veil');
const tdZone = document.getElementById('td-scrollzone');
const tdSteps = [...document.querySelectorAll('.td-step')];
const tdDots = [...document.querySelectorAll('#td-progress b')];
const tdCounter = document.getElementById('td-counter');
const navLinks = [...document.querySelectorAll('#nav-links a')];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

let scrollY = 0, docH = 1, vh = 1;
let fieldOpacity = 1, lastStep = -1;

/** Document-space top. offsetTop is relative to the nearest positioned
 *  ancestor, which several of these elements have — so it cannot be used. */
const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

const off = { problem: { top: 0, h: 1 }, td: { top: 0, h: 1 }, sections: [] };

function measure() {
  vh = window.innerHeight;
  docH = Math.max(1, document.documentElement.scrollHeight - vh);

  const problem = document.getElementById('problem');
  off.problem = { top: docTop(problem), h: problem.offsetHeight };
  if (tdZone) off.td = { top: docTop(tdZone), h: tdZone.offsetHeight };
  off.sections = sections.map(docTop);
}

function onScroll() {
  scrollY = window.scrollY || window.pageYOffset;
  checkEnters();
  const p = clamp01(scrollY / docH);
  bar.style.transform = `scaleX(${p})`;
  nav.classList.toggle('stuck', scrollY > 40);

  // --- neural field: montage -> shell -> dispersal over hero + problem
  const fieldEnd = off.problem.top + off.problem.h * 0.55;
  const fp = clamp01(scrollY / Math.max(1, fieldEnd - vh * 0.2));
  field?.setProgress(fp);

  // The field is the hero. Past the fold it drops to an ambient background so
  // it never competes with body copy, then leaves entirely.
  const dim = lerp(1, 0.22, clamp01((scrollY - vh * 0.25) / (vh * 0.55)));
  const outStart = off.problem.top + off.problem.h * 0.4;
  const outEnd = off.problem.top + off.problem.h * 0.92;
  const target = dim * (1 - clamp01((scrollY - outStart) / Math.max(1, outEnd - outStart)));
  if (Math.abs(target - fieldOpacity) > 0.004) {
    fieldOpacity = target;
    fieldCanvas.style.opacity = fieldOpacity.toFixed(3);
    veil.style.opacity = fieldOpacity.toFixed(3);
  }

  // --- teardown
  if (tdZone) {
    const usable = Math.max(1, off.td.h - vh);
    const t = clamp01((scrollY - off.td.top) / usable);
    teardown?.setProgress(t);

    const n = tdSteps.length;
    const step = Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
    if (step !== lastStep) {
      lastStep = step;
      tdSteps.forEach((s, i) => s.classList.toggle('on', i === step));
      tdDots.forEach((d, i) => d.classList.toggle('on', i <= step));
      tdCounter.textContent = `${String(step + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    }
  }

  // --- active nav link
  let activeIdx = -1;
  off.sections.forEach((top, i) => {
    if (top <= scrollY + vh * 0.35) activeIdx = i;
  });
  navLinks.forEach((a, i) => a.classList.toggle('active', i === activeIdx));
}

/* ------------------------------------------------------------------ *
 * Pointer
 * ------------------------------------------------------------------ */

let pointerActive = false;
window.addEventListener('pointermove', (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -((e.clientY / window.innerHeight) * 2 - 1);
  pointerActive = true;
  field?.setPointer(nx, ny, true);
  teardown?.setPointer(nx, ny);
}, { passive: true });

window.addEventListener('pointerleave', () => {
  pointerActive = false;
  field?.setPointer(0, 0, false);
});

/* ------------------------------------------------------------------ *
 * Loop
 * ------------------------------------------------------------------ */

let last = performance.now();
let frameN = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  drawIgnition(now);

  // catch entrances caused by reflow rather than scrolling (late fonts, resize)
  if ((frameN++ & 15) === 0) checkEnters();

  scenes.forEach((s) => { if (s.visible) s.obj.update(dt); });
  if (observatory) observatory.render(dt);
  if (dannTick) dannTick(now / 1000);

  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ *
 * Resize
 * ------------------------------------------------------------------ */

let resizeTimer;
function onResize() {
  measure();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    field?.resize();
    teardown?.resize();
    topology?.resize();
    observatory?.resize();
    onScroll();
  }, 120);
}

/* ------------------------------------------------------------------ *
 * Misc chrome
 * ------------------------------------------------------------------ */

function initClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const tick = () => {
    const t = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
    });
    el.textContent = `Chennai · ${t} IST`;
  };
  tick();
  setInterval(tick, 20000);
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: docTop(target) - 8, behavior: REDUCED ? 'auto' : 'smooth' });
  });
});

/* ------------------------------------------------------------------ */

measure();
initClock();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onResize);

// The loop must be running *before* boot: the ignition gauge is animated from
// it, and boot blocks for as long as the scenes take to compile.
requestAnimationFrame(frame);

// creep the gauge while the scenes compile, so it never looks stalled
const preSpin = setInterval(() => {
  if (ign.value < 0.97) setProgress(ign.value + 0.005);
}, 80);

// the sequence is a nicety, not a gate
document.getElementById('ign-skip')?.addEventListener('click', finishIgnition);

// never let a hung asset trap someone behind the curtain
setTimeout(finishIgnition, 9000);

boot()
  .catch((err) => {
    console.error('[boot]', err);
    finishIgnition();
  })
  .finally(() => {
    clearInterval(preSpin);
    measure();
    onScroll();
    // fonts change metrics; re-measure once they land
    document.fonts?.ready.then(() => { measure(); onScroll(); });
  });
