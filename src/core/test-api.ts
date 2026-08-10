import type { SiteState } from './state';

export interface TraceBoundsResult {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface InstrumentTestState {
  thresholdZ: number;
  windowSeconds: number;
  faPerDay: number;
  caught: number;
  totalEvents: number;
  sensitivity: number;
  revealed: boolean;
}

export interface TopologyTestState {
  plateCount: number;
  hasBloom: boolean;
  captionText: string;
}

export interface AuditTestState {
  p: number;
  layersRemaining: number;
  removedLayers: string[];
  transportSeconds: number;
  stateLabel: string;
  settled: boolean;
}

export interface CeilingTestState {
  instanceCount: number;
  nearMissCount: number;
  hasComposer: boolean;
  mobileScripted: boolean;
}

export interface CeilingClosestInstanceInfo {
  x: number;
  y: number;
  pixelSize: number;
  distance: number;
}

// The window.__test surface the Playwright harness drives — spec §7.5:
// window.__test = { ready, goTo(id|{id,p}), freeze(), tick(n),
// setThreshold(z), state(), traceBounds(), fpsOver(frames) }.
export interface TestApi {
  ready(): boolean;
  goTo(target: string | { id: string; p?: number }): void;
  freeze(): void;
  tick(n?: number, dt?: number): void;
  state(): SiteState;
  pieces(): { id: string; active: boolean; p: number; target: number }[];
  refreshCount(): number;
  /** The trace piece's current drawn extent, in viewport pixels — spec §3.1's done-test. */
  traceBounds(): TraceBoundsResult | null;
  /** The instrument's current threshold/readout state, once mounted — spec §2. */
  instrumentState(): InstrumentTestState | null;
  /** Set the instrument's threshold directly (test-only, bypasses drag/keyboard). */
  setThreshold(z: number): void;
  /** Average FPS measured over the next `frames` real animation frames. */
  fpsOver(frames: number): Promise<number>;
  /** Movement 04's current plate count / bloom / caption, once the WebGL piece (or its 2D fallback) is live. */
  topologyState(): TopologyTestState | null;
  /** Projects plate `index`'s current 3D centre to CSS pixel coords in the WebGL canvas, or null if off-screen/unavailable. */
  topologyProjectPlate(index: number): { x: number; y: number } | null;
  /** Directly sets the hovered plate (test-only, bypasses raycast) and returns the resulting caption text. */
  topologySimulateHover(index: number | null): string | null;
  /** Milliseconds the last raycast against the plates took, or null if no picker (coarse pointer) or not mounted. */
  topologyRaycastMs(): number | null;
  /** Movement 05's current reverse-transport state, once the lazily-loaded piece has mounted — spec §8 Phase 7. */
  auditState(): AuditTestState | null;
  /** Set movement 05's target directly (test-only, bypasses scroll/Lenis) — isolates a single damped-follow step. */
  auditSetTarget(p: number): void;
  /** Movement 06's current instance/near-miss counts, once the WebGL piece (or its 2D fallback) is live. */
  ceilingState(): CeilingTestState | null;
  /** Projects instance `index`'s resting position to CSS pixel coords in the WebGL canvas, or null if off-screen/unavailable. */
  ceilingProjectInstance(index: number): { x: number; y: number } | null;
  /** The instance nearest the current camera: its screen position and an analytic device-pixel size estimate — spec §8 Phase 8's done-test. */
  ceilingClosestInstance(): CeilingClosestInstanceInfo | null;
  /** The progress rail's current fill fraction (0..1), read from the same ScrollTrigger that drives it — spec §4.4/§8 Phase 9. */
  progressRail(): number | null;
  /** Whether the shared AudioContext has ever been constructed — spec §8 Phase 10's done-test asserts this stays false with the toggle off. */
  audioContextConstructed(): boolean;
  /** Whether the audio toggle is currently on. */
  audioEnabled(): boolean;
  /** Names of every sound actually started (one-shot or loop) since the page loaded or the log was last cleared — test-only, proves a piece's sound hook fired. */
  soundPlayLog(): string[];
  clearSoundPlayLog(): void;
}

declare global {
  interface Window {
    __ready?: boolean;
    __test?: TestApi;
  }
}
