/* ============================================================
   main.js — scroll engine, entrances, and the frame loop.

   Two rules that have already caused visible bugs on this page and
   should not be relearned:

   1. Entrances do not use IntersectionObserver. Its callbacks are
      suspended in throttled and background tabs, and a suspended
      callback means content that never appears. Everything runs from
      onEnter(), which is driven by the scroll handler and the frame
      loop, and anything already above the viewport resolves at once —
      otherwise a restored scroll position lands on a blank page.

   2. offsetTop is not used for scroll maths. Several sections sit in
      positioned ancestors. Use docTop().
   ============================================================ */

import { Instrument } from './scenes/instrument.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------------------------------------------------------- entrances */

const revealables = Array.from(document.querySelectorAll('[data-r]'));

function onEnter() {
  const limit = window.scrollY + window.innerHeight * 0.88;
  for (let i = revealables.length - 1; i >= 0; i--) {
    const el = revealables[i];
    /* No lower bound on purpose: anything above the fold must resolve. */
    if (docTop(el) < limit) {
      el.classList.add('in');
      revealables.splice(i, 1);
    }
  }
}

/* ---------------------------------------------------------- device tier */

function deviceTier() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const small = window.innerWidth < 760;
  if (mem <= 2 || cores <= 2) return 'low';
  return small ? 'mid' : 'high';
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) { return false; }
}

/* ---------------------------------------------------------- setup */

const instrument = new Instrument(
  document.getElementById('montage'),
  document.getElementById('rail')
);

const nav = document.getElementById('nav');
const navLinks = Array.from(document.querySelectorAll('.nav-sec a'));
const heroEl = document.getElementById('hero');
const redactSection = document.getElementById('redaction');
const redactStage = redactSection.querySelector('.redaction-stage');
const roleOut = document.getElementById('ru-role');

const DEFAULT_ROLE = 'Two manuscripts in preparation';

/* Signal agitation per section — the rail is calm where the writing is
   calm and busy where the subject is. */
const REGIONS = [
  { id: 'conviction', busy: 0.22, redact: 0 },
  { id: 'work',       busy: 0.55, redact: 0 },
  { id: 'redaction',  busy: 0.75, redact: 1 },
  { id: 'work-2',     busy: 0.45, redact: 0 },
  { id: 'method',     busy: 0.30, redact: 0 },
  { id: 'about',      busy: 0.18, redact: 0 },
  { id: 'contact',    busy: 0.10, redact: 0 },
].map((r) => ({ ...r, el: document.getElementById(r.id) })).filter((r) => r.el);

let redaction = null;
let redactionLoading = false;
let webglOK = hasWebGL();
if (!webglOK) document.body.classList.add('no-webgl');

/* Reduced motion does not mean "show nothing": the redacted diagram is
   the argument of that section, so it falls back to the static plate
   version rather than leaving three viewports of empty scroll. */
if (reduced || !webglOK) document.body.classList.add('flat-scene');

async function ensureRedaction() {
  if (redaction || redactionLoading || !webglOK || reduced) return;
  redactionLoading = true;
  try {
    const { Redaction } = await import('./scenes/redaction.js');
    redaction = new Redaction(document.getElementById('redact-canvas'), {
      tier: deviceTier(),
      onRole: (role) => {
        roleOut.textContent = role || DEFAULT_ROLE;
        roleOut.classList.toggle('on', !!role);
      },
    });
    redaction.resize();
    redaction.setProgress((window.scrollY - redactTop) / redactSpan);
  } catch (err) {
    webglOK = false;
    document.body.classList.add('no-webgl');
  }
}

/* ---------------------------------------------------------- scroll state */

let scrollY = window.scrollY;
let vh = window.innerHeight;
let heroBottom = vh;
let redactTop = 0, redactSpan = 1;
let navMarks = [];
let redactVisible = false;

function measure() {
  vh = window.innerHeight;
  heroBottom = Math.max(1, heroEl.getBoundingClientRect().height);
  redactTop = docTop(redactStage);
  redactSpan = Math.max(1, redactStage.getBoundingClientRect().height - vh);
  navMarks = navLinks.map((a) => {
    const el = document.querySelector(a.getAttribute('href'));
    return { a, top: el ? docTop(el) - vh * 0.35 : Infinity };
  });
  for (const r of REGIONS) {
    r.top = docTop(r.el);
    r.bottom = r.top + r.el.getBoundingClientRect().height;
  }
  instrument.resize();
  if (redaction) redaction.resize();
}

function onScroll() {
  scrollY = window.scrollY;
  instrument.scroll = scrollY;
  instrument.heroP = clamp01(scrollY / (heroBottom * 0.85));

  nav.classList.toggle('is-stuck', scrollY > vh * 0.6);

  /* section signature for the rail */
  const eye = scrollY + vh * 0.45;
  let busy = 0.2, redact = 0;
  for (const r of REGIONS) {
    if (eye >= r.top && eye < r.bottom) { busy = r.busy; redact = r.redact; break; }
  }
  instrument.targetBusy = busy;
  instrument.targetRedact = redact;

  /* redaction scene */
  const p = (scrollY - redactTop) / redactSpan;
  redactVisible = p > -0.6 && p < 1.6;
  if (p > -1 && p < 2) ensureRedaction();
  if (redaction) redaction.setProgress(p);

  /* nav current section */
  let cur = null;
  for (const m of navMarks) if (scrollY >= m.top) cur = m.a;
  for (const m of navMarks) m.a.classList.toggle('on', m.a === cur);

  onEnter();
}

/* ---------------------------------------------------------- loop */

let last = performance.now();
let t = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;

  /* Ease the rail's character between sections in the loop, not the
     scroll handler, so it keeps moving when the scroll stops. */
  const k = Math.min(1, dt * 3);
  instrument.busy += ((instrument.targetBusy ?? 0.2) - instrument.busy) * k;
  instrument.redact += ((instrument.targetRedact ?? 0) - instrument.redact) * k;

  /* Under reduced motion the instrument still tracks the scroll — that
     motion is the reader's — but time is frozen so nothing self-animates. */
  instrument.frame(reduced ? 0 : t);
  if (redaction && redactVisible) redaction.frame(t, dt);

  /* The scroll handler covers normal use; this covers the cases it does
     not — momentum settling, tab restore, anchor jumps. */
  if (revealables.length) onEnter();

  requestAnimationFrame(loop);
}

/* ---------------------------------------------------------- clock */

function tickClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  try {
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
    }).format(new Date());
    el.textContent = `Chennai ${time}`;
  } catch (_) { /* leave the static label */ }
}

/* ---------------------------------------------------------- boot */

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { measure(); onScroll(); }, 120);
}, { passive: true });

window.addEventListener('scroll', onScroll, { passive: true });

roleOut.textContent = DEFAULT_ROLE;

measure();
onScroll();
onEnter();
tickClock();
setInterval(tickClock, 30000);

requestAnimationFrame(() => {
  document.body.classList.add('ready');
  if (reduced) instrument.frame(0);
  requestAnimationFrame(loop);
});

/* A late web-font load shifts layout; re-measure once it settles. */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { measure(); onScroll(); });
}
window.addEventListener('load', () => { measure(); onScroll(); });
