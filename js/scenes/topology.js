import * as THREE from '../../vendor/three.module.js';
import { ELECTRODES, BANDS, connectivity, nodeStrength } from '../data/eeg.js';

/**
 * The band-wise connectivity graph.
 *
 * 19 electrodes in true 10-20 positions. Each frequency band gets its own
 * graph — which is the whole architectural argument: delta and gamma carry
 * opposite discriminative patterns, so fusing their adjacency matrices early
 * cancels the signal. Switch bands and watch the topology genuinely change.
 */

const NODE_VERT = /* glsl */ `
uniform float uTime;
attribute float aStrength;
attribute float aHot;
attribute float aSeed;
varying float vS;
varying float vHot;
void main() {
  vS = aStrength;
  vHot = aHot;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float breathe = 0.85 + 0.15 * sin(uTime * 1.6 + aSeed * 6.28);
  gl_PointSize = (7.0 + aStrength * 22.0 + aHot * 16.0) * breathe * (26.0 / max(-mv.z, 1.0));
  gl_Position = projectionMatrix * mv;
}`;

const NODE_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vS;
varying float vHot;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.42, 0.0, d);
  float ring = smoothstep(0.86, 0.62, d) * smoothstep(0.44, 0.60, d);
  float halo = pow(1.0 - d, 3.0) * 0.55;
  vec3 c = mix(uColor, vec3(1.0), 0.35 + vHot * 0.5);
  float i = core * (0.7 + vS * 0.8 + vHot) + ring * (0.5 + vHot) + halo * (0.4 + vS);
  gl_FragColor = vec4(c * i, 1.0);
}`;

const EDGE_VERT = /* glsl */ `
uniform float uTime;
uniform float uReveal;
attribute float aT;
attribute float aW;
attribute float aSeed;
attribute float aHot;
varying float vI;
varying float vHot;
void main() {
  float appear = smoothstep(aSeed * 0.55, aSeed * 0.55 + 0.45, uReveal);
  float head = fract(uTime * 0.22 + aSeed);
  float d = abs(aT - head); d = min(d, 1.0 - d);
  float pulse = exp(-pow(d * 10.0, 2.0));
  vI = appear * ((aW - 0.40) * 1.75 + pulse * 2.4 * aW + aHot * 1.6);
  vHot = aHot;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const EDGE_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vI;
varying float vHot;
void main() {
  if (vI <= 0.003) discard;
  vec3 c = mix(uColor, vec3(1.0, 0.98, 0.92), vHot * 0.6);
  gl_FragColor = vec4(c * vI, 1.0);
}`;

const R = 6.0;
const SEG = 10;

export class Topology {
  constructor(canvas, tier, onHover) {
    this.canvas = canvas;
    this.onHover = onHover;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1.2 : 1.7));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 0.8, 23.5);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.time = 0;
    this.reveal = 0;
    this.band = BANDS[4];       // gamma — where the attribution weight lands
    this.hoverIdx = -1;
    this.spin = 0;
    this.spinVel = 0.16;
    this.drag = null;
    this.pitch = 0.22;
    this.color = new THREE.Color(this.band.color);

    this._buildShell();
    this._buildNodes();
    this._buildEdges();
    this._buildLabels();
    this.setBand(this.band.key);

    this._bindInput();
    this.resize();
  }

  _buildShell() {
    const geo = new THREE.IcosahedronGeometry(R * 1.06, 2);
    const wire = new THREE.WireframeGeometry(geo);
    this.shell = new THREE.LineSegments(wire, new THREE.LineBasicMaterial({
      color: 0x2a3f66, transparent: true, opacity: 0.13, depthWrite: false,
    }));
    this.root.add(this.shell);

    // nose direction marker, so the orientation of the head is readable
    const nose = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, R * 1.02, 0.6), new THREE.Vector3(0, R * 1.22, 0), new THREE.Vector3(0, R * 1.02, -0.6),
    ]);
    this.root.add(new THREE.Line(nose, new THREE.LineBasicMaterial({ color: 0x4a6da8, transparent: true, opacity: 0.4 })));
  }

  _nodePos(i) {
    const p = ELECTRODES[i].pos;
    // three.js is y-up; our data is z-up (superior)
    return new THREE.Vector3(p[0] * R, p[2] * R, -p[1] * R);
  }

  _buildNodes() {
    const n = ELECTRODES.length;
    const pos = new Float32Array(n * 3);
    this.nodeVecs = [];
    for (let i = 0; i < n; i++) {
      const v = this._nodePos(i);
      this.nodeVecs.push(v);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aStrength', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aHot', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => i * 0.37), 1));

    this.nodeU = { uTime: { value: 0 }, uColor: { value: this.color.clone() } };
    this.nodes = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: NODE_VERT, fragmentShader: NODE_FRAG, uniforms: this.nodeU,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    this.root.add(this.nodes);
  }

  _buildEdges() {
    this.edgeU = { uTime: { value: 0 }, uReveal: { value: 0 }, uColor: { value: this.color.clone() } };
    this.edges = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
      vertexShader: EDGE_VERT, fragmentShader: EDGE_FRAG, uniforms: this.edgeU,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    this.edges.frustumCulled = false;
    this.root.add(this.edges);
  }

  _buildLabels() {
    this.labels = ELECTRODES.map((e, i) => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 64;
      const x = c.getContext('2d');
      x.font = '500 34px "JetBrains Mono", monospace';
      x.fillStyle = '#ffffff';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(e.name, 64, 32);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false,
      }));
      s.scale.set(0.98, 0.49, 1);
      s.position.copy(this.nodeVecs[i]).multiplyScalar(1.16);
      this.root.add(s);
      return s;
    });
  }

  setBand(key) {
    const band = BANDS.find((b) => b.key === key) || BANDS[0];
    this.band = band;
    this.color.set(band.color);
    this.nodeU.uColor.value.copy(this.color);
    this.edgeU.uColor.value.copy(this.color);

    const edges = connectivity(key);
    this.edgeList = edges;
    const strength = nodeStrength(edges);
    this.strength = strength;

    const sa = this.nodes.geometry.getAttribute('aStrength');
    for (let i = 0; i < strength.length; i++) sa.array[i] = strength[i];
    sa.needsUpdate = true;

    // rebuild the arc geometry for this band
    const verts = [], ts = [], ws = [], seeds = [], hots = [];
    this.edgeSpans = [];

    edges.forEach((e, k) => {
      const a = this.nodeVecs[e.i], b = this.nodeVecs[e.j];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.setLength(R * (1 + a.distanceTo(b) / (R * 3.4)));
      const seed = (k * 0.618034) % 1;
      const start = ts.length;

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
          ws.push(e.w, e.w);
          seeds.push(seed, seed);
          hots.push(0, 0);
        }
        prev = p;
      }
      this.edgeSpans.push({ i: e.i, j: e.j, from: start, to: ts.length });
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
    g.setAttribute('aW', new THREE.Float32BufferAttribute(ws, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    g.setAttribute('aHot', new THREE.Float32BufferAttribute(hots, 1));

    this.edges.geometry.dispose();
    this.edges.geometry = g;
    this.reveal = 0;
    this.edgeU.uReveal.value = 0;

    return { edges: edges.length, band };
  }

  _setHover(idx) {
    if (idx === this.hoverIdx) return;
    this.hoverIdx = idx;

    const hotN = this.nodes.geometry.getAttribute('aHot');
    for (let i = 0; i < hotN.array.length; i++) hotN.array[i] = 0;
    const hotE = this.edges.geometry.getAttribute('aHot');
    hotE.array.fill(0);

    if (idx >= 0) {
      hotN.array[idx] = 1;
      this.edgeSpans.forEach((s) => {
        if (s.i === idx || s.j === idx) {
          for (let k = s.from; k < s.to; k++) hotE.array[k] = 1;
          hotN.array[s.i === idx ? s.j : s.i] = Math.max(hotN.array[s.i === idx ? s.j : s.i], 0.45);
        }
      });
    }
    hotN.needsUpdate = true;
    hotE.needsUpdate = true;

    if (this.onHover) {
      const degree = idx < 0 ? 0 : this.edgeSpans.filter((s) => s.i === idx || s.j === idx).length;
      this.onHover(idx < 0 ? null : { ...ELECTRODES[idx], degree, strength: this.strength[idx] });
    }
  }

  _bindInput() {
    const c = this.canvas;
    const ndc = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    ray.params.Points.threshold = 0.55;

    const move = (ev) => {
      const r = c.getBoundingClientRect();
      const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);

      if (this.drag) {
        this.spin += (cx - this.drag.x) * 0.006;
        this.pitch = Math.max(-0.9, Math.min(0.9, this.pitch + (cy - this.drag.y) * 0.004));
        this.drag = { x: cx, y: cy };
        this.spinVel = 0;
        return;
      }

      ray.setFromCamera(ndc, this.camera);
      const hits = ray.intersectObject(this.nodes, false);
      this._setHover(hits.length ? hits[0].index : -1);
    };

    c.addEventListener('pointermove', move);
    c.addEventListener('pointerleave', () => { this._setHover(-1); this.drag = null; this.spinVel = 0.16; });
    c.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture?.(e.pointerId); });
    c.addEventListener('pointerup', () => { this.drag = null; this.spinVel = 0.16; });
    c.style.touchAction = 'pan-y';
  }

  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.time += dt;
    this.reveal = Math.min(1.55, this.reveal + dt * 1.05);
    this.edgeU.uReveal.value = this.reveal;
    this.edgeU.uTime.value = this.time;
    this.nodeU.uTime.value = this.time;

    if (!this.drag) this.spin += this.spinVel * dt;
    this.root.rotation.y = this.spin;
    this.root.rotation.x = this.pitch;

    // labels fade in on hover, plus a permanent dim state for the hubs
    this.labels.forEach((s, i) => {
      const want = this.hoverIdx === i ? 1 : (this.strength?.[i] > 0.94 ? 0.4 : 0);
      s.material.opacity += (want - s.material.opacity) * Math.min(1, dt * 8);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
