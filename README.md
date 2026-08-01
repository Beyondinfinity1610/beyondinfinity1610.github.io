# beyondinfinity1610.github.io

Personal research site — Thejeshwaar Sathishkumar, ML researcher working on
multimodal deep learning for non-stationary biosignals.

## Stack

No framework, no build step, no bundler. GitHub Pages serves the files as they
are; editing a file and pushing is the whole deploy process.

- **three.js** (vendored, `vendor/three.module.js`) for the three WebGL scenes
- **Custom GLSL** for the hero particle field, the module plates, and the
  connectivity graph
- **Custom bloom chain** (`js/gl/bloom.js`) — bright pass, three ping-pong
  gaussian mips, additive composite with a filmic tonemap. Written here rather
  than pulled from `three/examples` so the repo has no example-bundle dependency.
- **Canvas 2D** for the ablation observatory
- Fonts self-hosted in `vendor/fonts/` (latin + latin-ext subsets only)

Everything is same-origin. There are no CDN requests, no analytics, and no
third-party scripts.

## Layout

```
index.html
css/main.css
js/
  main.js              scroll engine, entrance sequencing, page chrome
  gl/bloom.js          post-processing chain shared by two scenes
  scenes/field.js      hero: EEG montage -> head shell -> dispersal
  scenes/teardown.js   NeuroSync architecture, scroll-driven exploded view
  scenes/topology.js   10-20 electrode graph, band-switchable connectivity
  ui/observatory.js    33-experiment ablation plot
  data/ablations.js    the ablation campaign, as data
  data/eeg.js          electrode montage, frequency bands, connectivity
vendor/                three.js + fonts
```

## The numbers on this site

`js/data/ablations.js` is the single source of truth for every research figure
shown. It tracks the `seizeit2-work` repo, and it includes results that were
**superseded** — the early balanced-split numbers are still plotted, struck
through, because the correction is part of the argument.

**Never quote a figure here that has not survived the continuous-stream,
patient-level evaluation.** The site previously led with 53% event-F1 and 91%
precision; both were artifacts of a balanced split and a time-shuffled
evaluation. If a number changes upstream, change it here and add a line to the
correction callout in `index.html` rather than silently editing it.

## Palette

"Molten" — warm graphite base, amber primary, one cold counterpoint. Signal
energy maps to temperature everywhere it appears: deep ember at rest, amber
working, ignition yellow into white at a discharge, ice blue for structure and
for the physiological channels. Frequency bands run cold to hot with frequency.
Keep that mapping if you add anything — it is doing real work, not decoration.

## Notes for future edits

- **Entrance animations do not use IntersectionObserver.** IO callbacks are
  suspended in throttled and background tabs, and a suspended callback means
  content that never appears at all. Everything that enters on scroll goes
  through `onEnter()` in `main.js`, which is driven from the scroll handler and
  the frame loop.
- **Counters write their final value on a `setTimeout` as well as via rAF**, so
  a stalled frame loop can never leave a headline number reading zero.
- **`offsetTop` is not used for scroll math.** Several sections sit inside
  positioned ancestors, which makes `offsetTop` relative to the wrong element.
  Use `docTop()`.
- Device tier (`deviceTier()` in `main.js`) controls particle count, pixel
  ratio and whether bloom runs at all. `prefers-reduced-motion` forces the
  lowest tier.
- The ablation figures in `data/ablations.js` are real results from the
  campaign. The connectivity matrices in `data/eeg.js` are generated to
  illustrate the topology, and say so in the file.
