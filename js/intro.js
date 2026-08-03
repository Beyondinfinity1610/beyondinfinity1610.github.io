/* ============================================================
   Ignition — a key-click in the dark, then two headlight beams
   cutting on and narrowing into an electrode trace. Canvas 2D so
   it starts on the first frame, and it is over in under three
   seconds. Any deliberate input ends it.

   Ends on the same pose the old tachometer version did — a flat
   trace pair dropped below the middle of the screen — because
   js/world.js's `arrive` hand-off is built around that exact
   pose. Retime this and retime `arrive` with it.
   ============================================================ */
(function () {
  'use strict';

  var root   = document.getElementById('ignition');
  var canvas = document.getElementById('ignition-canvas');
  var lineEl = document.getElementById('ig-line');
  var numEl  = document.getElementById('ig-num');
  var skipEl = document.getElementById('ignition-skip');
  if (!root || !canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function finish() {
    if (root.dataset.done) return;
    root.dataset.done = '1';
    root.classList.add('done');
    document.body.classList.remove('locked');
    window.dispatchEvent(new CustomEvent('ignition:done'));
    setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 900);
  }

  if (reduced) { finish(); return; }

  document.body.classList.add('locked');

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  var DUR = 2500;
  var t0 = performance.now();

  var easeIO  = function (x) { return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var span    = function (t, a, b) { return clamp01((t - a) / (b - a)); };

  // deterministic pseudo-EEG, so the flattened beams read as a recording
  function eeg(u, t) {
    var v = 0;
    v += Math.sin(u * 21.0 + t * 1.7) * 0.34;
    v += Math.sin(u * 47.0 - t * 2.3) * 0.20;
    v += Math.sin(u *  8.3 + t * 0.9) * 0.42;
    v += Math.sin(u * 96.0 + t * 4.1) * 0.09;
    var b = Math.exp(-Math.pow((u - 0.63) * 7.5, 2));
    v += Math.sin(u * 150.0 + t * 6.0) * b * 0.85;
    return v;
  }

  var phrases = [
    [0.00, 'ignition'],
    [0.14, 'beam align'],
    [0.46, 'range check'],
    [0.76, 'electrode']
  ];
  var lastPhrase = -1;

  var SEG = 96;

  function frame(now) {
    var t = clamp01((now - t0) / DUR);
    var time = (now - t0) / 1000;

    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;

    // the click: a single dark beat before anything lights
    var click   = span(t, 0.03, 0.08);
    var spark   = (1 - span(t, 0.06, 0.16)) * click;
    // the beams: rise, hold, then narrow into the flat trace pair
    var rise    = easeIO(span(t, 0.08, 0.42));
    var hold    = span(t, 0.42, 0.55);
    var morph   = easeIO(span(t, 0.55, 0.94));
    var out     = span(t, 0.88, 1.00);
    var flicker = 1 - Math.pow(1 - hold, 2) * 0.05 * Math.sin(time * 40.0);

    // the key-click: a small bright pinprick with a couple of radial ticks
    if (spark > 0.001) {
      ctx.save();
      ctx.globalAlpha = spark;
      ctx.fillStyle = 'rgba(159,224,214,0.95)';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(159,224,214,0.55)';
      ctx.lineWidth = 1;
      for (var k = 0; k < 4; k++) {
        var a = (Math.PI / 2) * k + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5);
        ctx.lineTo(cx + Math.cos(a) * (11 + spark * 6), cy + Math.sin(a) * (11 + spark * 6));
        ctx.stroke();
      }
      ctx.restore();
    }

    // two headlight beams, one per side, converging toward the centre-line.
    // Each is a soft wedge that widens on rise and flattens into a thin
    // trace as morph takes over — the two channels of EEG, arrived at from
    // headlights rather than a tachometer.
    var drop = Math.min(H * 0.17, 138);
    var baseY = cy + drop;
    var halfW = Math.min(W * 0.42, 560);
    var beamY = cy - Math.min(H * 0.05, 34) * (1 - morph);   // headlight height, settles down into baseY

    [-1, 1].forEach(function (side, si) {
      var originX = cx + side * Math.min(W * 0.09, 90) * (1 - morph * 0.94);
      var originY = beamY + (baseY - beamY) * morph;
      var reach = rise * (halfW - Math.abs(originX - cx));
      var wedge = (1 - morph) * (18 + rise * 46) * flicker;   // beam cone half-angle, in px at full reach

      // a soft glowing beam rather than a flat-shaded wedge: a wide blurred
      // stroke for the spill, a thin bright stroke for the filament at its
      // core, and a small bloom at the origin for the lamp itself
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      var gx = originX + side * reach;
      var a = (rise * 0.8 + hold * 0.2) * (1 - out) * flicker;

      ctx.strokeStyle = 'rgba(190,222,217,' + (0.30 * a).toFixed(3) + ')';
      ctx.lineWidth = Math.max(3, wedge * 1.7);
      ctx.shadowColor = 'rgba(190,222,217,0.85)';
      ctx.shadowBlur = 34;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(gx, originY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * a).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1.2, wedge * 0.34);
      ctx.shadowBlur = 14;
      ctx.stroke();

      ctx.shadowBlur = 0;
      var bloom = ctx.createRadialGradient(originX, originY, 0, originX, originY, 16 + wedge * 0.4);
      bloom.addColorStop(0, 'rgba(255,255,255,' + (0.6 * a).toFixed(3) + ')');
      bloom.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(originX, originY, 16 + wedge * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // once morph takes hold, the beam's centreline becomes a drawn trace —
      // the same deterministic waveform the site's own EEG traces use
      if (morph > 0.02) {
        var pts = [];
        for (var s = 0; s <= SEG; s++) {
          var u = s / SEG;
          var lx = originX + side * u * reach;
          var ly = originY + eeg(u + si * 0.37, time) * Math.min(H * 0.05, 40) * morph;
          pts.push([lx, ly]);
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = morph * (1 - out);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
        ctx.strokeStyle = si === 0 ? 'rgba(79,176,168,0.9)' : 'rgba(216,203,169,0.75)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(79,176,168,0.3)';
        ctx.shadowBlur = 10 * (1 - morph * 0.5);
        ctx.stroke();
        ctx.restore();
      }
    });

    var phraseIdx = 0;
    for (var i = 0; i < phrases.length; i++) if (t >= phrases[i][0]) phraseIdx = i;
    if (phraseIdx !== lastPhrase) { lineEl.textContent = phrases[phraseIdx][1]; lastPhrase = phraseIdx; }

    if (morph < 0.3) {
      var lux = Math.round(rise * 1180 * flicker);
      var s4 = String(lux);
      while (s4.length < 4) s4 = '0' + s4;
      numEl.textContent = s4 + '  lux';
    } else {
      numEl.textContent = (eeg(0.5, time) * 42).toFixed(1) + '  µV';
    }
    root.style.opacity = String(1 - out);

    if (t >= 1) { finish(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  skipEl.addEventListener('click', finish);
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (ev === 'keydown' && e.key === 'Tab') return;
      finish();
    }, { once: true, passive: true });
  });
})();
