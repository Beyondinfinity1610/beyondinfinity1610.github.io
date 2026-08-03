/* ============================================================
   Ignition — a cold start, then the car pulling away: light
   trails rushing past out of the dark, two of them holding their
   line while the rest scatter, narrowing into an electrode trace
   as the readout flips from rpm to µV. Canvas 2D so it starts on
   the first frame, and it is over in under three seconds. Any
   deliberate input ends it.

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

  var DUR = 2750;
  var t0 = performance.now();

  var easeIO  = function (x) { return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
  var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var span    = function (t, a, b) { return clamp01((t - a) / (b - a)); };
  var hash    = function (n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

  // deterministic pseudo-EEG, so the flattened trails read as a recording
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
    [0.00, 'cold start'],
    [0.16, 'accelerating'],
    [0.55, 'up to speed'],
    [0.78, 'electrode']
  ];
  var lastPhrase = -1;

  var SEG = 72;
  var N_STREAKS = 60;
  // two of the light trails are the signal — they hold a near-straight line
  // while the rest scatter, and become the two EEG channels on the far side
  var PRIMARY = [0, 1];
  var streaks = [];
  for (var i = 0; i < N_STREAKS; i++) {
    var primary = PRIMARY.indexOf(i) >= 0;
    streaks.push({
      side: i % 2 === 0 ? -1 : 1,
      spread: primary ? 0 : (hash(i * 3.1) - 0.5) * 2,
      start: primary ? 0 : hash(i * 7.7) * 0.1,
      wob: hash(i * 5.3) * Math.PI * 2,
      width: 1.1 + hash(i * 2.3) * 2.6,
      primary: primary
    });
  }

  function frame(now) {
    var t = clamp01((now - t0) / DUR);
    var time = (now - t0) / 1000;

    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;

    // ── cold start: an ember cranks unevenly before it catches
    var crank = 1 - span(t, 0.13, 0.19);
    var catch_ = span(t, 0.10, 0.15) * (1 - span(t, 0.14, 0.24));
    if (crank > 0.001) {
      var cyc = time * 9.0;
      var lit = (Math.floor(cyc) % 3 !== 0) && (cyc % 1 < 0.55);
      ctx.save();
      ctx.globalAlpha = crank * (lit ? 0.55 : 0.12);
      ctx.fillStyle = 'rgba(216,203,169,0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (catch_ > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 * catch_ + 4);
      flash.addColorStop(0, 'rgba(255,255,255,' + (0.8 * catch_).toFixed(3) + ')');
      flash.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = flash;
      ctx.beginPath();
      ctx.arc(cx, cy, 90 * catch_ + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── pulling away: light trails rushing outward, near-horizontal so the
    // two that matter can settle into a flat trace without a hard turn
    var zoom = easeIO(span(t, 0.14, 0.58));
    var morph = easeIO(span(t, 0.56, 0.94));
    var out = span(t, 0.88, 1.00);
    var reach = Math.min(W * 0.5, 640);
    var drop = Math.min(H * 0.17, 138);
    var baseY = cy + drop;

    // a signal-turning cue right as the trails start to resolve — two short
    // blinks of an indicator, the one unmistakably automotive beat left in
    var blinkWin = span(t, 0.50, 0.545) * (1 - span(t, 0.585, 0.62));
    if (blinkWin > 0.001 && Math.floor(time * 6.5) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = blinkWin * 0.85;
      ctx.fillStyle = 'rgba(216,180,120,0.95)';
      ctx.translate(cx + reach * 0.16, cy - drop * 0.55 * (1 - morph));
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(9, 0); ctx.lineTo(0, 6);
      ctx.moveTo(7, -6); ctx.lineTo(16, 0); ctx.lineTo(7, 6);
      ctx.fill();
      ctx.restore();
    }

    for (var s = 0; s < N_STREAKS; s++) {
      var st = streaks[s];
      var u = clamp01((zoom - st.start) / Math.max(0.01, 1 - st.start));
      if (u <= 0 && !st.primary) continue;

      var laneY = cy + Math.sin(st.wob) * (H * 0.32) * st.spread * (1 - morph);
      var headR = (0.35 + easeOut(u) * 0.65) * reach;
      var len = 60 + easeOut(u) * (st.primary ? 90 : 320);

      var hx = cx + st.side * headR;
      var hy = laneY;
      var tx = cx + st.side * Math.max(0, headR - len);
      var ty = laneY;

      if (st.primary && morph > 0.02) {
        // the streak becomes the drawn EEG waveform, converging on the
        // same flat pose the ignition has always handed off on
        var pts = [];
        for (var k = 0; k <= SEG; k++) {
          var v = k / SEG;
          var lx = cx + st.side * v * reach;
          var ly = (laneY + (baseY - laneY) * morph) + eeg(v + s * 0.41, time) * Math.min(H * 0.05, 40) * morph;
          pts.push([lx, ly]);
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = (1 - out);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
        ctx.strokeStyle = s === 0 ? 'rgba(79,176,168,0.9)' : 'rgba(216,203,169,0.75)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(79,176,168,0.3)';
        ctx.shadowBlur = 10 * (1 - morph * 0.5);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      var a = (0.65 + easeOut(u) * 0.35) * (1 - out) * (1 - morph);
      if (a <= 0.005) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      var grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0,   'rgba(200,220,216,0)');
      grad.addColorStop(0.7, 'rgba(216,232,228,' + (0.5 * a).toFixed(3) + ')');
      grad.addColorStop(1,   'rgba(255,255,255,' + (0.9 * a).toFixed(3) + ')');
      ctx.strokeStyle = grad;
      ctx.lineWidth = st.primary ? 2.2 : st.width;
      ctx.shadowColor = 'rgba(200,224,220,0.6)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.restore();
    }

    var phraseIdx = 0;
    for (var q = 0; q < phrases.length; q++) if (t >= phrases[q][0]) phraseIdx = q;
    if (phraseIdx !== lastPhrase) { lineEl.textContent = phrases[phraseIdx][1]; lastPhrase = phraseIdx; }

    if (morph < 0.3) {
      var rpmVal;
      if (crank > 0.01) rpmVal = Math.round(600 + hash(Math.floor(time * 9)) * 500);
      else rpmVal = Math.round(900 + zoom * 6300);
      var s4 = String(rpmVal);
      while (s4.length < 4) s4 = '0' + s4;
      numEl.textContent = s4 + '  rpm';
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
