/* ============================================================
   search.js — the shape of a search.

   One dot per run in a systematic sweep. They arrive as you scroll,
   most of them settling low, a few higher. A path threads through the
   handful that were kept, and terminates against a ceiling that does
   not move.

   DISCLOSURE: there are no axes, no labels, no experiment names and no
   values here, and there must not be. The heights are generated from a
   fixed seed purely so the cloud has structure to look at — they encode
   nothing. What the scene is allowed to say is that a large, systematic
   search happened and that its conclusion was a limit. Keep it that way.
   ============================================================ */

import * as THREE from '../../vendor/three.module.js';

const INK = 0x05070b;
const ICE = 0x8ec5f0;
const HOT = 0xffc98a;

const N = 168;              // dots — a sweep, not a count of anything
const KEPT = 9;             // how many the path visits

const rnd = (() => {
  let s = 987654321;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
})();

export class Search {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.tier = opts.tier || 'high';

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: true, powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(INK, 0);
    this.dprCap = this.tier === 'high' ? 1.75 : 1.2;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 200);
    this.group = new THREE.Group();
    /* Dropped clear of the copy that rides over the top-left of the canvas. */
    this.group.position.y = -3.4;
    this.scene.add(this.group);

    this.progress = 0;
    this.px = 0; this.py = 0; this.tx = 0; this.ty = 0;

    this.build();
    this.resize();

    this._move = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener('pointermove', this._move, { passive: true });
  }

  build() {
    /* Dots scattered across a plane, height drawn from a distribution
       that mostly fails and occasionally does not. */
    this.dots = [];
    const pos = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const seedA = new Float32Array(N);
    const hot = new Float32Array(N);

    const CEIL = 4.3;
    for (let i = 0; i < N; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * 11;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad * 0.62;
      /* skewed low: most attempts do not help */
      const u = rnd();
      const y = -3.2 + Math.pow(u, 2.6) * 7.4 + (rnd() - 0.5) * 0.5;
      this.dots.push({ x, y: Math.min(y, CEIL - 0.25), z, order: rnd() });
      size[i] = 2.8 + rnd() * 2.0;
      seedA[i] = rnd() * 6.283;
      hot[i] = 0;
    }

    /* The kept ones: an ascending route through the better attempts. */
    /* The kept runs are the better ones, ordered left to right, so the
       route reads as a progression rather than a scribble. */
    const byHeight = this.dots.map((d, i) => i).sort((a, b) => this.dots[a].y - this.dots[b].y);
    const top = byHeight.slice(Math.floor(byHeight.length * 0.55));
    top.sort((a, b) => this.dots[a].x - this.dots[b].x);
    const picks = [];
    for (let s = 0; s < KEPT; s++) {
      picks.push(top[Math.floor((top.length - 1) * (s / (KEPT - 1)))]);
    }
    /* pull them into a rising line so the ascent is unmistakable */
    picks.forEach((idx, s) => {
      const f = s / (KEPT - 1);
      this.dots[idx].y = -1.9 + Math.pow(f, 0.62) * 5.6;
      this.dots[idx].z *= 0.45;
    });
    this.picks = picks;
    for (const i of picks) { hot[i] = 1; size[i] = 5.0; }

    for (let i = 0; i < N; i++) {
      pos[i * 3] = this.dots[i].x;
      pos[i * 3 + 1] = this.dots[i].y;
      pos[i * 3 + 2] = this.dots[i].z;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    g.setAttribute('aHot', new THREE.BufferAttribute(hot, 1));
    g.setAttribute('aOrder', new THREE.BufferAttribute(
      new Float32Array(this.dots.map((d) => d.order)), 1
    ));

    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uPix: { value: 1 }, uReveal: { value: 0 },
        uCold: { value: new THREE.Color(ICE) }, uHot: { value: new THREE.Color(HOT) },
      },
      vertexShader: `
        attribute float aSize; attribute float aSeed;
        attribute float aHot;  attribute float aOrder;
        uniform float uTime; uniform float uPix; uniform float uReveal;
        varying float vA; varying float vHot;
        void main() {
          vHot = aHot;
          /* each dot appears when the reveal passes its own position in
             the order — the sweep arriving one run at a time */
          float on = smoothstep(aOrder, aOrder + 0.16, uReveal);
          vec3 p = position;
          p.y -= (1.0 - on) * 3.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float pulse = 0.85 + 0.15 * sin(uTime * 2.0 + aSeed * 5.0);
          gl_PointSize = aSize * uPix * pulse * (42.0 / -mv.z) * on;
          vA = on * clamp(1.0 - (-mv.z - 16.0) / 40.0, 0.2, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uCold; uniform vec3 uHot;
        varying float vA; varying float vHot;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.04, r);
          vec3 c = mix(uCold, uHot, vHot);
          gl_FragColor = vec4(c, a * vA * (0.9 + vHot * 0.1));
        }
      `,
    });

    this.points = new THREE.Points(g, this.mat);
    this.group.add(this.points);

    /* The route. Drawn progressively, so it reads as a trajectory. */
    const path = picks.map((i) => new THREE.Vector3(this.dots[i].x, this.dots[i].y, this.dots[i].z));
    const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.4);
    this.curvePts = curve.getPoints(240);
    const lp = new Float32Array(this.curvePts.length * 3);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lg.setDrawRange(0, 0);
    this.line = new THREE.Line(
      lg,
      new THREE.LineBasicMaterial({
        color: HOT, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    for (let i = 0; i < this.curvePts.length; i++) {
      lp[i * 3] = this.curvePts[i].x;
      lp[i * 3 + 1] = this.curvePts[i].y;
      lp[i * 3 + 2] = this.curvePts[i].z;
    }
    this.group.add(this.line);

    /* The ceiling: a plane of rules the path never gets above. */
    const cl = [];
    for (let i = -5; i <= 5; i++) {
      cl.push(-10, CEIL, i * 1.1, 10, CEIL, i * 1.1);
      cl.push(i * 2.0, CEIL, -5.5, i * 2.0, CEIL, 5.5);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cl, 3));
    this.ceiling = new THREE.LineSegments(
      cg,
      new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0 })
    );
    this.group.add(this.ceiling);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.narrow = w / h < 0.95;
    this.camera.fov = this.narrow ? 58 : 42;
    this.camera.updateProjectionMatrix();
    this.mat.uniforms.uPix.value = dpr;
  }

  setProgress(p) { this.progress = Math.min(1, Math.max(0, p)); }

  frame(t, dt) {
    const p = this.progress;
    this.mat.uniforms.uTime.value = t;
    /* dots fill in over the first two thirds, the route draws after */
    this.mat.uniforms.uReveal.value = Math.min(1, p * 1.55);

    const draw = Math.max(0, Math.min(1, (p - 0.5) / 0.42));
    const eased = draw * draw * (3 - 2 * draw);
    this.line.geometry.setDrawRange(0, Math.floor(eased * this.curvePts.length));
    this.ceiling.material.opacity = Math.max(0, (p - 0.66) / 0.34) * 0.22;

    this.px += (this.tx - this.px) * Math.min(1, dt * 2.2);
    this.py += (this.ty - this.py) * Math.min(1, dt * 2.2);

    /* A slow arc around the cloud, dropping toward its plane. */
    const ang = -0.42 + p * 0.8 + this.px * 0.12;
    const dist = (this.narrow ? 31 : 25) - p * 2.5;
    this.camera.position.set(
      Math.sin(ang) * dist,
      11.5 - p * 4.2 - this.py * 1.2,
      Math.cos(ang) * dist
    );
    this.camera.lookAt(0, -0.6, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('pointermove', this._move);
    this.renderer.dispose();
  }
}
