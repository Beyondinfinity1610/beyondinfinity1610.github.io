/* ============================================================
   Ignition — no vehicle at all. Two lines of raw noise search for
   a signal, resolve into a clean electrode trace as they find it,
   and settle on the same flat pose the site has always handed off
   from. Canvas 2D so it starts on the first frame, and it is over
   in under three seconds. Any deliberate input ends it.

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

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  var DUR = 2700;
  var t0 = performance.now();

  var easeIO  = function (x) { return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var span    = function (t, a, b) { return clamp01((t - a) / (b - a)); };

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
  var SEG = 90;

  function frame(now) {
    var t = clamp01((now - t0) / DUR);
    var time = (now - t0) / 1000;

    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    var drop = Math.min(H * 0.17, 138);
    var baseY = cy + drop;
    var halfW = Math.min(W * 0.42, 560);

    // 0 at the start (pure noise), 1 once the signal has resolved
    var resolve = easeIO(span(t, 0.10, 0.74));
    var out = span(t, 0.88, 1.00);

    // an oscilloscope trigger sweep, only while there is nothing locked yet
    if (resolve < 0.94) {
      var sweepX = cx - halfW + ((time * 260) % (halfW * 2));
      ctx.save();
      ctx.globalAlpha = (1 - resolve) * 0.22;
      ctx.strokeStyle = 'rgba(200,224,220,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sweepX, baseY - 70);
      ctx.lineTo(sweepX, baseY + 70);
      ctx.stroke();
      ctx.restore();
    }

    // the lock — a brief bloom the instant the signal settles in
    var lock = span(t, 0.70, 0.75) * (1 - span(t, 0.75, 0.86));
    if (lock > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, 120 * lock + 8);
      g.addColorStop(0, 'rgba(159,224,214,' + (0.5 * lock).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(159,224,214,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, baseY, 120 * lock + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    [0, 1].forEach(function (li) {
      var noiseAmp = Math.min(H * 0.34, 260) * (1 - resolve);
      var signalAmp = Math.min(H * 0.05, 40);
      var pts = [];
      for (var s = 0; s <= SEG; s++) {
        var u = s / SEG;
        var x = cx - halfW + u * halfW * 2;
        var clean = eeg(u + li * 0.37, time) * signalAmp * resolve;
        var noise = (Math.random() * 2 - 1) * noiseAmp;
        pts.push([x, baseY + clean + noise]);
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = (0.5 + resolve * 0.4) * (1 - out);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
      ctx.strokeStyle = li === 0 ? 'rgba(79,176,168,0.9)' : 'rgba(216,203,169,0.75)';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = 'rgba(79,176,168,0.3)';
      ctx.shadowBlur = 8 * resolve;
      ctx.stroke();
      ctx.restore();
    });

    var phraseIdx = 0;
    for (var i = 0; i < phrases.length; i++) if (t >= phrases[i][0]) phraseIdx = i;
    if (phraseIdx !== lastPhrase) { lineEl.textContent = phrases[phraseIdx][1]; lastPhrase = phraseIdx; }

    var jitter = (1 - resolve) * (Math.random() * 90 - 45);
    numEl.textContent = (eeg(0.5, time) * 42 * resolve + jitter).toFixed(1) + '  µV';
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
