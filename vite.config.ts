import { defineConfig } from 'vite';

// Spec §7.4's Explicit Uncertainty: vite-plugin-glsl vs inline template
// literals for shader source. Decided here in favour of inline template
// literals — one fewer dependency, one fewer version-coupling surface to
// track (spec's own uncertainty list separately flags
// postprocessing/three version coupling, which is enough plugin-adjacent
// risk for one build). Shaders live as exported `const ... = /* glsl */ \`...\`
// strings in src/gl/shaders/*.ts.
//
// webgl-director.ts / composer.ts / topology/piece.ts are deliberately NOT
// forced into the 'webgl' manual chunk alongside three+postprocessing,
// even though they're only ever reached together (movement 04's onEnter).
// topology/piece.ts's chain (via plates.ts) shares plate-atlas.ts with
// fallback-2d/topology-2d.ts — the eager, always-registered no-WebGL
// fallback (spec §3.2's "reuses it verbatim"). Forcing piece.ts into the
// same physical chunk as three.js pulls that shared dependency's chunk
// into the eager entry's static import graph, which makes Rollup treat
// the WHOLE merged chunk (three.js included) as needed synchronously at
// page load — a real regression that was caught by webgl.spec.ts's
// lazy-load done-tests (the chunk was showing up as an eager
// modulepreload in dist/index.html, defeating the entire lazy-load
// point). Left alone, Rollup auto-chunks these into their own small
// files; size-check.mjs's eager/lazy split (by index.html reference, not
// filename substring) buckets them into the lazy budget correctly anyway.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    // false, not just `{ polyfill: false }`: Vite's default modulePreload
    // still injects <link rel="modulepreload"> for any chunk it sees a
    // syntactic dynamic import() reaching from the entry — it can't know
    // ScrollTrigger's onEnter gate exists, so instrument/webgl would get
    // eagerly fetched (bytes on the wire on every visit) regardless of
    // when they're actually *executed*. Spec §5.5/§6.1 wants those chunks
    // not competing with fonts for bandwidth on first paint — `false`
    // turns the injection off entirely so only the real dynamic import()
    // call, gated by scroll proximity, ever requests them.
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 2048,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // three + postprocessing forced into 'webgl' — spec §7.4. NOT
          // src/signal/** here — feature.ts is shared with the eager
          // trace piece (spec §3.1), so forcing it into a lazy chunk
          // would make the whole thing load eagerly, defeating "lazy".
          if (id.includes('/node_modules/three/') || id.includes('/node_modules/postprocessing/')) return 'webgl';
          // audit/** (movement 05) forced alongside instrument/** — spec
          // §6.1's budget table groups "signal generator, instrument,
          // audit" under one ≤22KB lazy chunk, and size-check.mjs buckets
          // by filename substring ("instrument"), so both need to land in
          // the physical chunk that name actually applies to.
          if (id.includes('/src/pieces/instrument/') || id.includes('/src/pieces/audit/')) return 'instrument';
        },
      },
    },
  },
});
