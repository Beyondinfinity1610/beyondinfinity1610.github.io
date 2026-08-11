// Movement 06's instance vertex shader — spec §3.4: "the settle spring is
// computed in the vertex shader from uProgress; zero CPU per frame." Each
// instance rises from below the floor and settles into its resting
// position (aBasePos) on an analytic, critically-damped-looking spring —
// a closed-form function of a single scalar (uSettle), not a simulation,
// so there is nothing to step on the CPU. Billboarding (facing the camera)
// is also done here, from the view matrix's own basis vectors, rather than
// via THREE.Points/gl_PointSize — spec §3.4's explicit "not THREE.Points,
// which is what produced the historical empty-void bug; instance sizes
// come from real world units and cannot go sub-pixel."
//
// Inline template literal, not vite-plugin-glsl — see vite.config.ts's note
// on spec §7.4's Explicit Uncertainty.

export const FIELD_VERTEX_SHADER = /* glsl */ `
uniform float uSettle;      // 0..1 — field-wide settle driver (compressed from progress)
uniform float uInstanceSize; // world units — real size, never sub-pixel
// Screen-space (0..1, y-down — same convention piece.ts's own
// projectInstanceToScreen already uses) bounds of the section's live copy
// column: left, top, right, bottom. A degenerate/off-screen rect (the
// piece.ts default) makes vTextMask always evaluate to 0 — masking is
// opt-in from real measured text bounds, never a hardcoded guess.
uniform vec4 uTextRect;

attribute vec3 aBasePos;
attribute float aCategory;
attribute float aCloseness;
attribute float aSeed;

varying float vCategory;
varying float vCloseness;
varying float vAlpha;
varying float vTextMask;
varying vec2 vUv;

// A closed-form stand-in for a damped spring: starts at 0, oscillates
// through 1 with decaying amplitude, and is clamped so the overshoot can
// never exceed 15% of the travel distance — field.ts's CEILING_MARGIN is
// sized around exactly this bound, so the animated instance can never
// cross the ceiling plane even mid-bounce.
float settle(float t) {
  float damping = 4.5;
  float frequency = 5.0;
  float raw = 1.0 - exp(-damping * t) * cos(frequency * t);
  return clamp(raw, 0.0, 1.15);
}

void main() {
  vUv = uv;
  vCategory = aCategory;
  vCloseness = aCloseness;

  // Per-instance stagger — spec's "field" should not pop in as one block.
  // aSeed spreads each instance's local settle window across the leading
  // 35% of uSettle's own range, so by uSettle=1 every instance (even the
  // most delayed) has had a full local window to complete its spring.
  float delay = aSeed * 0.35;
  float local = clamp((uSettle - delay) / max(0.0001, 1.0 - delay), 0.0, 1.0);
  float se = settle(local);

  vAlpha = smoothstep(0.0, 0.12, local);

  vec3 startPos = vec3(aBasePos.x, -1.6, aBasePos.z);
  vec3 instPos = mix(startPos, aBasePos, se);

  // Billboard: offset the local quad corner (position.xy, -0.5..0.5) along
  // the camera's own right/up axes (the view matrix's rows), not the
  // instance's own orientation — this is what keeps every quad facing the
  // camera regardless of where it sits in the field.
  vec3 cameraRight = vec3(viewMatrix[0].x, viewMatrix[1].x, viewMatrix[2].x);
  vec3 cameraUp    = vec3(viewMatrix[0].y, viewMatrix[1].y, viewMatrix[2].y);
  vec3 corner = (position.x * cameraRight + position.y * cameraUp) * uInstanceSize;

  vec3 worldPos = instPos + corner;
  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);

  // Marks (never hard-cut, feathered ~2% of screen) any instance that
  // projects behind the live copy column — the same problem trace-piece.ts
  // solves by repositioning its 2D draw around a measured DOM rect, solved
  // here in screen space instead because these are billboards in a 3D
  // scene, not a 2D canvas layout. vTextMask carries insideText (1 =
  // behind text) through to field.frag.ts, which is where the actual
  // dimming happens — alpha-only masking measurably failed to suppress
  // rendering here even at vTextMask=0 (verified while building this: the
  // value itself was confirmed correct by visualizing it directly as a
  // fragment color, so the fragment shader instead darkens color, with a
  // milder alpha reduction riding alongside it — see that file's comment).
  vec2 screenPos = (gl_Position.xy / gl_Position.w) * 0.5 + 0.5;
  screenPos.y = 1.0 - screenPos.y;
  float feather = 0.02;
  float insideX = smoothstep(uTextRect.x - feather, uTextRect.x + feather, screenPos.x)
    * (1.0 - smoothstep(uTextRect.z - feather, uTextRect.z + feather, screenPos.x));
  float insideY = smoothstep(uTextRect.y - feather, uTextRect.y + feather, screenPos.y)
    * (1.0 - smoothstep(uTextRect.w - feather, uTextRect.w + feather, screenPos.y));
  vTextMask = insideX * insideY;
}
`;
