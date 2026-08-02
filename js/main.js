/* ============================================================
   The frame loop. Owns scroll state, entrance motion and the
   instrument rail, and publishes both to the 3D world.

   Entrances are driven from this loop rather than from an
   IntersectionObserver — observer callbacks are suspended in
   throttled tabs, which has left content invisible here before.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── shared state, read by js/world.js every frame
  var state = window.__site = {
    y: 0,            // scrollY
    vh: 0,           // viewport height
    doc: 0,          // scrollable distance
    progress: 0,     // 0..1 through the document
    velocity: 0,     // smoothed scroll velocity, px/frame
    pointer: { x: 0, y: 0 },   // -1..1, smoothed
    station: 'hero',
    stationProgress: 0,        // 0..1 through the current station
    stations: {},              // id -> { top, height }
    reduced: reduced,
    ready: false
  };

  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-station]'));
  var risers   = Array.prototype.slice.call(document.querySelectorAll('.rise'));

  var railFill    = document.getElementById('rail-fill');
  var railStation = document.getElementById('rail-station');
  var railDepth   = document.getElementById('rail-depth');
  var rail        = document.querySelector('.rail');
  var topbar      = document.querySelector('.topbar');
  var redactHud   = document.querySelector('.redact-hud');

  var STATION_LABEL = {
    hero: 'ignition', drift: 'the conviction', work: 'selected work',
    redaction: 'redacted topology', diagnosis: 'the audit', ceiling: 'ceiling map',
    work2: 'selected work', method: 'method', else: 'appendix',
    him: 'him', contact: 'contact'
  };

  // ── measurement. offsetTop lies here (positioned ancestors), so use rects.
  function measure() {
    state.vh = window.innerHeight;
    state.doc = Math.max(1, document.documentElement.scrollHeight - state.vh);
    var y = window.scrollY || window.pageYOffset || 0;
    for (var i = 0; i < sections.length; i++) {
      var el = sections[i];
      var r = el.getBoundingClientRect();
      state.stations[el.dataset.station] = { top: r.top + y, height: r.height, el: el };
    }
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { measure(); tick(); }, 120);
  });

  // ── pointer parallax, gentle
  var pxTarget = 0, pyTarget = 0;
  window.addEventListener('pointermove', function (e) {
    pxTarget = (e.clientX / window.innerWidth) * 2 - 1;
    pyTarget = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // ── entrances
  function sweepRisers() {
    if (reduced) return;
    var vh = state.vh;
    for (var i = risers.length - 1; i >= 0; i--) {
      var el = risers[i];
      var top = el.getBoundingClientRect().top;
      // anything already above the fold counts as entered — covers deep links
      // and restored scroll positions where nothing ever crosses the threshold
      if (top < vh * 0.88) {
        el.classList.add('in');
        risers.splice(i, 1);
      }
    }
  }

  var lastY = 0, vel = 0;

  function tick() {
    var y = window.scrollY || window.pageYOffset || 0;
    var dy = y - lastY;
    lastY = y;
    vel += (dy - vel) * 0.16;

    state.y = y;
    state.velocity = vel;
    state.progress = Math.min(1, Math.max(0, y / state.doc));

    state.pointer.x += (pxTarget - state.pointer.x) * 0.055;
    state.pointer.y += (pyTarget - state.pointer.y) * 0.055;

    // which station holds the middle of the viewport
    var mid = y + state.vh * 0.5;
    var current = 'hero', sp = 0;
    for (var key in state.stations) {
      var s = state.stations[key];
      if (mid >= s.top && mid < s.top + s.height) {
        current = key;
        sp = (mid - s.top) / Math.max(1, s.height);
        break;
      }
    }
    if (mid >= (state.stations.contact ? state.stations.contact.top : Infinity)) {
      current = 'contact';
    }
    state.station = current;
    state.stationProgress = sp;

    if (railFill) railFill.style.width = (state.progress * 100).toFixed(2) + '%';
    if (railDepth) railDepth.textContent = (state.progress * 9.99).toFixed(2);
    if (railStation) {
      var label = STATION_LABEL[current] || current;
      if (railStation.textContent !== label) railStation.textContent = label;
    }
    if (redactHud) redactHud.classList.toggle('on', current === 'redaction');

    sweepRisers();
  }

  function loop() { tick(); requestAnimationFrame(loop); }

  // ── boot
  function start() {
    measure();
    lastY = window.scrollY || 0;
    state.ready = true;
    sweepRisers();
    requestAnimationFrame(loop);
    // fonts change layout; re-measure once they land
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measure(); sweepRisers(); });
    }
    setTimeout(measure, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  function revealChrome() {
    if (rail) rail.classList.add('on');
    if (topbar) topbar.classList.add('on');
    sweepRisers();
  }
  window.addEventListener('ignition:done', function () { setTimeout(revealChrome, 120); });
  // if the ignition never runs (reduced motion, or it was removed early)
  setTimeout(revealChrome, 3200);
})();
