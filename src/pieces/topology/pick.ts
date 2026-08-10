// Raycast picking on 16 planes — spec §3.2. pointermove is throttled to
// once per frame (mark-dirty on the event, resolve in the frame loop —
// never raycast inside the event handler itself). The canvas bounding
// rect is cached on resize, never read per pointermove: "calling it per
// pointermove is a real 60→45 fps regression."

import { Raycaster, Vector2, type Camera } from 'three';
import type { PlateHandle } from './plates';

export class PlatePicker {
  private raycaster = new Raycaster();
  private ndc = new Vector2();
  private dirty = false;
  private rect: DOMRect | null = null;
  private hoveredIndex: number | null = null;

  constructor(private canvas: HTMLCanvasElement, private plates: PlateHandle[]) {
    canvas.addEventListener('pointermove', this.onPointerMove);
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.rect) this.rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((e.clientX - this.rect.left) / this.rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - this.rect.top) / this.rect.height) * 2 + 1;
    this.dirty = true;
  };

  /** Call on resize/fit — the one place the bounding rect is measured. */
  refreshRect(): void {
    this.rect = this.canvas.getBoundingClientRect();
  }

  /** Call once per frame. Returns the currently hovered plate index, or null. */
  resolve(camera: Camera): number | null {
    if (this.dirty) {
      this.dirty = false;
      this.raycaster.setFromCamera(this.ndc, camera);
      const meshes = this.plates.map((p) => p.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);
      this.hoveredIndex = intersects.length > 0 ? (intersects[0].object.userData.plateIndex as number) : null;
    }
    return this.hoveredIndex;
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
  }

  /** Test-only: times a raycast against the last-known pointer NDC,
   *  bypassing the dirty flag — spec §8 Phase 6's "raycast under 0.3 ms". */
  measureResolveMs(camera: Camera): number {
    const meshes = this.plates.map((p) => p.mesh);
    const t0 = performance.now();
    this.raycaster.setFromCamera(this.ndc, camera);
    this.raycaster.intersectObjects(meshes, false);
    return performance.now() - t0;
  }
}
