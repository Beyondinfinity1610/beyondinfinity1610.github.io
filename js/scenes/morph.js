/* ============================================================
   morph.js — "the same problem wearing different clothes".

   One point cloud, two arrangements. It begins as an inline-four:
   bores, crank throws, block. As you scroll it becomes the 10-20
   montage — nineteen electrodes on a scalp, wired as a network.
   Nothing is added or removed between the two; the same points move.

   That is the argument of the section made literal. An engine
   controller and an electrode array are the same object: a decision
   made now, from instruments that are drifting.

   The adjacency is generated geometry for the visual, not measured
   connectivity, and must stay that way — real connectivity from the
   research would be a disclosure.
   ============================================================ */

import * as THREE from '../../vendor/three.module.js';
import { ELECTRODES, connectivity } from '../data/eeg.js';

const INK = 0x05070b;
const ICE = 0x8ec5f0;

const N_PER_NODE = 16;                      // points clustered at each electrode
const N_NODES = ELECTRODES.length;          // 19
const N_SCALP = 900;
const N_TOTAL = N_NODES * N_PER_NODE + N_SCALP;

const rnd = (() => {
  let s = 20260802;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
})();

/* ------------------------------------------------------- arrangements */

/* An inline four, abstracted: four bores, four crank throws on a common
   axis, and the outline of the block. */
function enginePositions() {
  const p = new Float32Array(N_TOTAL * 3);
  const BORE_X = [-5.4, -1.8, 1.8, 5.4];
  const LIFT = [3.15, 1.55, 1.05, 2.65];   // four throws, four heights
  const PHASE = [0, Math.PI, Math.PI, 0];
  const R = 1.5;
  const CRANK_Y = -2.8;
  const THROW = 1.0;

  for (let i = 0; i < N_TOTAL; i++) {
    const t = i / N_TOTAL;
    const c = Math.min(3, Math.floor(rnd() * 4));
    const a = rnd() * Math.PI * 2;
    let x, y, z;

    if (t < 0.34) {
      /* bore walls — a vertical cylinder over each throw */
      const h = rnd();
      x = BORE_X[c] + Math.cos(a) * R;
      y = 0.6 + h * 3.6;
      z = Math.sin(a) * R;
    } else if (t < 0.50) {
      /* piston crowns — a disc inside each bore, each at its own lift */
      const r = Math.sqrt(rnd()) * R * 0.86;
      x = BORE_X[c] + Math.cos(a) * r;
      y = LIFT[c] + (rnd() - 0.5) * 0.16;
      z = Math.sin(a) * r;
    } else if (t < 0.66) {
      /* connecting rods — crown down to the throw */
      const k = rnd();
      const jx = BORE_X[c] + Math.cos(PHASE[c]) * 0.0;
      const jy = CRANK_Y + Math.cos(PHASE[c]) * THROW;
      const jz = Math.sin(PHASE[c]) * THROW;
      x = BORE_X[c] + (jx - BORE_X[c]) * k + (rnd() - 0.5) * 0.12;
      y = LIFT[c] + (jy - LIFT[c]) * k;
      z = 0 + (jz - 0) * k + (rnd() - 0.5) * 0.12;
    } else if (t < 0.80) {
      /* crank throws and the main axis they turn on */
      if (rnd() < 0.62) {
        const ph = PHASE[c] + (rnd() - 0.5) * 1.1;
        x = BORE_X[c] + (rnd() - 0.5) * 1.1;
        y = CRANK_Y + Math.cos(ph) * THROW;
        z = Math.sin(ph) * THROW;
      } else {
        x = (rnd() - 0.5) * 15;
        y = CRANK_Y + (rnd() - 0.5) * 0.16;
        z = (rnd() - 0.5) * 0.16;
      }
    } else {
      /* block — the box it all sits in */
      const w = 7.6, top = 4.5, bot = -4.2, d = 2.3;
      const e = rnd();
      if (e < 0.34)      { x = (rnd() - 0.5) * 2 * w; y = rnd() < 0.5 ? top : bot; z = rnd() < 0.5 ? -d : d; }
      else if (e < 0.68) { x = rnd() < 0.5 ? -w : w;  y = bot + rnd() * (top - bot); z = rnd() < 0.5 ? -d : d; }
      else               { x = rnd() < 0.5 ? -w : w;  y = rnd() < 0.5 ? top : bot; z = (rnd() - 0.5) * 2 * d; }
    }
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
  }
  return p;
}

/* The montage: tight clusters on each electrode, the rest on the scalp. */
function brainPositions() {
  const p = new Float32Array(N_TOTAL * 3);
  const S = 5.6;
  let k = 0;

  for (let n = 0; n < N_NODES; n++) {
    const [ex, ey, ez] = ELECTRODES[n].pos;
    for (let j = 0; j < N_PER_NODE; j++) {
      const spread = j === 0 ? 0 : 0.22;
      p[k * 3]     = ex * S + (rnd() - 0.5) * spread;
      p[k * 3 + 1] = ez * S * 0.92 + (rnd() - 0.5) * spread;
      p[k * 3 + 2] = ey * S + (rnd() - 0.5) * spread;
      k++;
    }
  }

  for (let j = 0; j < N_SCALP; j++) {
    /* upper half of an ellipsoid, biased toward the surface */
    const u = rnd() * Math.PI * 2;
    const v = Math.acos(1 - rnd() * 1.35);
    const r = 0.94 + rnd() * 0.06;
    p[k * 3]     = Math.sin(v) * Math.cos(u) * S * r;
    p[k * 3 + 1] = Math.cos(v) * S * 0.92 * r;
    p[k * 3 + 2] = Math.sin(v) * Math.sin(u) * S * r;
    k++;
  }
  return p;
}

/* ---------------------------------------------------------- scene */

export class Morph {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.tier = opts.tier || 'high';

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: true, powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(INK, 0);
    this.dprCap = this.tier === 'high' ? 1.75 : 1.2;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 200);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.m = 0;          // morph, 0 = engine, 1 = montage
    this.target = 0;
    this.spin = 0;
    this.drag = null;
    this.dragVel = 0;
    this.userSpin = 0;
    this.tilt = 0;

    this.A = enginePositions();
    this.B = brainPositions();

    /* Each point takes its own curved route between the two forms, so the
       transition reads as a swarm rather than a slide. */
    this.arc = new Float32Array(N_TOTAL * 3);
    for (let i = 0; i < N_TOTAL; i++) {
      this.arc[i * 3]     = (rnd() - 0.5) * 6.5;
      this.arc[i * 3 + 1] = (rnd() - 0.5) * 6.5 + 1.5;
      this.arc[i * 3 + 2] = (rnd() - 0.5) * 6.5;
    }
    this.delay = new Float32Array(N_TOTAL);
    for (let i = 0; i < N_TOTAL; i++) this.delay[i] = rnd() * 0.42;

    this.build();
    this.resize();
    this.bind();
  }

  build() {
    const pos = new Float32Array(this.A);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    /* Size and brightness vary per point so the cloud has depth without
       any lighting. Electrode points are the largest. */
    const size = new Float32Array(N_TOTAL);
    const seedA = new Float32Array(N_TOTAL);
    for (let i = 0; i < N_TOTAL; i++) {
      const isNode = i < N_NODES * N_PER_NODE && i % N_PER_NODE === 0;
      size[i] = isNode ? 5.0 : 2.3 + rnd() * 1.5;
      seedA[i] = rnd() * 6.283;
    }
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPix: { value: 1 },
        uCold: { value: new THREE.Color(ICE) },
        uWarm: { value: new THREE.Color(0xffb266) },
        uMorph: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPix;
        varying float vFade;
        varying float vSeed;
        void main() {
          vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float flick = 0.82 + 0.18 * sin(uTime * 1.7 + aSeed * 4.0);
          gl_PointSize = aSize * uPix * flick * (46.0 / -mv.z);
          vFade = clamp(1.0 - (-mv.z - 14.0) / 34.0, 0.15, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uCold;
        uniform vec3 uWarm;
        uniform float uMorph;
        varying float vFade;
        varying float vSeed;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.05, r);
          vec3 c = mix(uWarm, uCold, clamp(uMorph * 1.25 + vSeed * 0.02, 0.0, 1.0));
          gl_FragColor = vec4(c, a * vFade);
        }
      `,
    });

    this.points = new THREE.Points(g, mat);
    this.group.add(this.points);

    /* The network. Only meaningful in the montage arrangement, so it
       fades in with the morph. */
    const edges = connectivity();
    this.edges = edges;
    const lp = new Float32Array(edges.length * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    this.links = new THREE.LineSegments(
      lg,
      new THREE.LineBasicMaterial({
        color: ICE, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.group.add(this.links);
  }

  bind() {
    const down = (e) => {
      this.drag = { x: e.clientX ?? e.touches[0].clientX, y: e.clientY ?? e.touches[0].clientY };
      this.canvas.style.cursor = 'grabbing';
    };
    const move = (e) => {
      if (!this.drag) return;
      const cx = e.clientX ?? (e.touches && e.touches[0].clientX);
      const cy = e.clientY ?? (e.touches && e.touches[0].clientY);
      if (cx == null) return;
      this.dragVel = (cx - this.drag.x) * 0.006;
      this.userSpin += this.dragVel;
      this.tilt = Math.max(-0.6, Math.min(0.6, this.tilt + (cy - this.drag.y) * 0.004));
      this.drag = { x: cx, y: cy };
    };
    const up = () => { this.drag = null; this.canvas.style.cursor = 'grab'; };

    this.canvas.style.cursor = 'grab';
    this.canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    this._unbind = () => {
      this.canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.narrow = w / h < 0.95;
    this.camera.fov = this.narrow ? 54 : 40;
    this.camera.updateProjectionMatrix();
    this.points.material.uniforms.uPix.value = dpr;
  }

  setProgress(p) { this.target = Math.min(1, Math.max(0, p)); }

  frame(t, dt) {
    /* Ease toward the scroll target so flicks do not snap the cloud. */
    this.m += (this.target - this.m) * Math.min(1, dt * 3.2);
    const m = this.m;

    const pos = this.points.geometry.attributes.position.array;
    const A = this.A, B = this.B, arc = this.arc, delay = this.delay;

    for (let i = 0; i < N_TOTAL; i++) {
      const d = delay[i];
      let k = (m - d) / (1 - d);
      k = k < 0 ? 0 : k > 1 ? 1 : k;
      const e = k * k * (3 - 2 * k);
      const bow = Math.sin(e * Math.PI);
      const i3 = i * 3;
      pos[i3]     = A[i3] + (B[i3] - A[i3]) * e + arc[i3] * bow * 0.5;
      pos[i3 + 1] = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * e + arc[i3 + 1] * bow * 0.5;
      pos[i3 + 2] = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * e + arc[i3 + 2] * bow * 0.5;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.uniforms.uTime.value = t;
    this.points.material.uniforms.uMorph.value = m;

    /* Wire the network from wherever the electrode points have got to. */
    const lop = Math.max(0, (m - 0.72) / 0.28);
    this.links.material.opacity = lop * 0.34;
    if (lop > 0.001) {
      const lp = this.links.geometry.attributes.position.array;
      for (let e = 0; e < this.edges.length; e++) {
        const a = this.edges[e].i * N_PER_NODE * 3;
        const b = this.edges[e].j * N_PER_NODE * 3;
        lp[e * 6]     = pos[a];     lp[e * 6 + 1] = pos[a + 1]; lp[e * 6 + 2] = pos[a + 2];
        lp[e * 6 + 3] = pos[b];     lp[e * 6 + 4] = pos[b + 1]; lp[e * 6 + 5] = pos[b + 2];
      }
      this.links.geometry.attributes.position.needsUpdate = true;
    }

    /* Idle rotation, plus whatever the reader has dragged. */
    if (!this.drag) {
      this.dragVel *= 0.94;
      this.userSpin += this.dragVel;
    }
    this.spin += dt * 0.16;
    this.group.rotation.y = this.spin + this.userSpin;
    this.group.rotation.x = this.tilt + (1 - m) * 0.12;

    const dist = this.narrow ? 30 : 24;
    this.camera.position.set(0, 1.2, dist);
    this.camera.lookAt(0, 0.2, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this._unbind) this._unbind();
    this.renderer.dispose();
  }
}
