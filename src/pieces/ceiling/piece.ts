// Movement 06 — the ceiling (spec §3.4). Implements WebglPiece, mounted
// lazily by the shared WebglDirector alongside movement 04 (spec's own
// header comment on webgl-director.ts: "Registry for the WebGL pieces
// (movements 04, 06)"). One InstancedMesh billboard field, one draw call —
// deliberately NOT THREE.Points (spec: "the historical empty-void bug").
// No composer: "Movement 06 uses no composer at all — bloom smears the
// field and costs a pass" (spec §6.2).

import {
  Scene,
  PerspectiveCamera,
  PlaneGeometry,
  InstancedMesh,
  InstancedBufferAttribute,
  ShaderMaterial,
  LineSegments,
  BufferGeometry,
  LineBasicMaterial,
  Float32BufferAttribute,
  FogExp2,
  Color,
  Vector3,
  DoubleSide,
  Matrix4,
  type WebGLRenderer,
} from 'three';
import type { WebglPiece } from '../../gl/webgl-director';
import { playOneShot } from '../../audio/audio';
import { FIELD_VERTEX_SHADER } from '../../gl/shaders/field.vert';
import { FIELD_FRAGMENT_SHADER } from '../../gl/shaders/field.frag';
import {
  buildCeilingField,
  CEILING_Y,
  CEILING_INSTANCE_COUNT_HIGH,
  CEILING_INSTANCE_COUNT_MOBILE,
  FIELD_RADIUS_X,
  FIELD_RADIUS_Z,
  FIELD_DEPTH_BIAS,
  type CeilingField,
} from './field';

// Reads a CSS custom property straight into a THREE.Color, numeric fallback
// only — tokens.css's own hex strings ('#4fb0a8' etc.) are exactly the
// digit-bearing string literals spec §3.4/§8 Phase 8's grep bans from this
// directory, so the fallback here is a numeric literal (never sub-6-hex-
// digit-leading-zero for the three colours this piece actually uses, so no
// padding is needed either — see NEAR_MISS_HEX's own comment) and the CSS
// string itself only ever exists at runtime, never in this file's source.
function themeColor(name: string, fallbackHex: number): Color {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? new Color(v) : new Color(fallbackHex);
}

// spec §6.3: "<760px or coarse" — same test topology/piece.ts uses for its
// own mobile branch (9 plates, no bloom). Decided once, at construction.
function isMobile(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
}

// A warm tone distinct from --alarm (#d1533f, tokens.css) — --alarm is
// reserved for exactly two places on the whole site (spec §4.1: the
// false-alarm budget breach in movement 03, and the struck-through figures
// in movement 05). A near-miss here is a different idea ("closest this
// lever got"), not a failure event, so it earns its own warm accent rather
// than borrowing the reserved one and quietly breaking that scarcity rule.
const NEAR_MISS_HEX = 0xc9824a;

const INSTANCE_SIZE = 0.16; // world units — real size, per spec, never sub-pixel
const SETTLE_FRACTION = 0.24; // the field is fully in place by this much of the scroll-through
const FOLLOW_RATE = 8; // spec §5.2 — the same damped-follow rate every piece uses

const CAMERA_FOV = 55;
const CAMERA_Y_START = -3.1;
const CAMERA_Y_END = CEILING_Y - 0.32;
const CAMERA_Z_START = 8.6;
const CAMERA_Z_END = 1.55;
const CAMERA_X_DRIFT = 1.15; // "rotates" — a slow lateral arc, not a fixed dolly

const MOBILE_SCRIPT_SECONDS = 2.6; // "a short scripted camera move" (spec §6.3)

const GRID_DIVISIONS = 8;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class CeilingPiece implements WebglPiece {
  readonly id = 'ceiling';
  active = false;
  target = 0;
  private p = 0;

  private readonly mobile = isMobile();
  private mobileT = 0;
  // "A struck tone for the ceiling" (spec §8 Phase 10) — a single mallet/
  // bell hit the moment the settle spring finishes (the camera has
  // finished its descent to "oppressively overhead"), not a loop. Reset
  // once settle drops meaningfully below 1 so scrolling back up and down
  // again re-triggers it rather than firing exactly once per page load.
  private struckPlayed = false;

  private scene = new Scene();
  private camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60);
  private field: CeilingField;
  private mesh!: InstancedMesh;
  private material!: ShaderMaterial;

  constructor(_canvas: HTMLCanvasElement) {
    const phosphor = themeColor('--phosphor', 0x4fb0a8);
    const bone = themeColor('--bone', 0xece7de);

    this.scene.fog = new FogExp2(0x06080a, 0.05);

    const count = this.mobile ? CEILING_INSTANCE_COUNT_MOBILE : CEILING_INSTANCE_COUNT_HIGH;
    this.field = buildCeilingField(count);

    this.buildInstances(this.field, phosphor, bone);
    this.buildCeilingGrid(bone);
    this.buildNearMissHairlines(this.field);
  }

  private buildInstances(field: CeilingField, phosphor: Color, bone: Color): void {
    const geometry = new PlaneGeometry(1, 1);
    const count = field.instances.length;

    const basePos = new Float32Array(count * 3);
    const category = new Float32Array(count);
    const closeness = new Float32Array(count);
    const seed = new Float32Array(count);

    field.instances.forEach((inst, i) => {
      basePos[i * 3] = inst.x;
      basePos[i * 3 + 1] = inst.y;
      basePos[i * 3 + 2] = inst.z;
      category[i] = inst.category;
      closeness[i] = inst.closeness;
      seed[i] = inst.seed;
    });

    geometry.setAttribute('aBasePos', new InstancedBufferAttribute(basePos, 3));
    geometry.setAttribute('aCategory', new InstancedBufferAttribute(category, 1));
    geometry.setAttribute('aCloseness', new InstancedBufferAttribute(closeness, 1));
    geometry.setAttribute('aSeed', new InstancedBufferAttribute(seed, 1));

    this.material = new ShaderMaterial({
      vertexShader: FIELD_VERTEX_SHADER,
      fragmentShader: FIELD_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uSettle: { value: 0 },
        uInstanceSize: { value: INSTANCE_SIZE },
        uColorLo: { value: phosphor },
        uColorHi: { value: bone },
        uNearMissColor: { value: new Color(NEAR_MISS_HEX) },
      },
    });

    this.mesh = new InstancedMesh(geometry, this.material, count);
    // Every instance's actual placement comes from the custom aBasePos
    // attribute above, read directly in field.vert.ts — instanceMatrix is
    // never referenced by that shader, so it's never multiplied in. It
    // still has to be initialised to something valid (InstancedMesh's
    // default buffer is zero-filled, not identity) and its needsUpdate
    // flag set, or three logs "uninitialised instance matrix" warnings and
    // some drivers refuse to upload the zeroed buffer at all — the classic
    // InstancedMesh gotcha, avoided here even though this shader doesn't
    // depend on the result.
    const identity = new Matrix4();
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, identity);
    this.mesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.mesh);
  }

  /** "A hairline plane across the top that nothing crosses" (spec §3.4) —
   *  a sparse grid of lines at y=CEILING_Y, not a filled polygon, so it
   *  reads as a plane while staying a hairline. */
  private buildCeilingGrid(bone: Color): void {
    const positions: number[] = [];
    const x0 = -FIELD_RADIUS_X;
    const x1 = FIELD_RADIUS_X;
    const z0 = FIELD_DEPTH_BIAS - FIELD_RADIUS_Z;
    const z1 = FIELD_DEPTH_BIAS + FIELD_RADIUS_Z;

    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const t = i / GRID_DIVISIONS;
      const x = lerp(x0, x1, t);
      positions.push(x, CEILING_Y, z0, x, CEILING_Y, z1);
      const z = lerp(z0, z1, t);
      positions.push(x0, CEILING_Y, z, x1, CEILING_Y, z);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const material = new LineBasicMaterial({ color: bone, transparent: true, opacity: 0.22 });
    this.scene.add(new LineSegments(geometry, material));
  }

  /** "A few near-misses get thin vertical hairlines up to it — the only
   *  warm elements in the frame" (spec §3.4). Static, at each near-miss
   *  instance's resting position — the shader-side settle animation is a
   *  visual embellishment on the points themselves; these lines mark the
   *  data fact (this run came this close) and don't need to bounce too. */
  private buildNearMissHairlines(field: CeilingField): void {
    const positions: number[] = [];
    for (const idx of field.nearMissIndices) {
      const inst = field.instances[idx];
      positions.push(inst.x, inst.y, inst.z, inst.x, CEILING_Y, inst.z);
    }
    if (positions.length === 0) return;

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const material = new LineBasicMaterial({ color: new Color(NEAR_MISS_HEX), transparent: true, opacity: 0.8 });
    this.scene.add(new LineSegments(geometry, material));
  }

  mount(_renderer: WebGLRenderer): void {
    // No composer to build — spec §6.2's explicit "movement 06 uses no
    // composer at all."
  }

  fit(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** Mobile gets a bounded, self-contained sweep instead of a continuous
   *  scroll-linked one (spec §6.3: "ceiling 700 instances with a short
   *  scripted camera move") — real-time driven from the moment the section
   *  first becomes active, capped, never re-triggered, and never at the
   *  mercy of a scroll gesture on a coarse pointer. */
  private progressForFrame(dt: number): number {
    if (!this.mobile) return this.p;
    if (this.active && this.mobileT < MOBILE_SCRIPT_SECONDS) {
      this.mobileT = Math.min(MOBILE_SCRIPT_SECONDS, this.mobileT + dt);
    }
    return this.mobileT / MOBILE_SCRIPT_SECONDS;
  }

  private applyPose(progress: number): void {
    const settle = Math.min(1, progress / SETTLE_FRACTION);
    this.material.uniforms.uSettle.value = settle;

    if (settle >= 1 && !this.struckPlayed && this.active) {
      this.struckPlayed = true;
      void playOneShot('struck-tone', { gain: 0.55 });
    } else if (settle < 0.9) {
      this.struckPlayed = false;
    }

    const y = lerp(CAMERA_Y_START, CAMERA_Y_END, progress);
    const z = lerp(CAMERA_Z_START, CAMERA_Z_END, progress);
    const x = Math.sin(progress * Math.PI * 0.9) * CAMERA_X_DRIFT;
    this.camera.position.set(x, y, z);

    const lookY = lerp(y + 0.4, CEILING_Y + 1.4, progress);
    const lookZ = z - lerp(6, 0.4, progress);
    this.camera.lookAt(new Vector3(0, lookY, lookZ));
  }

  frame(dt: number): void {
    this.p += (this.target - this.p) * (1 - Math.exp(-FOLLOW_RATE * dt));
    const progress = this.progressForFrame(dt);
    this.applyPose(progress);
  }

  render(renderer: WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }

  /** Reduced motion: "one static frame at the final pose" (spec §6.3's
   *  table, row 06). */
  renderOnce(renderer: WebGLRenderer): void {
    this.p = 1;
    this.mobileT = MOBILE_SCRIPT_SECONDS;
    this.applyPose(1);
    renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }

  // --- test-only surface ---

  instanceCount(): number {
    return this.field.instances.length;
  }

  nearMissCount(): number {
    return this.field.nearMissIndices.length;
  }

  hasComposer(): boolean {
    return false;
  }

  isMobileScripted(): boolean {
    return this.mobile;
  }

  /** Projects instance `index`'s settled (resting) position to CSS pixel
   *  coordinates within the given canvas rect — mirrors topology/piece.ts's
   *  projectPlateToScreen. Uses aBasePos directly rather than the animated
   *  shader position, which is intentionally close-but-not-identical once
   *  fully settled (the spring's decaying oscillation only asymptotically
   *  reaches 0 residual). */
  projectInstanceToScreen(index: number, rectWidth: number, rectHeight: number): { x: number; y: number } | null {
    const inst = this.field.instances[index];
    if (!inst) return null;
    const v = new Vector3(inst.x, inst.y, inst.z).project(this.camera);
    if (v.z > 1 || v.z < -1) return null;
    return { x: ((v.x + 1) / 2) * rectWidth, y: ((1 - v.y) / 2) * rectHeight };
  }

  /** Finds the currently-nearest-to-camera instance and returns its screen
   *  position plus an analytic estimate of its on-screen size in DEVICE
   *  pixels (not CSS px) — `canvasDeviceHeight` should be the WebGL
   *  canvas's own `.height` (its real backing-store size, which already
   *  incorporates devicePixelRatio via renderer.setSize's setPixelRatio
   *  call), not clientHeight. This is the "reason from the geometry/
   *  camera projection math directly" half of spec §8 Phase 8's done-test
   *  — tests/ceiling.spec.ts cross-checks it against a real screenshot's
   *  actual pixels rather than trusting the math alone. */
  closestInstanceScreenInfo(
    rectWidth: number,
    rectHeight: number,
    canvasDeviceHeight: number,
  ): { x: number; y: number; pixelSize: number; distance: number } | null {
    let bestIndex = -1;
    let bestDist = Infinity;
    const camPos = this.camera.position;
    for (let i = 0; i < this.field.instances.length; i++) {
      const inst = this.field.instances[i];
      const dx = inst.x - camPos.x;
      const dy = inst.y - camPos.y;
      const dz = inst.z - camPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) return null;

    const screen = this.projectInstanceToScreen(bestIndex, rectWidth, rectHeight);
    if (!screen) return null;

    const fovRad = (this.camera.fov * Math.PI) / 180;
    const pixelSize = (INSTANCE_SIZE * canvasDeviceHeight) / (2 * bestDist * Math.tan(fovRad / 2));

    return { x: screen.x, y: screen.y, pixelSize, distance: bestDist };
  }
}
