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

The redacted topology in the 3D scene is the deliberate expression of this rule.
Stage count, block shapes and flow direction are visible; every label is a bar.
Keep it that way — the moment real text goes on those plates, the rule is broken.

## Running it

Static, no build step, no bundler, no framework. Editing a file and pushing to
`main` is the whole deploy.

```
python -m http.server 8000
```

Everything is vendored under `vendor/` — three.js and all four font files. The
page makes **zero third-party requests**. Do not add a CDN link, a Google Fonts
`<link>`, or analytics.

## Structure

| File | What it does |
|---|---|
| `index.html` | All copy. Sections carry `data-station`, which is what the 3D scene anchors to. |
| `css/main.css` | Type, layout, the fixed chrome, entrance states. |
| `js/intro.js` | The ignition: a tachometer sweep that unrolls into an electrode trace. Canvas 2D, under three seconds, any input skips it. |
| `js/main.js` | The frame loop. Owns scroll state and entrances, publishes both on `window.__site`. |
| `js/world.js` | The 3D chamber. ES module, imports vendored three.js. |

## How the page and the scene stay locked together

`js/main.js` measures every `[data-station]` section and puts the result on
`window.__site`. `js/world.js` maps document pixels to world depth —
`z = -(scroll / doc) * DEPTH` — so the camera's position *is* the scroll
position, and each set piece is anchored to the section it belongs to. Reflow
the layout, change the copy, resize the window: the scene follows, with no
hard-coded scroll offsets anywhere.

The set pieces, each visible only inside its own section's depth band:

- **the instrument** — a bezel with three rings tumbling inside it, behind the
  opening line. It comes back at the very end, drifts to centre and recedes.
- **the calibration** — three rings beside the audit section that start out of
  true and come into alignment as you scroll through it.
- **the rails** — rungs streaming past at the edges of vision. They mean
  nothing; they exist so the depth is legible while you read, and they fade out
  wherever a real set piece is on screen.
- **the trace** — two lines: the signal, and the signal as the instrument
  reports it. They leave the hero almost coincident, running away into depth.
  Across `[data-station="lie"]` they swing round to face the viewer and come
  apart, with the residual drawn between them. That stage is deliberately empty
  of copy; the legend is the fixed `.drift-hud`.
- **the topology** — the redacted plates, flown through
- **the field** — one point per run, crowding up under a ceiling they do not
  pass, with hairlines from the ceiling to the ones that got closest. No axes
  and no values, because there are none to show.

## Colour

Warm highlight, cool shadow. Brass and bone carry everything that matters; a
desaturated petrol (`--cool`, and the cooler scene fog) sits in the shadows and
the far distance. The cool tone never gets brighter than the warm one — its only
job is to make the brass read warm by contrast. In the scene it also carries
meaning: the true signal is cool, the instrument's reported signal is brass.

## The hand-off

The ignition does not cut to the site. It ends on a flat trace dropped below the
middle of the screen; `js/world.js` picks that same pose up (`arrive`, driven
from the `ignition:done` event), then swings the trace away into depth, pushes
the camera in, shrinks the bezel into place and fades the gimbal up. Entrance
animations are held until that event too, so the opening lines rise as the
ignition dissolves instead of sitting fully formed behind it.

If you retime the ignition, retime `arrive` with it, and check the trace does
not sit across the headline on the way through.

## Things that have broken before — do not undo these

- **Entrances are driven from the frame loop, not `IntersectionObserver`.**
  Observer callbacks are suspended in throttled and background tabs, which left
  content permanently invisible on this site once. Anything already above the
  fold counts as entered.
- **Positions come from `getBoundingClientRect().top + scrollY`, never
  `offsetTop`.** There are positioned ancestors here and `offsetTop` lies.
- **The frame loop must not take the rAF timestamp as its own argument.** An
  earlier version re-scheduled itself only when called with no argument, so the
  timestamp silently killed the loop after a single tick and nothing moved.
- **Point sizes need a real projection scale.** `gl_PointSize` is in device
  pixels; sizing points with an arbitrary constant over distance made them
  sub-pixel and the whole field rendered as an empty void.
- **The fixed chrome carries its own scrim.** The atmosphere layer sits *behind*
  the content, so it cannot stop body copy running under the nav.
- **Set pieces scale down on narrow viewports** (`fit`, set in `resize()`).
  A narrow window sees far less world width, and the topology otherwise
  straddles both edges off-screen.
- **Each set piece is bound to its own section's depth band**, not to distance
  from a centre point. Distance alone let the ceiling field bleed three sections
  backwards and read as debris behind the topology.
- **Stations nest, and the tightest one wins.** The `lie` stage sits inside the
  conviction section; picking the first match instead of the smallest meant its
  band never became current and its legend never appeared.
- **A line pointing at the camera is a dot.** The trace only reads as two
  diverging curves once it has swung side-on — that is what the `lie` blend is
  for, and why the pair is never simply slid toward the centre of the view.

## Before you push

1. Grep the site for the red-list terms above. Zero hits.
2. Look at screenshots — hero, each 3D station, and one narrow viewport. Every
   visual bug this site has ever had was invisible in the code and obvious in an
   image.
3. Check the console at several scroll positions. It should be silent.
