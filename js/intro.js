/* ============================================================
   Ignition — a field of scattered points in real 3D space, each
   drifting on its own smooth path, that fly into formation as two
   depth-separated electrode traces while the camera dollies and
   sways through them. Manual perspective projection on a 2D
   canvas rather than a second WebGL context — genuine depth and
   parallax without a module-loading race against js/world.js, and
   without doubling the number of GPU contexts on a low-end device.

   Canvas 2D so it starts on the first frame, and it is over in
   under three seconds. Any deliberate input skips it.

   Ends on the same pose the earlier versions did — a flat trace
   pair dropped below the middle of the screen — because
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
  var low = (navigator.deviceMemory || 4) <= 4 || (navigator.hardwareConcurrency || 4) <= 4;

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  var DUR = 2900;
  var t0 = performance.now();

  var easeIO  = function (x) { return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var span    = function (t, a, b) { return clamp01((t - a) / (b - a)); };
  var hash    = function (n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

  // the clean signal underneath the noise — deterministic, so once it
  // resolves it reads as a recording rather than a random line
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
    [0.00, 'acquiring signal'],
    [0.38, 'resolving'],
    [0.72, 'locked'],
    [0.86, 'electrode']
  ];
  var lastPhrase = -1;

  // ── the space ────────────────────────────────────────────────
  // world units, projected by hand: scale = FOCAL / -effectiveZ.
  // Two lines of points live at different depths (LINE_Z), so they
  // part from each other with real parallax rather than a flat offset.
  var FOCAL = 300;
  var N_PER_LINE = low ? 46 : 80;
  var N_DUST = low ? 60 : 140;
  var LINE_Z = [-230, -270];
  var HALF_X = 150;
  var SIGNAL_AMP = 34;
  // world-space Y so the finished formation lands where the site's own
  // `arrive` hand-off expects it: a trace dropped below screen centre
  var DROP_WORLD = 35;

  function seeded(seed) {
    return { a: hash(seed * 1.7), b: hash(seed * 3.3), c: hash(seed * 5.1), d: hash(seed * 7.9) };
  }

  var points = [];
  for (var li = 0; li < 2; li++) {
    for (var i = 0; i < N_PER_LINE; i++) {
      var u = i / (N_PER_LINE - 1);
      var sd = seeded(li * 1000 + i);
      points.push({
        line: li, u: u,
        // scattered start: a loose cloud roughly around the formation's
        // own depth range, so nothing has to travel an absurd distance
        nx: (sd.a - 0.5) * 620,
        ny: (sd.b - 0.5) * 420,
        nz: -140 - sd.c * 420,
        // per-point smooth wander — a sum of a couple of slow sines with a
        // random phase/frequency each, never an independent per-frame value
        wA: 0.15 + sd.a * 0.25, wB: 0.11 + sd.b * 0.2,
        phA: sd.c * Math.PI * 2, phB: sd.d * Math.PI * 2,
        start: hash(li * 71 + i * 3.3) * 0.16
      });
    }
  }
  var dust = [];
  for (var k = 0; k < N_DUST; k++) {
    var sdd = seeded(5000 + k);
    dust.push({
      x: (sdd.a - 0.5) * 900, y: (sdd.b - 0.5) * 560, z: -260 - sdd.c * 700,
      s: 0.5 + sdd.d * 1.2, ph: sdd.a * Math.PI * 2
    });
  }

  function project(x, y, z, cx, cy) {
    var scale = FOCAL / Math.max(8, -z);
    return [cx + x * scale, cy + y * scale, scale];
  }

  var lastNow = performance.now();
  var numSmooth = 0;

  function frame(now) {
    var t = clamp01((now - t0) / DUR);
    var time = (now - t0) / 1000;
    var dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;

    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    var drop = Math.min(H * 0.17, 138);

    // 0 at the start (scattered noise), 1 once the signal has resolved
    var resolve = easeIO(span(t, 0.12, 0.76));
    var out = span(t, 0.90, 1.00);

    // the camera opens on a wide establishing pull-back, then dollies in
    // through the whole run and never stops moving — which is most of what
    // reads as "3D" rather than a flat scene with things drifting on it
    var dolly = -70 + easeIO(span(t, 0, 1)) * 220;
    var yaw = Math.sin(time * 0.22) * 0.05;
    var camY = Math.sin(time * 0.17) * 8;
    var cosY = Math.cos(yaw), sinY = Math.sin(yaw);

    function toScreen(x, y, z) {
      var rx = x * cosY - z * sinY;
      var rz = x * sinY + z * cosY;
      return project(rx, y - camY, rz + dolly, cx, cy);
    }

    // distant dust, drifting, never converging — pure depth cue
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var d = 0; d < dust.length; d++) {
      var p = dust[d];
      var dx = p.x + Math.sin(time * 0.1 + p.ph) * 12;
      var dy = p.y + Math.cos(time * 0.08 + p.ph) * 8;
      var sp = toScreen(dx, dy, p.z);
      if (sp[2] <= 0) continue;
      var da = Math.min(0.5, sp[2] * 0.35) * (1 - out) * 0.5;
      if (da <= 0.004) continue;
      ctx.globalAlpha = da;
      ctx.fillStyle = 'rgba(216,203,169,1)';
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], Math.max(0.4, p.s * sp[2] * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // the lock — a bloom, an expanding ring, and a soft frame-wide flash,
    // all keyed to the same instant the signal settles in
    var lockPeak = span(t, 0.72, 0.77);
    var lock = lockPeak * (1 - span(t, 0.77, 0.88));
    var ringT = span(t, 0.72, 0.90);
    if (lock > 0.001 || ringT > 0) {
      var ls = toScreen(0, DROP_WORLD, (LINE_Z[0] + LINE_Z[1]) / 2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (lock > 0.001) {
        var rad = (150 * lock + 10) * Math.max(0.4, ls[2]);
        var g = ctx.createRadialGradient(ls[0], ls[1], 0, ls[0], ls[1], rad);
        g.addColorStop(0, 'rgba(159,224,214,' + (0.6 * lock).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(159,224,214,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ls[0], ls[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // a hairline ring expanding outward from the point of lock
      if (ringT > 0 && ringT < 1) {
        var ringR = ringT * 420 * Math.max(0.4, ls[2]);
        ctx.globalAlpha = (1 - ringT) * 0.5;
        ctx.strokeStyle = 'rgba(159,224,214,0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ls[0], ls[1], ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // a single soft, brief brightening of the whole frame at the instant of
    // lock — restrained (never past ~12% white), so it reads as punctuation
    if (lockPeak > 0.001) {
      ctx.save();
      ctx.globalAlpha = lockPeak * 0.12;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // the two lines, each a cloud of points flying into formation
    for (li = 0; li < 2; li++) {
      var screenPts = [];
      var col = li === 0 ? [79, 176, 168] : [216, 203, 169];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < N_PER_LINE; i++) {
        var pt = points[li * N_PER_LINE + i];
        var pu = clamp01((resolve - pt.start) / Math.max(0.01, 1 - pt.start));
        var wob = 1 - pu;

        var wx = pt.nx + Math.sin(time * pt.wA + pt.phA) * 70 * wob;
        var wy = pt.ny + Math.cos(time * pt.wB + pt.phB) * 55 * wob;
        var wz = pt.nz;

        var fx = -HALF_X + pt.u * HALF_X * 2;
        var fy = DROP_WORLD + eeg(pt.u + pt.line * 0.37, time) * SIGNAL_AMP;
        var fz = LINE_Z[pt.line];

        var ex = wx + (fx - wx) * pu;
        var ey = wy + (fy - wy) * pu;
        var ez = wz + (fz - wz) * pu;

        var sp2 = toScreen(ex, ey, ez);
        screenPts.push(sp2);
        if (sp2[2] <= 0) continue;

        var a = (0.35 + pu * 0.65) * (1 - out);
        var r = Math.max(0.7, (0.9 + pu * 1.3) * sp2[2]);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',1)';
        ctx.beginPath();
        ctx.arc(sp2[0], sp2[1], r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // once a point is close to formed, connect it to its neighbour —
      // the cloud reads as a line only once there is a line to read
      if (resolve > 0.35) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.globalAlpha = span(resolve, 0.35, 0.85) * (1 - out) * 0.85;
        ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',1)';
        ctx.lineWidth = 1.3;
        ctx.shadowColor = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.4)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(screenPts[0][0], screenPts[0][1]);
        for (i = 1; i < screenPts.length; i++) ctx.lineTo(screenPts[i][0], screenPts[i][1]);
        ctx.stroke();
        ctx.restore();
      }
    }

    // a vignette — the one cheap trick that makes a canvas scene read as
    // "shot" rather than "drawn": darken the corners, leave the centre alone
    var vig = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.28, cx, cy, Math.max(W, H) * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    var phraseIdx = 0;
    for (var q = 0; q < phrases.length; q++) if (t >= phrases[q][0]) phraseIdx = q;
    if (phraseIdx !== lastPhrase) { lineEl.textContent = phrases[phraseIdx][1]; lastPhrase = phraseIdx; }

    var target = eeg(0.5, time) * 42 * resolve + Math.sin(time * 3.1) * 30 * (1 - resolve);
    numSmooth += (target - numSmooth) * Math.min(1, dt * 5);
    numEl.textContent = numSmooth.toFixed(1) + '  µV';
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
