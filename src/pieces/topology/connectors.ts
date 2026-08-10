// Thin quads connecting adjacent plates, with travelling flow dots — spec
// §3.2. A quad per gap (not a Line — a Line can't take width, and even a
// hairline reads as more "structure" than a 1px stroke would here), plus
// one small sprite per connector animated along its length each frame.

import {
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  Vector3,
  Group,
  CanvasTexture,
  Sprite,
  SpriteMaterial,
} from 'three';
import type { PlateHandle } from './plates';

const CONNECTOR_WIDTH = 0.03;

function buildDotTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(159, 224, 214, 0.95)');
  grad.addColorStop(1, 'rgba(159, 224, 214, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  return texture;
}

export interface ConnectorHandle {
  from: Vector3;
  to: Vector3;
  dot: Sprite;
  phase: number;
  speed: number;
}

export function buildConnectors(plates: PlateHandle[], colorHex: number): { group: Group; connectors: ConnectorHandle[] } {
  const group = new Group();
  const connectors: ConnectorHandle[] = [];
  const dotTexture = buildDotTexture();

  for (let i = 0; i < plates.length - 1; i++) {
    const from = plates[i].position;
    const to = plates[i + 1].position;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const length = from.distanceTo(to);
    const direction = to.clone().sub(from).normalize();

    const geometry = new PlaneGeometry(CONNECTOR_WIDTH, length);
    const material = new MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.35 });
    const quad = new Mesh(geometry, material);
    quad.position.copy(mid);
    // orient the plane's local +Y along the connector direction
    quad.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);
    group.add(quad);

    const dotMaterial = new SpriteMaterial({ map: dotTexture, transparent: true, depthWrite: false });
    const dot = new Sprite(dotMaterial);
    dot.scale.setScalar(0.18);
    group.add(dot);

    connectors.push({ from, to, dot, phase: i * 0.37, speed: 0.25 + (i % 3) * 0.08 });
  }

  return { group, connectors };
}

export function advanceConnectors(connectors: ConnectorHandle[], dt: number): void {
  for (const c of connectors) {
    c.phase += dt * c.speed;
    const t = c.phase % 1;
    c.dot.position.lerpVectors(c.from, c.to, t);
  }
}
