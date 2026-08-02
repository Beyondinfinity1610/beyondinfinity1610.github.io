/* ============================================================
   intro.js — ignition.

   A short sequence, not a preloader. Two rules:

     1. It paints on the first frame. The boot lines are plain DOM and
        run before three.js has finished arriving; the world fades in
        underneath whenever it is ready. Nothing waits on anything.
     2. It is always skippable, and any intent to move — scroll, key,
        click, touch — skips it immediately.

   The self-test lines are the register the whole page is written in:
   an instrument checking its instruments before it trusts them.
   ============================================================ */

const LINES = [
  'ignition',
  'sensor array · 19 channels',
  'drift compensation · active',
  'all instruments suspect',
];

export function runIntro(root, onDone, calm) {
  const step = calm ? 90 : 240;
  const hold = calm ? 1100 : 2500;
  const list = root.querySelector('.boot-lines');
  const skip = root.querySelector('.boot-skip');

  let done = false;
  const timers = [];

  function finish(immediate) {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    root.classList.add('is-out');
    document.body.classList.remove('intro-lock');
    /* the world takes over the camera on its own easing */
    onDone(immediate === true);
    setTimeout(() => root.remove(), 1200);
  }

  /* Any intent to move ends it. */
  const bail = () => finish(true);
  window.addEventListener('wheel', bail, { once: true, passive: true });
  window.addEventListener('touchstart', bail, { once: true, passive: true });
  window.addEventListener('keydown', bail, { once: true });
  skip.addEventListener('click', bail);

  document.body.classList.add('intro-lock');

  LINES.forEach((text, i) => {
    const el = document.createElement('span');
    el.className = 'boot-line';
    el.textContent = text;
    list.appendChild(el);
    timers.push(setTimeout(() => el.classList.add('on'), 180 + i * step));
  });

  timers.push(setTimeout(() => root.classList.add('is-lit'), 180));
  timers.push(setTimeout(() => finish(false), hold));

  return { finish };
}
