// ~16 plates on a gentle S-curve in Z, sharing one PlaneGeometry — spec
// §3.2. Each plate gets its own lightweight Texture wrapper (same source
// canvas, different offset/repeat) rather than its own geometry, so the
// geometry is genuinely shared while each plate still frames its own
// atlas cell.

import { PlaneGeometry, MeshBasicMaterial, Mesh, Texture, SRGBColorSpace, Vector3, Group } from 'three';
import { PLATE_COUNT, cellUV, drawPlateAtlas } from './plate-atlas';

const PLATE_WIDTH = 2.4;
const PLATE_HEIGHT = 1.2; // matches the atlas cell's 2:1 aspect

export interface PlateHandle {
  mesh: Mesh;
  index: number;
  position: Vector3;
}

/** The S-curve path plates and the camera dolly both follow. */
export function curvePoint(t: number): Vector3 {
  const z = -t * 26;
  const x = Math.sin(t * Math.PI * 1.6) * 3.4;
  const y = Math.sin(t * Math.PI * 0.8) * 0.7;
  return new Vector3(x, y, z);
}

export function curveTangent(t: number): Vector3 {
  const eps = 0.001;
  const a = curvePoint(Math.max(0, t - eps));
  const b = curvePoint(Math.min(1, t + eps));
  return b.clone().sub(a).normalize();
}

/**
 * plateCount defaults to the full atlas (PLATE_COUNT=16, desktop). Spec
 * §6.3's mobile rule (<760px or coarse) asks for 9 — the atlas itself
 * stays 16 cells either way (plate-atlas.ts is unconditional), only the
 * subset placed along the curve shrinks, so the legible cell's index
 * (plate-atlas.ts's LEGIBLE_PLATE_INDEX=7) still falls inside the 9-plate
 * range and stays visible on mobile too.
 */
export function buildPlates(
  atlasCanvas: HTMLCanvasElement,
  plateCount: number = PLATE_COUNT,
): { group: Group; plates: PlateHandle[] } {
  drawPlateAtlas(atlasCanvas);

  const geometry = new PlaneGeometry(PLATE_WIDTH, PLATE_HEIGHT);
  const group = new Group();
  const plates: PlateHandle[] = [];

  for (let i = 0; i < plateCount; i++) {
    const uv = cellUV(i);
    // A separate Texture wrapper per plate (same .image, own offset/repeat)
    // — this is what "shares one atlas draw" while letting each plate
    // frame its own cell without needing its own geometry/UVs.
    const texture = new Texture(atlasCanvas);
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.offset.set(uv.offsetX, uv.offsetY);
    texture.repeat.set(uv.repeatX, uv.repeatY);
    texture.needsUpdate = true;

    const material = new MeshBasicMaterial({ map: texture, transparent: false });
    const mesh = new Mesh(geometry, material);

    const t = i / (plateCount - 1);
    const pos = curvePoint(t);
    mesh.position.copy(pos);
    const tangent = curveTangent(t);
    // lookAt(target) points local -Z at target, i.e. the front face (local
    // +Z) ends up facing AWAY from target — so to face the camera, which
    // approaches from the lower-t/"behind" side (piece.ts's dolly sits
    // `tangent`-distance behind the current curve point), the plate must
    // look toward pos - tangent, not pos + tangent. The opposite target
    // (originally + tangent) pointed the front face toward oncoming
    // plates instead of the approaching camera, which either culled the
    // plate entirely under single-sided rendering or, under a DoubleSide
    // patch, showed its back face — text mirrored left-to-right.
    mesh.lookAt(pos.clone().sub(tangent));

    mesh.userData.plateIndex = i;
    group.add(mesh);
    plates.push({ mesh, index: i, position: pos });
  }

  return { group, plates };
}

export { PLATE_WIDTH, PLATE_HEIGHT };
