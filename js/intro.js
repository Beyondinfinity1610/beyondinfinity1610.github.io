/* ============================================================
   Ignition — a tachometer sweep that unrolls into an electrode
   trace. Canvas 2D so it starts on the first frame, and it is
   over in under three seconds. Any deliberate input ends it.
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

  var A0 = Math.PI * 0.78;   // tachometer sweep start
  var A1 = Math.PI * 2.22;   // and end
  var SEG = 132;

  var DUR = 2750;
  var t0 = performance.now();

  var easeIO  = function (x) { return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var span    = function (t, a, b) { return clamp01((t - a) / (b - a)); };

  // deterministic pseudo-EEG, so the flattened trace reads as a recording
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
    [0.00, 'sensor bus'],
    [0.30, 'calibration'],
    [0.56, 'drift compensation'],
    [0.76, 'electrode']
  ];
  var lastPhrase = -1;

  function frame(now) {
    var t = clamp01((now - t0) / DUR);
    var time = (now - t0) / 1000;

    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    var R  = Math.min(W, H) * 0.27;

    var appear = span(t, 0.00, 0.16);
    var sweep  = easeIO(span(t, 0.06, 0.50));
    var settle = span(t, 0.50, 0.62);
    var morph  = easeIO(span(t, 0.60, 0.94));
    var out    = span(t, 0.88, 1.00);

    var reach = sweep * (1 - settle * 0.14);   // overshoot, then fall back

    // bezel ticks
    ctx.save();
    ctx.globalAlpha = appear * (1 - morph) * 0.75;
    for (var i = 0; i <= 48; i++) {
      var f = i / 48;
      var a = A0 + (A1 - A0) * f;
      var major = i % 6 === 0;
      var len = major ? 13 : 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R + 9), cy + Math.sin(a) * (R + 9));
      ctx.lineTo(cx + Math.cos(a) * (R + 9 + len), cy + Math.sin(a) * (R + 9 + len));
      ctx.strokeStyle = f <= reach
        ? (f > 0.78 ? 'rgba(201,124,78,0.85)' : 'rgba(201,154,78,0.70)')
        : 'rgba(236,231,222,0.13)';
      ctx.lineWidth = major ? 1.4 : 1;
      ctx.stroke();
    }
    ctx.restore();

    // the arc, unrolling into a trace
    var pts = [];
    var halfW = Math.min(W * 0.42, 560);
    for (var s = 0; s <= SEG; s++) {
      var u = s / SEG;
      var ang = A0 + (A1 - A0) * u;
      var ax = cx + Math.cos(ang) * R;
      var ay = cy + Math.sin(ang) * R;
      var drop = Math.min(H * 0.17, 138);
      var lx = cx - halfW + u * halfW * 2;
      var ly = cy + drop + eeg(u, time) * Math.min(H * 0.055, 46);
      var m = clamp01(morph * 1.55 - u * 0.5);   // unroll from the left
      m = m * m * (3 - 2 * m);
      pts.push([ax + (lx - ax) * m, ay + (ly - ay) * m]);
    }

    var lead = morph > 0 ? SEG : Math.floor(SEG * reach);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (morph < 0.02 && lead < SEG) {
      ctx.beginPath();
      ctx.moveTo(pts[lead][0], pts[lead][1]);
      for (var q = lead + 1; q <= SEG; q++) ctx.lineTo(pts[q][0], pts[q][1]);
      ctx.strokeStyle = 'rgba(236,231,222,0.08)';
      ctx.lineWidth = 1;
      ctx.globalAlpha = appear;
      ctx.stroke();
    }

    ctx.globalAlpha = (1 - out) * appear;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var p = 1; p <= lead; p++) ctx.lineTo(pts[p][0], pts[p][1]);
    var g = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
    g.addColorStop(0,    'rgba(141,106,52,0.55)');
    g.addColorStop(0.55, 'rgba(201,154,78,0.95)');
    g.addColorStop(1,    'rgba(230,192,138,0.95)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(201,154,78,0.35)';
    ctx.shadowBlur = 14 * (1 - morph * 0.6);
    ctx.stroke();
    ctx.restore();

    // needle
    if (morph < 0.5) {
      var na = A0 + (A1 - A0) * reach;
      ctx.save();
      ctx.globalAlpha = appear * (1 - morph * 2) * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(na) * R * 0.14, cy + Math.sin(na) * R * 0.14);
      ctx.lineTo(cx + Math.cos(na) * R * 0.93, cy + Math.sin(na) * R * 0.93);
      ctx.strokeStyle = 'rgba(236,231,222,0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,154,78,0.9)';
      ctx.fill();
      ctx.restore();
    }

    var phraseIdx = 0;
    for (var k = 0; k < phrases.length; k++) if (t >= phrases[k][0]) phraseIdx = k;
    if (phraseIdx !== lastPhrase) { lineEl.textContent = phrases[phraseIdx][1]; lastPhrase = phraseIdx; }

    if (morph < 0.35) {
      var rpm = String(Math.round(reach * 8600));
      while (rpm.length < 4) rpm = '0' + rpm;
      numEl.textContent = rpm + '  rpm';
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
