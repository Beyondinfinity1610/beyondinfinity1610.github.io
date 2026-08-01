import { QuietSignal } from './scenes/trace.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCED) document.documentElement.classList.add('no-motion');

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

/* ------------------------------------------------------------------ *
 * Entrances
 *
 * Driven from the scroll handler and the frame loop rather than from
 * IntersectionObserver: IO callbacks are suspended in throttled tabs, and a
 * suspended callback here means content that never appears at all.
 * ------------------------------------------------------------------ */

const queue = [];
let vh = window.innerHeight;

function onEnter(el, fraction, fn) { queue.push({ el, fraction, fn }); }

function checkEnters() {
  if (!queue.length) return;
  for (let i = queue.length - 1; i >= 0; i--) {
    // no lower bound — anything already above the fold has been passed, and
    // must resolve immediately or a restored scroll position hides it forever
    if (queue[i].el.getBoundingClientRect().top < vh * queue[i].fraction) {
      queue[i].fn(queue[i].el);
      queue.splice(i, 1);
    }
  }
}

document.querySelectorAll('[data-r]').forEach((el) => {
  onEnter(el, 0.92, (e) => e.classList.add('in'));
});

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

const heroTitle = document.getElementById('hero-title');
const heroLabel = document.getElementById('hero-label');

// the label fades in ahead of the pen; the title is revealed by it
if (heroLabel) {
  heroLabel.style.opacity = '0';
  heroLabel.style.transition = 'opacity 1.4s ease 0.15s';
  requestAnimationFrame(() => { heroLabel.style.opacity = '1'; });
}

const trace = new QuietSignal(document.getElementById('trace'), {
  reduced: REDUCED,
  onProgress: (p) => {
    // slightly ahead of the nib so the letters resolve just as it passes
    heroTitle?.style.setProperty('--pen', `${Math.min(112, p * 118)}%`);
  },
});
if (REDUCED) heroTitle?.style.setProperty('--pen', '112%');

/* ------------------------------------------------------------------ *
 * Topology — loaded only when it is close to being needed
 * ------------------------------------------------------------------ */

let topology = null;
const interlude = document.getElementById('interlude');

onEnter(interlude, 2.2, async () => {
  try {
    const { Topology } = await import('./scenes/topology.js');
    topology = new Topology(document.getElementById('topo-canvas'));
  } catch (err) {
    console.error('[topology]', err);
    interlude.style.display = 'none';
  }
});

/* ------------------------------------------------------------------ *
 * Scroll
 * ------------------------------------------------------------------ */

const nav = document.getElementById('nav');
const navLinks = [...document.querySelectorAll('.nav-sec a')];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

let heroH = 1, sectionTops = [];
let interludeVisible = false;

function measure() {
  vh = window.innerHeight;
  heroH = document.getElementById('hero').offsetHeight || vh;
  sectionTops = sections.map(docTop);
}

function onScroll() {
  const y = window.scrollY || window.pageYOffset;
  checkEnters();

  nav.classList.toggle('stuck', y > 30);
  trace.setScroll(clamp01(y / (heroH * 0.85)));

  let active = -1;
  sectionTops.forEach((top, i) => { if (top <= y + vh * 0.4) active = i; });
  navLinks.forEach((a, i) => a.classList.toggle('on', i === active));

  if (interlude) {
    const r = interlude.getBoundingClientRect();
    interludeVisible = r.bottom > -200 && r.top < vh + 200;
  }
}

/* ------------------------------------------------------------------ *
 * Pointer
 * ------------------------------------------------------------------ */

if (!window.matchMedia('(pointer: coarse)').matches) {
  window.addEventListener('pointermove', (e) => {
    trace.setPointer(e.clientX, e.clientY, e.clientY < vh * 1.1 && window.scrollY < heroH);
  }, { passive: true });
  window.addEventListener('pointerleave', () => trace.setPointer(-1, -1, false));
}

/* ------------------------------------------------------------------ *
 * Loop
 * ------------------------------------------------------------------ */

let last = performance.now();
let n = 0;
let traceLive = true;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Stop drawing the trace past the hero — but wipe it on the way out, or the
  // last painted frame sits over the rest of the page forever.
  if (window.scrollY < heroH * 1.15) {
    trace.update(dt);
    traceLive = true;
  } else if (traceLive) {
    trace.clear();
    traceLive = false;
  }

  if (topology && interludeVisible) topology.update(dt);
  if ((n++ & 15) === 0) checkEnters();

  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

window.addEventListener('scroll', onScroll, { passive: true });

let resizeT;
window.addEventListener('resize', () => {
  measure();
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { trace.resize(); topology?.resize(); onScroll(); }, 140);
});

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    window.scrollTo({ top: docTop(t) - 6, behavior: REDUCED ? 'auto' : 'smooth' });
  });
});

const clock = document.getElementById('clock');
if (clock) {
  const tick = () => {
    clock.textContent = 'Chennai · ' + new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
    });
  };
  tick();
  setInterval(tick, 30000);
}

measure();
onScroll();
requestAnimationFrame(frame);
document.fonts?.ready.then(() => { measure(); onScroll(); });
