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

What it must not say: architecture component names, layer or kernel
configurations, parameter counts, loss design, any of his own metrics, the
stated research gaps, the specific diagnostic findings, the ablation table, or
the connectivity separability table. Not in visible text, not in `alt`
attributes, not in data files, not in code comments, not in commit messages.

Never repeat the superseded figures (53% event-F1, 91% precision) outside a
correction. They are artifacts of an evaluation that was later found invalid.

Published patents are fine — a granted publication is already public. Public
repositories are fine. General method vocabulary in the skills list is fine as
*capability*; it is deliberately kept clear of the handful of terms that would
fingerprint the withheld architecture.

If a manuscript is accepted, that entry can be expanded and linked to the paper.
Not before.

Grep the site for red-list terms before pushing.

## Design

An instrument cluster: blue-black, a cold backlight (`--ice`) as the primary
accent and one warm warning colour (`--warn`) used sparingly, the way a car's
dash uses amber. Instrument Serif for display against JetBrains Mono. The
written content rides over the 3D world on smoked-glass panels with corner
ticks, so it stays legible against anything behind it.

## How the page works

**It is one continuous flight through one 3D space.** There are no separate
scenes and no sticky canvases. `js/world.js` builds a single scene; scroll
position drives a camera along a spline through it, and the regions arrive in
order:

| region | what it is |
|---|---|
| ignition | an inline four, turning over, then letting go |
| montage | the 10-20 electrode network, wired |
| corridor | a tunnel of recordings the camera flies down |
| archive | the redacted architecture, passed through |
| volume | the search — a field of runs you are *inside*, not looking at |
| settle | open space |

**Regions are positioned by `layout()`, not by hand.** `measure()` in `main.js`
computes where each section sits as a fraction of total scroll and passes those
marks in; `layout()` places each landmark at the depth the camera reaches when
its own section is on screen, offset a little further on so you approach it
rather than spawning inside it. This means the world can never drift out of sync
with the writing when copy is edited. **Do not go back to hard-coded z values.**

**The intro is not a preloader.** `js/intro.js` paints on the first frame with
plain DOM while three.js loads in parallel; nothing waits on anything. Any
intent to move — wheel, touch, key, or the skip button — ends it immediately.

## Disclosure rules baked into the code

Both are stated in the header of `world.js` and must survive any edit:

- **The archive carries no component names.** Its labels are generated bars and
  glyph-shaped rectangles, so nothing confidential exists in the source, the DOM
  or the network tab. The single legible plate is the input, because the input is
  a public dataset.
- **The volume has no axes, no labels, no experiment names and no values.**
  Heights come from a fixed seed and encode nothing. It may show that a large
  systematic search happened and that it ended at a limit. Nothing more.

The adjacency in `js/data/eeg.js` is generated geometry for the visual, **not
measured connectivity** — real connectivity from the research would be a
disclosure.

## Stack

No framework, no build step, no bundler. GitHub Pages serves the files as they
are; editing and pushing is the whole deploy. three.js and the fonts are
vendored, so the page makes no third-party requests.

Test with `python -m http.server` from the repo root — opening `index.html` over
`file://` fails because it uses ES modules.

## Notes for future edits

- **Entrances do not use IntersectionObserver.** Its callbacks are suspended in
  throttled and background tabs, and a suspended callback means content that
  never appears. Everything goes through `onEnter()` in `main.js`, driven from
  the scroll handler and the frame loop. The check has no lower bound on purpose:
  anything already above the viewport must resolve immediately, or a restored
  scroll position leaves the page blank.
- **`offsetTop` is not used for scroll maths** — sections sit inside positioned
  ancestors. Use `docTop()`.
- **Clamp `gl_PointSize`.** The camera flies *through* the point clouds; without
  a ceiling, a point a metre from the lens fills the screen with bokeh. Both
  custom shaders clamp, and the `PointsMaterial` clouds keep an inner radius
  clear of the flight line for the same reason.
- **Landmarks are lifted and shrunk on tall viewports** (`this.narrow` in
  `layout()`), because on a phone the copy owns the lower two thirds. `resize()`
  re-runs `layout()` since narrow can flip.
- The HUD is hidden below 760px; it would sit on the copy.
- `prefers-reduced-motion` and missing WebGL both set `body.flat`: no intro, no
  world, a static gradient, and every entrance resolved. The page reads fully
  without any of the 3D.
- When verifying in headless Chrome over CDP, **disable the cache**
  (`Network.setCacheDisabled`). Module scripts are cached hard enough that edits
  appear not to have taken effect.
