# beyondinfinity1610.github.io

Personal site — Thejeshwaar Sathishkumar.

## The rule that matters most

**Unpublished research methodology and results do not go on this site.**

Two manuscripts are in preparation. Earlier versions of this page carried the
full architecture of the seizure-detection system, its ablation campaign, and
its headline metrics. That is exactly the material under review, and it was
removed for that reason.

What the work section is allowed to say:

- the **problem**, and why it is hard
- the **scale**, but only using facts that are properties of a *public* dataset
- the **role** and current status ("in preparation", "under review")
- an offer to discuss privately

What it must not say: architecture, component design, ablation results, metrics,
or the specific findings that constitute a paper's contribution. Published
patents are fine — a granted publication is already public. Public repositories
are fine.

If a manuscript is accepted, that entry can be expanded and linked to the paper.
Not before.

## Design

"Restraint." Warm near-black, a single brass accent, Instrument Serif for
display against Space Grotesk and JetBrains Mono. Generous air, few sections,
low contrast in the motion. The site should read as a researcher's page, not a
project expo — the reader should conclude the work is serious rather than be
told so.

Two visuals only, both deliberately quiet:

- **The hero trace** (`js/scenes/trace.js`) — canvas 2D. A recording pen crosses
  once and reveals the headline through a CSS mask as it passes; behind it, a
  stack of older traces receding into the dark. Canvas rather than WebGL so the
  page is interactive immediately. There is no preloader, by design.
- **The interlude** (`js/scenes/topology.js`) — the 10-20 montage as a brass
  wireframe network, slowly rotating, draggable. The adjacency in
  `js/data/eeg.js` is **generated geometry for the visual**, not measured
  connectivity, and says so in the file. Keep it that way — real connectivity
  from the research would be a disclosure.

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
  the scroll handler and the frame loop. The check has no lower bound on
  purpose: anything already above the viewport must resolve immediately, or a
  restored scroll position leaves the page blank.
- **The trace canvas must be wiped when it stops updating**, or its last painted
  frame sits over the rest of the page.
- **`offsetTop` is not used for scroll maths** — several sections sit inside
  positioned ancestors. Use `docTop()`.
- The topology module is imported lazily, so three.js is only fetched when the
  interlude is close.
