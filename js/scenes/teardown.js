import * as THREE from '../../vendor/three.module.js';
import { BloomChain } from '../gl/bloom.js';

/**
 * The NeuroSync teardown.
 *
 * A scroll-driven exploded view of the architecture, built the way a product
 * teardown is shot: layers separated in depth, camera flying between them, each
 * stage lighting up as it is described.
 */

const PLATE_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PLATE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uActive;
uniform vec3  uColor;
uniform float uSeed;
uniform float uAssembled;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;

float grid(vec2 uv, float n, float w) {
  vec2 g = abs(fract(uv * n - 0.5) - 0.5) / fwidth(uv * n);
  float l = min(g.x, g.y);
  return 1.0 - min(l * w, 1.0);
}

void main() {
  vec2 uv = vUv;

  // internal circuitry: a fine grid plus a few hot traces
  float g = grid(uv, 9.0, 1.0) * 0.16;
  g += grid(uv, 3.0, 1.4) * 0.12;

  // data scanning through the module
  float scan = exp(-pow(fract(uv.x - uTime * 0.22 - uSeed) - 0.5, 2.0) * 34.0);
  float scan2 = exp(-pow(fract(uv.y * 0.7 + uTime * 0.13 + uSeed) - 0.5, 2.0) * 60.0);

  // fresnel rim so plates read as physical objects edge-on
  float fres = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 2.6);

  // border
  vec2 b = min(uv, 1.0 - uv);
  float edge = 1.0 - smoothstep(0.0, 0.012, min(b.x, b.y));
  float inner = 1.0 - smoothstep(0.03, 0.038, min(b.x, b.y));

  float base = 0.07 + uActive * 0.18;
  float lum = g * (0.34 + uActive * 0.62) + scan * (0.13 + uActive * 0.46) + scan2 * 0.10 * uActive;
  lum += edge * (0.40 + uActive * 0.85);
  lum += inner * (0.07 + uActive * 0.20);
  lum += fres * (0.14 + uActive * 0.34);

  vec3 col = uColor * (base + lum);
  float alpha = clamp(0.045 + lum * 0.75 + uActive * 0.08, 0.0, 1.0) * uAssembled;
  gl_FragColor = vec4(col * (0.42 + uActive * 0.52), alpha);
}`;

const FLOW_VERT = /* glsl */ `
uniform float uTime;
uniform float uActive;
attribute float aT;
attribute float aSeed;
attribute float aStage;
varying float vI;
varying float vStage;
void main() {
  float head = fract(uTime * 0.30 + aSeed);
  float d = abs(aT - head);
  d = min(d, 1.0 - d);
  float pulse = exp(-pow(d * 11.0, 2.0));
  vI = 0.05 + pulse * 1.6 * (0.35 + uActive);
  vStage = aStage;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FLOW_FRAG = /* glsl */ `
varying float vI;
varying float vStage;
void main() {
  vec3 cool = vec3(0.35, 0.78, 1.00);
  vec3 warm = vec3(1.00, 0.52, 0.12);
  vec3 c = mix(cool, warm, vStage);
  gl_FragColor = vec4(c * vI, 1.0);
}`;

/* ------------------------------------------------------------------ */

const CY = new THREE.Color('#ff7a18');   // EEG — the primary path
const VI = new THREE.Color('#ff9a3c');   // gate & fusion — mid amber
const AM = new THREE.Color('#6fd3ff');   // physiological — the cold channels
const GR = new THREE.Color('#3dd9b0');   // outputs

/**
 * [id, title, subtitle, x, y, z, w, h, color, narrative-step]
 *
 * The step index maps each module to the moment in the story it belongs to:
 * 1 what I built · 3 what the diagnosis found broken · 4 what the rebuild kept.
 * Step 2 is the plateau, where deliberately nothing lights up.
 */
const MODULES = [
  ['eeg_lf', 'EEG · LF',  'ChronoNet  0.5–15 Hz',      -6.4,  3.2, -13, 4.4, 2.5, CY, 1],
  ['eeg_hf', 'EEG · HF',  'TKEO + autocorr  20–40 Hz', -6.4,  0.2, -13, 4.4, 2.5, CY, 1],
  ['emg',    'EMG',       'Deltoid  E + rhythmicity',  -6.4, -2.8, -13, 4.4, 2.5, AM, 1],
  ['ecg',    'ECG',       'heart rate — the real signal', 0.0, 3.2, -13, 4.4, 2.5, AM, 1],
  ['acc',    'ACC',       'ROCKET  3-axis  frozen',     0.0, -2.8, -13, 4.4, 2.5, AM, 1],
  ['gate',   'DynMM Gate','collapsed to a constant',    0.0,  0.2,  -4, 5.6, 3.4, VI, 3],
  ['mult',   'Deep MulT', 'residual weights = 0',       0.0,  0.2,   4, 7.6, 4.6, VI, 4],
  ['h1',     'Head L1',   'seizure / background',       2.6,  1.6,  12, 3.9, 2.2, GR, 4],
  ['h2',     'Head L2',   'FBTC  motor generalisation', -2.6, -1.4, 12, 3.9, 2.2, GR, 4],
];

const LINKS = [
  ['eeg_lf', 'gate'], ['eeg_hf', 'gate'], ['emg', 'gate'], ['ecg', 'gate'], ['acc', 'gate'],
  ['gate', 'mult'],
  ['eeg_lf', 'mult'], ['ecg', 'mult'], ['emg', 'mult'],
  ['mult', 'h1'], ['mult', 'h2'],
];

/**
 * Camera keyframes, one per narrative step. The model spans roughly 15 units
 * in every direction, so every shot sits far enough out to keep the whole
 * assembly legible — this is a teardown, not a flythrough.
 */
const SHOTS = [
  { pos: [25, 10, 27],   look: [-1, 0, -2] },  // 0 · the setting — three-quarter overview
  { pos: [-21, 7, 20],   look: [-3, 1, -7] },  // 1 · what I built — the tokenizer bank
  { pos: [5, 3, 46],     look: [0, 0, -1] },   // 2 · the plateau — far back, nothing lit
  { pos: [16, 6, 20],    look: [0, 0.5, -3] }, // 3 · the diagnosis — in on the dead gate
  { pos: [-17, 2, 26],   look: [0, 0, 4] },    // 4 · the rebuild — fusion into the heads
  { pos: [28, 11, 33],   look: [-1, 0, 0] },   // 5 · the fair test — pull back
];

export class Teardown {
  constructor(canvas, tier) {
    this.canvas = canvas;
    this.tier = tier;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

    this.dpr = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 1.7 : 1.3);
    this.useBloom = tier === 'high';

    this.modules = new Map();
    this.t = 0;
    this.tSmooth = 0;
    this.time = 0;
    this.tilt = new THREE.Vector2();
    this.tiltTarget = new THREE.Vector2();

    this.camPos = new THREE.Vector3(...SHOTS[0].pos);
    this.camLook = new THREE.Vector3(...SHOTS[0].look);

    this._buildModules();
    this._buildFlow();
    this._buildStarfield();
    this.resize();
  }

  _label(title, subtitle, color) {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = S; c.height = Math.round(S * 0.36);
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);

    x.font = '500 46px "JetBrains Mono", monospace';
    x.fillStyle = '#ffffff';
    x.textBaseline = 'top';
    x.letterSpacing = '2px';
    x.fillText(title, 8, 10);

    x.font = '400 27px "JetBrains Mono", monospace';
    x.fillStyle = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},0.78)`;
    x.fillText(subtitle, 8, 72);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  _buildModules() {
    MODULES.forEach(([id, title, sub, px, py, pz, w, h, color, step], idx) => {
      const group = new THREE.Group();
      group.position.set(px, py, pz);

      const uniforms = {
        uTime: { value: 0 },
        uActive: { value: 0 },
        uColor: { value: color.clone() },
        uSeed: { value: idx * 0.137 },
        uAssembled: { value: 1 },
      };

      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h, 1, 1),
        new THREE.ShaderMaterial({
          vertexShader: PLATE_VERT,
          fragmentShader: PLATE_FRAG,
          uniforms,
          transparent: true,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      group.add(plate);

      // a second plate offset in depth gives each module physical thickness
      const back = plate.clone();
      back.material = plate.material;
      back.position.z = -0.34;
      back.scale.set(0.965, 0.965, 1);
      group.add(back);

      const lblTex = this._label(title, sub, color);
      const lw = w * 0.92;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(lw, lw * 0.36),
        new THREE.MeshBasicMaterial({ map: lblTex, transparent: true, depthWrite: false, opacity: 0.9 })
      );
      label.position.set(0, -h / 2 - lw * 0.24, 0.06);
      group.add(label);

      this.scene.add(group);
      this.modules.set(id, { group, plate, label, uniforms, step, home: new THREE.Vector3(px, py, pz), color });
    });
  }

  _buildFlow() {
    const SEG = 18;
    const verts = [], ts = [], seeds = [], stages = [];

    LINKS.forEach(([from, to], k) => {
      const a = this.modules.get(from).home.clone();
      const b = this.modules.get(to).home.clone();
      const seed = (k * 0.618034) % 1;
      const stage = b.z > 6 ? 1 : b.z > 0 ? 0.6 : 0.2;

      // bow the link sideways so parallel routes stay legible
      const mid = a.clone().lerp(b, 0.5);
      mid.x += (a.x - b.x) * 0.16 + Math.sin(k * 2.1) * 1.3;
      mid.y += Math.cos(k * 1.7) * 0.9;

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
          stages.push(stage, stage);
        }
        prev = p;
      }
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    g.setAttribute('aStage', new THREE.Float32BufferAttribute(stages, 1));

    this.flowU = { uTime: { value: 0 }, uActive: { value: 0 } };
    this.flow = new THREE.LineSegments(g, new THREE.ShaderMaterial({
      vertexShader: FLOW_VERT,
      fragmentShader: FLOW_FRAG,
      uniforms: this.flowU,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }));
    this.flow.frustumCulled = false;
    this.scene.add(this.flow);
  }

  _buildStarfield() {
    const n = this.tier === 'low' ? 300 : 1100;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 150;
      p[i * 3 + 1] = (Math.random() - 0.5) * 100;
      p[i * 3 + 2] = -40 - Math.random() * 120;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.9, color: 0x6b3a1c, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.scene.add(this.stars);
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < 820 ? 56 : 42;
    this.narrow = w < 900;

    // On wide screens the narration occupies the left half, so shift the
    // rendered frustum to park the model clear of it.
    if (this.narrow) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, -w * 0.25, 0, w, h);
    this.camera.updateProjectionMatrix();
    if (this.useBloom) {
      const bw = Math.floor(w * this.dpr), bh = Math.floor(h * this.dpr);
      if (this.bloom) this.bloom.setSize(bw, bh);
      else this.bloom = new BloomChain(this.renderer, bw, bh, { threshold: 0.46, knee: 0.28, strength: 0.62, levels: 3, vignette: 0.45 });
    }
  }

  /** t: 0..1 across the whole teardown scroll zone. */
  setProgress(t) { this.t = Math.max(0, Math.min(1, t)); }
  setPointer(nx, ny) { this.tiltTarget.set(nx, ny); }

  update(dt) {
    this.time += dt;
    const k = Math.min(1, 1 - Math.pow(0.0015, dt));
    this.tSmooth += (this.t - this.tSmooth) * Math.min(1, k * 1.5);
    this.tilt.lerp(this.tiltTarget, Math.min(1, k * 0.4));

    const nSteps = SHOTS.length;
    const raw = this.tSmooth * (nSteps - 1);
    const i0 = Math.min(nSteps - 2, Math.floor(raw));
    const local = Math.min(1, Math.max(0, raw - i0));
    const e = local * local * (3 - 2 * local); // smoothstep between shots

    const a = SHOTS[i0], b = SHOTS[i0 + 1];
    const zoomOut = this.narrow ? 1.42 : 1;
    this.camPos.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], e) * zoomOut,
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], e) * zoomOut,
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], e) * zoomOut
    );
    this.camLook.set(
      THREE.MathUtils.lerp(a.look[0], b.look[0], e),
      THREE.MathUtils.lerp(a.look[1], b.look[1], e),
      THREE.MathUtils.lerp(a.look[2], b.look[2], e)
    );

    this.camera.position.copy(this.camPos);
    this.camera.position.x += this.tilt.x * 2.4;
    this.camera.position.y += this.tilt.y * 1.6;
    this.camera.lookAt(this.camLook);

    // explosion: modules separate through the middle of the story, reassemble at the end
    const explode = Math.sin(Math.min(1, Math.max(0, (this.tSmooth - 0.04) / 0.86)) * Math.PI);
    const activeStep = raw;

    // The first and last shots are overviews — light the whole assembly there.
    // In between, only the stage being narrated.
    const overview = Math.max(0, 1 - activeStep) + Math.max(0, activeStep - 4);

    this.modules.forEach((m) => {
      const d = Math.abs(activeStep - m.step);
      const act = Math.max(overview * 0.62, Math.max(0, 1 - d * 0.85));
      m.uniforms.uActive.value += (act - m.uniforms.uActive.value) * Math.min(1, k * 0.7);
      m.uniforms.uTime.value = this.time;

      const dir = m.home.clone().normalize();
      const sep = explode * (m.step === 1 ? 1.5 : m.step === 4 ? 1.2 : 0.45);
      m.group.position.copy(m.home).addScaledVector(dir, sep);
      m.group.position.y += Math.sin(this.time * 0.55 + m.home.x) * 0.11;

      // plates yaw slightly toward the camera as they light up
      m.group.rotation.y = (this.camera.position.x - m.group.position.x) * 0.006 + explode * 0.10;
      m.label.material.opacity = 0.25 + m.uniforms.uActive.value * 0.75;
    });

    this.flowU.uTime.value = this.time;
    this.flowU.uActive.value = 0.3 + Math.sin(Math.min(1, this.tSmooth * 1.4) * Math.PI) * 0.7;

    this.stars.rotation.z = this.time * 0.005;

    if (this.useBloom) this.bloom.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }
}
