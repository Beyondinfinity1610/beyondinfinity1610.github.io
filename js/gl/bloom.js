import * as THREE from '../../vendor/three.module.js';

/**
 * Compact selective-bloom post chain.
 *
 * scene -> HDR target -> bright pass (half res) -> N ping-pong gaussian
 * mip levels -> additive composite. Roughly the look of UnrealBloomPass at a
 * fraction of the code, and with no dependency on three's examples bundle.
 */

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // soft knee so the bloom onset is not a hard edge
  float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-5);
  float contrib = max(soft, l - uThreshold) / max(l, 1e-5);
  gl_FragColor = vec4(c * contrib, 1.0);
}`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  // 9-tap gaussian, linear-sampled
  vec2 o = uTexel * uDir;
  vec4 s = texture2D(tSrc, vUv) * 0.2270270270;
  s += texture2D(tSrc, vUv + o * 1.3846153846) * 0.3162162162;
  s += texture2D(tSrc, vUv - o * 1.3846153846) * 0.3162162162;
  s += texture2D(tSrc, vUv + o * 3.2307692308) * 0.0702702703;
  s += texture2D(tSrc, vUv - o * 3.2307692308) * 0.0702702703;
  gl_FragColor = s;
}`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tBase;
uniform sampler2D tB0;
uniform sampler2D tB1;
uniform sampler2D tB2;
uniform float uStrength;
uniform float uVignette;
varying vec2 vUv;

// Cheap filmic-ish tonemap; keeps highlights from clipping to flat white
vec3 tonemap(vec3 x) {
  return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
}

void main() {
  vec3 base = texture2D(tBase, vUv).rgb;
  vec3 b = texture2D(tB0, vUv).rgb * 1.00
         + texture2D(tB1, vUv).rgb * 0.72
         + texture2D(tB2, vUv).rgb * 0.48;

  vec3 col = base + b * uStrength;
  col = tonemap(col);

  vec2 d = vUv - 0.5;
  float vig = 1.0 - smoothstep(0.34, 0.86, length(d) * 1.28);
  col *= mix(1.0, vig, uVignette);

  gl_FragColor = vec4(col, 1.0);
}`;

function makeRT(w, h) {
  return new THREE.WebGLRenderTarget(Math.max(2, w | 0), Math.max(2, h | 0), {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

export class BloomChain {
  constructor(renderer, width, height, opts = {}) {
    this.renderer = renderer;
    this.levels = opts.levels ?? 3;
    this.strength = opts.strength ?? 0.9;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.matBright = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: BRIGHT_FRAG,
      uniforms: {
        tSrc: { value: null },
        uThreshold: { value: opts.threshold ?? 0.42 },
        uKnee: { value: opts.knee ?? 0.32 },
      },
      depthTest: false, depthWrite: false,
    });

    this.matBlur = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: BLUR_FRAG,
      uniforms: {
        tSrc: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uDir: { value: new THREE.Vector2(1, 0) },
      },
      depthTest: false, depthWrite: false,
    });

    this.matComposite = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tBase: { value: null },
        tB0: { value: null },
        tB1: { value: null },
        tB2: { value: null },
        uStrength: { value: this.strength },
        uVignette: { value: opts.vignette ?? 0.85 },
      },
      depthTest: false, depthWrite: false,
    });

    this.setSize(width, height);
  }

  setSize(width, height) {
    const dispose = (rt) => rt && rt.dispose();
    dispose(this.rtScene);
    (this.mips || []).forEach((m) => { dispose(m.a); dispose(m.b); });

    this.rtScene = makeRT(width, height);
    this.rtScene.depthBuffer = true;
    this.rtScene.texture.colorSpace = THREE.LinearSRGBColorSpace;

    this.mips = [];
    let w = width, h = height;
    for (let i = 0; i < this.levels; i++) {
      w = Math.max(2, Math.floor(w / 2));
      h = Math.max(2, Math.floor(h / 2));
      this.mips.push({ a: makeRT(w, h), b: makeRT(w, h), w, h });
    }
  }

  get target() { return this.rtScene; }

  /** Render `scene`/`camera` through the chain to the default framebuffer. */
  render(scene, camera) {
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();

    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(scene, camera);

    // bright pass into the first mip
    this.quad.material = this.matBright;
    this.matBright.uniforms.tSrc.value = this.rtScene.texture;
    r.setRenderTarget(this.mips[0].a);
    r.clear();
    r.render(this.scene, this.camera);

    // successive downsample + separable blur
    this.quad.material = this.matBlur;
    for (let i = 0; i < this.mips.length; i++) {
      const m = this.mips[i];
      const src = i === 0 ? this.mips[0].a.texture : this.mips[i - 1].a.texture;

      this.matBlur.uniforms.uTexel.value.set(1 / m.w, 1 / m.h);

      this.matBlur.uniforms.tSrc.value = src;
      this.matBlur.uniforms.uDir.value.set(1, 0);
      r.setRenderTarget(m.b);
      r.clear();
      r.render(this.scene, this.camera);

      this.matBlur.uniforms.tSrc.value = m.b.texture;
      this.matBlur.uniforms.uDir.value.set(0, 1);
      r.setRenderTarget(m.a);
      r.clear();
      r.render(this.scene, this.camera);
    }

    // composite to screen
    this.quad.material = this.matComposite;
    const u = this.matComposite.uniforms;
    u.tBase.value = this.rtScene.texture;
    u.tB0.value = this.mips[0].a.texture;
    u.tB1.value = (this.mips[1] || this.mips[0]).a.texture;
    u.tB2.value = (this.mips[2] || this.mips[0]).a.texture;
    u.uStrength.value = this.strength;

    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
    r.setRenderTarget(prevTarget);
  }

  dispose() {
    this.rtScene.dispose();
    this.mips.forEach((m) => { m.a.dispose(); m.b.dispose(); });
    this.quad.geometry.dispose();
    [this.matBright, this.matBlur, this.matComposite].forEach((m) => m.dispose());
  }
}
