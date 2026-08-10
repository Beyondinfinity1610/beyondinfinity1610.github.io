#!/usr/bin/env node
// Emits shots/index.html — a contact sheet of every screenshot the harness
// took, grouped by viewport project. Spec §7.5: "Open it at the end of
// every phase." This is what makes that a two-second habit instead of an
// aspiration.

import { readdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = join(ROOT, 'shots');

function main() {
  if (!existsSync(SHOTS)) {
    console.error('shots/ not found — run the Playwright harness first');
    process.exit(1);
  }

  const projects = readdirSync(SHOTS).filter((name) => {
    const full = join(SHOTS, name);
    return statSync(full).isDirectory() && name !== '.artifacts' && name !== 'report';
  });

  let total = 0;
  const sections = projects
    .sort()
    .map((project) => {
      const dir = join(SHOTS, project);
      const images = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
      total += images.length;
      const cards = images
        .map(
          (img) => `
        <figure>
          <img src="${project}/${img}" loading="lazy" alt="${project} — ${img}" />
          <figcaption>${img.replace('.png', '')}</figcaption>
        </figure>`
        )
        .join('');
      return `
      <section>
        <h2>${project} <span class="count">${images.length}</span></h2>
        <div class="grid">${cards}</div>
      </section>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Contact sheet — ${total} shots</title>
<style>
  body { margin: 0; background: #06080a; color: #ece7de; font-family: ui-sans-serif, system-ui, sans-serif; }
  header { padding: 2rem clamp(1rem,4vw,3rem); border-bottom: 1px solid rgba(214,224,226,0.17); }
  h1 { font-weight: 400; margin: 0 0 0.3rem; }
  .meta { color: #8a8279; font-family: ui-monospace, monospace; font-size: 0.85rem; }
  section { padding: 1.5rem clamp(1rem,4vw,3rem); border-bottom: 1px solid rgba(214,224,226,0.1); }
  h2 { font-family: ui-monospace, monospace; font-weight: 400; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.9rem; color: #4fb0a8; }
  .count { color: #8a8279; font-weight: 400; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
  figure { margin: 0; border: 1px solid rgba(214,224,226,0.17); background: #0c0f11; }
  img { width: 100%; display: block; background: #000; }
  figcaption { padding: 0.5rem 0.75rem; font-family: ui-monospace, monospace; font-size: 0.75rem; color: #b9b2a8; }
</style>
</head>
<body>
<header>
  <h1>Contact sheet</h1>
  <p class="meta">${total} screenshots · generated ${new Date().toISOString()}</p>
</header>
${sections}
</body>
</html>`;

  writeFileSync(join(SHOTS, 'index.html'), html);
  console.log(`shots/index.html written — ${total} screenshots across ${projects.length} projects`);
}

main();
