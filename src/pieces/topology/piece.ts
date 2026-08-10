// Movement 04 — the redacted topology (spec §3.2). Implements WebglPiece:
// mounted lazily by the WebGL director, camera dollies along the plates'
// S-curve as the section scrolls, hover returns a role (fine pointers) or
// auto-cycles (coarse), and exactly one plate is legible.

import {
  Scene,
  PerspectiveCamera,
  FogExp2,
  Group,
  type WebGLRenderer,
} from 'three';
import type { EffectComposer } from 'postprocessing';
import type { WebglPiece } from '../../gl/webgl-director';
import { playOneShot } from '../../audio/audio';
import { buildPlates, curvePoint, curveTangent, type PlateHandle } from './plates';
import { buildConnectors, advanceConnectors, type ConnectorHandle } from './connectors';
import { PlatePicker } from './pick';
import {
  PLATE_ROLES,
  LEGIBLE_PLATE_ROLE,
  TOPOLOGY_DEFAULT_CAPTION,
  TOPOLOGY_CAPTION_DOCUMENT_LABEL,
  TOPOLOGY_CAPTION_DOCUMENT_VALUE,
  TOPOLOGY_CAPTION_CLASSIFICATION_LABEL,
  TOPOLOGY_CAPTION_CLASSIFICATION_VALUE,
  TOPOLOGY_CAPTION_PLATE_LABEL,
} from '../../content/strings';
import { PLATE_COUNT, LEGIBLE_PLATE_INDEX } from './plate-atlas';

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function isFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches;
}

// spec §6.3: "<760px or coarse" gets 9 plates, no bloom, no hover. Hover is
// already covered by isFinePointer() below (coarse → auto-cycle branch);
// plate count and bloom are decided here, once, at construction.
function isMobile(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
}

const MOBILE_PLATE_COUNT = 9;
const AUTO_CYCLE_SECONDS = 2.4;

export class TopologyPiece implements WebglPiece {
  readonly id = 'withheld';
  active = false;
  target = 0;
  private p = 0;

  private scene = new Scene();
  private camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private group = new Group();
  private plates: PlateHandle[] = [];
  private connectors: ConnectorHandle[] = [];
  private picker: PlatePicker | null = null;
  private captionEl: HTMLElement;
  private atlasCanvas = document.createElement('canvas');
  private composer: EffectComposer | null = null;
  private composerFactory:
    | ((renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) => EffectComposer)
    | null = null;
  private autoCycleT = 0;
  private lastHovered: number | null = null;
  private readonly mobile = isMobile();

  constructor(canvas: HTMLCanvasElement) {
    const phosphor = cssVar('--phosphor', '#4fb0a8');
    this.scene.fog = new FogExp2(0x06080a, 0.045);

    const { group, plates } = buildPlates(this.atlasCanvas, this.mobile ? MOBILE_PLATE_COUNT : PLATE_COUNT);
    this.group = group;
    this.plates = plates;
    this.scene.add(this.group);

    const { group: connectorGroup, connectors } = buildConnectors(plates, parseInt(phosphor.replace('#', '0x'), 16) || 0x4fb0a8);
    this.scene.add(connectorGroup);
    this.connectors = connectors;

    if (isFinePointer()) {
      this.picker = new PlatePicker(canvas, plates);
    }

    this.captionEl = document.createElement('div');
    this.captionEl.className = 'topology-caption';
    this.captionEl.setAttribute('aria-hidden', 'true');
    this.captionEl.innerHTML = `
      <div class="tc-row"><span class="tc-k">${TOPOLOGY_CAPTION_DOCUMENT_LABEL}</span><span class="tc-v">${TOPOLOGY_CAPTION_DOCUMENT_VALUE}</span></div>
      <div class="tc-row"><span class="tc-k">${TOPOLOGY_CAPTION_CLASSIFICATION_LABEL}</span><span class="tc-v tc-stamp">${TOPOLOGY_CAPTION_CLASSIFICATION_VALUE}</span></div>
      <div class="tc-row"><span class="tc-k">${TOPOLOGY_CAPTION_PLATE_LABEL}</span><span class="tc-v tc-role">${TOPOLOGY_DEFAULT_CAPTION}</span></div>
    `;
    document.body.appendChild(this.captionEl);
  }

  setComposerFactory(
    factory: (renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera) => EffectComposer,
  ): void {
    this.composerFactory = factory;
  }

  mount(renderer: WebGLRenderer): void {
    // spec §6.3: no bloom on mobile — "nothing may glare" already covers
    // why bloom exists at all; on the small/coarse end the pass is also a
    // GPU cost the section doesn't need.
    if (this.composerFactory && !this.composer && !this.mobile) {
      this.composer = this.composerFactory(renderer, this.scene, this.camera);
    }
  }

  fit(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.picker?.refreshRect();
    this.composer?.setSize(width, height);
  }

  private updateCameraForProgress(progress: number): void {
    // Offsetting the camera by a fixed world-space +Z (the original
    // formula) ignores how much the S-curve has actually turned by this
    // point — plates are oriented off the curve's local tangent (plates.ts),
    // so a camera that isn't ALSO offset along that same local tangent
    // drifts out of alignment with them as the curve bends, framing plates
    // edge-on instead of face-on. Positioning "3.2 units behind, along the
    // curve's own tangent at this point" keeps the camera's approach angle
    // consistent with each plate's orientation regardless of curvature.
    const t = Math.min(0.96, progress);
    const pos = curvePoint(t);
    const tangent = curveTangent(t);
    const behind = pos.clone().addScaledVector(tangent, -5.5);
    this.camera.position.set(behind.x, behind.y + 0.5, behind.z);
    const aheadPos = curvePoint(Math.min(1, progress + 0.1));
    this.camera.lookAt(aheadPos);
  }

  private roleFor(index: number): string {
    if (index === LEGIBLE_PLATE_INDEX) return LEGIBLE_PLATE_ROLE;
    return PLATE_ROLES[index % PLATE_ROLES.length];
  }

  /** `withSound` gates the sixth sound (spec §8 Phase 10's "six" despite
   *  five NAMED types — see this file's own working notes / final report:
   *  movement 04 is the one case-study act with no sound of its own in
   *  that list, so a soft plate-select tone fills the gap) — true for a
   *  real fine-pointer hover (frame()'s picker branch below) and for the
   *  test-only simulateHoverForTest() below it, both genuine "a plate was
   *  selected" moments; false for the coarse-pointer auto-cycle branch,
   *  which would otherwise spam a tone every 2.4s with no visitor action
   *  behind it at all. */
  private updateCaption(index: number | null, withSound = false): void {
    if (index === this.lastHovered) return;
    this.lastHovered = index;
    const roleEl = this.captionEl.querySelector('.tc-role');
    if (roleEl) roleEl.textContent = index === null ? TOPOLOGY_DEFAULT_CAPTION : this.roleFor(index);
    if (withSound && index !== null && this.active) void playOneShot('plate-tone', { gain: 0.35 });
  }

  frame(dt: number): void {
    this.p += (this.target - this.p) * (1 - Math.exp(-8 * dt));
    this.updateCameraForProgress(this.p);
    advanceConnectors(this.connectors, dt);

    if (this.picker) {
      const hovered = this.picker.resolve(this.camera);
      this.updateCaption(hovered, true);
      this.captionEl.classList.toggle('tc-on', this.active);
    } else {
      // coarse pointer: auto-cycling role caption instead — spec §3.2
      this.autoCycleT += dt;
      if (this.autoCycleT >= AUTO_CYCLE_SECONDS) {
        this.autoCycleT = 0;
        const next = ((this.lastHovered ?? -1) + 1) % this.plates.length;
        this.updateCaption(next);
      }
      this.captionEl.classList.toggle('tc-on', this.active);
    }
  }

  render(renderer: WebGLRenderer): void {
    if (this.composer) this.composer.render();
    else renderer.render(this.scene, this.camera);
  }

  renderOnce(renderer: WebGLRenderer): void {
    this.updateCameraForProgress(this.target);
    if (this.composer) this.composer.render();
    else renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.picker?.dispose();
    this.captionEl.remove();
  }

  // --- test-only surface ---

  getCaptionText(): string {
    return this.captionEl.querySelector('.tc-role')?.textContent ?? '';
  }

  /** Projects a plate's current 3D centre to CSS pixel coordinates within
   *  the given canvas rect — lets a test know where to move the pointer
   *  to hit a specific plate, without hardcoding screen-space guesses. */
  projectPlateToScreen(index: number, rectWidth: number, rectHeight: number): { x: number; y: number } | null {
    const plate = this.plates[index];
    if (!plate) return null;
    const ndc = plate.position.clone().project(this.camera);
    if (ndc.z > 1 || ndc.z < -1) return null; // behind camera / outside frustum
    return {
      x: ((ndc.x + 1) / 2) * rectWidth,
      y: ((1 - ndc.y) / 2) * rectHeight,
    };
  }

  plateCount(): number {
    return this.plates.length;
  }

  hasBloom(): boolean {
    return this.composer !== null;
  }

  /** null when no picker exists (coarse pointer) — the raycast timing
   *  done-test only applies to the fine-pointer/hover path. */
  raycastTimingMs(): number | null {
    return this.picker?.measureResolveMs(this.camera) ?? null;
  }

  simulateHoverForTest(index: number | null): void {
    this.updateCaption(index, true);
  }
}
