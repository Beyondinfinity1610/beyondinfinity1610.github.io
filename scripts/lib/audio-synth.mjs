// Deterministic, procedural synthesis for the six diegetic UI sounds
// (spec Phase 10 / docs/SPEC.md §8). No recorded samples anywhere in this
// build — the same "nothing here is real, everything is generated from a
// fixed seed" ethos as src/signal/**, applied to audio instead of EEG.
//
// This is a plain Node build-time script, not part of the shipped bundle,
// so it can't import src/core/rng.ts's TypeScript directly without adding
// a TS-execution toolchain (scripts/gen-fallback-svg.mjs sets the existing
// precedent of a self-contained .mjs script rather than that). mulberry32
// /hash32 below are a byte-for-byte port of src/core/rng.ts — keep them in
// sync by hand if that file ever changes.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function hash32(...parts) {
  return xmur3(parts.join(':'))();
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The site's one real SEED (src/signal/seed.ts) — reused here so the
// audio is provably part of the same "fixed seed" disclosure, not a
// separate unaccountable source of randomness.
export const SEED = 0xc0ffee;

export const SR = 48000;

// --- small DSP building blocks -------------------------------------

export function silence(seconds) {
  return new Float32Array(Math.round(seconds * SR));
}

export function whiteNoise(rng, seconds) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

/** One-pole lowpass, cutoff in Hz — cheap and adequate for texture, not
 *  aiming for a textbook-flat passband. */
export function lowpass(signal, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SR;
  const alpha = dt / (rc + dt);
  const out = new Float32Array(signal.length);
  let prev = 0;
  for (let i = 0; i < signal.length; i++) {
    prev = prev + alpha * (signal[i] - prev);
    out[i] = prev;
  }
  return out;
}

/** One-pole highpass (complement of the lowpass above). */
export function highpass(signal, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SR;
  const alpha = rc / (rc + dt);
  const out = new Float32Array(signal.length);
  let prevIn = signal[0] ?? 0;
  let prevOut = 0;
  for (let i = 0; i < signal.length; i++) {
    prevOut = alpha * (prevOut + signal[i] - prevIn);
    prevIn = signal[i];
    out[i] = prevOut;
  }
  return out;
}

export function bandpass(signal, lowHz, highHz) {
  return highpass(lowpass(signal, highHz), lowHz);
}

export function sine(freqHz, seconds, phase = 0) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin(2 * Math.PI * freqHz * (i / SR) + phase);
  return out;
}

/** A sine sweeping linearly from f0 to f1 over the buffer's duration. */
export function sineSweep(f0, f1, seconds) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 + (f1 - f0) * (t / seconds);
    phase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(phase);
  }
  return out;
}

export function mulAll(signal, factor) {
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) out[i] = signal[i] * factor;
  return out;
}

export function mix(...signals) {
  const n = Math.max(...signals.map((s) => s.length));
  const out = new Float32Array(n);
  for (const s of signals) {
    for (let i = 0; i < s.length; i++) out[i] += s[i];
  }
  return out;
}

/** Per-sample envelope multiply — env(t) returns a 0..1 gain for t in seconds. */
export function applyEnvelope(signal, envFn) {
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) out[i] = signal[i] * envFn(i / SR);
  return out;
}

export function expDecayEnvelope(attackS, decayTauS) {
  return (t) => (t < attackS ? t / attackS : Math.exp(-(t - attackS) / decayTauS));
}

/** Slow sinusoidal LFO, 0..1, for tremolo/wobble modulation. */
export function lfo(rateHz, seconds, phase = 0) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = 0.5 + 0.5 * Math.sin(2 * Math.PI * rateHz * (i / SR) + phase);
  return out;
}

export function applyGain(signal, gainSignal) {
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) out[i] = signal[i] * (gainSignal[i % gainSignal.length] ?? 1);
  return out;
}

export function normalizePeak(signal, targetPeak) {
  let peak = 0;
  for (let i = 0; i < signal.length; i++) peak = Math.max(peak, Math.abs(signal[i]));
  if (peak < 1e-9) return signal;
  const g = targetPeak / peak;
  return mulAll(signal, g);
}

/** Equal-power crossfade of a buffer's tail back into its own head, so a
 *  `loop=true` AudioBufferSourceNode doesn't click at the seam. */
export function loopify(signal, crossfadeSeconds) {
  const n = signal.length;
  const xf = Math.min(n >> 1, Math.round(crossfadeSeconds * SR));
  if (xf <= 0) return signal;
  const out = Float32Array.from(signal);
  for (let i = 0; i < xf; i++) {
    const t = i / xf;
    const fadeIn = Math.sin((t * Math.PI) / 2);
    const fadeOut = Math.cos((t * Math.PI) / 2);
    const headSample = signal[i];
    const tailSample = signal[n - xf + i];
    out[i] = headSample * fadeIn + tailSample * fadeOut;
  }
  // Drop the raw tail that was just folded into the head, so the loop
  // point is exactly the buffer's own end.
  return out.subarray(0, n);
}

/** A sine whose instantaneous frequency wobbles sinusoidally around
 *  baseFreq — the "motor" component under tapeWhirr's noise bed. */
export function wobbleSine(baseFreq, wobbleHz, wobbleDepthHz, seconds, phase = 0) {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let ph = phase;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = baseFreq + wobbleDepthHz * Math.sin(2 * Math.PI * wobbleHz * t);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph);
  }
  return out;
}

export function clampSeconds(signal, seconds) {
  const n = Math.round(seconds * SR);
  if (signal.length >= n) return signal.subarray(0, n);
  const out = new Float32Array(n);
  out.set(signal);
  return out;
}
