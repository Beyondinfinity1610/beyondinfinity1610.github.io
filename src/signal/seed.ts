// One SEED constant — spec §2.2. Every value in src/signal/** is a pure
// function of (SEED, block index, channel, event index). Math.random is
// banned in this directory by CI grep; core/rng.ts's mulberry32 + hash32
// are the only randomness in the app.
export const SEED = 0xc0ffee;

// Timebase — spec §2.2/§2.3.
export const SAMPLE_RATE_HZ = 128;
export const DAY_SECONDS = 24 * 60 * 60;
export const BLOCK_SECONDS = 4;
export const BLOCK_SAMPLES = BLOCK_SECONDS * SAMPLE_RATE_HZ; // 512
export const BLOCK_OVERLAP_SECONDS = 0.5;

export const FEATURE_RATE_HZ = 4;
export const FEATURE_SAMPLES_PER_DAY = DAY_SECONDS * FEATURE_RATE_HZ; // 345,600 → 1.4MB as Float32

export const CHANNELS = ['eeg1', 'eeg2', 'ecg', 'emg', 'acc'] as const;
export type Channel = (typeof CHANNELS)[number];
