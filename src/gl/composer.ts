// Built lazily, the first time a bloom-using piece (movement 04) activates
// — spec §6.2. Movement 06 uses no composer at all (bloom would smear the
// field and costs a pass it doesn't need). Bloom intensity 0.6: "nothing
// may glare" (spec §4.1) — the legible plate and flow dots are the only
// bright things in frame, so bloom reads them as emissive without
// touching anything else.

import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect } from 'postprocessing';
import type { Tier } from '../core/tier';

export function createComposer(renderer: WebGLRenderer, scene: Scene, camera: Camera, tier: Tier): EffectComposer {
  const composer = new EffectComposer(renderer, {
    frameBufferType: HalfFloatType,
    multisampling: tier === 'high' ? 4 : 0,
  });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new EffectPass(
      camera,
      new BloomEffect({
        luminanceThreshold: 0.72,
        luminanceSmoothing: 0.15,
        intensity: 0.6,
        mipmapBlur: true,
        radius: 0.62,
      })
    )
  );
  return composer;
}
