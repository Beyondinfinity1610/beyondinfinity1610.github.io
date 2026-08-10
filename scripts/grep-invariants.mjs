#!/usr/bin/env node
// CI-grep invariants — spec §5.1/§5.4/§2.2. These are architectural rules
// a type system can't enforce: no self-scheduling frame loop outside
// core/ticker.ts, no offsetTop anywhere, autoRaf:false present, and no
// Math.random in src/signal/** or src/pieces/** (core/rng.ts's
// mulberry32 + hash32 are the only randomness in the app).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const TICKER = join(SRC, 'core', 'ticker.ts');

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (['.ts', '.tsx'].includes(extname(full))) files.push(full);
  }
  return files;
}

function main() {
  const files = walk(SRC);
  const violations = [];

  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    const rel = relative(ROOT, f);
    const lines = content.split('\n');

    // requestAnimationFrame is only allowed inside core/ticker.ts, and only
    // then via gsap.ticker (never called directly even there).
    if (f !== TICKER && /\brequestAnimationFrame\s*\(/.test(content)) {
      lines.forEach((l, i) => {
        if (/\brequestAnimationFrame\s*\(/.test(l)) violations.push(`${rel}:${i + 1} — requestAnimationFrame outside core/ticker.ts`);
      });
    }
    if (/\brequestAnimationFrame\s*\(/.test(content) && f === TICKER) {
      violations.push(`${rel} — requestAnimationFrame must not be called directly, even here (use gsap.ticker)`);
    }

    if (/renderer\.setAnimationLoop\s*\(/.test(content)) {
      lines.forEach((l, i) => {
        if (/renderer\.setAnimationLoop\s*\(/.test(l)) violations.push(`${rel}:${i + 1} — renderer.setAnimationLoop is banned (spec §5.1)`);
      });
    }

    if (/\.offsetTop\b/.test(content)) {
      lines.forEach((l, i) => {
        if (/\.offsetTop\b/.test(l)) violations.push(`${rel}:${i + 1} — offsetTop is banned (spec §5.4), use ScrollTrigger's own measurement`);
      });
    }

    // Math.random is banned in src/signal/** and src/pieces/** — spec §2.2.
    // core/rng.ts's mulberry32 + hash32 are the only randomness in the app.
    const isSignalOrPieces = rel.startsWith('src\\signal\\') || rel.startsWith('src/signal/') ||
      rel.startsWith('src\\pieces\\') || rel.startsWith('src/pieces/');
    if (isSignalOrPieces && /Math\.random\s*\(/.test(content)) {
      lines.forEach((l, i) => {
        if (/Math\.random\s*\(/.test(l)) violations.push(`${rel}:${i + 1} — Math.random is banned in src/signal/** and src/pieces/** (spec §2.2), use core/rng.ts`);
      });
    }

    // A single static `from 'three'` (or 'postprocessing') anywhere
    // reachable from main.ts silently makes the webgl chunk eager,
    // defeating "lazy" — spec §7.4. Only files behind a dynamic import()
    // may reference three/postprocessing at all.
    const isLazyWebglFile = rel.startsWith('src\\gl\\') || rel.startsWith('src/gl/') ||
      rel.endsWith('webgl-placeholder.ts') || rel.includes('pieces\\topology\\') || rel.includes('pieces/topology/') ||
      rel.includes('pieces\\ceiling\\') || rel.includes('pieces/ceiling/');
    if (!isLazyWebglFile) {
      const staticImportRe = /^\s*import\s+.+\sfrom\s+['"](three|postprocessing)(\/[^'"]*)?['"]/m;
      if (staticImportRe.test(content)) {
        lines.forEach((l, i) => {
          if (/^\s*import\s+.+\sfrom\s+['"](three|postprocessing)/.test(l)) {
            violations.push(`${rel}:${i + 1} — static import from three/postprocessing outside src/gl/** makes the webgl chunk eager (spec §7.4)`);
          }
        });
      }
    }

    // Movement 06 — "No axes, no ticks, no numerals anywhere in this piece"
    // (spec §3.4). CI greps pieces/ceiling/** for digit-bearing string
    // literals: no axis label, count, or threshold may ever render as
    // visible text. Numeric literals (positions, counts, uniform values)
    // are untouched — this only flags digits inside quoted/template string
    // literals. Comments are stripped first (this file's own header prose
    // quotes spec section numbers like "§3.4", which would otherwise
    // false-positive).
    const isCeilingPiece = rel.startsWith('src\\pieces\\ceiling\\') || rel.startsWith('src/pieces/ceiling/');
    if (isCeilingPiece) {
      // Block comments are blanked-but-not-removed (newlines kept) so
      // reported line numbers below still match the real file.
      const withoutComments = content
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
        .replace(/\/\/.*$/gm, '');
      const stringLiteralRe = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
      let match;
      while ((match = stringLiteralRe.exec(withoutComments)) !== null) {
        if (/\d/.test(match[0])) {
          const upTo = withoutComments.slice(0, match.index);
          const line = upTo.split('\n').length;
          violations.push(`${rel}:${line} — digit-bearing string literal in pieces/ceiling/** (spec §3.4/§8 Phase 8: no numerals in this piece): ${match[0]}`);
        }
      }
    }
  }

  const hasAutoRafFalse = files.some((f) => readFileSync(f, 'utf8').includes('autoRaf: false'));
  if (!hasAutoRafFalse) {
    violations.push(`no file sets "autoRaf: false" on the Lenis instance (mandatory with Lenis, spec §5.1)`);
  }

  if (violations.length > 0) {
    console.error(`grep invariants FAILED — ${violations.length} violation(s):`);
    violations.forEach((v) => console.error(`  ${v}`));
    process.exit(1);
  }

  console.log(`grep invariants passed (${files.length} files scanned)`);
}

main();
