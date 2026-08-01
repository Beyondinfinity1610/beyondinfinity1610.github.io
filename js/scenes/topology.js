import * as THREE from '../../vendor/three.module.js';
import { ELECTRODES, connectivity } from '../data/eeg.js';

/**
 * The montage, drawn as a network.
 *
 * Deliberately quiet: thin brass edges, small nodes, a slow rotation and a
 * single travelling highlight. No bloom, no glow stack — at this brightness
 * restraint reads as craft and spectacle would read as a demo.
 */

const NODE_VERT = /* glsl */ `
uniform float uTime;
attribute float aSeed;
attribute float aHot;
varying float vHot;
void main() {
  vHot = aHot;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float breathe = 0.9 + 0.1 * sin(uTime * 0.8 + aSeed * 6.28);
  gl_PointSize = (4.6 + aHot * 7.0) * breathe * (34.0 / max(-mv.z, 1.0));
  gl_Position = projectionMatrix * mv;
}`;

const NODE_FRAG = /* glsl */ `
varying float vHot;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.55, 0.0, d);
  float ring = smoothstep(0.98, 0.72, d) * smoothstep(0.56, 0.74, d);
  vec3 warm = vec3(0.90, 0.74, 0.50);
  vec3 lit  = vec3(1.00, 0.94, 0.86);
  vec3 c = mix(warm, lit, vHot);
  gl_FragColor = vec4(c * (core * (1.0 + vHot * 0.8) + ring * 0.7), 1.0);
}`;

const EDGE_VERT = /* glsl */ `
uniform float uTime;
uniform float uReveal;
attribute float aT;
attribute float aW;
attribute float aSeed;
attribute float aHot;
varying float vI;
void main() {
  float appear = smoothstep(aSeed * 0.6, aSeed * 0.6 + 0.5, uReveal);
  // one slow packet per edge, most of the time invisible
  float head = fract(uTime * 0.09 + aSeed);
  float d = abs(aT - head); d = min(d, 1.0 - d);
  float pulse = exp(-pow(d * 13.0, 2.0));
  vI = appear * (0.26 + (aW - 0.55) * 0.78 + pulse * 0.95 + aHot * 0.9);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const EDGE_FRAG = /* glsl */ `
varying float vI;
void main() {
  if (vI <= 0.004) discard;
  gl_FragColor = vec4(vec3(0.78, 0.61, 0.38) * vI, 1.0);
}`;

const R = 6.0;
const SEG = 9;

export class Topology {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.camera.position.set(0, 1.5, 21);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.time = 0;
    this.reveal = 0;
    this.hoverIdx = -1;
    this.spin = -0.5;
    this.spinVel = 0.055;
    this.pitch = 0.14;
    this.drag = null;

    this._buildShell();
    this._buildNodes();
    this._buildEdges();
    this._buildLabels();
    this._bind();
    this.resize();
  }

  _nodePos(i) {
    const p = ELECTRODES[i].pos;
    return new THREE.Vector3(p[0] * R, p[2] * R, -p[1] * R);
  }

  _buildShell() {
    const wire = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 1.05, 2));
    this.root.add(new THREE.LineSegments(wire, new THREE.LineBasicMaterial({
      color: 0x6b5540, transparent: true, opacity: 0.075, depthWrite: false,
    })));
  }

  _buildNodes() {
    const n = ELECTRODES.length;
    const pos = new Float32Array(n * 3);
    this.nodeVecs = [];
    for (let i = 0; i < n; i++) {
      const v = this._nodePos(i);
      this.nodeVecs.push(v);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aHot', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => i * 0.41), 1));

    this.nodeU = { uTime: { value: 0 } };
    this.nodes = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: NODE_VERT, fragmentShader: NODE_FRAG, uniforms: this.nodeU,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    this.root.add(this.nodes);
  }

  _buildEdges() {
    const edges = connectivity();
    const verts = [], ts = [], ws = [], seeds = [], hots = [];
    this.spans = [];

    edges.forEach((e, k) => {
      const a = this.nodeVecs[e.i], b = this.nodeVecs[e.j];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.setLength(R * (1 + a.distanceTo(b) / (R * 4.2)));
      const seed = (k * 0.618034) % 1;
      const from = ts.length;

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
      this.spans.push({ i: e.i, j: e.j, from, to: ts.length });
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
    g.setAttribute('aW', new THREE.Float32BufferAttribute(ws, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    g.setAttribute('aHot', new THREE.Float32BufferAttribute(hots, 1));

    this.edgeU = { uTime: { value: 0 }, uReveal: { value: 0 } };
    this.edges = new THREE.LineSegments(g, new THREE.ShaderMaterial({
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
      x.font = '400 30px "JetBrains Mono", monospace';
      x.fillStyle = '#f0e6d8';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(e.name, 64, 32);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false,
      }));
      s.scale.set(0.92, 0.46, 1);
      s.position.copy(this.nodeVecs[i]).multiplyScalar(1.18);
      this.root.add(s);
      return s;
    });
  }

  _setHover(idx) {
    if (idx === this.hoverIdx) return;
    this.hoverIdx = idx;
    const hn = this.nodes.geometry.getAttribute('aHot');
    const he = this.edges.geometry.getAttribute('aHot');
    hn.array.fill(0);
    he.array.fill(0);
    if (idx >= 0) {
      hn.array[idx] = 1;
      this.spans.forEach((s) => {
        if (s.i === idx || s.j === idx) {
          for (let k = s.from; k < s.to; k++) he.array[k] = 1;
          const other = s.i === idx ? s.j : s.i;
          hn.array[other] = Math.max(hn.array[other], 0.5);
        }
      });
    }
    hn.needsUpdate = true;
    he.needsUpdate = true;
  }

  _bind() {
    const c = this.canvas;
    const ndc = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    ray.params.Points.threshold = 0.5;

    const at = (ev) => [ev.clientX, ev.clientY];

    c.addEventListener('pointermove', (ev) => {
      const [cx, cy] = at(ev);
      if (this.drag) {
        this.spin += (cx - this.drag[0]) * 0.006;
        this.pitch = Math.max(-0.8, Math.min(0.8, this.pitch + (cy - this.drag[1]) * 0.004));
        this.drag = [cx, cy];
        return;
      }
      const r = c.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hits = ray.intersectObject(this.nodes, false);
      this._setHover(hits.length ? hits[0].index : -1);
    });

    c.addEventListener('pointerdown', (ev) => {
      this.drag = at(ev);
      this.spinVel = 0;
      c.setPointerCapture?.(ev.pointerId);
      c.style.cursor = 'grabbing';
    });
    const release = () => { this.drag = null; this.spinVel = 0.055; c.style.cursor = 'grab'; };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointerleave', () => { release(); this._setHover(-1); });
    c.style.cursor = 'grab';
    c.style.touchAction = 'pan-y';
  }

  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < 760 ? 52 : 38;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    this.time += dt;
    this.reveal = Math.min(1.6, this.reveal + dt * 0.5);
    this.edgeU.uReveal.value = this.reveal;
    this.edgeU.uTime.value = this.time;
    this.nodeU.uTime.value = this.time;

    if (!this.drag) this.spin += this.spinVel * dt;
    this.root.rotation.y = this.spin;
    this.root.rotation.x = this.pitch;

    this.labels.forEach((s, i) => {
      const want = this.hoverIdx === i ? 0.95 : 0;
      s.material.opacity += (want - s.material.opacity) * Math.min(1, dt * 9);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
