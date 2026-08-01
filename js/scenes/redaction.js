/* ============================================================
   redaction.js — the centrepiece.

   A multi-stage system rendered in three dimensions with every label
   struck out. The viewer sees the number of stages, the direction of
   flow and where it branches; they see nothing that identifies any
   part of it.

   IMPORTANT, and the reason this file is written the way it is:
   there are no component names in here to redact. The labels are
   generated as abstract bars and glyph-shaped rectangles, so nothing
   confidential exists in the source, the DOM or the network tab. The
   hover roles are deliberately generic. Keep it that way.

   The only legible plate is the input, because the input is a public
   dataset and its properties are published.
   ============================================================ */

import * as THREE from '../../vendor/three.module.js';

const INK = 0x0a0908;
const BRASS = 0xc69a5e;

/* Layout: five inputs → one weighting stage → two combining stages →
   two outputs. Shape and flow only. */
const LAYOUT = [
  { x: -10.5, ys: [-3.4, -1.7, 0, 1.7, 3.4], w: 2.6, h: 1.05, role: 'Input channel' },
  { x:  -4.6, ys: [0],                        w: 3.4, h: 4.6,  role: 'Weighting stage' },
  { x:   1.0, ys: [-1.5, 1.5],                w: 3.0, h: 2.1,  role: 'Combining stage' },
  { x:   6.8, ys: [-1.5, 1.5],                w: 2.4, h: 1.5,  role: 'Output' },
];

const seed = (n) => {
  const s = Math.sin(n * 91.7) * 43758.5453;
  return s - Math.floor(s);
};

/* ---------------------------------------------------------- textures */

/* Bars: what a struck-out line of text looks like. Nothing underneath. */
function barTexture(key, w, h) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.max(48, Math.round(256 * (h / w)));
  const x = c.getContext('2d');
  const pad = 20;
  const rows = c.height > 150 ? 4 : c.height > 90 ? 2 : 1;
  const rh = Math.min(15, (c.height - pad * 2) / (rows * 1.9));

  x.fillStyle = '#020202';
  let y = (c.height - (rows * rh * 1.85 - rh * 0.85)) / 2;
  for (let r = 0; r < rows; r++) {
    let cx = pad;
    const limit = c.width - pad;
    let i = 0;
    while (cx < limit) {
      const bw = 16 + seed(key + r * 7.1 + i * 3.3) * 46;
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

/* What sits behind the bars: shapes with the rhythm of words and the
   information content of none. */
function glyphTexture(key, w, h) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.max(48, Math.round(256 * (h / w)));
  const x = c.getContext('2d');
  const pad = 20;
  const rows = c.height > 150 ? 4 : c.height > 90 ? 2 : 1;
  const rh = Math.min(15, (c.height - pad * 2) / (rows * 1.9));

  x.fillStyle = 'rgba(232,200,158,0.92)';
  let y = (c.height - (rows * rh * 1.85 - rh * 0.85)) / 2;
  for (let r = 0; r < rows; r++) {
    let cx = pad;
    const limit = c.width - pad;
    let i = 0;
    while (cx < limit) {
      const gw = 3 + seed(key * 1.7 + r * 2.9 + i * 5.1) * 6;
      if (cx + gw < limit) x.fillRect(cx, y + rh * 0.18, gw, rh * 0.64);
      cx += gw + 3.2;
      i++;
    }
    y += rh * 1.85;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* The one plate that is allowed to be read. */
function plainTexture(lines, w, h) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.max(96, Math.round(512 * (h / w)));
  const x = c.getContext('2d');
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const size = 30;
  const total = lines.length * size * 1.35;
  let y = c.height / 2 - total / 2 + size * 0.68;
  lines.forEach((ln, i) => {
    x.font = `${i === 0 ? 500 : 400} ${i === 0 ? size : size * 0.8}px "JetBrains Mono", monospace`;
    x.fillStyle = i === 0 ? 'rgba(236,229,218,0.95)' : 'rgba(198,154,94,0.85)';
    x.fillText(ln, c.width / 2, y);
    y += size * 1.35;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------------------------------------------------- scene */

export class Redaction {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.onRole = opts.onRole || (() => {});
    this.tier = opts.tier || 'high';

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.tier === 'high',
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(INK, 0);
    this.dprCap = this.tier === 'high' ? 1.85 : 1.25;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(INK, 0.026);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 140);

    this.group = new THREE.Group();
    /* The layout's own centre of mass sits left of the origin; nudge the
       whole assembly back to frame centre, and down clear of the copy. */
    this.group.position.set(3.2, -2.7, 0);
    this.scene.add(this.group);

    this.blocks = [];
    this.pick = [];
    this.progress = 0;
    this.px = 0; this.py = 0;      // pointer parallax, smoothed
    this.tx = 0; this.ty = 0;
    this.hovered = null;
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2(-2, -2);

    this.build();
    this.resize();

    this._move = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      this.ndc.set(this.tx, -this.ty);
    };
    this._leave = () => { this.ndc.set(-2, -2); this.tx = 0; this.ty = 0; };
    window.addEventListener('pointermove', this._move, { passive: true });
    this.canvas.addEventListener('pointerleave', this._leave);
  }

  build() {
    /* A soft source behind the assembly. Materials here are unlit by
       design — crisp lines read better than shaded boxes — so the sense
       of light comes from this instead. */
    const gc = document.createElement('canvas');
    gc.width = gc.height = 256;
    const gx = gc.getContext('2d');
    const rg = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(198,154,94,0.55)');
    rg.addColorStop(0.45, 'rgba(150,108,62,0.16)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    gx.fillStyle = rg;
    gx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(gc);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 32),
      new THREE.MeshBasicMaterial({
        map: glowTex, transparent: true, opacity: 0.9,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    this.glow.position.set(-2, 0, -9);
    this.group.add(this.glow);

    const edgeMat = new THREE.LineBasicMaterial({
      color: BRASS, transparent: true, opacity: 0.7,
    });
    /* The plate is deliberately lighter than the page. A redaction only
       reads as a redaction if the bar is darker than what it covers. */
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x2a2419 });

    let key = 1;
    LAYOUT.forEach((stage, si) => {
      stage.ys.forEach((y, bi) => {
        const depth = 0.42;
        const g = new THREE.BoxGeometry(stage.w, stage.h, depth);
        const mesh = new THREE.Mesh(g, faceMat);
        mesh.position.set(stage.x, y, 0);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(g), edgeMat.clone()
        );
        mesh.add(edges);

        const legible = si === 0 && bi === 2;
        const pw = stage.w * 0.82, ph = stage.h * 0.62;

        /* glyph layer, then the bar that covers it */
        const glyph = new THREE.Mesh(
          new THREE.PlaneGeometry(pw, ph),
          new THREE.MeshBasicMaterial({
            map: legible
              ? plainTexture(['BEHIND-THE-EAR EEG', 'PUBLIC DATASET'], pw, ph)
              : glyphTexture(key, pw, ph),
            transparent: true,
            opacity: legible ? 0.95 : 0,
            depthWrite: false,
          })
        );
        glyph.position.z = depth / 2 + 0.012;
        mesh.add(glyph);

        let bar = null;
        if (!legible) {
          bar = new THREE.Mesh(
            new THREE.PlaneGeometry(pw, ph),
            new THREE.MeshBasicMaterial({
              map: barTexture(key, pw, ph),
              transparent: true,
              opacity: 1,
              depthWrite: false,
            })
          );
          bar.position.z = depth / 2 + 0.026;
          mesh.add(bar);
        }

        this.group.add(mesh);
        const b = {
          mesh, edges, glyph, bar, legible, stage: si,
          role: legible ? 'Input · public dataset' : stage.role,
          home: mesh.position.clone(),
          phase: seed(key * 3.1) * Math.PI * 2,
          lift: 0, hover: 0,
        };
        this.blocks.push(b);
        this.pick.push(mesh);
        mesh.userData.block = b;
        key++;
      });
    });

    /* Connections between consecutive stages, plus a long skip path —
       flow direction and branching, nothing more. */
    this.edgesList = [];
    const positions = [];
    const stageBlocks = [];
    let idx = 0;
    LAYOUT.forEach((stage) => {
      const arr = [];
      stage.ys.forEach(() => arr.push(this.blocks[idx++]));
      stageBlocks.push(arr);
    });

    for (let s = 0; s < stageBlocks.length - 1; s++) {
      for (const a of stageBlocks[s]) {
        for (const b of stageBlocks[s + 1]) {
          const from = a.home.clone().setX(a.home.x + LAYOUT[s].w / 2);
          const to = b.home.clone().setX(b.home.x - LAYOUT[s + 1].w / 2);
          this.edgesList.push([from, to]);
          positions.push(from.x, from.y, from.z, to.x, to.y, to.z);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.links = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: BRASS, transparent: true, opacity: 0.13 })
    );
    this.group.add(this.links);

    /* Signal moving through the system. */
    const N = this.tier === 'high' ? 150 : 70;
    const pts = new Float32Array(N * 3);
    this.flow = [];
    for (let i = 0; i < N; i++) {
      this.flow.push({
        e: Math.floor(seed(i * 1.31) * this.edgesList.length),
        t: seed(i * 7.7),
        v: 0.13 + seed(i * 2.9) * 0.2,
      });
    }
    const flowGeo = new THREE.BufferGeometry();
    flowGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this.particles = new THREE.Points(
      flowGeo,
      new THREE.PointsMaterial({
        color: 0xe2c093, size: 0.07, transparent: true, opacity: 0.7,
        sizeAttenuation: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.group.add(this.particles);

    /* A floor of faint rules, for depth reference. */
    const fl = [];
    for (let i = -8; i <= 8; i++) {
      fl.push(-16, -6.4, i * 1.6, 12, -6.4, i * 1.6);
    }
    const flGeo = new THREE.BufferGeometry();
    flGeo.setAttribute('position', new THREE.Float32BufferAttribute(fl, 3));
    this.floor = new THREE.LineSegments(
      flGeo, new THREE.LineBasicMaterial({ color: BRASS, transparent: true, opacity: 0.055 })
    );
    this.group.add(this.floor);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    /* Narrow viewports need a wider field or the outer blocks leave frame. */
    this.camera.fov = w / h < 1 ? 52 : 38;
    this.camera.updateProjectionMatrix();

    /* On a tall viewport the flow is turned to run down the screen
       instead of across it. The plates are counter-rotated so the
       redaction bars stay horizontal and still read as struck-out text. */
    const narrow = w / h < 0.95;
    if (narrow !== this.narrow) {
      this.narrow = narrow;
      this.group.rotation.z = narrow ? -Math.PI / 2 : 0;
      this.group.scale.setScalar(narrow ? 0.63 : 1);
      this.group.position.set(narrow ? 0.3 : 3.2, narrow ? -3.2 : -2.7, 0);
      for (const b of this.blocks) {
        b.mesh.rotation.z = narrow ? Math.PI / 2 : 0;
        /* Turned on its side, the input fan's spacing becomes horizontal
           and is narrower than the plates; slim them so they separate. */
        b.mesh.scale.x = narrow && b.stage === 0 ? 0.6 : 1;
      }
      if (this.glow) this.glow.scale.setScalar(narrow ? 1.15 : 1);
    }
  }

  /* progress: 0 when the section enters, 1 when it leaves. */
  setProgress(p) { this.progress = Math.min(1, Math.max(0, p)); }

  frame(t, dt) {
    const p = this.progress;

    /* Scroll drives a single dolly-in with a slow arc across it. */
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const dist = this.narrow ? 25 - e * 3 : 29 - e * 7;
    const ang = (this.narrow ? -0.18 : -0.34) + e * (this.narrow ? 0.3 : 0.6);
    this.px += (this.tx - this.px) * Math.min(1, dt * 2.5);
    this.py += (this.ty - this.py) * Math.min(1, dt * 2.5);

    this.camera.position.set(
      Math.sin(ang) * dist + this.px * 1.4,
      1.2 - e * 0.4 - this.py * 1.2,
      Math.cos(ang) * dist
    );
    /* Aimed above the assembly's centre so it renders low in frame,
       clear of the copy that sits over the top-left of the canvas. */
    this.camera.lookAt(0, this.narrow ? -0.4 : -1.05, 0);

    this.group.rotation.y = Math.sin(t * 0.09) * 0.035;

    /* Proximity: as the camera closes, the bars retract just enough to
       show there is something under them — then snap back before any
       of it could be read. Per-block offsets so it is not a chorus. */
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      const local = Math.min(1, Math.max(0, (e - 0.18 - (i % 5) * 0.055) / 0.42));
      const snap = local > 0.78 ? 1 - (local - 0.78) / 0.22 : 1;
      const open = local * snap;

      b.mesh.position.y = b.home.y + Math.sin(t * 0.5 + b.phase) * 0.045;
      b.hover += ((this.hovered === b ? 1 : 0) - b.hover) * Math.min(1, dt * 8);

      if (!b.legible) {
        b.glyph.material.opacity = open * 0.42 + b.hover * 0.12;
        b.bar.scale.x = 1 - open * 0.11;
        b.bar.material.opacity = 1 - open * 0.06;
      }
      b.edges.material.opacity = 0.3 + b.hover * 0.5 + (b.legible ? 0.22 : 0);
      b.mesh.position.z = b.home.z + b.hover * 0.35;
    }

    /* Flow along the links. */
    const pos = this.particles.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < this.flow.length; i++) {
      const f = this.flow[i];
      f.t += f.v * dt;
      if (f.t > 1) { f.t -= 1; f.e = (f.e + 7) % this.edgesList.length; }
      const [a, b] = this.edgesList[f.e];
      const k = f.t;
      arr[i * 3] = a.x + (b.x - a.x) * k;
      arr[i * 3 + 1] = a.y + (b.y - a.y) * k;
      arr[i * 3 + 2] = a.z + (b.z - a.z) * k;
    }
    pos.needsUpdate = true;

    /* Hover — roles only, never identity. */
    if (this.ndc.x > -1.5) {
      this.ray.setFromCamera(this.ndc, this.camera);
      const hit = this.ray.intersectObjects(this.pick, false)[0];
      const next = hit ? hit.object.userData.block : null;
      if (next !== this.hovered) {
        this.hovered = next;
        this.onRole(next ? next.role : null);
      }
    } else if (this.hovered) {
      this.hovered = null;
      this.onRole(null);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('pointermove', this._move);
    this.canvas.removeEventListener('pointerleave', this._leave);
    this.renderer.dispose();
  }
}
