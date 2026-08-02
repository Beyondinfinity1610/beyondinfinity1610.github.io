/* ============================================================
   world.js — one continuous space, flown through once.

   The whole page is a single camera flight down the -Z axis. There are
   no separate scenes and no sticky canvases: scroll position drives the
   camera along a spline, and the regions of the world arrive in order.

     ignition   an inline four, turning over, then dispersing
     corridor   a tunnel of recordings the camera flies down
     archive    the redacted architecture, passed through
     volume     the search — a field of runs, entered rather than viewed
     settle     open space

   DISCLOSURE. Two rules hold everywhere in this file and must survive
   any edit:
     - The archive carries no component names. Its labels are generated
       bars and glyph-shaped rectangles, so nothing confidential exists
       in the source, the DOM or the network tab.
     - The volume has no axes, no labels, no experiment names and no
       values. Heights come from a fixed seed and encode nothing. It may
       say that a large systematic search happened and that it ended at
       a limit. Nothing more.
   ============================================================ */

import * as THREE from '../vendor/three.module.js';
import { ELECTRODES, connectivity } from './data/eeg.js';

const INK = 0x05070b;
const ICE = 0x8ec5f0;
const WARM = 0xffa25c;

/* Regions are positioned by layout() from where their sections actually
   sit on the page, so the world and the writing can never drift apart.
   These are only the fallbacks used before the first layout call. */
const DEFAULT_MARKS = {
  ignition: 0.02, montage: 0.10,
  corridor: [0.16, 0.40], archive: 0.46,
  volume: [0.62, 0.86], settle: 0.93,
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const rnd = (() => {
  let s = 1610;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
})();

/* ---------------------------------------------------------- textures */

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* A struck-out line of text. There is nothing underneath it. */
function barTexture(key, ratio) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.max(48, Math.round(256 * ratio));
  const x = c.getContext('2d');
  const pad = 18;
  const rows = c.height > 150 ? 4 : c.height > 90 ? 2 : 1;
  const rh = Math.min(15, (c.height - pad * 2) / (rows * 1.9));
  x.fillStyle = '#02040a';
  let y = (c.height - (rows * rh * 1.85 - rh * 0.85)) / 2;
  for (let r = 0; r < rows; r++) {
    let cx = pad;
    const limit = c.width - pad;
    let i = 0;
    while (cx < limit) {
      const bw = 16 + rnd() * 46;
      const draw = Math.min(bw, limit - cx);
      if (draw > 5) x.fillRect(cx, y, draw, rh);
      cx += draw + 7;
      i++;
    }
    y += rh * 1.85;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function plateTexture(lines, ratio) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.max(96, Math.round(512 * ratio));
  const x = c.getContext('2d');
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const size = 30;
  let y = c.height / 2 - (lines.length * size * 1.35) / 2 + size * 0.68;
  lines.forEach((ln, i) => {
    x.font = `${i === 0 ? 500 : 400} ${i === 0 ? size : size * 0.8}px "JetBrains Mono", monospace`;
    x.fillStyle = i === 0 ? 'rgba(233,238,244,0.95)' : 'rgba(142,197,240,0.85)';
    x.fillText(ln, c.width / 2, y);
    y += size * 1.35;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* A plausible biosignal, for the corridor traces. */
function hash1(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u - 0.5;
}
function bio(u, k) {
  let v = 0.4 * Math.sin(u * 0.9 + k * 2.1) + 0.22 * Math.sin(u * 2.4 + k * 5.7);
  v += 0.85 * noise1(u * 1.6 + k * 40) + 0.4 * noise1(u * 6.5 + k * 91);
  const env = noise1(u * 0.1 + k * 17) + 0.5;
  if (env > 0.66) v += ((env - 0.66) / 0.34) * 1.6 * Math.sin(u * 10.5 + k);
  return v;
}

/* ============================================================ */

export class World {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.tier = opts.tier || 'high';
    this.low = this.tier === 'low';

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(INK, 1);
    this.dprCap = this.tier === 'high' ? 1.7 : 1.2;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(INK, 26, 165);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 400);

    this.dot = dotTexture();
    this.t = 0;
    this.p = 0;            // eased scroll progress, 0..1
    this.pTarget = 0;
    this.intro = 1;        // 1 during the ignition hold, 0 once flying
    this.mx = 0; this.my = 0;
    this.tmx = 0; this.tmy = 0;

    this.buildPath();
    this.buildIgnition();
    this.buildCorridor();
    this.buildArchive();
    this.buildVolume();
    this.buildSettle();
    this.layout(null);

    this.resize();

    this._move = (e) => {
      this.tmx = (e.clientX / window.innerWidth) * 2 - 1;
      this.tmy = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', this._move, { passive: true });
  }

  /* -------------------------------------------------------- the path */

  buildPath() {
    /* A mostly straight run with enough lateral drift that the world
       moves past rather than at you. */
    const pts = [
      new THREE.Vector3(0, 1.5, 14),
      new THREE.Vector3(2.5, 2.0, -34),
      new THREE.Vector3(-4, 0.5, -110),
      new THREE.Vector3(3.5, -1.5, -200),
      new THREE.Vector3(-2.5, 1.0, -300),
      new THREE.Vector3(1.5, 0.0, -390),
      new THREE.Vector3(-3.0, -2.0, -500),
      new THREE.Vector3(2.0, -1.0, -620),
      new THREE.Vector3(-1.5, 1.5, -740),
      new THREE.Vector3(0.5, 2.5, -880),
    ];
    this.path = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }

  /* ---------------------------------------------------- 1. ignition */

  buildIgnition() {
    const N = this.low ? 900 : 1700;
    const pos = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const seed = new Float32Array(N);
    const burst = new Float32Array(N * 3);

    const BORE_X = [-7.2, -2.4, 2.4, 7.2];
    const LIFT = [4.2, 2.0, 1.4, 3.5];
    const PHASE = [0, Math.PI, Math.PI, 0];
    const R = 2.0;
    const CRANK_Y = -3.8;
    const THROW = 1.35;

    for (let i = 0; i < N; i++) {
      const t = i / N;
      const c = Math.min(3, Math.floor(rnd() * 4));
      const a = rnd() * Math.PI * 2;
      let x, y, z;

      if (t < 0.32) {                     // bore walls
        x = BORE_X[c] + Math.cos(a) * R;
        y = 0.8 + rnd() * 4.8;
        z = Math.sin(a) * R;
      } else if (t < 0.48) {              // piston crowns
        const r = Math.sqrt(rnd()) * R * 0.86;
        x = BORE_X[c] + Math.cos(a) * r;
        y = LIFT[c] + (rnd() - 0.5) * 0.2;
        z = Math.sin(a) * r;
      } else if (t < 0.64) {              // connecting rods
        const k = rnd();
        const jy = CRANK_Y + Math.cos(PHASE[c]) * THROW;
        const jz = Math.sin(PHASE[c]) * THROW;
        x = BORE_X[c] + (rnd() - 0.5) * 0.16;
        y = LIFT[c] + (jy - LIFT[c]) * k;
        z = (jz) * k + (rnd() - 0.5) * 0.16;
      } else if (t < 0.80) {              // crank throws and main axis
        if (rnd() < 0.6) {
          const ph = PHASE[c] + (rnd() - 0.5) * 1.2;
          x = BORE_X[c] + (rnd() - 0.5) * 1.4;
          y = CRANK_Y + Math.cos(ph) * THROW;
          z = Math.sin(ph) * THROW;
        } else {
          x = (rnd() - 0.5) * 20;
          y = CRANK_Y + (rnd() - 0.5) * 0.2;
          z = (rnd() - 0.5) * 0.2;
        }
      } else {                            // block
        const w = 10.2, top = 6.0, bot = -5.6, d = 3.0;
        const e = rnd();
        if (e < 0.34) { x = (rnd() - 0.5) * 2 * w; y = rnd() < 0.5 ? top : bot; z = rnd() < 0.5 ? -d : d; }
        else if (e < 0.68) { x = rnd() < 0.5 ? -w : w; y = bot + rnd() * (top - bot); z = rnd() < 0.5 ? -d : d; }
        else { x = rnd() < 0.5 ? -w : w; y = rnd() < 0.5 ? top : bot; z = (rnd() - 0.5) * 2 * d; }
      }

      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      size[i] = 2.0 + rnd() * 2.2;
      seed[i] = rnd() * 6.283;
      /* where each point goes when the engine lets go */
      burst[i * 3] = x * 2.4 + (rnd() - 0.5) * 26;
      burst[i * 3 + 1] = y * 2.0 + (rnd() - 0.5) * 22;
      burst[i * 3 + 2] = z * 2.0 + (rnd() - 0.5) * 34;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aBurst', new THREE.BufferAttribute(burst, 3));

    this.ignitionMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uPix: { value: 1 }, uBurst: { value: 0 },
        uMap: { value: this.dot },
        uCold: { value: new THREE.Color(ICE) },
        uWarm: { value: new THREE.Color(WARM) },
        uFire: { value: 0 },
      },
      vertexShader: `
        attribute float aSize; attribute float aSeed; attribute vec3 aBurst;
        uniform float uTime; uniform float uPix; uniform float uBurst;
        varying float vA; varying float vSeed;
        void main() {
          vSeed = aSeed;
          float b = uBurst * uBurst;
          vec3 p = mix(position, aBurst, b);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float fl = 0.8 + 0.2 * sin(uTime * 2.2 + aSeed * 4.0);
          gl_PointSize = min(aSize * uPix * fl * (170.0 / -mv.z), 26.0 * uPix);
          vA = (1.0 - b) * clamp(1.0 - (-mv.z - 30.0) / 200.0, 0.0, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap; uniform vec3 uCold; uniform vec3 uWarm; uniform float uFire;
        varying float vA; varying float vSeed;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a;
          /* combustion runs through the cloud in a slow wave */
          float f = uFire * (0.5 + 0.5 * sin(vSeed * 3.0));
          vec3 c = mix(uCold, uWarm, clamp(f, 0.0, 1.0));
          gl_FragColor = vec4(c, a * vA);
        }
      `,
    });

    this.ignition = new THREE.Points(g, this.ignitionMat);
    this.scene.add(this.ignition);

    /* The montage the engine becomes — nineteen nodes, wired. Sits just
       beyond the engine so the two read as one idea. */
    const S = 9.5;
    const np = new Float32Array(ELECTRODES.length * 3);
    ELECTRODES.forEach((e, i) => {
      np[i * 3] = e.pos[0] * S;
      np[i * 3 + 1] = e.pos[2] * S * 0.92;
      np[i * 3 + 2] = e.pos[1] * S;
    });
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(np, 3));
    this.nodes = new THREE.Points(ng, new THREE.PointsMaterial({
      color: ICE, size: 0.7, map: this.dot, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));

    const edges = connectivity();
    const lp = new Float32Array(edges.length * 6);
    edges.forEach((e, i) => {
      lp[i * 6] = np[e.i * 3]; lp[i * 6 + 1] = np[e.i * 3 + 1]; lp[i * 6 + 2] = np[e.i * 3 + 2];
      lp[i * 6 + 3] = np[e.j * 3]; lp[i * 6 + 4] = np[e.j * 3 + 1]; lp[i * 6 + 5] = np[e.j * 3 + 2];
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    this.nodeLinks = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      color: ICE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));

    this.montage = new THREE.Group();
    this.montage.add(this.nodes);
    this.montage.add(this.nodeLinks);
    this.montage.position.y = 0.5;
    this.scene.add(this.montage);
  }

  /* ---------------------------------------------------- 2. corridor */

  buildCorridor() {
    /* Long recordings running alongside the flight path, arranged in a
       ring so the camera travels down the middle of them. */
    const COUNT = this.low ? 9 : 16;
    const SEG = this.low ? 300 : 560;
    /* Built along unit z; layout() stretches it to the real span. */
    const z0 = 0, z1 = -1;
    this.corridor = new THREE.Group();

    for (let c = 0; c < COUNT; c++) {
      const ang = (c / COUNT) * Math.PI * 2 + rnd() * 0.2;
      const rad = 17 + rnd() * 17;
      const ox = Math.cos(ang) * rad;
      const oy = Math.sin(ang) * rad * 0.62;
      const amp = 1.1 + rnd() * 1.5;
      const k = c * 7.3;

      const p = new Float32Array(SEG * 3);
      for (let i = 0; i < SEG; i++) {
        const f = i / (SEG - 1);
        const z = -f;
        const u = f * 46 + c * 3.1;
        p[i * 3] = ox + bio(u, k) * amp;
        p[i * 3 + 1] = oy + bio(u + 17.4, k + 3.1) * amp * 0.55;
        p[i * 3 + 2] = z;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({
        color: c % 5 === 0 ? WARM : ICE,
        transparent: true,
        opacity: c % 5 === 0 ? 0.5 : 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      this.corridor.add(line);
    }

    /* Sparse motes so the tunnel has volume as well as walls. */
    const M = this.low ? 400 : 1100;
    const mp = new Float32Array(M * 3);
    const ms = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = 9 + rnd() * 26;
      mp[i * 3] = Math.cos(ang) * rad;
      mp[i * 3 + 1] = Math.sin(ang) * rad * 0.7;
      mp[i * 3 + 2] = -rnd();
      ms[i] = 0.5 + rnd() * 1.2;
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    mg.setAttribute('size', new THREE.BufferAttribute(ms, 1));
    this.corridor.add(new THREE.Points(mg, new THREE.PointsMaterial({
      color: ICE, size: 0.34, map: this.dot, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    })));

    this.scene.add(this.corridor);
  }

  /* ----------------------------------------------------- 3. archive */

  /* Shape, flow and stage count. Nothing that identifies any part of it. */
  buildArchive() {
    const LAYOUT = [
      { z: 46, ys: [-5.0, -2.5, 0, 2.5, 5.0], xs: 0, w: 4.4, h: 1.7, role: 'Input channel' },
      { z: 16, ys: [0], xs: 0, w: 5.6, h: 7.6, role: 'Weighting stage' },
      { z: -14, ys: [-2.6, 2.6], xs: 0, w: 5.0, h: 3.4, role: 'Combining stage' },
      { z: -44, ys: [-2.6, 2.6], xs: 0, w: 4.0, h: 2.4, role: 'Output' },
    ];

    this.archive = new THREE.Group();
    this.scene.add(this.archive);

    this.plates = [];
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1d242e });
    const edgeMat = new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0.62 });

    const stageBlocks = [];
    LAYOUT.forEach((st, si) => {
      const row = [];
      st.ys.forEach((y, bi) => {
        const depth = 0.7;
        const g = new THREE.BoxGeometry(st.w, st.h, depth);
        const mesh = new THREE.Mesh(g, faceMat);
        mesh.position.set(st.xs, y, st.z);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat.clone()));

        const legible = si === 0 && bi === 2;
        const pw = st.w * 0.84, ph = st.h * 0.6;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(pw, ph),
          new THREE.MeshBasicMaterial({
            map: legible
              ? plateTexture(['BEHIND-THE-EAR EEG', 'PUBLIC DATASET'], ph / pw)
              : barTexture(si * 10 + bi, ph / pw),
            transparent: true, depthWrite: false,
          })
        );
        plane.position.z = depth / 2 + 0.02;
        mesh.add(plane);

        this.archive.add(mesh);
        const rec = { mesh, legible, role: legible ? 'Input · public dataset' : st.role, home: mesh.position.clone() };
        this.plates.push(rec);
        mesh.userData.plate = rec;
        row.push(mesh.position.clone());
      });
      stageBlocks.push(row);
    });

    /* connections */
    const lp = [];
    this.archEdges = [];
    for (let s = 0; s < stageBlocks.length - 1; s++) {
      for (const a of stageBlocks[s]) {
        for (const b of stageBlocks[s + 1]) {
          const from = a.clone(); from.z -= 0.4;
          const to = b.clone(); to.z += 0.4;
          this.archEdges.push([from, to]);
          lp.push(from.x, from.y, from.z, to.x, to.y, to.z);
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    this.archive.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      color: ICE, transparent: true, opacity: 0.16,
    })));

    /* signal moving through it */
    const F = this.low ? 60 : 150;
    this.flow = [];
    for (let i = 0; i < F; i++) {
      this.flow.push({
        e: Math.floor(rnd() * this.archEdges.length),
        t: rnd(),
        v: 0.16 + rnd() * 0.22,
      });
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(F * 3), 3));
    this.flowPts = new THREE.Points(fg, new THREE.PointsMaterial({
      color: 0xc5e2fb, size: 0.26, map: this.dot, transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.archive.add(this.flowPts);
  }

  /* ------------------------------------------------------ 4. volume */

  /* The search, entered. No axes, no labels, no values — see the header. */
  buildVolume() {
    /* Unit z, stretched by layout(). */
    const z0 = 0, z1 = -1;
    const N = this.low ? 900 : 2400;
    const KEPT = 11;

    this.volume = new THREE.Group();
    this.scene.add(this.volume);

    const pos = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const seed = new Float32Array(N);
    const hot = new Float32Array(N);
    const order = new Float32Array(N);

    const CEIL = 15.5;
    const dots = [];
    for (let i = 0; i < N; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = 5 + Math.sqrt(rnd()) * 32;
      const f = rnd();
      const x = Math.cos(ang) * rad;
      /* skewed low: most runs do not help */
      const y = -14 + Math.pow(rnd(), 2.4) * 27;
      const z = -f;
      dots.push({ x, y: Math.min(y, CEIL - 1), z, f });
      pos[i * 3] = x; pos[i * 3 + 1] = dots[i].y; pos[i * 3 + 2] = z;
      size[i] = 1.4 + rnd() * 2.0;
      seed[i] = rnd() * 6.283;
      order[i] = f;
    }

    /* The route: the few that were kept, rising as the flight advances,
       held near the path so the camera travels along beside it. */
    this.keptPath = [];
    for (let s = 0; s < KEPT; s++) {
      const f = s / (KEPT - 1);
      const z = -(0.06 + f * 0.88);
      this.keptPath.push(new THREE.Vector3(
        Math.sin(f * 5.2) * 8.5,
        -10 + Math.pow(f, 0.62) * 24,
        z
      ));
      /* mark the nearest dot as kept so the route lands on real points */
      let best = 0, bd = Infinity;
      for (let i = 0; i < N; i++) {
        const d = Math.abs(dots[i].z - z);
        if (d < bd) { bd = d; best = i; }
      }
      dots[best].x = this.keptPath[s].x;
      dots[best].y = this.keptPath[s].y;
      pos[best * 3] = dots[best].x;
      pos[best * 3 + 1] = dots[best].y;
      hot[best] = 1;
      size[best] = 5.5;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aHot', new THREE.BufferAttribute(hot, 1));
    g.setAttribute('aOrder', new THREE.BufferAttribute(order, 1));

    this.volMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uPix: { value: 1 }, uReveal: { value: 0 },
        uMap: { value: this.dot },
        uCold: { value: new THREE.Color(ICE) },
        uHot: { value: new THREE.Color(0xffc98a) },
      },
      vertexShader: `
        attribute float aSize; attribute float aSeed;
        attribute float aHot;  attribute float aOrder;
        uniform float uTime; uniform float uPix; uniform float uReveal;
        varying float vA; varying float vHot;
        void main() {
          vHot = aHot;
          /* each run appears as the flight reaches its depth */
          float on = smoothstep(aOrder - 0.10, aOrder + 0.06, uReveal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float pulse = 0.82 + 0.18 * sin(uTime * 1.8 + aSeed * 5.0);
          gl_PointSize = min(aSize * uPix * pulse * (150.0 / -mv.z), 30.0 * uPix) * on;
          vA = on * clamp(1.0 - (-mv.z - 20.0) / 210.0, 0.0, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap; uniform vec3 uCold; uniform vec3 uHot;
        varying float vA; varying float vHot;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a;
          vec3 c = mix(uCold, uHot, vHot);
          gl_FragColor = vec4(c, a * vA * (0.75 + vHot * 0.25));
        }
      `,
    });
    this.volPoints = new THREE.Points(g, this.volMat);
    this.volume.add(this.volPoints);

    const curve = new THREE.CatmullRomCurve3(this.keptPath, false, 'catmullrom', 0.4);
    this.routePts = curve.getPoints(360);
    const rp = new Float32Array(this.routePts.length * 3);
    this.routePts.forEach((v, i) => { rp[i * 3] = v.x; rp[i * 3 + 1] = v.y; rp[i * 3 + 2] = v.z; });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rg.setDrawRange(0, 0);
    this.route = new THREE.Line(rg, new THREE.LineBasicMaterial({
      color: 0xffc98a, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.volume.add(this.route);

    /* The ceiling: a lid of rules overhead that the route never clears. */
    const cl = [];
    for (let i = -9; i <= 9; i++) cl.push(i * 5, CEIL, 0, i * 5, CEIL, -1);
    for (let i = 0; i <= 18; i++) cl.push(-45, CEIL, -i / 18, 45, CEIL, -i / 18);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cl, 3));
    this.ceiling = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({
      color: ICE, transparent: true, opacity: 0,
    }));
    this.volume.add(this.ceiling);
  }

  /* ------------------------------------------------------- 5. settle */

  buildSettle() {
    const N = this.low ? 250 : 700;
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = 9 + Math.sqrt(rnd()) * 30;
      p[i * 3] = Math.cos(ang) * rad;
      p[i * 3 + 1] = Math.sin(ang) * rad * 0.7;
      p[i * 3 + 2] = -rnd() * 220;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.settle = new THREE.Points(g, new THREE.PointsMaterial({
      color: ICE, size: 0.3, map: this.dot, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.scene.add(this.settle);
  }

  /* ---------------------------------------------------------- utils */

  /* Place every region at the depth the camera reaches when its own
     section is on screen. Called from measure(), so the world follows
     the writing instead of the two being tuned against each other. */
  layout(marks) {
    if (marks) this.marks = marks;
    const m = Object.assign({}, DEFAULT_MARKS, this.marks || {});
    const zAt = (t) => this.path.getPoint(Math.min(1, Math.max(0, t))).z;

    /* Each landmark sits ahead of where the camera is when its section
       is centred, so you approach it and then pass through — never spawn
       inside it. */
    this.zIgnition = zAt(m.ignition) - 52;
    /* On a tall viewport the copy owns the lower two thirds, so the
       landmarks are lifted above it rather than sat behind it. */
    if (this.narrow) {
      this.ignition.position.set(3, 13, this.zIgnition);
      this.ignition.scale.setScalar(0.72);
    } else {
      this.ignition.position.set(14, -1.5, this.zIgnition);
      this.ignition.scale.setScalar(1);
    }

    this.zMontage = zAt(m.montage) - 46;
    this.montage.position.set(this.narrow ? -2 : -11, this.narrow ? 13 : 1, this.zMontage);
    this.montage.scale.setScalar(this.narrow ? 0.75 : 1);

    const c0 = zAt(m.corridor[0]), c1 = zAt(m.corridor[1]);
    this.corridor.position.z = c0;
    this.corridor.scale.z = Math.max(1, c0 - c1);   // local z runs 0 → -1
    this.zCorridor = [c0, c1];

    this.zArchive = zAt(m.archive) - 34;
    this.archive.position.set(0, this.narrow ? 13 : 0, this.zArchive);
    this.archive.scale.setScalar(this.narrow ? 0.8 : 1);

    const v0 = zAt(m.volume[0]), v1 = zAt(m.volume[1]);
    this.volume.position.z = v0;
    this.volume.scale.z = Math.max(1, v0 - v1);
    this.zVolume = [v0, v1];

    this.settle.position.z = zAt(m.settle);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.narrow = w / h < 0.95;
    this.camera.fov = this.narrow ? 66 : 52;
    this.camera.updateProjectionMatrix();
    this.ignitionMat.uniforms.uPix.value = dpr;
    this.volMat.uniforms.uPix.value = dpr;
    if (this.marks) this.layout(this.marks);
  }

  setProgress(p) { this.pTarget = Math.min(1, Math.max(0, p)); }

  /* Called by the intro: 1 holds the camera on the engine, 0 releases. */
  setIntro(v) { this.intro = v; }

  frame(dt) {
    this.t += dt;
    /* Ease toward the scroll target — the flight should have weight. */
    this.p += (this.pTarget - this.p) * Math.min(1, dt * 2.6);
    const p = this.p;

    this.mx += (this.tmx - this.mx) * Math.min(1, dt * 2.0);
    this.my += (this.tmy - this.my) * Math.min(1, dt * 2.0);

    /* ---- camera along the path, held back during the intro ---- */
    const tt = Math.min(0.999, p * (1 - this.intro * 0.999));
    const here = this.path.getPoint(tt);
    const ahead = this.path.getPoint(Math.min(1, tt + 0.012));

    /* during the intro the camera orbits the engine instead of flying */
    if (this.intro > 0.001) {
      const a = this.t * 0.22;
      const orbit = new THREE.Vector3(
        Math.sin(a) * 23, 4.0 + Math.sin(this.t * 0.4) * 1.4, this.zIgnition + Math.cos(a) * 23
      );
      here.lerp(orbit, this.intro);
      ahead.lerp(new THREE.Vector3(0, 0, this.zIgnition), this.intro);
    }

    this.camera.position.set(
      here.x + this.mx * 2.4,
      here.y - this.my * 1.6,
      here.z
    );
    this.camera.lookAt(ahead.x + this.mx * 1.0, ahead.y - this.my * 0.6, ahead.z);
    /* a slight roll into the lateral drift, like a vehicle leaning */
    this.camera.rotation.z += (ahead.x - here.x) * 0.012 + this.mx * 0.01;

    /* ---- ignition ---- */
    const camZ = this.camera.position.z;
    this.ignition.rotation.y = this.t * 0.13;
    this.ignition.rotation.x = Math.sin(this.t * 0.19) * 0.06;
    /* it lets go once the flight begins, and is gone by the corridor */
    /* It holds together while the intro holds the camera, and lets go
       only once the flight has actually started past it. */
    const burst = clamp01(((this.zIgnition + 26) - camZ) / 78) * (1 - this.intro);
    this.ignitionMat.uniforms.uBurst.value = burst;
    this.ignitionMat.uniforms.uTime.value = this.t;
    this.ignitionMat.uniforms.uFire.value =
      this.intro > 0.02 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.t * 2.4)) : Math.max(0, 1 - burst * 2);
    this.ignition.visible = burst < 0.995 && camZ > this.zIgnition - 60;

    const mON = clamp01((this.zMontage + 75 - camZ) / 55) * clamp01((camZ - this.zMontage + 55) / 35);
    this.nodes.material.opacity = mON * 0.95;
    this.nodeLinks.material.opacity = mON * 0.42;
    this.montage.visible = mON > 0.01;
    this.montage.rotation.y = this.t * 0.1;

    /* ---- corridor ---- */
    this.corridor.visible = camZ < this.zCorridor[0] + 120 && camZ > this.zCorridor[1] - 120;

    /* ---- archive ---- */
    this.archive.visible = Math.abs(camZ - this.zArchive) < 200;
    if (this.archive.visible) {
      const arr = this.flowPts.geometry.attributes.position.array;
      for (let i = 0; i < this.flow.length; i++) {
        const f = this.flow[i];
        f.t += f.v * dt;
        if (f.t > 1) { f.t -= 1; f.e = (f.e + 7) % this.archEdges.length; }
        const [a, b] = this.archEdges[f.e];
        arr[i * 3] = a.x + (b.x - a.x) * f.t;
        arr[i * 3 + 1] = a.y + (b.y - a.y) * f.t;
        arr[i * 3 + 2] = a.z + (b.z - a.z) * f.t;
      }
      this.flowPts.geometry.attributes.position.needsUpdate = true;
      for (const pl of this.plates) {
        pl.mesh.position.y = pl.home.y + Math.sin(this.t * 0.5 + pl.home.y) * 0.09;
      }
    }

    /* ---- volume ---- */
    const [vz0, vz1] = this.zVolume;
    const vf = (camZ - vz0) / (vz1 - vz0);
    this.volume.visible = vf > -0.35 && vf < 1.5;
    if (this.volume.visible) {
      this.volMat.uniforms.uTime.value = this.t;
      this.volMat.uniforms.uReveal.value = Math.min(1.1, Math.max(0, vf + 0.22));
      const drawn = Math.min(1, Math.max(0, vf + 0.14));
      this.route.geometry.setDrawRange(0, Math.floor(drawn * this.routePts.length));
      this.ceiling.material.opacity = Math.min(0.2, Math.max(0, (vf - 0.25) * 0.4));
    }

    this.settle.visible = camZ < vz1 + 160;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('pointermove', this._move);
    this.renderer.dispose();
  }
}
