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
dash uses amber. Instrument Serif for display against Space Grotesk and
JetBrains Mono. Generous air, unequal weight by section. The page should read as
a researcher's, not a project expo — the reader ought to conclude the work is
serious rather than be told so.

## The visuals

Each one has a job. Nothing here is decoration, and nothing here is measured
data — it is all generated geometry.

- **The montage** (`js/scenes/instrument.js`) — canvas 2D, behind the hero. A
  stack of recording channels receding toward a vanishing point. Canvas rather
  than WebGL so the page is drawn on the first frame; there is no preloader, by
  design. It fades out as the hero leaves and is **wiped once** when it stops
  updating, or its last painted frame sits over the rest of the page.
- **The rail** (same file) — one hairline running down the left margin for the
  whole document, like paper feeding through a chart recorder. Its deflection is
  a function of *document* position, so it is anchored to the page rather than
  the screen, and its agitation is set per section by `REGIONS` in `main.js`.
  Over the redaction section it becomes a struck-out line.
- **The morph** (`js/scenes/morph.js`) — one point cloud, two arrangements.
  An inline four becomes the 10-20 montage as you scroll: same points, nothing
  added, nothing removed. It is the cars-to-electrodes argument made literal.
  Draggable once it settles. The adjacency in `js/data/eeg.js` is **generated
  geometry for the visual, not measured connectivity** — keep it that way, real
  connectivity from the research would be a disclosure.
- **The search** (`js/scenes/search.js`) — one dot per run in a sweep, arriving
  as you scroll, with a route drawn through the few that were kept and a ceiling
  the route never clears. Showing that a large systematic search happened, and
  that it ended at a limit, is permitted. **There are no axes, no labels, no
  experiment names and no values in this scene, and there must not be** — the
  heights come from a fixed seed and encode nothing.
- **The redacted architecture** (`js/scenes/redaction.js`) — three.js, lazily
  imported so the library is only fetched near the section. The real stage count
  and flow of a multi-stage system with every label struck out. As the camera
  closes, the bars retract just far enough to show there is something under them,
  then snap back. Hovering reports a **generic role only**.

  The file contains no component names to redact: the labels are generated as
  abstract bars and glyph-shaped rectangles, so nothing confidential exists in
  the source, the DOM or the network tab. **Keep it that way.** The one legible
  plate is the input, because the input is a public dataset.

## Stack

No framework, no build step, no bundler. GitHub Pages serves the files as they
are; editing and pushing is the whole deploy. three.js and the fonts are
vendored, so the page makes no third-party requests.

Test with `python -m http.server` from the repo root — opening `index.html` over
`file://` fails because it uses ES modules.

## Notes for future edits

- **Entrances do not use IntersectionObserver.** IO callbacks are suspended in
  throttled and background tabs, and a suspended callback means content that
  never appears. Everything goes through `onEnter()` in `main.js`, driven from
  the scroll handler and the frame loop. The check has no lower bound on purpose:
  anything already above the viewport must resolve immediately, or a restored
  scroll position leaves the page blank.
- **`offsetTop` is not used for scroll maths** — several sections sit inside
  positioned ancestors. Use `docTop()`.
- **Do not bottom-align the hero with `justify-content` and an auto margin at the
  same time.** It is a grid with an explicit footer row for that reason.
- **Watch `padding` shorthands on elements that are also `.wrap`.** `padding: X 0
  Y` silently wipes the gutters `.wrap` sets; use `padding-block`.
- Scenes are registered in the `SCENES` array in `main.js`: each one is lazily
  imported when its section is close, driven by its own scroll span, rendered
  only while visible, and wrapped so that one failing cannot take the page with
  it. Adding a scene means adding an entry there and a `.stage` section.
- `prefers-reduced-motion` and missing WebGL both fall back to `body.flat-scene`,
  which swaps the canvas for the static CSS plate diagram and collapses the
  scroll stage. Reduced motion still tracks the scroll — that motion is the
  reader's — but freezes time so nothing self-animates.
- When verifying in headless Chrome over CDP, **disable the cache**
  (`Network.setCacheDisabled`). Module scripts are cached hard enough that edits
  appear not to have taken effect.
