# beyondinfinity1610.github.io

Personal site — Thejeshwaar Sathishkumar.

## The rule that matters most

**Unpublished research methodology and results do not go on this site.**

Two manuscripts are in preparation. An early version of this page carried the
full architecture of the seizure-detection system, its ablation campaign and its
headline metrics. That is exactly the material under review, and it was removed
for that reason.

What the work section may say:

- the **problem**, and why it is hard
- the **scale**, but only using facts that are properties of a *public* dataset
- the **role** and current status ("in preparation", "under review")
- other people's *published* numbers, attributed as theirs
- an offer to discuss privately

What it may never say — in visible text, in `alt` attributes, in data files, in
code comments or in commit messages:

- any architecture component name, layer configuration, kernel size, parameter
  count or loss design
- any of *his* metrics — AUROC, event-F1, sensitivity, false-alarm rate,
  precision
- the research gaps and their stated contributions
- the specific diagnostic findings, the ablation table, or the ceiling map
- the per-band connectivity separability counts
- CGPA, phone number, employer-internal detail
- the superseded figures from the invalidated evaluation, in any context other
  than a correction

Method vocabulary in the skills list ("graph attention", "domain adaptation",
"phase-based connectivity") is fine: that is capability, not a description of a
specific unpublished system.

**Movement 03 (`try`) generates its data synthetically in the browser from a
fixed seed, and is driven by a textbook 2001 line-length detector attributed by
name — Esteller et al.** It is a demonstration of the problem's difficulty, not
a result. The redacted topology in movement 04 (`withheld`) is the deliberate
expression of the same rule for the real system: stage count, block shapes and
flow direction are visible; every label is a bar.

This is enforced mechanically by `scripts/disclosure-check.mjs` — see
[`docs/SPEC.md`](docs/SPEC.md) §7.3 for how the checker works without ever
storing the banned vocabulary in plaintext in this repo. Run it yourself:

```
node scripts/disclosure-check.mjs
```

It runs again automatically via `.githooks/pre-commit` and `.githooks/commit-msg`
(installed by `npm install` via the `prepare` script), and in CI before every
deploy.

## Running it

Vite + TypeScript, as of the 2026-08 rebuild — see `docs/SPEC.md` for why the
static/no-build era ended.

```
npm install
npm run dev
```

`npm run build` produces `dist/`. `npm run verify` runs the full gate:
disclosure check → typecheck → unit tests → build → bundle size budgets → the
Playwright screenshot harness. Deploy is still "push to `main`" — GitHub Actions
builds and publishes it (Settings → Pages → Source must be **GitHub Actions**).

Zero third-party requests at runtime: fonts are self-hosted under
`public/fonts/`, and the Playwright harness asserts this mechanically (spec
§7.5). Do not add a CDN link, a Google Fonts `<link>`, or analytics.

## Structure

The full repo layout and the reasoning behind each piece is
[`docs/SPEC.md`](docs/SPEC.md) §7.2. In short:

| Path | What it is |
|---|---|
| `index.html` | All long-form copy, semantic markup only. Source of truth — works with JS off. |
| `src/main.ts` | Entry: boot, register plugins, schedule lazy chunks. |
| `src/core/` | The single rAF loop, Lenis↔ScrollTrigger bridge, viewport/tier state. |
| `src/pieces/` | Each movement's set-piece: mount/unmount/fit/frame, isolated per-scene. |
| `src/signal/` | The synthetic-EEG generator for movement 03. No DOM. |
| `src/content/strings.ts` | JS-injected micro-copy only — everything longer than a phrase lives in `index.html`. |
| `disclosure/` | The hash-based red-list and the allow-list. See above. |
| `scripts/` | Disclosure checker, bundle-size checker, contact-sheet generator. |
| `tests/` | `signal.spec.ts` (pure-logic unit tests), `shots.spec.ts` (the screenshot harness). |

## How the page and the scene stay locked together

One `WebGLRenderer` on one canvas, but independent `Scene`/`Camera` pairs per
piece, each with a local 0..1 progress driven by its own `ScrollTrigger`
(measurement only — it never animates the canvas directly). A `Director`
gates which piece is active and hides the canvas the instant none are — see
`docs/SPEC.md` §5.3–§5.4 for why the old single-corridor depth architecture
(`js/world.js`, now removed) was abandoned rather than repaired.

## Things that used to break, and how the new stack handles them

The full table is spec §5.4. Summary: most of the nine historical bugs are
*moot by construction* under this architecture (per-section scenes instead of
a shared depth corridor, `ScrollTrigger` instead of hand-rolled `offsetTop`
math, `InstancedMesh` instead of `THREE.Points`). The two that remain real
under any stack — fixed chrome needing its own scrim, and set pieces needing
to scale on narrow viewports — are still handled explicitly in `chrome.css`
and each piece's `fit(w, h)`.

## Before you push

`npm run verify`, then **open `shots/index.html` and look at the images** —
not the terminal output. Every visual bug this site has ever shipped was
invisible in code and obvious in a screenshot.
