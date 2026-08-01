/**
 * The standard 10-20 montage.
 *
 * Electrodes are given in the topographic (radius, angle) form used by scalp
 * plotting, then projected onto a sphere: polar angle = R * PI, so R = 0.5
 * lands on the equator and R = 0 is the vertex.
 */

const RAW = [
  ['Fp1', 0.500, -18], ['Fp2', 0.500,  18],
  ['F7',  0.500, -54], ['F3', 0.333, -39], ['Fz', 0.250,   0], ['F4', 0.333,  39], ['F8', 0.500,  54],
  ['T3',  0.500, -90], ['C3', 0.250, -90], ['Cz', 0.000,   0], ['C4', 0.250,  90], ['T4', 0.500,  90],
  ['T5',  0.500,-126], ['P3', 0.333,-141], ['Pz', 0.250, 180], ['P4', 0.333, 141], ['T6', 0.500, 126],
  ['O1',  0.500,-162], ['O2', 0.500, 162],
];

export const ELECTRODES = RAW.map(([name, r, aDeg], i) => {
  const theta = r * Math.PI;
  const phi = (aDeg * Math.PI) / 180;
  const s = Math.sin(theta);
  return { i, name, pos: [s * Math.sin(phi), s * Math.cos(phi), Math.cos(theta)] };
});

/**
 * An illustrative adjacency. This is generated geometry for the visual, not
 * measured connectivity — it exists to show the montage as a network rather
 * than to assert anything about one.
 */
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function connectivity() {
  const edges = [];
  const n = ELECTRODES.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = ELECTRODES[i].pos, b = ELECTRODES[j].pos;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      // mostly local structure, with a few long-range edges for interest
      const w = Math.max(0, Math.min(1, 0.92 - d * 0.42 + (hash(i, j) - 0.5) * 0.30));
      if (w > 0.55) edges.push({ i, j, w });
    }
  }
  return edges;
}
