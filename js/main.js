/* ============================================================
   main.js — scroll, entrances, HUD, and the frame loop.

   The page is a single flight through one 3D world (see world.js).
   Scroll position maps to a position along that flight; the written
   content rides over it. There is one WebGL context and one loop.

   Rules that have already cost visible bugs here:

   1. Entrances do not use IntersectionObserver. Its callbacks are
      suspended in throttled and background tabs, and a suspended
      callback means content that never appears. Everything runs from
      onEnter(), driven by the scroll handler and the frame loop, and
      anything already above the viewport resolves at once — otherwise
      a restored scroll position lands on a blank page.

   2. offsetTop is not used for scroll maths. Sections sit inside
      positioned ancestors. Use docTop().
   ============================================================ */

/* Assets are served with a ten-minute cache and no filename hashing, so a
   redeploy can otherwise be masked by a stale stylesheet or module. The
   stamp in index.html is mirrored here for the lazily imported world. */
const V = new URL(import.meta.url).searchParams.get('v') || '';
const withV = (u) => (V ? `${u}?v=${V}` : u);

import { runIntro } from './intro.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------------------------------------------------------- entrances */

const revealables = Array.from(document.querySelectorAll('[data-r]'));

function onEnter() {
  const limit = window.scrollY + window.innerHeight * 0.9;
  for (let i = revealables.length - 1; i >= 0; i--) {
    const el = revealables[i];
    /* No lower bound on purpose: anything above the fold must resolve. */
    if (docTop(el) < limit) {
      el.classList.add('in');
      revealables.splice(i, 1);
    }
  }
}

/* ---------------------------------------------------------- capability */

function deviceTier() {
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 2 || cores <= 2) return 'low';
  return window.innerWidth < 760 ? 'mid' : 'high';
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) { return false; }
}

/* Reduced motion calms the flight — it does not delete it. Tying the whole
   3D world to this setting meant anyone with "reduce animations" enabled in
   their OS silently got a completely different, much plainer site. Only a
   real lack of WebGL falls back to flat. */
const webglOK = hasWebGL();
if (!webglOK) document.body.classList.add('flat');
if (reduced) document.body.classList.add('calm');

/* ---------------------------------------------------------- elements */

const nav = document.getElementById('nav');
const navLinks = Array.from(document.querySelectorAll('.nav-sec a'));
const hudRegion = document.getElementById('hud-region');
const hudDepth = document.getElementById('hud-depth');
const hudBar = document.getElementById('hud-bar');
const introRoot = document.getElementById('boot');

/* The HUD names where in the flight you are. */
const REGIONS = [
  ['top', 'ignition'],
  ['conviction', 'the conviction'],
  ['work', 'selected work'],
  ['archive', 'withheld'],
  ['work-2', 'selected work'],
  ['search', 'the search'],
  ['order', 'the order'],
  ['method', 'method'],
  ['about', 'about'],
  ['contact', 'contact'],
].map(([id, name]) => ({ id, name, el: document.getElementById(id) }))
 .filter((r) => r.el);

/* ---------------------------------------------------------- world */

let world = null;
let introDone = false;
let introEase = 1;      // 1 = held on the engine, eases to 0

async function bootWorld() {
  if (!webglOK) return;
  try {
    const { World } = await import(withV('./world.js'));
    world = new World(document.getElementById('world'), { tier: deviceTier(), calm: reduced });
    measure();
    world.setProgress(pageProgress());
    document.body.classList.add('world-on');
  } catch (err) {
    document.body.classList.add('flat');
  }
}

/* ---------------------------------------------------------- scroll */

let vh = window.innerHeight;
let docH = 1;
let navMarks = [];

function pageProgress() {
  return clamp01(window.scrollY / Math.max(1, docH - vh));
}

/* Where a section sits as a fraction of the whole flight. */
function markOf(id, bias = 0.5) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const y = r.top + window.scrollY + r.height * bias - vh * 0.5;
  return clamp01(y / Math.max(1, docH - vh));
}

function measure() {
  vh = window.innerHeight;
  docH = document.documentElement.scrollHeight;
  navMarks = navLinks.map((a) => {
    const el = document.querySelector(a.getAttribute('href'));
    return { a, top: el ? docTop(el) - vh * 0.35 : Infinity };
  });
  for (const r of REGIONS) r.top = docTop(r.el) - vh * 0.5;

  if (world) {
    world.resize();
    /* The world follows the writing: each region is placed at the depth
       the camera reaches when its own section is on screen. */
    world.layout({
      ignition: 0,
      montage: markOf('conviction'),
      corridor: [markOf('work', 0.4), markOf('archive', 0.1)],
      archive: markOf('archive'),
      volume: [markOf('search', -0.15), markOf('search', 1.15)],
      settle: markOf('about'),
    });
  }
}

let lastRegion = null;

function onScroll() {
  const y = window.scrollY;
  const p = pageProgress();

  nav.classList.toggle('is-stuck', y > vh * 0.55);
  if (world) world.setProgress(p);

  hudDepth.textContent = String(Math.round(p * 100)).padStart(3, '0');
  hudBar.style.transform = `scaleY(${0.015 + p * 0.985})`;

  let cur = REGIONS[0];
  for (const r of REGIONS) if (y >= r.top) cur = r;
  if (cur !== lastRegion) {
    lastRegion = cur;
    hudRegion.textContent = cur.name;
    hudRegion.classList.remove('flip');
    void hudRegion.offsetWidth;   // restart the transition
    hudRegion.classList.add('flip');
  }

  let na = null;
  for (const m of navMarks) if (y >= m.top) na = m.a;
  for (const m of navMarks) m.a.classList.toggle('on', m.a === na);

  onEnter();
}

/* ---------------------------------------------------------- loop */

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (world) {
    /* Release the camera from the engine smoothly once the intro ends. */
    if (introDone && introEase > 0) introEase = Math.max(0, introEase - dt * 0.85);
    world.setIntro(introEase < 0.001 ? 0 : introEase * introEase);
    world.frame(dt);
  }

  if (revealables.length) onEnter();
  requestAnimationFrame(loop);
}

/* ---------------------------------------------------------- clock */

function tickClock() {
  const el = document.getElementById('hud-clock');
  if (!el) return;
  try {
    el.textContent = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date());
  } catch (_) { /* leave it */ }
}

/* ---------------------------------------------------------- boot */

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { measure(); onScroll(); }, 120);
}, { passive: true });

window.addEventListener('scroll', onScroll, { passive: true });

measure();
onScroll();
onEnter();
tickClock();
setInterval(tickClock, 1000);

/* The world loads in parallel with the intro; neither waits on the other. */
bootWorld();

if (introRoot && webglOK && window.scrollY < 40) {
  runIntro(introRoot, (immediate) => {
    introDone = true;
    /* A deliberate skip should feel instant, not merely faster. */
    if (immediate) introEase = Math.min(introEase, 0.5);
    document.body.classList.add('lit');
  }, reduced);
} else {
  if (introRoot) introRoot.remove();
  introDone = true;
  introEase = 0;
  document.body.classList.add('lit');
}

requestAnimationFrame(() => {
  document.body.classList.add('ready');
  requestAnimationFrame(loop);
});

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { measure(); onScroll(); });
}
window.addEventListener('load', () => { measure(); onScroll(); });
