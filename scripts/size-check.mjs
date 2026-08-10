#!/usr/bin/env node
// Bundle budget enforcement — spec §6.1. Budgets are gzipped sizes.
// Chunks that don't exist yet (instrument/webgl land in later phases)
// are skipped rather than failed — the budget only binds once the chunk
// exists to bind on.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

const KB = 1024;
const BUDGETS = {
  entry: 70 * KB,
  instrument: 22 * KB,
  webgl: 210 * KB,
  css: 16 * KB,
  fonts: 130 * KB,
  totalJs: 300 * KB,
};

function gz(path) {
  return gzipSync(readFileSync(path)).length;
}

function fmt(bytes) {
  return `${(bytes / KB).toFixed(1)} KB`;
}

function main() {
  if (!existsSync(DIST)) {
    console.error('dist/ not found — run `npm run build` first');
    process.exit(1);
  }

  const assetsDir = join(DIST, 'assets');
  const jsFiles = existsSync(assetsDir)
    ? readdirSync(assetsDir).filter((f) => extname(f) === '.js').map((f) => join(assetsDir, f))
    : [];
  const cssFiles = existsSync(assetsDir)
    ? readdirSync(assetsDir).filter((f) => extname(f) === '.css').map((f) => join(assetsDir, f))
    : [];

  // "entry" means eagerly loaded on first paint — determined by whether
  // index.html actually references the file (<script type=module src=...>
  // or <link rel=modulepreload href=...>), not by filename. A substring
  // match ("webgl" in the name) can't tell an eager chunk from a lazy one
  // — e.g. webgl-director.ts/composer.ts/topology/piece.ts are lazy
  // satellites of the WebGL layer that Rollup happens to auto-name
  // distinctly from the 'webgl' manual chunk. Everything NOT referenced by
  // index.html only ever loads via a runtime dynamic import(), i.e. lazy.
  let indexHtml = '';
  const distIndexPath = join(DIST, 'index.html');
  if (existsSync(distIndexPath)) indexHtml = readFileSync(distIndexPath, 'utf8');
  const eagerHrefs = new Set(
    [...indexHtml.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="([^"]+\.js)"/g)].map((m) => m[1]),
  );

  let entrySize = 0, instrumentSize = 0, webglSize = 0;
  for (const f of jsFiles) {
    const size = gz(f);
    const href = `/assets/${f.split(/[\\/]/).pop()}`;
    const base = f.toLowerCase();
    if (eagerHrefs.has(href)) {
      entrySize += size;
    } else if (base.includes('instrument')) {
      instrumentSize += size;
    } else {
      // every other lazy chunk — the real 'webgl' bundle plus its small
      // lazy satellites (webgl-director/composer/topology/piece etc.) and
      // any other debug-only lazy chunk (e.g. signal-debug.ts).
      webglSize += size;
    }
  }

  let cssSize = 0;
  for (const f of cssFiles) cssSize += gz(f);

  // fonts actually preloaded, per index.html
  let fontsSize = 0;
  const preloads = [...indexHtml.matchAll(/<link rel="preload" href="([^"]+\.woff2)"/g)].map((m) => m[1]);
  for (const href of preloads) {
    const fontPath = join(DIST, href.replace(/^\//, ''));
    if (existsSync(fontPath)) fontsSize += gz(fontPath);
  }

  const totalJs = entrySize + instrumentSize + webglSize;

  const rows = [
    ['entry', entrySize, BUDGETS.entry, jsFiles.length > 0],
    ['instrument (lazy)', instrumentSize, BUDGETS.instrument, instrumentSize > 0],
    ['webgl (lazy)', webglSize, BUDGETS.webgl, webglSize > 0],
    ['css', cssSize, BUDGETS.css, cssFiles.length > 0],
    ['fonts (preloaded)', fontsSize, BUDGETS.fonts, fontsSize > 0],
    ['total JS', totalJs, BUDGETS.totalJs, jsFiles.length > 0],
  ];

  let failed = false;
  for (const [name, size, budget, applicable] of rows) {
    if (!applicable) {
      console.log(`  ${name}: (not present yet — skipped)`);
      continue;
    }
    const ok = size <= budget;
    if (!ok) failed = true;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}: ${fmt(size)} / ${fmt(budget)} budget`);
  }

  if (failed) {
    console.error('\nsize check FAILED — over budget (spec §6.1)');
    process.exit(1);
  }
  console.log('\nsize check passed');
}

main();
