// 1/255 dither for dark gradients — spec §4.5: "Banding in dark gradients
// is genuine at these luminances on 8-bit panels." Interleaved-gradient
// noise reads as blue noise perceptually and is one ALU-cheap line, unlike
// an actual blue-noise texture lookup. A GLSL snippet, not a full shader —
// scenes with their own background/fog gradient (movements 04, 06) splice
// `ditherNoise`/`applyDither` into their fragment shader.
//
// Inline template literals, not vite-plugin-glsl — see vite.config.ts's
// note on spec §7.4's Explicit Uncertainty.

export const DITHER_GLSL = /* glsl */ `
float ditherNoise(vec2 fragCoord) {
  return fract(52.9829189 * fract(dot(fragCoord, vec2(0.06711056, 0.00583715))));
}

vec3 applyDither(vec3 color, vec2 fragCoord) {
  float n = ditherNoise(fragCoord) - 0.5;
  return color + n * (1.0 / 255.0);
}
`;
