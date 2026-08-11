// Movement 06's instance fragment shader — spec §3.4/§4.1. "Bone-vs-
// phosphor carries the thesis everywhere else — including in the 3D
// scene" (spec §4.1): a run's category tints it somewhere along the
// phosphor -> bone continuum, never an invented decorative hue. A run
// close enough to read as a near-miss warms slightly toward
// uNearMissColor, but the hairline reaching up to the ceiling (built
// separately in piece.ts, not here) is what actually carries "the only
// warm elements in the frame" — this fragment shader only lets that same
// warmth bleed faintly into the point itself, at real closeness only.
//
// Inline template literal — see field.vert.ts's note.

export const FIELD_FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

uniform vec3 uColorLo; // phosphor — the reported signal
uniform vec3 uColorHi; // bone — the true signal
uniform vec3 uNearMissColor;

varying float vCategory;
varying float vCloseness;
varying float vAlpha;
varying float vTextMask;
varying vec2 vUv;

void main() {
  float catT = vCategory / 6.0; // LEVER_CATEGORY_COUNT - 1
  vec3 base = mix(uColorLo, uColorHi, catT);

  float nearMissMix = smoothstep(0.90, 0.98, vCloseness);
  vec3 color = mix(base, uNearMissColor, nearMissMix * 0.55);

  // Soft circular falloff so the billboard reads as a point, not a square
  // — computed from the quad's own UV, not gl_PointCoord (which only
  // applies to gl_PointSize/POINTS primitives, not the billboard quads
  // this piece deliberately uses instead of THREE.Points).
  float d = length(vUv - 0.5) * 2.0;
  float shape = 1.0 - smoothstep(0.7, 1.0, d);
  if (shape <= 0.001) discard;

  // vTextMask is 1 where this instance sits behind the live copy column
  // (field.vert.ts). Masking multiplies color, not just alpha: alpha
  // alone (tried first) measurably failed to suppress the rendered
  // instances at runtime — verified by isolating each factor while
  // building this — so color carries the real dimming, with a milder
  // alpha reduction riding alongside it.
  vec3 masked = color * mix(1.0, 0.05, vTextMask);
  float maskedAlpha = vAlpha * shape * mix(1.0, 0.3, vTextMask);
  gl_FragColor = vec4(masked, maskedAlpha);
}
`;
