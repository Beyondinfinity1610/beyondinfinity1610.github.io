/* ============================================================
   One chamber, flown through once.

   The camera's depth is the scroll position: z = -(scroll/doc) *
   DEPTH. Every set piece is anchored to the section it belongs
   to, so the page and the space stay locked together no matter
   how the layout reflows.

   Three set pieces, and nothing decorative between them:
     · the trace      — what he works on
     · the topology   — real shape, every label struck out
     · the field      — one point per run, no axes, no values
   ============================================================ */

import * as THREE from '../vendor/three.module.js';

const site = window.__site;
const canvas = document.getElementById('world');
if (canvas && site) boot();

function boot() {
  // ── device tier ───────────────────────────────────────────
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 760;
  const low = mem <= 4 || cores <= 4 || (coarse && narrow);

  let gl;
  try {
    gl = new THREE.WebGLRenderer({
      canvas, antialias: !low, alpha: true,
      powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false
    });
  } catch (e) {
    return; // no WebGL — the page is complete without it
  }

  const DPR_CAP = low ? 1.35 : 1.75;
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  gl.setSize(window.innerWidth, window.innerHeight, false);
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  // the fog is a shade cooler than the page, so distance recedes cool while
  // everything near the camera stays warm. It is the whole depth cue.
  scene.fog = new THREE.FogExp2(0x080a0c, 0.0042);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.6, 1600);

  const DEPTH = 1500;        // world units spanned by the whole document
  const BONE  = new THREE.Color(0xece7de);
  const BRASS = new THREE.Color(0x4fb0a8);   // the accent — phosphor teal, not amber

  // depth of a document position, in world units
  const zAt = (px) => -(px / Math.max(1, site.doc)) * DEPTH;
  const centreOf = (id, fallback) => {
    const s = site.stations[id];
    return s ? s.top + s.height * 0.5 : fallback;
  };

  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  // ── a soft round sprite, drawn once ───────────────────────
  function dotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const DOT = dotTexture();

  // ══════════════════════════════════════════════════════════
  //  atmosphere — motes that wrap around the camera forever
  // ══════════════════════════════════════════════════════════
  const MOTES = low ? 900 : 2200;
  const MOTE_SPAN = 620;
  const moteGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(MOTES * 3);
    const s = new Float32Array(MOTES);
    for (let i = 0; i < MOTES; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 700;
      p[i * 3 + 1] = (Math.random() - 0.5) * 460;
      p[i * 3 + 2] = (Math.random() - 0.5) * MOTE_SPAN;
      s[i] = 0.5 + Math.random() * 1.7;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    moteGeo.setAttribute('aScale', new THREE.BufferAttribute(s, 1));
  }
  const moteMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: DOT },
      uTime: { value: 0 },
      uProj: { value: 1000 },
      uColor: { value: new THREE.Color(0xb9a68c) },
      uOpacity: { value: 0.0 }
    },
    vertexShader: `
      attribute float aScale;
      uniform float uTime; uniform float uProj;
      varying float vFade;
      void main() {
        vec3 pos = position;
        pos.x += sin(uTime * 0.11 + position.z * 0.02) * 6.0;
        pos.y += cos(uTime * 0.09 + position.x * 0.015) * 5.0;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float d = -mv.z;
        vFade = smoothstep(600.0, 90.0, d) * smoothstep(2.0, 26.0, d);
        gl_PointSize = aScale * 0.30 * uProj / max(d, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity;
      varying float vFade;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(uColor, t.a * vFade * uOpacity);
        if (gl_FragColor.a < 0.01) discard;
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);

  // ══════════════════════════════════════════════════════════
  //  the bezel — a far instrument ring, held ahead of the camera
  // ══════════════════════════════════════════════════════════
  const bezel = new THREE.Group();
  {
    const ring = (radius, opacity, segments) => {
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({ color: BRASS, transparent: true, opacity });
      return new THREE.Line(g, m);
    };
    bezel.add(ring(68, 0.5, 220));
    bezel.add(ring(84, 0.18, 220));

    // graduations, like a tachometer face
    const tickPts = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const inner = i % 8 === 0 ? 71 : 74;
      tickPts.push(new THREE.Vector3(Math.cos(a) * inner, Math.sin(a) * inner, 0));
      tickPts.push(new THREE.Vector3(Math.cos(a) * 78, Math.sin(a) * 78, 0));
    }
    const tg = new THREE.BufferGeometry().setFromPoints(tickPts);
    bezel.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({
      color: BONE, transparent: true, opacity: 0.1
    })));
  }
  scene.add(bezel);

  // Three rings on three axes, tumbling slowly inside the bezel — the
  // instrument the whole page is about, sitting behind the opening line.
  const gimbal = new THREE.Group();
  const gimbalRings = [];
  {
    const hoop = (radius, color) => {
      const pts = [];
      for (let i = 0; i <= 150; i++) {
        const a = (i / 150) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
      );
    };
    [[47, 'x', 0.34, BRASS], [35, 'y', 0.26, BONE], [23, 'z', 0.20, BRASS]]
      .forEach(([r, axis, base, color], i) => {
        const pivot = new THREE.Group();
        const ring = hoop(r, color);
        if (axis === 'x') ring.rotation.y = Math.PI / 2;
        if (axis === 'y') ring.rotation.x = Math.PI / 2;
        pivot.add(ring);
        gimbal.add(pivot);
        gimbalRings.push({ pivot, axis, mat: ring.material, base, speed: 0.13 + i * 0.09 });
      });
    bezel.add(gimbal);
  }

  // ══════════════════════════════════════════════════════════
  //  the trace — a travelling waveform running away into depth
  // ══════════════════════════════════════════════════════════
  const TRACE_N = 420;
  const TRACE_LEN = 760;

  // a line that fades out both very near the camera and far away, so it
  // never arrives as a hard slash across the type
  function traceMaterial(color, opacity) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity }
      },
      vertexShader: `
        varying float vD;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uOpacity;
        varying float vD;
        void main() {
          float a = smoothstep(70.0, 260.0, vD) * smoothstep(900.0, 420.0, vD);
          gl_FragColor = vec4(uColor, a * uOpacity);
          if (gl_FragColor.a < 0.005) discard;
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
  }

  const traceGeo = new THREE.BufferGeometry();
  const tracePos = new Float32Array(TRACE_N * 3);
  traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePos, 3));
  const traceMat = traceMaterial(0x4fb0a8, 0);
  const trace = new THREE.Line(traceGeo, traceMat);
  trace.frustumCulled = false;
  scene.add(trace);

  // a fainter second trace, offset — two channels
  const trace2Geo = new THREE.BufferGeometry();
  const trace2Pos = new Float32Array(TRACE_N * 3);
  trace2Geo.setAttribute('position', new THREE.BufferAttribute(trace2Pos, 3));
  const trace2Mat = traceMaterial(0xd8cba9, 0);
  const trace2 = new THREE.Line(trace2Geo, trace2Mat);
  trace2.frustumCulled = false;
  scene.add(trace2);

  // The two lines are the same signal: one as it is, one as the instrument
  // reports it. They leave the opening almost coincident and come apart across
  // the conviction section, with the residual drawn between them.
  const ERR_N = 56;
  const errGeo = new THREE.BufferGeometry();
  const errPos = new Float32Array(ERR_N * 2 * 3);
  errGeo.setAttribute('position', new THREE.BufferAttribute(errPos, 3));
  const errMat = traceMaterial(0x4fb0a8, 0);
  const errors = new THREE.LineSegments(errGeo, errMat);
  errors.frustumCulled = false;
  scene.add(errors);

  function waveform(u, t, seed) {
    let v = 0;
    v += Math.sin(u * 17.0 + t * 1.3 + seed) * 0.36;
    v += Math.sin(u * 39.0 - t * 2.1 + seed) * 0.18;
    v += Math.sin(u *  6.1 + t * 0.7) * 0.44;
    const burst = Math.exp(-Math.pow((((u + t * 0.05) % 1) - 0.5) * 6.0, 2));
    v += Math.sin(u * 120.0 + t * 5.0) * burst * 0.7;
    return v;
  }

  // ══════════════════════════════════════════════════════════
  //  the topology — real shape, every label struck out
  // ══════════════════════════════════════════════════════════
  const topology = new THREE.Group();
  scene.add(topology);

  const PLATE_W = 40, PLATE_H = 13;

  // Stage layout mirrors the real block diagram: parallel inputs,
  // a single conditioning stage, a combination stage, two heads.
  // Positions and counts only — every label on these plates is a bar.
  const STAGES = [
    { z:   92, role: 'physiological channel', pts: [[-64, 34], [64, 30], [-78, -12], [70, -22], [-6, 52]] },
    { z:   26, role: 'conditioning stage',    pts: [[-34, 6], [40, -14]] },
    { z:  -38, role: 'combination stage',     pts: [[-52, 20], [46, 26], [0, -30]] },
    { z: -104, role: 'decision stage',        pts: [[-40, -4], [44, 8]] }
  ];

  function plateTexture(barsSeed, legible) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 168;
    const x = c.getContext('2d');

    x.fillStyle = '#100e0c';
    x.fillRect(0, 0, 512, 168);
    x.strokeStyle = legible ? 'rgba(201,154,78,0.75)' : 'rgba(201,154,78,0.30)';
    x.lineWidth = 2;
    x.strokeRect(3, 3, 506, 162);

    if (legible) {
      x.fillStyle = '#e6c08a';
      x.font = '600 34px "JetBrains Mono", monospace';
      x.fillText('SeizeIT2', 30, 62);
      x.fillStyle = '#a29a8e';
      x.font = '400 21px "JetBrains Mono", monospace';
      x.fillText('125 patients · 2,912 h', 30, 100);
      x.fillStyle = '#6d655b';
      x.font = '400 17px "JetBrains Mono", monospace';
      x.fillText('public — not mine to withhold', 30, 134);
    } else {
      // struck-out title
      x.fillStyle = '#000';
      x.fillRect(28, 32, 300 + (barsSeed % 5) * 32, 34);
      x.fillStyle = 'rgba(120,112,100,0.5)';
      x.font = '400 22px "JetBrains Mono", monospace';
      x.fillText('▮▮▮▮▮▮▮▮▮▮', 36, 58);

      // struck-out parameter rows
      for (let r = 0; r < 2; r++) {
        const w = 120 + ((barsSeed * (r + 3)) % 7) * 34;
        x.fillStyle = '#000';
        x.fillRect(28, 84 + r * 30, w, 20);
      }
      x.fillStyle = 'rgba(201,154,78,0.45)';
      x.font = '400 15px "JetBrains Mono", monospace';
      x.fillText('REDACTED', 380, 148);
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = low ? 1 : 4;
    return t;
  }

  const plates = [];
  const nodePositions = [];   // per stage, world-local positions

  STAGES.forEach((stage, si) => {
    const here = [];
    stage.pts.forEach((p, pi) => {
      // one plate in the first stage stays legible — the public dataset
      const legible = si === 0 && pi === 4;
      const mat = new THREE.MeshBasicMaterial({
        map: plateTexture(si * 7 + pi * 3 + 1, legible),
        transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W, PLATE_H), mat);
      mesh.position.set(p[0], p[1], stage.z);
      mesh.userData.y0 = p[1];
      mesh.rotation.y = (p[0] > 0 ? -1 : 1) * 0.16;
      mesh.rotation.z = ((si + pi) % 3 - 1) * 0.012;
      mesh.userData.role = legible ? 'public dataset — legible' : stage.role;
      mesh.userData.legible = legible;
      topology.add(mesh);
      plates.push(mesh);
      here.push(new THREE.Vector3(p[0], p[1], stage.z));

      // a hairline frame so the plate reads as a physical object
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(PLATE_W + 2.4, PLATE_H + 2.4)),
        new THREE.LineBasicMaterial({
          color: legible ? BRASS : BONE, transparent: true,
          opacity: 0, depthWrite: false
        })
      );
      edge.position.copy(mesh.position);
      edge.rotation.copy(mesh.rotation);
      mesh.userData.edge = edge;
      topology.add(edge);
    });
    nodePositions.push(here);
  });

  // connectors — flow direction is visible, contents are not
  const linkPairs = [];
  for (let s = 0; s < nodePositions.length - 1; s++) {
    nodePositions[s].forEach((a) => {
      nodePositions[s + 1].forEach((b) => linkPairs.push([a, b]));
    });
  }
  {
    const pts = [];
    linkPairs.forEach(([a, b]) => { pts.push(a.clone(), b.clone()); });
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const linkMat = new THREE.LineBasicMaterial({
      color: BRASS, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const links = new THREE.LineSegments(g, linkMat);
    topology.add(links);
    topology.userData.linkMat = linkMat;
  }

  // signal travelling along the connectors
  const FLOW_N = low ? 90 : 220;
  const flowGeo = new THREE.BufferGeometry();
  const flowPos = new Float32Array(FLOW_N * 3);
  const flowSeed = new Float32Array(FLOW_N);
  for (let i = 0; i < FLOW_N; i++) flowSeed[i] = Math.random();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
  const flowMat = new THREE.PointsMaterial({
    color: 0x9fe0d6, size: 2.6, map: DOT, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false
  });
  const flow = new THREE.Points(flowGeo, flowMat);
  flow.frustumCulled = false;
  topology.add(flow);

  // ══════════════════════════════════════════════════════════
  //  rails — rungs streaming past at the edges of vision. They do
  //  nothing except make the depth legible while you read.
  // ══════════════════════════════════════════════════════════
  const RUNG_GAP = 46;
  const RUNG_SPAN = RUNG_GAP * 26;
  const rails = new THREE.Group();
  const railMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x4fb0a8) }, uOpacity: { value: 0 } },
    vertexShader: `
      varying float vD;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    // only the near rungs are drawn — those are the ones still out at the
    // edges of the frame. Further back they would converge over the copy.
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity;
      varying float vD;
      void main() {
        float a = smoothstep(30.0, 90.0, vD) * smoothstep(430.0, 190.0, vD);
        gl_FragColor = vec4(uColor, a * uOpacity);
        if (gl_FragColor.a < 0.004) discard;
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  {
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const z = -i * RUNG_GAP;
      const long = i % 4 === 0;
      const inner = 166, outer = inner + (long ? 88 : 46);
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const y = sy * 86;
          pts.push(new THREE.Vector3(sx * inner, y, z));
          pts.push(new THREE.Vector3(sx * outer, y, z));
        }
      }
    }
    const rungs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), railMat);
    rungs.frustumCulled = false;
    rails.add(rungs);
    scene.add(rails);
  }

  // ══════════════════════════════════════════════════════════
  //  the calibration — three rings that start out of true and come
  //  into alignment as you read the audit
  // ══════════════════════════════════════════════════════════
  const calib = new THREE.Group();
  const calibRings = [];
  {
    const hoop = (radius, color) => {
      const pts = [];
      for (let i = 0; i <= 140; i++) {
        const a = (i / 140) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
      );
    };
    [[52, 0x4fb0a8, 0.9, -0.7], [38, 0xd8cba9, -1.1, 0.5], [24, 0x4fb0a8, 0.6, 1.2]]
      .forEach(([r, color, tx, ty], i) => {
        const ring = hoop(r, color);
        calib.add(ring);
        calibRings.push({ ring, tx, ty, mat: ring.material, base: 0.34 - i * 0.06 });
      });
    scene.add(calib);
  }

  // ══════════════════════════════════════════════════════════
  //  the field — one point per run, unlabelled by necessity
  // ══════════════════════════════════════════════════════════
  const field = new THREE.Group();
  scene.add(field);

  const RUNS = low ? 1000 : 2400;
  const CEILING = 54;
  // seven levers pulled, independently — data scale, fusion strategy,
  // ensembling, false-alarm filtering, persistence, hand-crafted features,
  // band selection (named in the copy and in .field-hud). Each gets its own
  // angular spoke so the *shape* of a structured search is legible — which
  // axes were pulled, and how many times — without a single value on it.
  const CATS = 7;
  const SECTOR = (Math.PI * 2) / CATS;
  const fieldGeo = new THREE.BufferGeometry();
  const dropPts = [];
  const pointCat = new Int8Array(RUNS);   // which of the seven spokes each run belongs to
  {
    const p = new Float32Array(RUNS * 3);
    const s = new Float32Array(RUNS);
    const b = new Float32Array(RUNS);
    // Runs crowd up under a ceiling and stop. Nothing is labelled and there
    // are no axes — the only thing being said is "they all stop here".
    for (let i = 0; i < RUNS; i++) {
      // even split across the seven spokes — a gap between them keeps each
      // one legible as its own arm rather than a blurred disc
      const cat = i % CATS;
      pointCat[i] = cat;
      const th = (cat + 0.5) * SECTOR + (Math.random() - 0.5) * SECTOR * 0.72;
      const rad = 40 + Math.pow(Math.random(), 0.6) * 330;
      const drop = Math.pow(Math.random(), 2.3);       // most sit just below
      p[i * 3]     = Math.cos(th) * rad;
      p[i * 3 + 1] = CEILING - drop * 210 - Math.random() * 6;
      p[i * 3 + 2] = Math.sin(th) * rad * 0.85;
      s[i] = 0.85 + Math.random() * 1.5;
      b[i] = 0.3 + (1 - drop * 0.9) * 0.7;              // dimmer the further below, never dark

      // a few of the ones that got closest get a hairline up to the ceiling,
      // so you can see what they ran into
      if (drop < 0.1 && dropPts.length < 120 && Math.random() < 0.3) {
        dropPts.push(new THREE.Vector3(p[i * 3], CEILING, p[i * 3 + 2]));
        dropPts.push(new THREE.Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]));
      }
    }
    // the run that mattered — brighter, pressed right against the ceiling
    s[0] = 3.2; b[0] = 1.0;
    p[0] = 26; p[1] = CEILING - 3; p[2] = -40;
    fieldGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    fieldGeo.setAttribute('aScale', new THREE.BufferAttribute(s, 1));
    fieldGeo.setAttribute('aBright', new THREE.BufferAttribute(b, 1));
    fieldGeo.setAttribute('aHi', new THREE.BufferAttribute(new Float32Array(RUNS), 1));
  }
  const fieldMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: DOT }, uTime: { value: 0 },
      uProj: { value: 1000 }, uOpacity: { value: 0 },
      uWarm: { value: new THREE.Color(0x4fb0a8) },
      uCool: { value: new THREE.Color(0xd8cba9) }
    },
    vertexShader: `
      attribute float aScale; attribute float aBright; attribute float aHi;
      uniform float uTime; uniform float uProj;
      varying float vFade; varying float vBright; varying float vHi;
      void main() {
        vec3 pos = position;
        pos.x += sin(uTime * 0.16 + position.y * 0.03) * 2.4;
        pos.y += cos(uTime * 0.13 + position.z * 0.02) * 2.0;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float d = -mv.z;
        vBright = aBright;
        vHi = aHi;
        vFade = smoothstep(980.0, 140.0, d) * smoothstep(3.0, 30.0, d);
        float pulse = aScale > 3.0 ? (0.75 + 0.45 * sin(uTime * 2.1)) : 1.0;
        gl_PointSize = (aScale * pulse + aHi * 3.4) * 0.72 * uProj / max(d, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uOpacity;
      uniform vec3 uWarm; uniform vec3 uCool;
      varying float vFade; varying float vBright; varying float vHi;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        vec3 c = mix(mix(uCool, uWarm, vBright), vec3(1.0), vHi * 0.6);
        gl_FragColor = vec4(c, t.a * vFade * uOpacity * (0.62 + vBright * 0.6 + vHi * 0.5));
        if (gl_FragColor.a < 0.01) discard;
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const runs = new THREE.Points(fieldGeo, fieldMat);
  runs.frustumCulled = false;
  field.add(runs);

  // the ceiling itself — a hairline plane the runs stop against.
  // No graduations on it: there are no values to read here.
  {
    const pts = [];
    const R = 430;
    for (let i = -10; i <= 10; i++) {
      const o = i * 42;
      pts.push(new THREE.Vector3(-R, CEILING, o), new THREE.Vector3(R, CEILING, o));
      pts.push(new THREE.Vector3(o, CEILING, -R), new THREE.Vector3(o, CEILING, R));
    }
    const gridMat = traceMaterial(0x4fb0a8, 0);
    const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), gridMat);
    grid.frustumCulled = false;
    field.add(grid);
    field.userData.gridMat = gridMat;

    const dropMat = traceMaterial(0xd8cba9, 0);
    const drops = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dropPts), dropMat);
    drops.frustumCulled = false;
    field.add(drops);
    field.userData.dropMat = dropMat;
  }

  // ══════════════════════════════════════════════════════════
  //  layout — anchor each piece to its section
  // ══════════════════════════════════════════════════════════
  let zRedaction = 0, zField = 0, zTraceStart = 0, zTraceEnd = 0;
  let zWorkStart = 0, zWorkEnd = 0;
  const bands = {};   // id -> { near, far, fade } in world z

  // A piece exists only inside its own section's depth, plus a short fade at
  // each end. Distance-from-centre alone let the field bleed three sections
  // back, which read as debris behind the topology.
  function band(id, fallbackTop, fallbackHeight) {
    const s = site.stations[id];
    const top = s ? s.top : fallbackTop;
    const h = s ? s.height : fallbackHeight;
    const near = zAt(top - site.vh * 0.35);            // larger z: met first
    const far = zAt(top + h + site.vh * 0.35);
    return { near, far, fade: Math.min(150, (near - far) * 0.3) };
  }

  function bandFade(b, z) {
    return smooth(b.near + b.fade, b.near, z) * smooth(b.far - b.fade, b.far, z);
  }

  // 0 entering the band, 1 leaving it
  function bandProgress(b, z) {
    return Math.min(1, Math.max(0, (b.near - z) / Math.max(1, b.near - b.far)));
  }

  function layout() {
    const doc = Math.max(1, site.doc);
    zRedaction = zAt(centreOf('redaction', doc * 0.32));
    zField = zAt(centreOf('ceiling', doc * 0.52));
    zTraceStart = zAt(0);
    zTraceEnd = zAt(centreOf('work', doc * 0.22));
    topology.position.z = zRedaction;
    field.position.z = zField;
    bands.redaction = band('redaction', doc * 0.28, doc * 0.1);
    bands.ceiling = band('ceiling', doc * 0.48, doc * 0.1);
    bands.contact = band('contact', doc * 0.92, doc * 0.08);
    bands.drift = band('lie', doc * 0.1, doc * 0.06);
    bands.diagnosis = band('diagnosis', doc * 0.4, doc * 0.08);

    const work = site.stations.work;
    zWorkStart = zAt(work ? work.top : doc * 0.18);
    zWorkEnd = zAt((work ? work.top + work.height * 0.75 : doc * 0.26));
  }

  // ══════════════════════════════════════════════════════════
  //  hover — a plate returns its role in the flow, nothing more
  // ══════════════════════════════════════════════════════════
  const roleEl = document.getElementById('rh-role');
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;

  window.addEventListener('pointermove', (e) => {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  // touch has no hover: a tap picks a plate the same way, and it stays picked
  // (the raycast re-runs every frame against the same coordinate) until the
  // next tap moves it, so the legend still answers something on a phone
  canvas.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    ndc.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    pickPlate();
    pickPoint();
  }, { passive: true });

  function pickPlate() {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(plates, false)[0];
    const mesh = hit ? hit.object : null;
    canvas.classList.toggle('hover-plate', !!mesh);
    if (mesh === hovered) return;
    if (hovered) hovered.userData.hover = 0;
    hovered = mesh;
    if (roleEl) roleEl.textContent = mesh ? mesh.userData.role : '— hover a plate —';
  }

  // ══════════════════════════════════════════════════════════
  //  hover — a run in the ceiling map lights up and names its spoke.
  //  It answers the same question the static legend does; hovering just
  //  ties the answer to the point you're actually looking at.
  // ══════════════════════════════════════════════════════════
  const fhRows = Array.prototype.slice.call(document.querySelectorAll('.fh-row'));
  let hoveredPoint = -1;
  ray.params.Points = { threshold: 7 };

  function pickPoint() {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(runs, false)[0];
    const idx = hit ? hit.index : -1;
    canvas.classList.toggle('hover-point', idx >= 0);
    if (idx === hoveredPoint) return;
    if (hoveredPoint >= 0) fieldGeo.attributes.aHi.setX(hoveredPoint, 0);
    hoveredPoint = idx;
    if (idx >= 0) fieldGeo.attributes.aHi.setX(idx, 1);
    fieldGeo.attributes.aHi.needsUpdate = true;
    fhRows.forEach((row, i) => row.classList.toggle('active', idx >= 0 && pointCat[idx] === i));
  }

  // ══════════════════════════════════════════════════════════
  //  frame
  // ══════════════════════════════════════════════════════════
  let t = 0;
  let fit = 1;        // set-piece scale for the current aspect
  let sideShift = 1;  // how far off-centre the trace runs
  let running = true;

  // ── the hand-off. The ignition ends on a flat trace across the middle of
  // the screen; the world picks that exact pose up and swings it away into
  // depth while the bezel shrinks into place. No cut between the two.
  let arriveT = 0, arriving = false;
  window.addEventListener('ignition:done', () => { arriving = true; arriveT = 0; });
  setTimeout(() => { arriving = true; }, 3600);   // if the ignition never ran
  let lastFrame = performance.now();
  const camPos = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit = Math.min(1, Math.max(0.5, camera.aspect / 1.45));
    sideShift = camera.aspect < 1 ? 1.8 : 1;
    topology.scale.setScalar(fit);
    field.scale.setScalar(Math.max(0.62, fit));
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    gl.setSize(w, h, false);
    var proj = (gl.getDrawingBufferSize(new THREE.Vector2()).y * 0.5) /
               Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    moteMat.uniforms.uProj.value = proj;
    fieldMat.uniforms.uProj.value = proj;
    layout();
  }
  window.addEventListener('resize', () => { clearTimeout(resize._d); resize._d = setTimeout(resize, 120); });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { lastFrame = performance.now(); requestAnimationFrame(frame); }
  });

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    t += site.reduced ? dt * 0.25 : dt;

    if (site.doc !== frame._doc) { frame._doc = site.doc; layout(); }

    if (arriving && arriveT < 2) arriveT += dt;
    // 0 while the ignition still owns the screen, 1 once the site has arrived
    const arrive = site.reduced ? 1 : smooth(0, 1.15, arriveT);

    // ── camera: depth is scroll, with a little pointer parallax
    const zCam = zAt(site.y + site.vh * 0.5);
    const routeX = Math.sin(site.progress * Math.PI * 3.4) * 21;
    const routeY = Math.cos(site.progress * Math.PI * 2.2) * 9;
    camPos.set(site.pointer.x * 14 + routeX,
               -site.pointer.y * 9 + routeY + Math.sin(t * 0.21) * 1.6,
               zCam + 30 + (1 - arrive) * 120);
    camera.position.lerp(camPos, site.reduced ? 1 : 0.09);
    camera.lookAt(camera.position.x * 0.35, camera.position.y * 0.35, camera.position.z - 200);
    // bank into the turn, and lean a little with the scroll
    camera.rotation.z = site.velocity * 0.00035
                      + Math.cos(site.progress * Math.PI * 3.4) * 0.016;

    // ── motes wrap around the camera so the void is never empty
    motes.position.z = Math.round(camera.position.z / MOTE_SPAN) * MOTE_SPAN;
    moteMat.uniforms.uTime.value = t;
    moteMat.uniforms.uOpacity.value = 0.55 + Math.min(0.28, Math.abs(site.velocity) * 0.006);

    // ── bezel: held ahead, present at the opening, gone by the work
    // it opens the page and it closes it: at the end the ring drifts back to
    // centre, shrinks and recedes, and the instrument shuts down
    const closing = bandFade(bands.contact, camera.position.z);
    bezel.position.set(104 * (1 - closing), 4 * (1 - closing),
                       camera.position.z - 250 - closing * 150);
    bezel.rotation.z = t * 0.022;
    const bezelIn = Math.max(
      1 - smooth(zAt(site.vh * 0.2), zAt(site.vh * 1.5), camera.position.z),
      closing * 0.85
    );
    bezel.children.forEach((c, i) => {
      if (c.material) c.material.opacity = bezelIn * (i === 0 ? 0.40 : i === 1 ? 0.14 : 0.11);
    });
    // the gimbal is the last thing to appear, once the bezel has settled
    const gimbalIn = bezelIn * smooth(0.45, 1, arrive);
    for (let i = 0; i < gimbalRings.length; i++) {
      const r = gimbalRings[i];
      r.pivot.rotation[r.axis] = t * r.speed;
      r.mat.opacity = gimbalIn * r.base;
    }

    // ── the trace: signal and instrument, coming apart as you read why
    const traceIn = 1 - smooth(zWorkStart, zWorkEnd, camera.position.z);
    // 0 at the opening, 1 across the conviction section — the amount by which
    // the reported line has wandered off the real one
    const lie = bandFade(bands.drift, camera.position.z);
    traceMat.uniforms.uOpacity.value = traceIn * (0.34 + lie * 0.46 + (1 - arrive) * 0.5);
    trace2Mat.uniforms.uOpacity.value = traceIn * (0.30 + lie * 0.22 + (1 - arrive) * 0.35);
    errMat.uniforms.uOpacity.value = traceIn * lie * 0.42;
    bezel.scale.setScalar(Math.max(0.62, fit) * (1 - closing * 0.6) * (1 + (1 - arrive) * 1.5));
    if (traceIn > 0.01) {
      const head = camera.position.z - 90;
      const spread = 8 + lie * 13;
      // Running away into depth at the opening; as the conviction section
      // arrives the pair swings round and lays itself across the view, which
      // is the only angle the gap between the two lines can be read from.
      const halfW = Math.min(142, 88 * camera.aspect);
      const zFace = camera.position.z - 250;
      // flat and facing where the ignition left it, and flat again for the lie
      const face = Math.max(lie, 1 - arrive);
      for (let i = 0; i < TRACE_N; i++) {
        const u = i / (TRACE_N - 1);
        const zRun = head - u * TRACE_LEN;
        const xRun = (60 + Math.sin(u * 2.2 + t * 0.15) * 15) * sideShift;
        const xFace = camera.position.x + (-halfW + u * halfW * 2);
        const x = xRun + (xFace - xRun) * face;
        const z = zRun + (zFace - zRun) * face;
        const w = waveform(u * 3.0, t, 0);

        // what is actually happening
        // the hand-off pose sits low, where the ignition left the flat trace
        const yTrue = 12 - (1 - arrive) * 46 + w * (15 - lie * 4);
        trace2Pos[i * 3] = x;
        trace2Pos[i * 3 + 1] = yTrue + spread * 0.35;
        trace2Pos[i * 3 + 2] = z;

        // what the instrument says: same signal, with a slow gain error and a
        // baseline that walks away from it
        const gain = 1 + lie * 0.5 * Math.sin(u * 1.7 + t * 0.23);
        const walk = lie * (0.25 + u * u * 1.5) * 11;
        tracePos[i * 3] = x;
        tracePos[i * 3 + 1] = yTrue * gain - walk - spread * 0.35;
        tracePos[i * 3 + 2] = z;
      }
      traceGeo.attributes.position.needsUpdate = true;
      trace2Geo.attributes.position.needsUpdate = true;

      if (lie > 0.01) {
        for (let k = 0; k < ERR_N; k++) {
          const i = Math.round((k / (ERR_N - 1)) * (TRACE_N - 1));
          errPos[k * 6]     = tracePos[i * 3];
          errPos[k * 6 + 1] = tracePos[i * 3 + 1];
          errPos[k * 6 + 2] = tracePos[i * 3 + 2];
          errPos[k * 6 + 3] = trace2Pos[i * 3];
          errPos[k * 6 + 4] = trace2Pos[i * 3 + 1];
          errPos[k * 6 + 5] = trace2Pos[i * 3 + 2];
        }
        errGeo.attributes.position.needsUpdate = true;
      }
    }

    // ── topology
    const topoIn = bandFade(bands.redaction, camera.position.z);
    topology.visible = topoIn > 0.005;
    if (topology.visible) {
      topology.rotation.y = Math.sin(t * 0.06) * 0.035 + site.pointer.x * 0.045;
      topology.userData.linkMat.opacity = topoIn * 0.13;
      flowMat.opacity = topoIn * 0.6;

      for (let i = 0; i < plates.length; i++) {
        const p = plates[i];
        const dz = Math.abs(camera.position.z - (zRedaction + p.position.z * fit));
        const near = (0.32 + 0.68 * smooth(340, 150, dz)) * smooth(16, 62, dz);
        p.material.opacity = topoIn * near;
        const e = p.userData.edge;
        const isHot = p === hovered;
        // the plates hang rather than sit — each drifts on its own phase
        const bob = Math.sin(t * 0.32 + i * 1.7) * 1.4 + (isHot ? 2.2 : 0);
        p.position.y = p.userData.y0 + bob;
        e.position.y = p.userData.y0 + bob;
        e.material.opacity = topoIn * near * (p.userData.legible ? 0.7 : 0.28) + (isHot ? 0.45 : 0);
        e.scale.setScalar(isHot ? 1.035 : 1.0);
      }

      // flow particles ride the connectors
      const n = linkPairs.length;
      for (let i = 0; i < FLOW_N; i++) {
        const pair = linkPairs[i % n];
        const u = (flowSeed[i] + t * 0.16) % 1;
        const e = u * u * (3 - 2 * u);
        flowPos[i * 3]     = pair[0].x + (pair[1].x - pair[0].x) * e;
        flowPos[i * 3 + 1] = pair[0].y + (pair[1].y - pair[0].y) * e;
        flowPos[i * 3 + 2] = pair[0].z + (pair[1].z - pair[0].z) * e;
      }
      flowGeo.attributes.position.needsUpdate = true;

      // interactive for the whole visible fade, not just while the station
      // label reads "redaction" — the plates were visible well outside that
      // narrow window with no way to explain why hovering did nothing there
      if (topoIn > 0.15 && !site.reduced) pickPlate();
      else if (hovered) { hovered = null; canvas.classList.remove('hover-plate'); if (roleEl) roleEl.textContent = '— hover a plate —'; }
    }

    // ── the calibration: out of true on the way in, aligned on the way out
    const diagIn = bandFade(bands.diagnosis, camera.position.z);
    calib.visible = diagIn > 0.005;
    if (calib.visible) {
      const off = 1 - bandProgress(bands.diagnosis, camera.position.z);
      calib.position.set(camera.position.x + 118 * fit, 8, camera.position.z - 265);
      for (let i = 0; i < calibRings.length; i++) {
        const c = calibRings[i];
        c.ring.rotation.x = c.tx * off + Math.sin(t * 0.13 + i) * 0.03;
        c.ring.rotation.y = c.ty * off + Math.cos(t * 0.11 + i) * 0.03;
        c.ring.rotation.z = t * 0.05 * (1 + off * 2);
        c.mat.opacity = diagIn * c.base;
      }
    }

    // ── field
    const fieldIn = bandFade(bands.ceiling, camera.position.z);
    field.visible = fieldIn > 0.005;
    if (field.visible) {
      fieldMat.uniforms.uTime.value = t;
      fieldMat.uniforms.uOpacity.value = fieldIn;
      field.userData.gridMat.uniforms.uOpacity.value = fieldIn * 0.30;
      field.userData.dropMat.uniforms.uOpacity.value = fieldIn * 0.16;
      field.rotation.y = t * 0.014 + site.pointer.x * 0.06;
      field.rotation.x = site.pointer.y * 0.03;
      field.updateMatrixWorld();

      if (fieldIn > 0.15 && !site.reduced) pickPoint();
      else if (hoveredPoint >= 0) {
        fieldGeo.attributes.aHi.setX(hoveredPoint, 0);
        fieldGeo.attributes.aHi.needsUpdate = true;
        hoveredPoint = -1;
        canvas.classList.remove('hover-point');
        fhRows.forEach((row) => row.classList.remove('active'));
      }
    }

    // ── rails stream past the edges, and get out of the way of the set pieces
    rails.position.z = camera.position.z
      - (((camera.position.z % RUNG_GAP) + RUNG_GAP) % RUNG_GAP);
    railMat.uniforms.uOpacity.value =
      0.34 * arrive * (1 - topoIn * 0.9) * (1 - fieldIn * 0.9) * (1 - lie * 0.85);

    gl.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    layout();
    canvas.classList.add('lit');
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }

  if (site.ready) start();
  else setTimeout(start, 60);
}
