// One AudioContext, constructed only inside the first user gesture — spec
// Phase 10 (docs/SPEC.md §8): "earlier leaves it suspended and logs a
// warning, which fails the harness." setAudioEnabled(true) is the only
// place `new AudioContext()` is ever called, and it must be invoked
// synchronously from inside a real gesture handler (main.ts's toggle click
// listener) — everything after that first synchronous call is free to be
// async (fetch/decode), since Chrome only gates *construction*/`resume()`
// behind a gesture, not later playback calls on an already-running context.
//
// The six files are the diegetic samples spec §1/§8 calls for: public/
// audio/*.opus, "fetched only after the toggle is switched on" (spec's own
// tree comment) — nothing here is requested with the toggle off, which is
// what tests/audio.spec.ts's zero-request assertion checks for.

export type SoundName = 'room-tone' | 'relay-click' | 'blip' | 'tape-whirr' | 'struck-tone' | 'plate-tone';

const SOUND_FILES: Record<SoundName, string> = {
  'room-tone': '/audio/room-tone.opus',
  'relay-click': '/audio/relay-click.opus',
  blip: '/audio/blip.opus',
  'tape-whirr': '/audio/tape-whirr.opus',
  'struck-tone': '/audio/struck-tone.opus',
  'plate-tone': '/audio/plate-tone.opus',
};

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let enabled = false;

const buffers = new Map<SoundName, AudioBuffer>();
const loading = new Map<SoundName, Promise<AudioBuffer | null>>();
const activeLoops = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();

/** Test hook (spec Phase 10's done-test: "AudioContext never constructed"
 *  with the toggle off) — core/test-api.ts exposes this as
 *  window.__test.audioContextConstructed(). */
export function audioContextConstructed(): boolean {
  return ctx !== null;
}

// Test-only play log — not part of the done-test's literal wording, but
// the only reliable way for tests/audio.spec.ts to prove each piece's
// sound hook (relay click on a detent, blip on a false alarm, the audit
// loop, the ceiling strike, the topology plate tone) actually fires,
// since a cached AudioBuffer play doesn't generate a fresh network
// request the way the first fetch does.
const playLog: SoundName[] = [];
export function getSoundPlayLog(): SoundName[] {
  return [...playLog];
}
export function clearSoundPlayLog(): void {
  playLog.length = 0;
}

export function isAudioEnabled(): boolean {
  return enabled;
}

function ensureBuffer(name: SoundName): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached) return Promise.resolve(cached);
  const inFlight = loading.get(name);
  if (inFlight) return inFlight;

  const p = (async () => {
    const activeCtx = ctx;
    if (!activeCtx) return null;
    try {
      const res = await fetch(SOUND_FILES[name]);
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await activeCtx.decodeAudioData(arrayBuffer);
      buffers.set(name, decoded);
      return decoded;
    } catch {
      // A decode/fetch failure (e.g. an unsupported codec in a very old
      // browser) degrades to silence, never a thrown error into the
      // caller — audio is atmosphere here, not content the page depends
      // on (spec §1: "Photography: none... typographic and generative
      // only" carries the same "nothing load-bearing is binary" spirit).
      return null;
    } finally {
      loading.delete(name);
    }
  })();
  loading.set(name, p);
  return p;
}

/** Must be called synchronously from within a real user gesture. Toggling
 *  off stops every currently-playing loop immediately; toggling on
 *  constructs (or resumes) the single shared AudioContext and starts
 *  prefetching all six sounds, so the moment a piece asks to play one,
 *  it's usually already decoded. */
export function setAudioEnabled(on: boolean): void {
  enabled = on;
  if (on) {
    if (!ctx) {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(ctx.destination);
    } else if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    for (const name of Object.keys(SOUND_FILES) as SoundName[]) void ensureBuffer(name);
  } else {
    for (const key of Array.from(activeLoops.keys())) stopLoop(key);
  }
}

export async function playOneShot(name: SoundName, opts?: { gain?: number }): Promise<void> {
  if (!enabled || !ctx || !masterGain) return;
  const buffer = await ensureBuffer(name);
  if (!buffer || !ctx || !masterGain || !enabled) return; // state may have changed while awaiting
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = opts?.gain ?? 1;
  source.connect(gain).connect(masterGain);
  source.start();
  playLog.push(name);
}

/** Starts a looping sound under `key` if not already running — idempotent,
 *  so callers (e.g. a per-frame state check) can call it every tick
 *  without stacking duplicate loops. */
export async function startLoop(name: SoundName, key: string, opts?: { gain?: number }): Promise<void> {
  if (!enabled || !ctx || !masterGain) return;
  if (activeLoops.has(key)) return;
  const buffer = await ensureBuffer(name);
  if (!buffer || !ctx || !masterGain || !enabled || activeLoops.has(key)) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = opts?.gain ?? 1;
  source.connect(gain).connect(masterGain);
  source.start();
  activeLoops.set(key, { source, gain });
  playLog.push(name);
}

export function stopLoop(key: string): void {
  const entry = activeLoops.get(key);
  if (!entry) return;
  try {
    entry.source.stop();
  } catch {
    // already stopped — ctx state changes (e.g. a fast toggle-off/on)
    // can race a stop() that's already happened.
  }
  activeLoops.delete(key);
}
