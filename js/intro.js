/* ============================================================
   Ignition — the site is off. A single word flickers to life like
   a dying neon sign fighting to hold a charge — a scripted beat
   of dark, flash, dark, dim, steady — then blooms to full
   brightness and dissolves, letting the real site show through
   underneath. Canvas 2D so it starts on the first frame, and it
   is over in under three seconds. Any deliberate input skips it.

   The flicker is a fixed, hand-timed sequence, not per-frame
   randomness — independent noise every frame reads as a broken
   render, not a temperamental sign. See "things that have broken
   before" in the README for the general version of this rule.
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

  var DUR = 2900 * (location.search.indexOf('slowintro') >= 0 ? 8 : 1);
  var t0 = performance.now();

  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var span    = function (t, a, b) { return clamp01((t - a) / (b - a)); };
  var hash    = function (n) { var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

  // ── the flicker — a fixed script, not noise ─────────────────
  // [start, end, level] over the local 0..1 span of the sign coming to
  // life: dark, two failed catches, a dim struggle, then it holds.
  var SEGMENTS = [
    [0.00, 0.05, 0],
    [0.05, 0.08, 1],
    [0.08, 0.15, 0],
    [0.15, 0.19, 0.8],
    [0.19, 0.23, 0],
    [0.23, 0.26, 1],
    [0.26, 0.40, 0],
    [0.40, 0.45, 0.9],
    [0.45, 0.50, 0.18],
    [0.50, 0.55, 0.95],
    [0.55, 0.60, 0],
    [0.60, 0.62, 1],
    [0.62, 1.00, 1]
  ];
  function flickerLevel(f) {
    var EDGE = 0.006;
    for (var i = 0; i < SEGMENTS.length; i++) {
      var seg = SEGMENTS[i];
      if (f >= seg[0] && f < seg[1]) {
        var next = SEGMENTS[i + 1];
        var toEnd = seg[1] - f;
        if (next && toEnd < EDGE) {
          var e = 1 - toEnd / EDGE;
          return seg[2] + (next[2] - seg[2]) * e;
        }
        return seg[2];
      }
    }
    return 1;
  }

  var phrases = [
    [0.02, 'dark'],
    [0.34, 'flicker'],
    [0.62, 'steady'],
    [0.86, 'drift']
  ];
  var lastPhrase = -1;

  // faint background dust — depth without a camera move, just enough
  // that the sign isn't floating in an empty void
  var N_DUST = 90;
  var dust = [];
  for (var k = 0; k < N_DUST; k++) {
    dust.push({
      x: (hash(k * 3.1) - 0.5) * 1.3,
      y: (hash(k * 5.7) - 0.5) * 1.3,
      z: 0.3 + hash(k * 7.9) * 1.0,
      ph: hash(k * 2.3) * Math.PI * 2,
      s: 0.5 + hash(k * 11.3) * 1.2
    });
  }

  var numFlicker = 0;

  function eeg(u, t) {
    var v = 0;
    v += Math.sin(u * 21.0 + t * 1.7) * 0.34;
    v += Math.sin(u * 8.3 + t * 0.9) * 0.42;
    return v;
  }

  function frame(now) {
    var t = clamp01((now - t0) / DUR);
    var time = (now - t0) / 1000;

    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;

    // 0..1 across the flicker script; the last stretch of it holds at 1
    var f = span(t, 0.03, 0.66);
    var level = flickerLevel(f);
    // a small mains-hum ripple, only once there is a charge to modulate
    var hum = 1 + Math.sin(time * 113) * 0.025 * level;
    var lit = clamp01(level * hum);

    // it keeps warming even after it holds steady — the glow, not the text,
    // is what still has somewhere to go
    var warm = span(t, 0.42, 0.70);
    var out = span(t, 0.80, 1.00);
    var showAlpha = lit * (1 - out);

    // background dust, dimly lit by whatever the sign is currently giving off
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var d = 0; d < dust.length; d++) {
      var p = dust[d];
      var dx = cx + (p.x + Math.sin(time * 0.06 + p.ph) * 0.02) * W;
      var dy = cy + (p.y + Math.cos(time * 0.05 + p.ph) * 0.02) * H;
      var da = (0.08 + p.z * 0.1) * (0.25 + lit * 0.75) * (1 - out);
      if (da <= 0.004) continue;
      ctx.globalAlpha = da;
      ctx.fillStyle = 'rgba(216,203,169,1)';
      ctx.beginPath();
      ctx.arc(dx, dy, p.s * p.z, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // scanlines — cheap, and it's most of what reads as "an old tube"
    // rather than "a word fading in"
    if (level < 0.98) {
      ctx.save();
      ctx.globalAlpha = 0.05 * (1 - out);
      ctx.fillStyle = '#000';
      for (var sy = 0; sy < H; sy += 3) ctx.fillRect(0, sy, W, 1);
      ctx.restore();
    }

    // the sign itself: one word, Instrument Serif italic, the site's own
    // display type — this is the site's sign, not a prop borrowed for the
    // intro. Unstable while it's still catching; clean once it holds.
    var word = 'drift.';
    var size2 = Math.min(W * 0.16, H * 0.28);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 400 ' + size2.toFixed(0) + 'px "Instrument Serif", Georgia, serif';

    var unstable = level > 0.04 && level < 0.96;
    if (unstable && showAlpha > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = showAlpha * 0.35;
      ctx.fillStyle = 'rgba(79,176,168,1)';
      ctx.fillText(word, cx - 2, cy);
      ctx.fillStyle = 'rgba(216,203,169,1)';
      ctx.fillText(word, cx + 2, cy);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (showAlpha > 0.005) {
      ctx.globalAlpha = showAlpha;
      ctx.shadowColor = 'rgba(79,176,168,0.85)';
      ctx.shadowBlur = 14 + warm * 46;
      ctx.fillStyle = 'rgba(236,231,222,1)';
      ctx.fillText(word, cx, cy);
      // a second, tighter pass keeps the glyphs crisp under all that blur
      ctx.shadowBlur = 0;
      ctx.globalAlpha = showAlpha * (0.8 + warm * 0.2);
      ctx.fillText(word, cx, cy);
    }
    ctx.restore();

    var phraseIdx = 0;
    for (var q = 0; q < phrases.length; q++) if (t >= phrases[q][0]) phraseIdx = q;
    if (phraseIdx !== lastPhrase) { lineEl.textContent = phrases[phraseIdx][1]; lastPhrase = phraseIdx; }

    if (level < 0.4) {
      numEl.textContent = '— —';
    } else {
      var target = eeg(0.5, time) * 42;
      numFlicker += (target - numFlicker) * 0.15;
      numEl.textContent = numFlicker.toFixed(1) + '  µV';
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
