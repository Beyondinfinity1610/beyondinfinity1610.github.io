// Seizures and confusable artefacts — spec §2.2/§2.3. Both go through the
// same burst envelope; the discriminator is deliberately not amplitude —
// seizures evolve in frequency (8–10 Hz slowing to 3–4 Hz), artefacts hold
// a band. A simple amplitude/line-length statistic can't see that
// difference, which is the whole point.

import { rngFor } from '../core/rng';
import { SEED, DAY_SECONDS } from './seed';

export type EventKind = 'seizure' | 'artefact';

export interface SignalEvent {
  id: number;
  kind: EventKind;
  start: number; // seconds since midnight
  end: number;
  /** Peak target contribution to the line-length feature (feature.ts units). */
  intensity: number;
  freqStart: number; // Hz
  freqEnd: number; // Hz — equals freqStart for artefacts (held band)
}

const N_SEIZURES = 7;
const N_ARTEFACTS = 400;

function overlaps(events: SignalEvent[], start: number, end: number): boolean {
  for (const e of events) {
    if (start < e.end + 1 && end > e.start - 1) return true;
  }
  return false;
}

let cached: SignalEvent[] | null = null;

export function buildEvents(): SignalEvent[] {
  if (cached) return cached;

  const rng = rngFor(SEED, 'events');
  const events: SignalEvent[] = [];
  let id = 0;

  let attempts = 0;
  while (events.filter((e) => e.kind === 'seizure').length < N_SEIZURES && attempts < 5000) {
    attempts++;
    // Nocturnal skew: 75% of the time, pick an hour in [0,6) or [22,24).
    const hour = rng() < 0.75 ? (rng() < 0.5 ? rng() * 6 : 22 + rng() * 2) : rng() * 24;
    const start = hour * 3600 + rng() * 3000;
    const dur = 20 + rng() * 70;
    const end = start + dur;
    if (end > DAY_SECONDS - 120 || start < 30) continue;
    if (overlaps(events, start, end)) continue;
    events.push({
      id: id++,
      kind: 'seizure',
      start,
      end,
      // Modest, deliberately not dominant — see the invariant note below.
      intensity: 3 + rng() * 3,
      freqStart: 8 + rng() * 2,
      freqEnd: 3 + rng() * 1,
    });
  }

  attempts = 0;
  while (events.filter((e) => e.kind === 'artefact').length < N_ARTEFACTS && attempts < 40_000) {
    attempts++;
    const start = rng() * DAY_SECONDS;
    const dur = 3 + rng() * 20;
    const end = start + dur;
    if (end > DAY_SECONDS - 5 || start < 5) continue;
    if (overlaps(events, start, end)) continue;
    const band = pickArtefactBand(rng);
    // Heavy tail, deliberately: chewing/walking/talking artefacts in real
    // ambulatory EEG are often larger than an ictal discharge — that is
    // the entire clinical problem this page demonstrates. Most artefacts
    // are weak; a long tail is authored strong enough that the top few
    // out-rank every seizure (spec §2.3's guaranteed-failure invariant,
    // proven in tests/signal.spec.ts, never hand-waved here).
    const intensity = 0.4 + -Math.log(1 - rng() * 0.995) * 2.1;
    events.push({
      id: id++,
      kind: 'artefact',
      start,
      end,
      intensity,
      freqStart: band,
      freqEnd: band,
    });
  }

  events.sort((a, b) => a.start - b.start);
  cached = events;
  return events;
}

function pickArtefactBand(rng: () => number): number {
  // Representative held frequencies for chewing (jaw, ~1.2-1.8Hz range
  // muscle bursts read higher in EEG), talking, walking-related muscle
  // artefact, and broadband EMG spikes.
  const bands = [1.5, 2.0, 5.5, 12, 25];
  const idx = Math.min(bands.length - 1, Math.floor(rng() * bands.length));
  return bands[idx] + (rng() - 0.5) * 0.6;
}
