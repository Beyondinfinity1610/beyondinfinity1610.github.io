/**
 * The NeuroSync campaign, in full — including the part where the numbers I was
 * proud of turned out to be measuring the wrong thing.
 *
 * Three registers, because collapsing them onto one axis is exactly the mistake
 * this project is about:
 *
 *   lane 'auroc'   Official SeizeIT2 split, continuous stream. The fair test.
 *   lane 'event'   Held-out continuous patients, event-level F1.
 *   lane 'window'  Balanced-split window F1 — the metric that misled me for months.
 *   lane 'verify'  Findings that produce no score at all, and matter most.
 */

export const CAMPAIGNS = {
  B: { key: 'B', label: 'B · Foundations',  color: '#6FD3FF', blurb: 'Remove one thing at a time and watch what breaks.' },
  C: { key: 'C', label: 'C · Architecture', color: '#FF7A18', blurb: 'Replace the front-end, deepen the fusion, chase the ceiling.' },
  D: { key: 'D', label: 'D · Deployment',   color: '#FFC44D', blurb: 'Could a clinician live with these false alarms?' },
  E: { key: 'E', label: 'E · Diagnosis',    color: '#FF3B5C', blurb: 'Stop tuning. Find out what the model is actually doing.' },
  F: { key: 'F', label: 'F · Fair test',    color: '#3DD9B0', blurb: 'Rebuild on the evidence, then test on the published split.' },
};

/** Published baselines, drawn as reference marks on the AUROC lane. */
export const BASELINES = [
  { name: 'SVM (published)',       auroc: 0.700, note: '71% sensitivity @ 11 FA/h' },
  { name: 'ChronoNet (published)', auroc: 0.792, note: '84% sensitivity @ 100.5 FA/h' },
];

export const ABLATIONS = [
  /* ================= F — the fair test, official split ================= */
  {
    id: 'F1_official_split', c: 'F', lane: 'auroc', status: 'champion', auroc: 0.759, best: 0.780,
    name: 'Official-split retrain',
    aim: 'Compare honestly with the dataset\'s published baselines instead of my own convenient split.',
    did: 'Retrained the Evidence Model on the official SeizeIT2 split — train sub-001–096, validate sub-097–125. 181 seizures, 2,912 recording-hours, continuous stream.',
    took: 'Continuous AUROC 0.759, best seed 0.780. That beats the published SVM at 0.700 and effectively matches ChronoNet at 0.792 — on the exact standard split, fully automated. This is the number I actually stand behind.',
  },
  {
    id: 'F2_eeg_only', c: 'F', lane: 'auroc', status: 'kept', auroc: 0.738,
    name: 'EEG-only ablation',
    aim: 'Now that fusion actually trains, does it earn its place?',
    did: 'Same network, physiological features switched off.',
    took: '0.738 against 0.759. Fusion helps — modestly, honestly, and for the first time measurably.',
  },
  {
    id: 'F3_hard_negatives', c: 'F', lane: 'auroc', status: 'kept', auroc: 0.760,
    name: 'Triple background',
    aim: 'The model is under-confident on unseen patients. Cure it with more negatives.',
    did: 'Background ratio 20 → 60, 50k → 148k windows.',
    took: 'Confidence p99 moved 0.47 → 0.55 and AUROC to 0.76. Real but small. The cap is not sample count.',
  },
  {
    id: 'F6_handcrafted', c: 'F', lane: 'auroc', status: 'champion', auroc: 0.761,
    name: 'Hand-crafted features',
    aim: 'Why does a decade-old SVM stay competitive with my deep encoder?',
    did: 'Built the classical feature set and tested it alone, and stacked under the TCN.',
    took: 'Line length <em>on its own</em> scores 0.712 against the entire deep TCN\'s 0.714. All classical features together reach 0.761 — and the TCN adds nothing on top. On a cohort this size, deep learning is not buying what I assumed it was buying. Least comfortable result in the campaign, and probably the most publishable.',
  },
  {
    id: 'F4_late_fusion', c: 'F', lane: 'auroc', status: 'failed', auroc: 0.724,
    name: 'Late-fusion recombination',
    aim: 'Maybe the learned fusion is leaving information on the table.',
    did: 'Logistic regression over EEG + heart rate + motion, against the learned fusion.',
    took: '0.724 against the learned 0.728, and the parts (0.71 + 0.64) barely combine to 0.73. The modalities are redundant on this cohort — they are correlated with the same errors. There is no headroom to recover.',
  },
  {
    id: 'F5_ensemble', c: 'F', lane: 'auroc', status: 'failed', auroc: 0.773,
    name: 'Two-seed ensemble',
    aim: 'Average the seeds and sharpen the decision.',
    did: 'Ensembled two training seeds.',
    took: '0.773 — worse than the better single seed at 0.780. Ensembling is not a free win when the members fail the same way.',
  },
  {
    id: 'F7_high_freq', c: 'F', lane: 'auroc', status: 'failed', auroc: 0.741,
    name: 'High-frequency branch',
    aim: 'Restore the 20–40 Hz branch for automatisms.',
    did: 'Low-frequency, high-frequency, and combined.',
    took: 'Low alone 0.752, high alone 0.720, combined 0.741. Adding the branch actively hurts. It was removed correctly the first time.',
  },
  {
    id: 'F8_artifact_reject', c: 'F', lane: 'auroc', status: 'failed', auroc: null,
    name: 'Artifact rejection',
    aim: 'Apply the amplitude filter the published baselines use.',
    did: 'Rejected windows outside 13–150 µV.',
    took: 'False alarms fell 29 → 21 and recall collapsed 71% → 41%. Seizures <em>are</em> high-amplitude EEG. The filter throws away the thing being detected.',
  },
  {
    id: 'F9_persistence_artifact', c: 'F', lane: 'auroc', status: 'failed', auroc: null,
    name: 'The persistence artifact',
    aim: 'Require k consecutive firings to suppress isolated blips.',
    did: 'Swept k from 1 to 10 and read the sensitivity curve.',
    took: 'It reported 97.8% sensitivity at 11 FA/h — and I nearly believed it. The model was predicting seizure 60% of the time; the metric was rewarding coverage, not detection. Caught it, guarded the tuning against it, and reported the honest 60% @ 13 FA/h instead. The single most important thing I did not publish.',
  },
  {
    id: 'F10_hr_filter_official', c: 'F', lane: 'auroc', status: 'failed', auroc: null,
    name: 'Heart-rate veto',
    aim: 'Reject false alarms with no ictal tachycardia — it worked on the earlier split.',
    did: 'Gated detections on heart rate over the official cohort.',
    took: 'Trades recall for false alarms roughly evenly. No net gain. What generalises across splits and what does not is itself the finding.',
  },

  /* ================= F — the Evidence Model, event level ================= */
  {
    id: 'F0_evidence_model', c: 'F', lane: 'event', status: 'champion', f1: 0.327, lopo: 0.326, farh: 2.23,
    name: 'The Evidence Model',
    aim: 'Rebuild from what the diagnosis actually showed: keep the working EEG detector, feed heart rate and motion in explicitly, drop the dead fusion, train it end to end.',
    did: 'TCN EEG encoder with explicit physiological features, trained end to end rather than bolted on. Evaluated on 25 held-out continuous patients with no leakage.',
    took: 'Event-F1 0.327, and 0.326 under leave-one-patient-out calibration — it generalises. Roughly 32× the same-cohort automated baseline. The fusion was never the problem. The training protocol was.',
  },
  {
    id: 'F0b_eeg_only_event', c: 'F', lane: 'event', status: 'kept', f1: 0.163, farh: 10.80,
    name: 'Same net, features off',
    aim: 'Isolate exactly what the physiological channels contribute.',
    did: 'Identical network and schedule, heart rate and motion switched off.',
    took: 'Event-F1 halves to 0.163 and false alarms go up roughly five-fold. This is the cleanest multimodal result in the project — and it only appeared once the training was fixed.',
  },
  {
    id: 'F0c_high_precision', c: 'F', lane: 'event', status: 'champion', f1: 0.30, prec: 0.47, farday: 0.5,
    name: 'High-precision operating point',
    aim: 'Find the point a ward could actually tolerate.',
    did: 'Swept the operating curve to the precision end.',
    took: '47% precision at roughly half a false alarm per day — under the strict clinical bar. Low recall there, and that trade is stated rather than hidden.',
  },
  {
    id: 'F0d_hr_dynamics', c: 'F', lane: 'event', status: 'failed', f1: 0.143,
    name: 'Heart-rate dynamics',
    aim: 'Within-window rate-of-change should beat absolute heart rate.',
    did: 'Replaced absolute HR with HR change across the window.',
    took: '0.143, clearly worse. Eight seconds is too short a window to estimate a derivative from a noisy rate. Absolute heart rate plus motion is the best configuration.',
  },
  {
    id: 'F11_lopo_clinical', c: 'F', lane: 'event', status: 'champion', f1: 0.30, recall: 0.60, farh: 2.0,
    name: 'Leave-one-patient-out clinical curve',
    aim: 'What does this do on a real continuous recording, cross-validated, with nobody in the loop?',
    did: '2,385 hours across 25 patients, 145 seizures, time-ordered stream rebuilt from the raw BIDS recordings.',
    took: 'About 60% of seizures at roughly 2 false alarms per hour, fully automated. SeizeIT2\'s own comparable figure is 52% at 7 FA/h — with a human reviewing. Defensible, and it survives review.',
  },

  /* ================= E — the diagnosis ================= */
  {
    id: 'E1_window_bottleneck', c: 'E', lane: 'verify', status: 'champion',
    name: 'The model was half-blind',
    aim: 'Before adding anything else: is the network even seeing the data I think it is?',
    did: 'Traced the slicing and found it was reading the last 2 seconds of every 17-second window. Swept window length on the continuous stream.',
    took: 'Continuous AUROC went 0.51 → 0.72 from that one line. The largest gain of the entire project came from reading my own dataloader carefully, not from architecture. Every clever thing I built before this was tuning a model that could barely see.',
  },
  {
    id: 'E2_inert_fusion', c: 'E', lane: 'verify', status: 'champion',
    name: 'The fusion was inert',
    aim: 'The multimodal gains never materialised. Find out why rather than tuning around it.',
    did: 'Inspected the deployed checkpoint\'s actual weights.',
    took: 'The fusion residual weights were exactly zero — never trained. The gate had collapsed to a constant 0.44. One of its inputs was a dead constant. The model I had been calling multimodal for months was functionally EEG-only, wearing dead scaffolding. Publishable as a negative result: <em>why</em> a sophisticated gated cross-modal transformer goes inert.',
  },
  {
    id: 'E3_time_ordered_eval', c: 'E', lane: 'verify', status: 'champion',
    name: 'The evaluation was shuffled',
    aim: 'Event-level numbers looked strange in a way I could not explain.',
    did: 'Found the continuous validation set was 283k single-window files loaded in hash order — time-shuffled. AUROC was unaffected, but every event-level figure computed on it was an artifact. Rebuilt a time-ordered evaluation from the raw BIDS recordings and verified the model input byte-identical to training.',
    took: 'Every event-level sensitivity and false-alarm number I had reported before this was meaningless. Finding that in your own work is unpleasant, and it is the job.',
  },
  {
    id: 'E4_hr_biomarker', c: 'E', lane: 'verify', status: 'champion',
    name: 'Heart rate was the signal all along',
    aim: 'If the modalities are useless, prove it properly before dropping them.',
    did: 'Recomputed raw physiological features at the detector\'s firing windows across 145 seizures.',
    took: 'Real seizures average 93 bpm, false alarms 78 — ictal tachycardia, AUROC 0.73, up to 0.91 on the best single patient. The modalities were never useless. The pipeline had been throwing the signal away. Muscle, HRV and motion sit near 0.5 and genuinely do not help.',
  },
  {
    id: 'E5_fa_concentration', c: 'E', lane: 'verify', status: 'kept',
    name: 'False alarms are concentrated',
    aim: 'Are false alarms spread evenly, or is a minority of recordings responsible?',
    did: 'Attributed every false alarm to its source recording.',
    took: 'The worst 20% of recordings generate 77% of all false alarms. That reframes the problem from "make the model better everywhere" to "handle a small set of bad recordings".',
  },
  {
    id: 'E6_human_ceiling', c: 'E', lane: 'verify', status: 'kept',
    name: 'The human ceiling',
    aim: 'Before claiming a model is underperforming, find out what a person achieves on the same signal.',
    did: 'Pulled the reader studies for behind-the-ear wearable EEG.',
    took: 'Human experts reach roughly 59% on this modality. My ~60% is not underperformance — it is sitting on the ceiling of two-channel behind-the-ear EEG. The limit is the hardware, and saying so is a contribution rather than an excuse.',
  },
  {
    id: 'E7_phase_degradation', c: 'E', lane: 'verify', status: 'kept',
    name: 'The curriculum was discarding its own work',
    aim: 'Why does the best checkpoint always come from Phase 1?',
    did: 'Tracked AUROC across all four curriculum phases.',
    took: 'Phase 1 produced the best checkpoint every time; Phases 2 and 3 degraded it, and global-best selection quietly threw them away. A zero-initialised residual bolted on after the encoder has already fit the data has no gradient to grow into.',
  },

  /* ================= D — deployment & verification ================= */
  {
    id: 'D5_stat_bootstrap', c: 'D', lane: 'verify', status: 'kept',
    name: 'Bootstrap significance',
    aim: 'Is any of this distinguishable from a lucky split?',
    did: '10,000-iteration bootstrap resampling with confidence intervals, plus per-seizure-type breakdown.',
    took: 'AUROC is roughly 14× more stable across resamples than sensitivity — which is precisely why I now lead with AUROC and quote sensitivity at a stated false-alarm rate rather than alone.',
  },
  {
    id: 'D0_xai_attribution', c: 'D', lane: 'verify', status: 'kept',
    name: 'Attribution',
    aim: '"Black box" is a fair objection in a clinical setting. Answer it with numbers.',
    did: 'Feature attribution across the trained detector.',
    took: 'Heart rate is the dominant non-EEG contributor, worth about +0.055 AUROC on its own. The explanation agrees with the biomarker analysis, which is the only reason to trust either.',
  },
  {
    id: 'D6_clinical_cases', c: 'D', lane: 'verify', status: 'kept',
    name: 'Per-seizure-type breakdown',
    aim: 'A single averaged score hides which seizures are being missed.',
    did: 'Scored focal-aware, focal-impaired-awareness and bilateral tonic-clonic events separately.',
    took: 'Bilateral tonic-clonic detection is essentially solved at 100%. Focal aware seizures — no motor component, minimal EEG change — are where everything is lost. The average was hiding two completely different problems.',
  },
  {
    id: 'D3_hardware_profiler', c: 'D', lane: 'verify', status: 'kept',
    name: 'Edge profiling',
    aim: 'A model that only runs on a workstation is a paper, not a device.',
    did: 'Profiled FLOPs, parameters and peak memory.',
    took: 'Around 2.6M parameters — real-time on wearable-class hardware.',
  },

  /* ========= B and C — the early campaign, on the metric that misled ========= */
  {
    id: 'B0_control', c: 'B', lane: 'window', status: 'kept', f1: 0.1985, fp: 468,
    name: 'Baseline control',
    aim: 'Establish a stable reference before touching anything.',
    did: 'Full four-modality stack with Asymmetric Loss, unmodified.',
    took: 'Reproducible run to run. Everything below is measured against it — on a balanced validation set I did not yet know was flattering me.',
  },
  {
    id: 'B6_eeg_only', c: 'B', lane: 'window', status: 'failed', f1: 0.1690, fp: 736,
    name: 'EEG only',
    aim: 'Do we need ECG, EMG and accelerometer at all?',
    did: 'Bypassed fusion, evaluated the two EEG channels alone.',
    took: 'It looked like proof that multimodality was mandatory. It was not — the fusion was inert, so this was comparing EEG against EEG. The real multimodal result had to wait for the Evidence Model.',
  },
  {
    id: 'B2_no_gate', c: 'B', lane: 'window', status: 'failed', f1: 0.1783, fp: 772,
    name: 'No trust gate',
    aim: 'Could the transformer handle un-gated signals on its own?',
    did: 'Removed the DynMM gate entirely.',
    took: '41% more false alarms on this metric. Later found the gate had collapsed to a constant anyway — so what this actually measured was the removal of a scaling factor.',
  },
  {
    id: 'B3_bce_no_gate', c: 'B', lane: 'window', status: 'failed', f1: 0.1702, fp: 884,
    name: 'BCE, no gate',
    aim: 'What does the naive default configuration look like?',
    did: 'Standard cross-entropy, no gating.',
    took: 'False alarms nearly double. At sub-1% prevalence a loss that treats false positives and false negatives as equals is not a loss function, it is a bias.',
  },
  {
    id: 'B12_phase3_warm_restart', c: 'B', lane: 'window', status: 'superseded', f1: 0.2200, fp: 420,
    name: 'Phase-3 warm restart',
    aim: 'Unfreezing the encoder destroys what fusion just learned.',
    did: 'Warm-restart curriculum — learning rate re-warmed to 5e-5 at the Phase 3 boundary.',
    took: 'Reported 47% event-F1 at the time and I was proud of it. It was computed on a time-shuffled validation set, so the event-level part of that number meant nothing. The curriculum insight was real; the headline was not.',
  },
  {
    id: 'C5_deep_mult', c: 'C', lane: 'window', status: 'superseded', f1: 0.2350, fp: 405,
    name: 'Deep multimodal transformer',
    aim: 'Can ECG and EMG attending to <em>each other</em> filter out chewing artifacts?',
    did: 'Second transformer layer for inter-modal self-attention after cross-modal fusion.',
    took: 'This was my headline result for months — 53% event-F1, apparently ten points clear of the scalp-EEG literature. Then the time-ordered evaluation showed the event scoring was an artifact, and the weight inspection showed the fusion it depended on was never trained. Both halves of the claim failed. Leaving it here on purpose.',
  },
  {
    id: 'C13_high_aug_tcn', c: 'C', lane: 'window', status: 'kept', f1: 0.2280, fp: 410,
    name: 'TCN with heavy augmentation',
    aim: 'Wider receptive field plus aggressive invariance training.',
    did: 'Dilated TCN, k=7, with high-probability rotations and mixup.',
    took: 'The TCN front-end is the one architectural choice from this era that survived into the Evidence Model. Best-calibrated model of the period.',
  },
  {
    id: 'C6_se_gate', c: 'C', lane: 'window', status: 'failed', f1: 0.0, fp: 1000,
    name: 'Vector gating',
    aim: 'A scalar trust value is lossy — gate all 128 dimensions independently.',
    did: 'Squeeze-excitation vector gate on binary targets.',
    took: 'Complete collapse to zero F1. Supervising a 128-dimensional gate with a noisy binary label produces gradient variance nothing recovers from.',
  },
  {
    id: 'B11_pre_cached', c: 'B', lane: 'window', status: 'kept', f1: 0.2084, fp: 455,
    name: 'Pre-cached filtering',
    aim: 'Remove filtering non-determinism from the training loop.',
    did: 'Butterworth bandpass applied once and cached.',
    took: 'Deterministic and faster. Adopted everywhere downstream and never revisited.',
  },
  {
    id: 'B8_combined', c: 'B', lane: 'window', status: 'failed', f1: 0.1873, fp: 954,
    name: 'Naive stack of winners',
    aim: 'Four things helped individually — stack them.',
    did: 'Merged four winning configurations at once.',
    took: 'Worst false-alarm count of the era. Improvements interact; conflicting gradient momenta cancel. Tune sequentially or do not tune.',
  },
  {
    id: 'C7_mixup', c: 'C', lane: 'window', status: 'kept', f1: 0.1886, fp: 936,
    name: 'Cross-modal mixup',
    aim: 'Seizure morphology varies enormously between patients — widen the boundary.',
    did: 'Convex blending across modalities, alpha 0.4.',
    took: 'Highest raw sensitivity of the period, paid for in false alarms. Useful as a component, dangerous alone.',
  },
  {
    id: 'C9_label_smoothing', c: 'C', lane: 'window', status: 'kept', f1: 0.1865, fp: 444,
    name: 'Label smoothing',
    aim: 'Human-annotated seizure onsets are not crisp — stop the model believing them absolutely.',
    did: 'Label smoothing, epsilon 0.1.',
    took: 'Calibrated the probabilities and stabilised the operating threshold across folds, which is what makes any fixed deployment threshold viable.',
  },
];

export const STATUS_STYLE = {
  champion:   { label: 'Load-bearing', color: '#3DD9B0' },
  kept:       { label: 'Adopted',      color: '#FFC44D' },
  neutral:    { label: 'Inconclusive', color: '#7A7069' },
  failed:     { label: 'Failed',       color: '#FF3B5C' },
  superseded: { label: 'Superseded',   color: '#9A8F84' },
};
