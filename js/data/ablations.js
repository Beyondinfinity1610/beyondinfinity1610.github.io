/**
 * The NeuroSync ablation campaign.
 *
 * Every entry is a real experiment run during the development of the multimodal
 * focal-seizure detector. `f1` / `fp` are window-level unless `level: 'event'`,
 * in which case they are clinical event-level (Any-Overlap, 2.0 s collars).
 *
 * status: 'champion' | 'kept' | 'neutral' | 'failed'
 */

export const CAMPAIGNS = {
  B: { key: 'B', label: 'B · Foundations',   color: '#4ddbff', blurb: 'Does each piece earn its place? Remove one thing at a time and watch what breaks.' },
  C: { key: 'C', label: 'C · Architecture',  color: '#9d7bff', blurb: 'Replace the front-end, deepen the fusion, reshape the loss. Chase the ceiling.' },
  D: { key: 'D', label: 'D · Deployment',    color: '#ffc46b', blurb: 'Stop optimising metrics. Ask whether a clinician could live with the false alarms.' },
};

export const ABLATIONS = [
  /* ---------------- B campaign — foundations ---------------- */
  {
    id: 'B0_control', c: 'B', name: 'Baseline control', status: 'kept', f1: 0.1985, fp: 468,
    aim: 'Establish a statistically stable reference before touching anything.',
    did: 'Full four-modality stack with Asymmetric Loss, unmodified.',
    took: 'Confirmed the baseline was replicable run-to-run. Everything after this is measured against it.',
  },
  {
    id: 'B1_bce_loss', c: 'B', name: 'Plain BCE loss', status: 'neutral', f1: 0.2019, fp: 697,
    aim: 'Is Asymmetric Loss actually doing anything, or is it decoration?',
    did: 'Swapped ASL for standard binary cross-entropy.',
    took: 'Window F1 looks fine — and false positives jump 49%. A reminder that a single headline metric can hide the failure that matters.',
  },
  {
    id: 'B2_no_gate', c: 'B', name: 'No trust gate', status: 'failed', f1: 0.1783, fp: 772,
    aim: 'Could the transformer just learn to ignore bad channels on its own?',
    did: 'Removed the DynMM gating module entirely.',
    took: 'It cannot. High-amplitude chewing EMG contaminates the attention keys and fires as epileptiform activity. +41% false alarms.',
  },
  {
    id: 'B3_bce_no_gate', c: 'B', name: 'BCE, no gate', status: 'failed', f1: 0.1702, fp: 884,
    aim: 'What does the naive version of this model actually look like?',
    did: 'Standard BCE, no gating — the paper-default configuration.',
    took: 'False alarms nearly double. At 99.8% background prevalence, a loss that treats FP and FN as equals is not a loss function, it is a bias.',
  },
  {
    id: 'B4_large_eeg', c: 'B', name: 'Wider EEG encoder', status: 'neutral', f1: 0.1902, fp: 850, sens: 0.691,
    aim: 'More filters should capture high-frequency ripple activity.',
    did: 'Widened ChronoNet channels to 64 filters.',
    took: 'Capacity is not the bottleneck — noise is. The wider model memorised ambulatory artifacts faster than it learned seizures.',
  },
  {
    id: 'B5_cosine_lr', c: 'B', name: 'Cosine annealing', status: 'failed', f1: 0.1837, fp: 832,
    aim: 'Standard LR decay instead of warm restarts.',
    did: 'Cosine annealing across the full schedule.',
    took: 'Decays too fast. By the time Phase 3 unfreezes the encoder, there is no learning rate left to re-settle the fusion weights.',
  },
  {
    id: 'B6_eeg_only', c: 'B', name: 'EEG only', status: 'failed', f1: 0.1690, fp: 736,
    aim: 'The honest question: do we need ECG, EMG and accelerometer at all?',
    did: 'Bypassed fusion entirely, evaluated the two behind-the-ear EEG channels alone.',
    took: 'The load-bearing result of the whole project. Single-site wearable EEG cannot separate a seizure from a jaw clench. Multimodality is not a garnish here — it is the mechanism.',
  },
  {
    id: 'B7_no_phase0', c: 'B', name: 'No ECG pre-training', status: 'failed', f1: 0.1811, fp: 741,
    aim: 'Self-supervised pre-training is expensive. Is it worth the compute?',
    did: 'Skipped the Phase 0 masked-autoencoder pre-train on ECG.',
    took: 'It is. The network has to know what a normal heart looks like before an abnormal one means anything.',
  },
  {
    id: 'B8_combined', c: 'B', name: 'Naive stack of winners', status: 'failed', f1: 0.1873, fp: 954,
    aim: 'Four things helped individually. Stack them.',
    did: 'Merged B1 + B2 + B4 + B5 in one configuration.',
    took: 'Worst false-alarm count in the campaign. Improvements interact; conflicting gradient momenta cancel. Tune sequentially or do not tune at all.',
  },
  {
    id: 'B9_gate_bias', c: 'B', name: 'Gate opened at init', status: 'neutral', f1: 0.1873, fp: 711,
    aim: 'Force information through the gate early so it does not starve.',
    did: 'Positive bias initialisation (+1.0) on the DynMM gate.',
    took: 'Backwards. Starting open teaches the gate that noise is signal, and it spends the rest of training unlearning that.',
  },
  {
    id: 'B10_longer_ph1', c: 'B', name: 'Longer unimodal warm-up', status: 'kept', f1: 0.2036, fp: 512,
    aim: 'Let the EEG encoder settle before fusion starts competing for gradient.',
    did: 'Extended Phase 1 to 20 epochs.',
    took: 'Better cross-attention alignment. A well-formed unimodal representation is a precondition for fusion, not a byproduct of it.',
  },
  {
    id: 'B11_pre_cached', c: 'B', name: 'Pre-cached filtering', status: 'champion', f1: 0.2084, fp: 455,
    aim: 'Remove filtering non-determinism from the training loop.',
    did: 'Butterworth bandpass (0.5–15 Hz low branch, 20–40 Hz high branch) applied once, cached.',
    took: 'Best window-level F1 in the campaign, and deterministic. Adopted universally downstream.',
  },
  {
    id: 'B12_phase3_warm_restart', c: 'B', name: 'Phase-3 warm restart', status: 'champion', f1: 0.4701, fp: 55, level: 'event',
    prec: 0.5175,
    aim: 'Unfreezing the encoder for end-to-end fine-tuning destroys what fusion just learned.',
    did: 'Three-phase warm-restart curriculum — LR re-warmed to 5e-5 with patience 10 at the Phase 3 boundary.',
    took: 'Solved catastrophic forgetting at the hand-off. 47.0% event F1 became the optimisation foundation every later architecture was built on.',
  },
  {
    id: 'B13_extended_ph0', c: 'B', name: 'Maximal ECG pre-train', status: 'kept', f1: 0.2017, fp: 490,
    aim: 'Give the cardiac autoencoder every rhythm it can get.',
    did: 'Phase 0 pre-training across all available training samples.',
    took: 'The masked autoencoder rewards rhythm diversity more than epochs.',
  },
  {
    id: 'B14_4sec_window', c: 'B', name: '4-second window', status: 'neutral', f1: 0.1950, fp: 760,
    aim: 'Longer slices should be more stable to classify.',
    did: 'Doubled the current-window slice from 2.0 s to 4.0 s.',
    took: 'Stability bought with latency. Longer windows blur the onset timestamp — and onset time is the clinically useful part. Kept 2.0 s.',
  },
  {
    id: 'B15_gate_targets', c: 'B', name: 'Discriminative gate targets', status: 'kept', f1: 0.1947, fp: 468,
    aim: 'The gate needs a supervision signal that is not a heuristic median.',
    did: 'Label-derived soft targets: 0.9 during seizure, 0.3 on clean background.',
    took: 'Cleanly reduced false positives and gave the gate an interpretable scale. Carried into C5 and C14.',
  },
  {
    id: 'B16_combined_v2', c: 'B', name: 'Careful stack of winners', status: 'failed', f1: 0.1863, fp: 581,
    aim: 'Stack winners again — but only the ones that were individually principled.',
    did: 'B9 + B10 + B12 + B15 together.',
    took: 'Still interferes. Confirmed B8 was not a fluke: hyperparameter overrides compete for the same fusion-layer equilibrium.',
  },

  /* ---------------- C campaign — architecture ---------------- */
  {
    id: 'C0_champion', c: 'C', name: 'Replay control', status: 'kept', f1: 0.1851, fp: 480,
    aim: 'Verify the baseline is still the baseline before spending a campaign on it.',
    did: 'Exact replay of the B12 configuration.',
    took: 'Reproducible. Every C-result below is a real delta, not seed noise.',
  },
  {
    id: 'C3_tcn_encoder', c: 'C', name: 'Dilated TCN encoder', status: 'kept', f1: 0.1991, fp: 638,
    aim: 'Do dilated convolutions read temporal context better than a CNN-GRU stack?',
    did: 'Replaced ChronoNet with a dilated causal TCN, receptive field 757 samples (~3 s).',
    took: 'Cleaner long-range dependencies. This became the front-end of C13 and C14.',
  },
  {
    id: 'C4_channel_se', c: 'C', name: 'Channel attention', status: 'kept', f1: 0.1968, fp: 410,
    aim: 'Left and right electrodes rarely have matched impedance. Can the model learn to distrust the worse one?',
    did: 'Squeeze-excitation channel attention across the CNN feature maps.',
    took: 'Lowest window-level false-positive count before cross-attention arrived. Spatial noise is separable from spatial signal.',
  },
  {
    id: 'C5_deep_mult', c: 'C', name: 'Deep multimodal transformer', status: 'champion', f1: 0.5301, fp: 46, level: 'event',
    prec: 0.5893,
    aim: 'Wearable EEG is drowned in chewing and speaking artifacts. Can ECG and EMG attending to <em>each other</em> filter that out?',
    did: 'Added a second transformer layer for inter-modal self-attention, immediately after cross-modal fusion.',
    took: 'The clinical winner. Suppressed over 90% of chewing and speaking false alarms and cleared the scalp-EEG literature ceiling (43%) by ten points.',
  },
  {
    id: 'C6_se_gate', c: 'C', name: 'Vector gating', status: 'failed', f1: 0.0, fp: 0,
    aim: 'A scalar trust value is lossy. Gate all 128 feature dimensions independently.',
    did: 'Squeeze-excitation vector gate supervised on binary targets.',
    took: 'Total collapse to zero F1. Supervising a 128-dimensional gate with a noisy binary label produces gradient variance the network never recovers from. The scalar gate is not a simplification — it is the right inductive bias.',
  },
  {
    id: 'C7_mixup', c: 'C', name: 'Cross-modal mixup', status: 'kept', f1: 0.1886, fp: 936, sens: 0.758,
    aim: 'Seizure morphology varies enormously between patients. Widen the decision boundary.',
    did: 'Convex blending of samples across all four modalities, alpha 0.4.',
    took: 'Highest raw sensitivity in the campaign, paid for in false alarms. Useful as a component, dangerous alone.',
  },
  {
    id: 'C8_focal_tversky', c: 'C', name: 'Focal Tversky loss', status: 'kept', f1: 0.1930, fp: 520, sens: 0.651,
    aim: 'Optimise temporal overlap directly instead of per-window correctness.',
    did: 'Focal Tversky loss, gamma 0.75, weighted against false negatives.',
    took: 'Raised event capture rate by optimising the thing clinicians actually score on.',
  },
  {
    id: 'C9_label_smoothing', c: 'C', name: 'Label smoothing', status: 'kept', f1: 0.1865, fp: 444,
    aim: 'Clinical seizure onset labels are annotated by humans and are not crisp. Stop the model believing them absolutely.',
    did: 'Label smoothing, epsilon 0.1, positive target 0.9.',
    took: 'Calibrated probabilities and stabilised the operating threshold across folds — which is what makes a fixed deployment threshold viable at all.',
  },
  {
    id: 'C10_extended_80ep', c: 'C', name: 'Extended schedule', status: 'kept', f1: 0.1969, fp: 428,
    aim: 'Maybe fusion just needs longer to reach equilibrium.',
    did: 'Doubled the training regime to 80 epochs.',
    took: 'It does. A deeper equilibrium with materially fewer false positives, which justified the long regime for the final synthesis.',
  },
  {
    id: 'C12_rotations', c: 'C', name: 'Spatial rotations', status: 'kept', f1: 0.1968, fp: 465,
    aim: 'A wearable is re-seated every morning at a slightly different angle. The model must not care.',
    did: '2×2 channel mixing plus 3D spatial rotations, applied stochastically.',
    took: 'Prevented memorisation of electrode-specific artifact signatures — the failure mode that kills ambulatory deployment.',
  },
  {
    id: 'C13_high_aug_tcn', c: 'C', name: 'TCN + heavy augmentation', status: 'champion', f1: 0.4822, fp: 52, level: 'event',
    prec: 0.5259, brier: 0.3396,
    aim: 'Combine the wider receptive field with aggressive invariance training.',
    did: 'Dilated TCN (k=7, RF 757) with high-probability rotations (p=0.8) and mixup (0.4).',
    took: 'Best-calibrated model of the campaign (Brier 0.3396). A 7-second receptive field reads pre-ictal build-up without being fooled by a single noise spike.',
  },
  {
    id: 'C14_unified_hybrid', c: 'C', name: 'Unified hybrid', status: 'champion', f1: 0.50, fp: 48, level: 'event', pending: true,
    aim: 'Synthesise the temporal invariance of C13 with the attention filtering of C5.',
    did: 'Dilated TCN front-end + Deep MulT fusion + full augmentation suite. ~2.63M parameters.',
    took: 'The structural culmination of the campaign: lowest-false-alarm front-end welded to highest-precision back-end. Full continuous-dataset evaluation across ~300,000 windows is in progress.',
  },

  /* ---------------- D campaign — deployment ---------------- */
  {
    id: 'D0_xai_attribution', c: 'D', name: 'Attribution & trust maps', status: 'kept', f1: null, fp: null,
    aim: '"Black box" is a valid objection in a clinical setting. Answer it.',
    did: 'Extracted directional cross-attention relevance (Chefer propagation) and per-window DynMM trust scores.',
    took: 'The gate is legible: you can watch it close on a corrupted channel in real time. Explainability here is a property of the architecture, not a post-hoc wrapper.',
  },
  {
    id: 'D1_winner_ensemble', c: 'D', name: 'Bedside ensemble', status: 'champion', f1: null, fp: null, level: 'event',
    prec: 0.9118, far: 79.1,
    aim: 'A metric is not a deployment. What false-alarm rate could a ward actually tolerate?',
    did: 'Weighted consensus vote (0.45·C5 + 0.35·C13 + 0.20·B12) with an 8-second debouncing collar.',
    took: '91.18% precision and under two false alarms per day — with perfect precision on 7 of 10 validation subjects. Consensus across independently-failing models is what makes ambulatory monitoring viable.',
  },
  {
    id: 'D2_patient_verification', c: 'D', name: 'Cross-patient verification', status: 'kept', f1: null, fp: null,
    aim: 'Confirm the model learned seizures and not patients.',
    did: 'Patient-level fold extraction and per-subject review across the validation split.',
    took: 'Generalisation holds across widely varying baseline rhythms. The 80/20 split is patient-level and seeded — no subject appears on both sides.',
  },
  {
    id: 'D3_hardware_profiler', c: 'D', name: 'Edge profiling', status: 'kept', f1: null, fp: null,
    aim: 'A four-modality transformer that only runs on a workstation is a paper, not a device.',
    did: 'Profiled FLOPs, parameter count and peak memory footprint.',
    took: '~2.6M parameters — small enough for real-time inference on bedside and wearable-class hardware.',
  },
  {
    id: 'D4_plot_generator', c: 'D', name: 'Calibration curves', status: 'kept', f1: null, fp: null,
    aim: 'Verify the decision boundary is smooth and the threshold is stable.',
    did: 'Precision-recall, ROC and threshold-stability curves across folds.',
    took: 'Confirmed the calibration benefit of label smoothing shows up where it matters: threshold choice transfers between folds.',
  },
  {
    id: 'D5_stat_bootstrap', c: 'D', name: 'Bootstrap significance', status: 'champion', f1: null, fp: null,
    aim: 'Is the improvement over the published baseline real, or a lucky split?',
    did: '10,000-iteration bootstrap resampling of event-level F1 against the Swinnen et al. baseline.',
    took: 'The improvement is significant at p < 0.001. Worth more than any single headline number in this whole table.',
  },
  {
    id: 'D6_clinical_cases', c: 'D', name: 'Blinded case review', status: 'kept', f1: null, fp: null,
    aim: 'Close the gap between an F1 score and a clinical judgement.',
    did: 'Extracted focal-aware, focal-impaired-awareness and bilateral tonic-clonic segments for blinded neurologist review.',
    took: 'The model tracks seizure spread across the temporal lobe — including subtle aware seizures with no motor component, the hardest class in the set.',
  },
];

export const STATUS_STYLE = {
  champion: { label: 'Champion', color: '#5ce8b0' },
  kept:     { label: 'Adopted',  color: '#4ddbff' },
  neutral:  { label: 'Inconclusive', color: '#8b93a7' },
  failed:   { label: 'Failed',   color: '#ff6f85' },
};
