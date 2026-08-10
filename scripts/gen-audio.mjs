#!/usr/bin/env node
// Generates the six diegetic UI sounds — spec Phase 10 (docs/SPEC.md §8):
// "low room tone, a relay click on threshold detents, a soft blip per
// false alarm, a tape whirr for 05, a struck tone for the ceiling" — plus
// a sixth, `plate-tone`, for movement 04's plate hover (the spec names
// only five sound TYPES despite saying "six ~40KB Opus samples"; movement
// 04 is the only one of the four case-study acts with zero sound coverage
// in that list, so a soft interaction tone there is the one gap that
// completes "one distinctive sound per act" — see this repo's Phase 10
// working notes for the full reasoning; flagged as an inference, not a
// literal spec requirement).
//
// Everything here is procedurally synthesised, never recorded — same
// "generated in your browser from a fixed seed" ethos src/signal/**
// already carries for the EEG data, applied to audio instead (this script
// runs at build time in Node, not in the browser, since the files are
// static assets under public/audio/ per spec's own tree).
//
// No ffmpeg / opusenc is available in this environment (checked). Encoding
// uses opusscript (pure JS/WASM libopus port, zero transitive deps,
// devDependency-only — never reaches the shipped browser bundle) and a
// hand-rolled Ogg-Opus muxer (scripts/lib/ogg-opus-mux.mjs) since no
// dependency-light container muxer exists on npm (the only real option,
// `ogg`, requires native bindings). Every file this script writes is
// round-trip verified below: demuxed and decoded with a fresh opusscript
// decoder before being trusted, so a muxing bug can't silently ship a
// .opus file that LOOKS present but fails `decodeAudioData` in a browser.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpusScript from 'opusscript';
import { muxOggOpus, demuxOggOpus } from './lib/ogg-opus-mux.mjs';
import {
  SEED,
  SR,
  hash32,
  mulberry32,
  whiteNoise,
  lowpass,
  highpass,
  bandpass,
  sine,
  sineSweep,
  wobbleSine,
  mulAll,
  mix,
  applyEnvelope,
  expDecayEnvelope,
  lfo,
  applyGain,
  normalizePeak,
  loopify,
} from './lib/audio-synth.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = join(ROOT, 'public', 'audio');

const FRAME_SAMPLES = 960; // 20ms @ 48kHz — a valid Opus frame size

// --- the six sounds --------------------------------------------------

function roomTone() {
  const rng = mulberry32(hash32(SEED, 'audio', 'room-tone'));
  const dur = 4.0;
  const noiseBed = lowpass(whiteNoise(rng, dur), 220);
  const hum1 = sine(55, dur);
  const hum2 = sine(55 * 1.008, dur, 0.7);
  const hum = mix(mulAll(hum1, 0.5), mulAll(hum2, 0.5));
  const sway = lfo(0.13, dur, 0.2); // 0..1
  const swayGain = new Float32Array(sway.length);
  for (let i = 0; i < sway.length; i++) swayGain[i] = 0.82 + 0.18 * sway[i];

  const bed = mix(mulAll(noiseBed, 0.55), mulAll(hum, 0.45));
  const swayed = applyGain(bed, swayGain);
  const normalized = normalizePeak(swayed, 0.22);
  return loopify(normalized, 0.35);
}

function relayClick() {
  const rng = mulberry32(hash32(SEED, 'audio', 'relay-click'));
  const total = 0.09;
  const n = Math.round(total * SR);
  const out = new Float32Array(n);

  const burstA = applyEnvelope(highpass(whiteNoise(rng, 0.03), 1500), expDecayEnvelope(0.0008, 0.010));
  const burstB = applyEnvelope(highpass(whiteNoise(rng, 0.03), 1900), expDecayEnvelope(0.0006, 0.006));
  const offsetB = Math.round(0.013 * SR);

  for (let i = 0; i < burstA.length && i < n; i++) out[i] += burstA[i];
  for (let i = 0; i < burstB.length && offsetB + i < n; i++) out[offsetB + i] += burstB[i] * 0.55;

  return normalizePeak(out, 0.75);
}

function blip() {
  const dur = 0.16;
  const tone = mix(mulAll(sineSweep(880, 760, dur), 1), mulAll(sineSweep(1320, 1140, dur), 0.18));
  const shaped = applyEnvelope(tone, expDecayEnvelope(0.004, 0.05));
  return normalizePeak(shaped, 0.5);
}

function tapeWhirr() {
  const rng = mulberry32(hash32(SEED, 'audio', 'tape-whirr'));
  const dur = 1.8;
  const noiseBed = bandpass(whiteNoise(rng, dur), 500, 1400);
  const tremolo = lfo(3.2, dur, 0.4);
  const tremGain = new Float32Array(tremolo.length);
  for (let i = 0; i < tremolo.length; i++) tremGain[i] = 0.55 + 0.45 * tremolo[i];
  const swayed = applyGain(noiseBed, tremGain);

  const motor = wobbleSine(88, 0.45, 7, dur);
  const combined = mix(mulAll(swayed, 0.65), mulAll(motor, 0.22));
  const normalized = normalizePeak(combined, 0.3);
  return loopify(normalized, 0.15);
}

function struckTone() {
  const dur = 1.2;
  const partials = [
    { freq: 340, tau: 0.85, amp: 1.0 },
    { freq: 340 * 2.41, tau: 0.32, amp: 0.5 },
    { freq: 340 * 3.83, tau: 0.16, amp: 0.26 },
  ];
  const parts = partials.map((p) => applyEnvelope(mulAll(sine(p.freq, dur), p.amp), expDecayEnvelope(0.002, p.tau)));
  const combined = mix(...parts);
  return normalizePeak(combined, 0.6);
}

function plateTone() {
  const dur = 0.18;
  const tone = mix(mulAll(sine(660, dur), 1), mulAll(sine(660 * 1.5, dur), 0.15));
  const shaped = applyEnvelope(tone, expDecayEnvelope(0.008, 0.09));
  return normalizePeak(shaped, 0.4);
}

const SOUNDS = [
  { name: 'room-tone', gen: roomTone, bitrate: 24000 },
  { name: 'relay-click', gen: relayClick, bitrate: 32000 },
  { name: 'blip', gen: blip, bitrate: 32000 },
  { name: 'tape-whirr', gen: tapeWhirr, bitrate: 24000 },
  { name: 'struck-tone', gen: struckTone, bitrate: 32000 },
  { name: 'plate-tone', gen: plateTone, bitrate: 32000 },
];

// --- float32 PCM -> Opus packets -> Ogg container ---------------------

function floatTo16BitPCM(float32) {
  const buf = Buffer.alloc(float32.length * 2);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    buf.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), i * 2);
  }
  return buf;
}

function encodeToOpusPackets(float32, bitrate) {
  const encoder = new OpusScript(SR, 1, OpusScript.Application.AUDIO);
  encoder.setBitrate(bitrate);

  const pcm16 = floatTo16BitPCM(float32);
  const totalFrames = Math.ceil(float32.length / FRAME_SAMPLES);
  const packets = [];
  let lastPacketSamples = FRAME_SAMPLES;

  for (let f = 0; f < totalFrames; f++) {
    const start = f * FRAME_SAMPLES * 2;
    const isLast = f === totalFrames - 1;
    let frameBuf;
    if (isLast) {
      const remainingSamples = float32.length - f * FRAME_SAMPLES;
      lastPacketSamples = remainingSamples;
      frameBuf = Buffer.alloc(FRAME_SAMPLES * 2);
      pcm16.copy(frameBuf, 0, start, start + remainingSamples * 2);
    } else {
      frameBuf = pcm16.subarray(start, start + FRAME_SAMPLES * 2);
    }
    const packet = encoder.encode(frameBuf, FRAME_SAMPLES);
    packets.push(Uint8Array.from(packet));
  }

  encoder.delete();
  return { packets, lastPacketSamples };
}

function verifyRoundTrip(name, oggBuffer) {
  const { head, tags, audioPackets } = demuxOggOpus(oggBuffer);
  if (!head || head.toString('ascii', 0, 8) !== 'OpusHead') {
    throw new Error(`${name}: OpusHead packet missing/malformed`);
  }
  if (!tags || tags.toString('ascii', 0, 8) !== 'OpusTags') {
    throw new Error(`${name}: OpusTags packet missing/malformed`);
  }
  if (audioPackets.length === 0) {
    throw new Error(`${name}: no audio packets found after muxing`);
  }

  const channels = head.readUInt8(9);
  const decoder = new OpusScript(SR, channels, OpusScript.Application.AUDIO);
  let totalSamples = 0;
  try {
    for (const packet of audioPackets) {
      const pcm = decoder.decode(Buffer.from(packet), FRAME_SAMPLES);
      totalSamples += pcm.length / 2 / channels;
    }
  } finally {
    decoder.delete();
  }
  if (totalSamples <= 0) throw new Error(`${name}: decoded zero samples`);
  return totalSamples;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log('generating audio (procedural synthesis, no recordings — spec Phase 10):\n');

  let totalBytes = 0;
  for (const { name, gen, bitrate } of SOUNDS) {
    const pcm = gen();
    const { packets, lastPacketSamples } = encodeToOpusPackets(pcm, bitrate);
    const oggBuffer = muxOggOpus({
      channels: 1,
      inputSampleRate: SR,
      preSkip: 0,
      packets,
      samplesPerPacket: FRAME_SAMPLES,
      lastPacketSamples,
      serial: hash32(SEED, 'audio', name, 'serial') & 0x7fffffff,
    });

    const decodedSamples = verifyRoundTrip(name, oggBuffer);
    const outPath = join(OUT_DIR, `${name}.opus`);
    writeFileSync(outPath, oggBuffer);
    totalBytes += oggBuffer.length;

    const srcDurationS = pcm.length / SR;
    const decodedDurationS = decodedSamples / SR;
    console.log(
      `  ${name}.opus`.padEnd(22) +
        `${(oggBuffer.length / 1024).toFixed(2)} KB`.padStart(10) +
        `   synth ${srcDurationS.toFixed(2)}s -> decoded ${decodedDurationS.toFixed(2)}s (round-trip OK)`,
    );
  }

  console.log(`\ntotal: ${(totalBytes / 1024).toFixed(2)} KB across ${SOUNDS.length} files`);
}

main();
