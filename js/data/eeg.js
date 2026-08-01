/**
 * 10-20 electrode montage and frequency-band definitions.
 *
 * Electrodes are given in the standard topographic (radius, angle) form used by
 * scalp-map plotting, then projected onto a sphere: polar angle = R * PI, so
 * R = 0.5 lands on the equator (the Fp/T/O ring) and R = 0 is the vertex (Cz).
 */

const RAW = [
  ['Fp1', 0.500, -18], ['Fp2', 0.500,  18],
  ['F7',  0.500, -54], ['F3', 0.333, -39], ['Fz', 0.250,   0], ['F4', 0.333,  39], ['F8', 0.500,  54],
  ['T3',  0.500, -90], ['C3', 0.250, -90], ['Cz', 0.000,   0], ['C4', 0.250,  90], ['T4', 0.500,  90],
  ['T5',  0.500,-126], ['P3', 0.333,-141], ['Pz', 0.250, 180], ['P4', 0.333, 141], ['T6', 0.500, 126],
  ['O1',  0.500,-162], ['O2', 0.500, 162],
];

/** Lobe grouping, used for colouring and for the frontal-posterior story. */
const LOBE = {
  Fp1: 'frontal', Fp2: 'frontal', F7: 'frontal', F3: 'frontal', Fz: 'frontal', F4: 'frontal', F8: 'frontal',
  T3: 'temporal', T4: 'temporal', T5: 'temporal', T6: 'temporal',
  C3: 'central', Cz: 'central', C4: 'central',
  P3: 'parietal', Pz: 'parietal', P4: 'parietal',
  O1: 'occipital', O2: 'occipital',
};

export const ELECTRODES = RAW.map(([name, r, aDeg], i) => {
  const theta = r * Math.PI;          // polar angle from vertex
  const phi = (aDeg * Math.PI) / 180; // azimuth, 0 = anterior
  const s = Math.sin(theta);
  return {
    i,
    name,
    lobe: LOBE[name],
    // x = right, y = anterior, z = superior
    pos: [s * Math.sin(phi), s * Math.cos(phi), Math.cos(theta)],
  };
});

export const BANDS = [
  { key: 'delta', label: 'Delta', hz: '0.5–4 Hz',  color: '#3d6bff', note: 'Slow-wave dominance. Elevated frontal delta is the oldest ADHD marker in the literature — and the least reliable one alone.' },
  { key: 'theta', label: 'Theta', hz: '4–8 Hz',    color: '#4ddbff', note: 'The theta/beta ratio is the classic clinical index. It is also the one that fails hardest across sites.' },
  { key: 'alpha', label: 'Alpha', hz: '8–13 Hz',   color: '#5ce8b0', note: 'Posterior alpha reflects the resting default mode. Its suppression pattern separates attentional states.' },
  { key: 'beta',  label: 'Beta',  hz: '13–30 Hz',  color: '#ffc46b', note: 'Active cognitive engagement. Long-range beta edges carry real discriminative weight in the trained model.' },
  { key: 'gamma', label: 'Gamma', hz: '30–45 Hz',  color: '#ff6f85', note: 'Cognitive binding. Integrated-gradient attribution puts the heaviest weight here — on long-range frontal-posterior gamma coupling.' },
];

/**
 * Deterministic pseudo-connectivity per band.
 *
 * These matrices illustrate the topology the model operates on — they are
 * generated, not measured, and are shaped by the published structure of the
 * effect (frontal-posterior weighting in high bands, local clustering in low
 * bands) so the visual reads correctly.
 */
function hash(a, b, salt) {
  let h = (a * 374761393 + b * 668265263 + salt * 2246822519) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const FRONTAL = new Set(['Fp1', 'Fp2', 'F7', 'F3', 'Fz', 'F4', 'F8']);
const POSTERIOR = new Set(['P3', 'Pz', 'P4', 'O1', 'O2', 'T5', 'T6']);

export function connectivity(bandKey) {
  const bandIdx = BANDS.findIndex((b) => b.key === bandKey);
  const highBand = bandIdx >= 3;
  const edges = [];
  const n = ELECTRODES.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = ELECTRODES[i], b = ELECTRODES[j];
      const d = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);

      // low bands: local clustering. high bands: long-range coupling.
      let w = highBand ? 0.24 + d * 0.38 : 0.94 - d * 0.32;

      // the frontal-posterior "highway" the attribution analysis surfaces
      const bridge = (FRONTAL.has(a.name) && POSTERIOR.has(b.name)) || (FRONTAL.has(b.name) && POSTERIOR.has(a.name));
      if (bridge) w += highBand ? 0.34 : -0.08;

      w += (hash(i, j, bandIdx + 1) - 0.5) * 0.34;
      w = Math.max(0, Math.min(1, w));

      if (w > 0.56) edges.push({ i, j, w });
    }
  }
  return edges;
}

/** Node strength — the graph metric fed back in as an auxiliary node feature. */
export function nodeStrength(edges) {
  const s = new Float32Array(ELECTRODES.length);
  edges.forEach((e) => { s[e.i] += e.w; s[e.j] += e.w; });
  const max = Math.max(...s, 1e-5);
  return Array.from(s, (v) => v / max);
}
