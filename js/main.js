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
  var driftHud    = document.querySelector('.drift-hud');
  var fieldHud    = document.querySelector('.field-hud');

  var STATION_LABEL = {
    hero: 'ignition', drift: 'the conviction', lie: 'signal vs instrument',
    work: 'selected work',
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

  // ── entrances. Held until the ignition clears, so the opening lines rise
  // as it dissolves rather than being sat there fully formed behind it.
  var released = reduced;
  function sweepRisers() {
    if (reduced || !released) return;
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

  // ── display type arrives a line at a time, from under its own baseline
  function maskify() {
    var targets = [];
    Array.prototype.forEach.call(document.querySelectorAll('.display'), function (el) {
      var lines = el.querySelectorAll(':scope > span.rise');
      if (lines.length) targets.push.apply(targets, Array.prototype.slice.call(lines));
      else targets.push(el);
    });
    targets.forEach(function (el) {
      var parts = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = parts.map(function (part, i) {
        var d = i ? ' style="--md:' + (i * 0.09).toFixed(2) + 's"' : '';
        return '<span class="mask"' + d + '><span>' + part + '</span></span>';
      }).join('');
    });
  }

  // ── parallax. Amounts are peak travel in px across a full viewport; the
  // value lands on --par, which composes with the entrance transform.
  var PARALLAX = [
    ['.entry .idx', 44],
    ['.facts', 22],
    ['.hold', 14],
    ['.hero-foot', -20],
    ['.skills .sk', 16],
    ['.contact-links', 16],
    ['.throughline', 12],
    ['.creds', 10]
  ];
  var parallax = [];
  function collectParallax() {
    PARALLAX.forEach(function (pair) {
      Array.prototype.forEach.call(document.querySelectorAll(pair[0]), function (el, i) {
        // alternate direction down a set so the column breathes rather than slides
        var amt = pair[1] * (i % 2 ? -0.7 : 1);
        el.style.willChange = 'transform';
        el.classList.add('par');
        parallax.push({ el: el, amt: amt });
      });
    });
  }
  function runParallax() {
    if (reduced) return;
    var vh = state.vh;
    for (var i = 0; i < parallax.length; i++) {
      var p = parallax[i];
      var r = p.el.getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) continue;
      var off = ((r.top + r.height * 0.5) - vh * 0.5) / vh;
      p.el.style.setProperty('--par', (off * p.amt).toFixed(1) + 'px');
    }
  }

  // ── stagger indices for the rows that draw their own rule in
  function indexRows() {
    var sets = ['.throughline li', '.quiet li', '.method-list li', '.facts > div', '.clink'];
    sets.forEach(function (sel) {
      var last = null, n = 0;
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
        if (el.parentNode !== last) { last = el.parentNode; n = 0; }
        el.style.setProperty('--i', n++);
      });
    });
  }

  // ── the nav marks where you are
  var NAV_FOR = {
    work: 'work', redaction: 'work', diagnosis: 'work', ceiling: 'work', work2: 'work',
    method: 'method', else: 'method', him: 'him', contact: 'contact'
  };
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.topnav a'));
  var navCurrent = '';
  function markNav(station) {
    var want = NAV_FOR[station] || '';
    if (want === navCurrent) return;
    navCurrent = want;
    navLinks.forEach(function (a) {
      a.classList.toggle('here', a.getAttribute('href') === '#' + want);
    });
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
    // stations can nest — a stage inside a section — so the tightest one wins
    var current = 'hero', sp = 0, best = Infinity;
    for (var key in state.stations) {
      var s = state.stations[key];
      if (mid >= s.top && mid < s.top + s.height && s.height < best) {
        best = s.height;
        current = key;
        sp = (mid - s.top) / Math.max(1, s.height);
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
    if (driftHud) driftHud.classList.toggle('on', current === 'lie');
    if (fieldHud) fieldHud.classList.toggle('on', current === 'ceiling');
    markNav(current);
    if (topbar) topbar.classList.toggle('compact', y > 80);

    runParallax();
    sweepRisers();
  }

  function loop() { tick(); requestAnimationFrame(loop); }

  // ── boot
  function start() {
    if (!reduced) maskify();
    indexRows();
    collectParallax();
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
    released = true;
    if (rail) rail.classList.add('on');
    if (topbar) topbar.classList.add('on');
    sweepRisers();
  }
  window.addEventListener('ignition:done', function () { setTimeout(revealChrome, 90); });
  // if the ignition never runs (reduced motion, or it was removed early)
  setTimeout(revealChrome, 3200);
})();
