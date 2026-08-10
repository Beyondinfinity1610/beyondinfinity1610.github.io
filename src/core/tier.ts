// Device tier scoring (once, at boot) + runtime one-way FPS demotion —
// spec §6.3. Real demotion actions (DPR→1, bloom off, instances halved)
// belong to the WebGL pieces that land in Phase 5/6; this module owns the
// scoring and the EMA monitor that later phases hook into.

export type Tier = 'high' | 'mid' | 'low';

interface NavigatorConnection {
  saveData?: boolean;
}
interface ExtendedNavigator extends Navigator {
  connection?: NavigatorConnection;
  deviceMemory?: number;
}

export function computeTier(): Tier {
  const nav = navigator as ExtendedNavigator;
  if (nav.connection?.saveData) return 'low';

  let score = 0;
  const cores = nav.hardwareConcurrency ?? 4;
  if (cores >= 8) score += 2;
  else if (cores >= 6) score += 1;

  if (nav.deviceMemory && nav.deviceMemory >= 8) score += 1;

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (coarse && window.innerWidth < 900) score -= 2;

  if ((window.devicePixelRatio || 1) > 2.5) score -= 1;

  let hasWebGL2 = false;
  try {
    hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
  } catch {
    hasWebGL2 = false;
  }
  if (!hasWebGL2) score -= 3;

  if (score >= 3) return 'high';
  if (score >= 1) return 'mid';
  return 'low';
}

export function dprCap(tier: Tier): number {
  const raw = window.devicePixelRatio || 1;
  const cap = tier === 'high' ? 2 : tier === 'mid' ? 1.5 : 1;
  return Math.min(raw, cap);
}

/**
 * EMA of frame time. If avg FPS < 45 for 2 continuous seconds while a WebGL
 * piece is active, fire `onDemote` once and never again — one-way, so it
 * cannot oscillate (spec §6.3).
 */
export class FpsMonitor {
  private emaFps = 60;
  private belowSince: number | null = null;
  private demoted = false;

  constructor(private onDemote: () => void, private thresholdFps = 45, private holdSeconds = 2) {}

  sample(dt: number): void {
    if (this.demoted || dt <= 0) return;
    const instFps = 1 / dt;
    this.emaFps = this.emaFps * 0.9 + instFps * 0.1;

    if (this.emaFps < this.thresholdFps) {
      if (this.belowSince === null) this.belowSince = performance.now();
      else if (performance.now() - this.belowSince >= this.holdSeconds * 1000) {
        this.demoted = true;
        this.onDemote();
      }
    } else {
      this.belowSince = null;
    }
  }

  get isDemoted(): boolean {
    return this.demoted;
  }
}
