import * as THREE from '../../vendor/three.module.js';
import { BloomChain } from '../gl/bloom.js';
import { ELECTRODES } from '../data/eeg.js';

/**
 * "The Signal Sky" — the hero field.
 *
 * One GPU particle system that morphs through three states as the page scrolls:
 *
 *   p = 0.0   a 19-channel EEG montage, drawn as light. A rhythmic discharge
 *             sweeps across the channels every ~13 s, propagating with a
 *             per-channel delay the way a real focal seizure spreads.
 *   p = 0.55  the traces wrap onto a head-shaped shell and the montage becomes
 *             a connectivity graph.
 *   p = 1.0   the shell disperses into a wide constellation.
 *
 * All three states are evaluated per-vertex and blended on the GPU; nothing is
 * animated on the CPU except uniforms.
 */

const NCH = 19;

const VERT = /* glsl */ `
uniform float uTime;
uniform float uProg;
uniform float uSize;
uniform float uDpr;
uniform vec3  uPointer;
uniform float uPointerAmt;
uniform float uBurstMix;

attribute float aChan;
attribute float aT;
attribute vec3  aRand;
attribute vec3  aShell;

varying vec3  vColor;
varying float vGlow;

// --- cheap value noise -------------------------------------------------
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
        mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
        mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}

void main() {
  // Roughly half the points draw the montage; the rest are ambient dust, so
  // the field has depth without the traces collapsing into a wall of static.
  float isDust = step(0.52, aRand.z);

  float row = mod(aChan, 11.0);
  float chN = row / 10.0;                          // 0..1 down the montage
  float phase = aRand.x * 6.2831853;
  float speed = 0.75 + aRand.y * 0.55;

  // ---------------- STATE A : the montage --------------------------------
  // spans wider than the viewport on purpose — the montage should read as a
  // window onto a recording that continues past both edges
  float x0 = (aT - 0.5) * 64.0;
  float y0 = (chN - 0.5) * -22.0;

  // a focal discharge sweeping left to right, delayed per channel so it
  // propagates down the montage instead of firing everywhere at once
  float cyc  = mod(uTime * 0.30 + chN * 0.10, 1.0);
  float front = cyc * 84.0 - 40.0;
  float env  = exp(-pow((x0 - front) * 0.115, 2.0));
  env *= smoothstep(0.02, 0.20, cyc) * (1.0 - smoothstep(0.72, 0.97, cyc));
  env *= uBurstMix;

  // composite of the five clinical bands
  float w = 0.0;
  w += 0.62 * sin(x0 * 0.170 + uTime * 0.5 * speed + phase);          // delta
  w += 0.34 * sin(x0 * 0.430 + uTime * 1.0 * speed + phase * 1.7);    // theta
  w += 0.24 * sin(x0 * 0.940 + uTime * 1.7 * speed + phase * 2.3);    // alpha
  w += 0.13 * sin(x0 * 2.000 + uTime * 2.9 * speed + phase * 3.1);    // beta
  w += 0.07 * sin(x0 * 4.300 + uTime * 5.0 * speed + phase * 4.7);    // gamma

  // rhythmic spike-wave rides on top of the discharge envelope
  w += env * 2.6 * sin(x0 * 1.26 - uTime * 7.0) * (0.6 + 0.4 * sin(x0 * 3.7 - uTime * 14.0));

  float energy = abs(w) * (0.34 + env * 1.5);

  vec3 posA = vec3(x0, y0 + w * 0.86, (aRand.z - 0.5) * 0.7 + env * 1.8);

  // dust: a slow volumetric haze behind the montage
  vec3 dust = vec3(
    (aRand.x - 0.5) * 96.0,
    (aRand.y - 0.5) * 46.0,
    -6.0 - fract(aRand.z * 37.0) * 30.0
  );
  dust += vec3(sin(uTime * 0.07 + aRand.y * 9.0), cos(uTime * 0.06 + aRand.x * 9.0), 0.0) * 1.4;
  posA = mix(posA, dust, isDust);
  energy *= (1.0 - isDust * 0.86);

  // ---------------- STATE B : the head shell -----------------------------
  vec3 sh = aShell;
  float bre = noise3(sh * 2.1 + uTime * 0.16) - 0.5;
  vec3 posB = sh * (9.6 + bre * 1.4);
  posB.y *= 1.04;

  // ---------------- STATE C : dispersal ----------------------------------
  vec3 dir = normalize(sh + vec3(0.001));
  float turb = noise3(sh * 1.4 + uTime * 0.07);
  vec3 posC = dir * (16.0 + aRand.x * 32.0 + turb * 11.0);
  posC.z -= 14.0;

  // ---------------- blend -------------------------------------------------
  float p1 = smoothstep(0.06, 0.58, uProg);
  float p2 = smoothstep(0.56, 1.00, uProg);
  vec3 pos = mix(mix(posA, posB, p1), posC, p2);

  // slow global drift so nothing is ever perfectly still
  pos += vec3(
    sin(uTime * 0.13 + aRand.x * 6.28),
    cos(uTime * 0.11 + aRand.y * 6.28),
    sin(uTime * 0.09 + aRand.z * 6.28)
  ) * 0.16;

  // ---------------- pointer: a depolarisation front ------------------------
  vec2 d2 = pos.xy - uPointer.xy;
  float dist = length(d2);
  float ring = exp(-pow((dist - 3.2) * 0.55, 2.0));
  float near = exp(-dist * dist * 0.012);
  float push = (ring * 1.7 + near * 0.9) * uPointerAmt;
  pos.xy += normalize(d2 + 0.0001) * push;
  pos.z  += push * 0.6;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // ---------------- colour -------------------------------------------------
  // A real black-body ramp: signal energy is temperature. Dark ember at rest,
  // amber as the trace works, ignition yellow into white at the discharge.
  vec3 cEmber = vec3(0.290, 0.070, 0.015);
  vec3 cAmber = vec3(1.000, 0.420, 0.070);
  vec3 cIgnite= vec3(1.000, 0.790, 0.320);
  vec3 cWhite = vec3(1.000, 0.960, 0.900);
  vec3 cIce   = vec3(0.330, 0.760, 1.000);

  float act = clamp(energy * 0.9, 0.0, 1.0);
  vec3 col = mix(cEmber, cAmber, smoothstep(0.02, 0.42, act));
  col = mix(col, cIgnite, smoothstep(0.38, 0.80, act));
  col = mix(col, cWhite, smoothstep(0.62, 1.20, act + env * 0.8));

  // the shell reads cooler — it is structure, not activity
  col = mix(col, mix(col, cIce, 0.42), p1 * 0.62);
  col = mix(col, cIce, p2 * 0.30 * (0.3 + aRand.y * 0.7));

  float ptr = (ring + near) * uPointerAmt;
  col += cIce * ptr * 1.5;

  // dust stays dim and cool once the montage exists; it rejoins the shell later
  float dustNow = isDust * (1.0 - p1);
  col = mix(col, vec3(0.44, 0.16, 0.05), dustNow);

  // dissolve toward the edges of the montage so the field has no visible box
  float edge = (1.0 - smoothstep(17.0, 33.0, abs(pos.x)))
             * (1.0 - smoothstep(7.0, 13.5, abs(pos.y)));
  edge = mix(edge, 1.0, p1);

  vColor = col;
  vGlow = mix(0.95 + act * 1.9 + env * 2.8 + ptr * 1.9, 0.30, dustNow)
        * (0.06 + edge * 0.94)
        * mix(1.0, 0.62, p1);   // the shell is background, not headline

  float sz = uSize * (0.62 + act * 1.05 + env * 2.0 + ptr * 1.1);
  sz *= mix(1.0, 0.55, dustNow) * (0.35 + edge * 0.65);
  sz *= mix(1.0, 0.80, p2);
  // clamp: dispersed points can drift close to the camera and would otherwise
  // blow up into soft blobs
  gl_PointSize = min(sz * uDpr * (40.0 / max(-mv.z, 1.0)), 13.0 * uDpr);
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vGlow;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = dot(uv, uv) * 4.0;                 // 0 at centre, 1 at edge
  if (d > 1.0) discard;
  float halo = pow(1.0 - d, 2.4);
  float core = pow(1.0 - d, 14.0) * 1.9;
  gl_FragColor = vec4(vColor * (halo + core) * vGlow, 1.0);
}`;

/* ---------------- connectivity arcs, visible in the shell state ----------- */

const ARC_VERT = /* glsl */ `
uniform float uTime;
uniform float uProg;
attribute float aArcT;
attribute float aArcSeed;
varying float vFade;
void main() {
  vec3 pos = position;
  float breathe = sin(uTime * 0.7 + aArcSeed * 6.28) * 0.5 + 0.5;

  float p1 = smoothstep(0.14, 0.60, uProg);
  float p2 = smoothstep(0.60, 0.92, uProg);
  float vis = p1 * (1.0 - p2);

  // arcs assemble from their endpoints inward
  float grow = smoothstep(0.0, 1.0, p1 * 1.6 - abs(aArcT - 0.5) * 0.9);
  pos *= mix(0.55, 1.0, grow);

  // a signal packet travelling along each edge
  float head = fract(uTime * 0.34 + aArcSeed);
  float pulse = exp(-pow((aArcT - head) * 9.0, 2.0));

  vFade = vis * (0.14 + breathe * 0.20 + pulse * 1.5) * grow;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const ARC_FRAG = /* glsl */ `
varying float vFade;
void main() {
  if (vFade <= 0.002) discard;
  gl_FragColor = vec4(vec3(0.42, 0.80, 1.0) * vFade, 1.0);
}`;

/* ------------------------------------------------------------------------ */

export class NeuralField {
  constructor(canvas, tier) {
    this.canvas = canvas;
    this.tier = tier;
    this.count = tier === 'high' ? 150000 : tier === 'mid' ? 62000 : 20000;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x0b0a09, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 260);
    this.camera.position.set(0, 0, 34);

    this.dpr = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 1.85 : 1.4);
    this.useBloom = tier !== 'low';

    this._buildPoints();
    this._buildArcs();

    this.pointer = new THREE.Vector3(0, 0, 0);
    this.pointerTarget = new THREE.Vector3(0, 0, 0);
    this.pointerAmt = 0;
    this.pointerAmtTarget = 0;

    this.prog = 0;
    this.progTarget = 0;
    this.camTilt = new THREE.Vector2();
    this.camTiltTarget = new THREE.Vector2();
    this.time = 0;
    this.intro = 0;

    this.resize();
  }

  _buildPoints() {
    const n = this.count;
    const g = new THREE.BufferGeometry();
    const perCh = Math.floor(n / NCH);

    const pos = new Float32Array(n * 3);   // placeholder; real position is shader-side
    const chan = new Float32Array(n);
    const t = new Float32Array(n);
    const rand = new Float32Array(n * 3);
    const shell = new Float32Array(n * 3);

    // golden-angle distribution -> even coverage of the head shell
    const GA = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < n; i++) {
      const ch = Math.min(NCH - 1, Math.floor(i / perCh));
      chan[i] = ch;
      t[i] = (i % perCh) / perCh;

      rand[i * 3] = Math.random();
      rand[i * 3 + 1] = Math.random();
      rand[i * 3 + 2] = Math.random();

      // 85% spread over the shell, 15% clustered at real electrode sites so the
      // montage folds into something with recognisable structure
      let sx, sy, sz;
      if (i % 7 === 0) {
        const e = ELECTRODES[(i * 13) % ELECTRODES.length].pos;
        const j = 0.17;
        sx = e[0] + (Math.random() - 0.5) * j;
        sy = e[1] + (Math.random() - 0.5) * j;
        sz = e[2] + (Math.random() - 0.5) * j;
      } else {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = GA * i;
        sx = Math.cos(th) * r;
        sz = Math.sin(th) * r;
        sy = y;
      }
      // ellipsoid: wider than tall, longer front-to-back — a head, not a ball
      const l = Math.hypot(sx, sy, sz) || 1;
      shell[i * 3] = (sx / l) * 0.92;
      shell[i * 3 + 1] = (sy / l) * 1.0;
      shell[i * 3 + 2] = (sz / l) * 1.08;

      pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
    }

    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aChan', new THREE.BufferAttribute(chan, 1));
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
    g.setAttribute('aShell', new THREE.BufferAttribute(shell, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

    this.uniforms = {
      uTime: { value: 0 },
      uProg: { value: 0 },
      uSize: { value: this.tier === 'high' ? 1.9 : 2.6 },
      uDpr: { value: 1 },
      uPointer: { value: new THREE.Vector3(999, 999, 0) },
      uPointerAmt: { value: 0 },
      uBurstMix: { value: 1 },
    };

    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  _buildArcs() {
    const SEG = 14;
    const pairs = [];
    const n = ELECTRODES.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = ELECTRODES[i].pos, b = ELECTRODES[j].pos;
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        if (d > 0.55 && d < 1.75 && (i * 31 + j * 17) % 5 < 2) pairs.push([i, j]);
      }
    }

    const verts = [];
    const ts = [];
    const seeds = [];
    const R = 9.6;

    pairs.forEach(([i, j], k) => {
      const a = new THREE.Vector3(...ELECTRODES[i].pos).multiplyScalar(R);
      const b = new THREE.Vector3(...ELECTRODES[j].pos).multiplyScalar(R);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const lift = 1 + a.distanceTo(b) / (R * 2.4);
      mid.setLength(R * lift);
      const seed = (k * 0.618) % 1;

      let prev = null;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const p = new THREE.Vector3()
          .copy(a).multiplyScalar((1 - t) * (1 - t))
          .addScaledVector(mid, 2 * (1 - t) * t)
          .addScaledVector(b, t * t);
        if (prev) {
          verts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          ts.push((s - 1) / SEG, t);
          seeds.push(seed, seed);
        }
        prev = p;
      }
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('aArcT', new THREE.Float32BufferAttribute(ts, 1));
    g.setAttribute('aArcSeed', new THREE.Float32BufferAttribute(seeds, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    this.arcUniforms = { uTime: { value: 0 }, uProg: { value: 0 } };
    this.arcs = new THREE.LineSegments(g, new THREE.ShaderMaterial({
      vertexShader: ARC_VERT,
      fragmentShader: ARC_FRAG,
      uniforms: this.arcUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    }));
    this.arcs.frustumCulled = false;
    this.scene.add(this.arcs);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the montage readable on narrow screens by pulling the camera back
    this.camera.fov = w < 760 ? 62 : 46;
    this.camera.updateProjectionMatrix();
    this.uniforms.uDpr.value = this.dpr;

    if (this.useBloom) {
      const bw = Math.floor(w * this.dpr), bh = Math.floor(h * this.dpr);
      if (this.bloom) this.bloom.setSize(bw, bh);
      else this.bloom = new BloomChain(this.renderer, bw, bh, {
        threshold: 0.20, knee: 0.30, strength: this.tier === 'high' ? 1.45 : 1.2, levels: 3,
        vignette: 0.55,
      });
    }
  }

  setProgress(p) { this.progTarget = Math.max(0, Math.min(1, p)); }

  setPointer(nx, ny, active) {
    // project normalised pointer into the plane the montage lives on
    const z = 34;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hh = Math.tan(vFov / 2) * z;
    this.pointerTarget.set(nx * hh * this.camera.aspect, ny * hh, 0);
    this.pointerAmtTarget = active ? 1 : 0;
    this.camTiltTarget.set(nx, ny);
  }

  update(dt) {
    this.time += dt;
    this.intro = Math.min(1, this.intro + dt * 0.42);

    const k = 1 - Math.pow(0.001, dt);
    this.prog += (this.progTarget - this.prog) * Math.min(1, k * 1.6);
    this.pointer.lerp(this.pointerTarget, Math.min(1, k * 1.1));
    this.pointerAmt += (this.pointerAmtTarget - this.pointerAmt) * Math.min(1, k * 0.9);
    this.camTilt.lerp(this.camTiltTarget, Math.min(1, k * 0.5));

    const u = this.uniforms;
    u.uTime.value = this.time;
    u.uProg.value = this.prog;
    u.uPointer.value.copy(this.pointer);
    u.uPointerAmt.value = this.pointerAmt;
    u.uBurstMix.value = this.intro;

    this.arcUniforms.uTime.value = this.time;
    this.arcUniforms.uProg.value = this.prog;

    // the shell slowly rotates once it exists; the montage stays face-on
    const spin = Math.max(0, this.prog - 0.12) * 1.5;
    this.points.rotation.y = this.arcs.rotation.y = this.time * 0.08 * spin + spin * 0.5;
    this.points.rotation.x = this.arcs.rotation.x = -0.12 * spin;

    // ease-out intro dolly + gentle parallax
    const introZ = 34 + (1 - this.intro) * 26;
    this.camera.position.z = introZ + this.prog * 5;
    this.camera.position.x = this.camTilt.x * 2.2;
    this.camera.position.y = this.camTilt.y * 1.5;
    this.camera.lookAt(0, 0, 0);

    if (this.useBloom) this.bloom.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }
}
