# Rebuild: beyondinfinity1610.github.io

**This file is the master spec.** Phase 0 copies it to `site/docs/SPEC.md` in the repo; every later phase reads from there.

---

## Context

**The problem.** The current site's *ideas* are excellent — the drift thesis, the redacted topology, the self-audit. Its *machine* is a bicycle, and that is why it reads as basic despite having three.js in it:

- It runs on **raw native scroll**. On a mouse wheel the 3D camera moves in discrete jumps. No amount of scene work survives that.
- **Every element enters identically** — `opacity 0 → 1` plus a 26px translate, one shared class. There is no motion vocabulary, only a motion *word*.
- **No post-processing.** Raw three.js output on a dark ground renders flat, not cinematic.
- `getBoundingClientRect()` is called per parallax element per frame — layout thrash.
- Text reveals are done by splitting `innerHTML` on `<br>`.
- 1.27 MB of unminified three.js ships on first paint.

So: **the thesis carries forward, the machine is thrown away entirely.**

**What changes structurally.** Today the seizure project is scattered across four disconnected sections (`work`, `redaction`, `diagnosis`, `ceiling`) with `work2` arriving afterwards. In the rebuild those four become **one continuous four-act case study**, and it opens with something the visitor *operates* rather than reads.

**The intended outcome.** A hiring researcher opens the page, tries to solve his problem in ten seconds, fails, and only then is told the solution exists and is blacked out pending review. That sequence is the site. It shows a specific talent rather than a general one, and it is not a thing any other portfolio does.

### Decisions taken with the author (do not re-litigate)

| | |
|---|---|
| Build step | **Yes** — Vite + TypeScript, npm, GitHub Actions → Pages |
| Centrepiece | **The playable instrument** (movement 03), redaction promoted to its payoff |
| Photography | **None anywhere.** Typographic and generative only |
| Audio | **Yes** — ~6 diegetic samples, muted by default, visible toggle, never autoplay |

### The disclosure rule — the one hard constraint

Two manuscripts are in preparation. Nothing may appear — in text, `alt`, JSON, code comments, generated data, or **commit messages** — that reveals architecture component names, layer configs, parameter counts, loss designs, **his** metrics (AUROC / event-F1 / sensitivity / FA-rate / precision), the research gaps, the specific diagnostic findings, the ablation table, or per-band separability. Also barred: CGPA, phone number, and the superseded 53% / 91% figures in any context other than the correction narrative.

Green-listed and safe: the patent number, public repo URLs, public dataset properties, problem statements, physical intuitions, role and status, the personal story, skills vocabulary, and **other people's published numbers when attributed**.

This is enforced mechanically in §7.3, and it has a manual sign-off gate in Phase 12.

---

## 1. The spine — 11 movements

Movements **03–06 are one continuous case study** on the seizure work, told as four acts. That is the central structural change.

| # | id | Title | What it does | Canvas |
|---|---|---|---|---|
| 01 | `drift` | *I build models for measurements that drift.* | Hero. One line is born. | 2D |
| 02 | `lie` | **Every instrument is lying.** | The conviction. Cars → electrodes. The line splits into truth and as-reported; the residual fills. | 2D |
| 03 | `try` | **Try it.** | **The centrepiece.** Playable threshold on a synthetic ambulatory recording. You fail. | 2D |
| 04 | `withheld` | **You are looking at it. You are not reading it.** | The redacted topology. Earned by 03. | **WebGL** |
| 05 | `audit` | **It plateaued. I audited myself.** | Scroll forward, instrument scrubs backward. De-derivation. | 2D |
| 06 | `ceiling` | **I stopped.** | Field of runs under a line none cross. | **WebGL** |
| 07 | `method` | Diagnostic before architectural. | The six habits — now demonstrated, not asserted. | — |
| 08 | `work` | Other work, weighted. | KYFR · ADHD band-wise GAT · the patent · quantum-Hilbert. Unequal by design. | — |
| 09 | `else` | Everything else. | The quiet list, skills, credentials. | — |
| 10 | `him` | Twenty-one, final year, mostly nocturnal. | Cars. Short. | — |
| 11 | `contact` | If the instrument is unreliable, that is the interesting one. | — | — |

Only **two** WebGL pieces. That is "one idea executed completely" taken seriously, and it is what makes the bundle budget reachable.

---

## 2. Movement 03 — the playable instrument

The highest-risk component. Build and prove it **before** any polish exists (Phase 2, then Phase 4).

### 2.1 What the visitor does

A dashed threshold rule sits across a scrolling multi-hour EEG-like trace with ECG, EMG and accelerometer lanes beneath it. Seizures are hidden in it. Chewing, walking and talking produce bursts that look the same. The clinical bar is **fewer than two false alarms per day**. Drag the rule and try.

They will fail. Then: *published human expert readers reach roughly 59% sensitivity on this modality* (public, attributed, allowed). Then: the method that closes the gap is withheld.

### 2.2 The generator — seeded, lazy, block-addressed

24 h × 128 Hz × 5 channels is ~55 M samples. **Do not materialise it.**

- Time is cut into **4-second blocks** of 512 samples. Block `k`'s randomness is `mulberry32(hash32(SEED, k, channel))`, so any window generates in O(window) with no history, identical regardless of visit order. 0.5 s overlap, raised-cosine cross-fade, 8-block LRU.
- **`Math.random` is banned in `src/signal/**` and `src/pieces/**`** by CI grep. One `SEED` constant in `src/signal/seed.ts`.
- **EEG per channel**: ~12 sinusoids per band (δ θ α β γ) at random in-band frequencies and phases, amplitude scaled `1/f^1.2` — that power law is what makes it *read* as EEG. Times a 0.02–0.1 Hz random-walk envelope, times a state gain from the day schedule. Plus baseline wander (0.05–0.5 Hz), electrode pops (step + τ≈0.3 s decay), 5–15% ECG bleed, and a tiny 50 Hz mains component.
- **ECG**: five-Gaussian P–QRS–T at a state-driven rate (55–65 asleep → 95–120 walking) with ±4% respiratory sinus arrhythmia. **EMG**: 20–150 Hz noise, envelope ≈0 at rest, bursting on chew/talk/walk. **ACC**: gravity + posture; walking 1.8–2.2 Hz with harmonics, chewing 1.2–1.8 Hz.
- **Day schedule** (`schedule.ts`): 300–600 segments over `asleep | drowsy | quiet-wake | active | walking | eating | talking`, flat typed arrays, binary-searched.
- **Events** (`events.ts`): **7** true seizures 20–90 s with a nocturnal skew, and ~400 confusable artefacts with authored intensities. Both go through the *same* burst generator. The discriminator is deliberately not amplitude — **seizures evolve in frequency** (8–10 Hz slowing to 3–4 Hz), artefacts hold a band. That is the textbook, public reason a trained human beats a threshold.

### 2.3 The detector, and why failure is *true*

The visitor drives one fixed, transparent, publicly-attributable detector: smoothed **line length** over a 2 s window, z-scored against a 5-minute running baseline — **Esteller et al., 2001**. Say so on the page. That is the honesty anchor: a textbook detector from before he was born, not his method.

**Key move:** the detector runs on a closed-form 4 Hz feature stream, not on generated samples. `feature.ts` exports `score(t) = baselineEnvelope(t) + Σ contribution(t)` — O(1) per sample, the whole day is a 1.4 MB `Float32Array` computed in milliseconds. The drawn waveform's amplitude envelope *is* that stream, so they agree by construction (proved by test #4 below). `roc.ts` sweeps 200 thresholds at init into a lookup table; drag is then O(1).

Scoring, stated in plain words on the page (this is his habit §iv made visible): alarms are maximal runs above θ merged under a 10 s refractory, one per onset; an event is caught if an onset lands in `[start−30s, end+30s]`; FA/day counts unmatched alarms over the full 24 h; sensitivity is caught/7.

**The guaranteed-failure invariant — a property of the data, enforced by unit test, never faked in the UI:**

```
sortedArtefactPeaks[2] > max(truePeakScores)
```

The third-strongest artefact of the day out-scores the strongest seizure. It follows mechanically that any θ catching *anything* already yields ≥3 FA/day, and any θ under 2 FA/day yields sensitivity 0. Two counter-tests keep it from feeling rigged: some θ reaches sensitivity ≥ 0.5 (~4/7 at ~18 FA/day, so the trade-off is legible), and 1.0 is reachable at an absurd rate.

### 2.4 The payoff — an empty box

An inset plot: FA/day on x, sensitivity on y, the full ROC curve, and the visitor's operating point as a moving dot. Then draw the rectangle `FA/day ≤ 2 ∧ sensitivity ≥ 59%`, with the 59% attributed on the axis label. **The curve passes entirely beneath it. The dot can never enter it.** No copy is needed to make the argument; the copy only names it afterwards.

### 2.5 Where the disclosure line lives — four places, none dismissible

1. A permanent mono caption strip: `synthetic signal · generated in your browser from a fixed seed · detector: line-length threshold (Esteller et al., 2001) · not the method under review`
2. The section eyebrow: `03 · a demonstration, not a result`
3. **A prose paragraph in `index.html`** (so it survives JS-off), in his voice, `aria-describedby`'d from the canvas.
4. **An on-canvas `SYNTHETIC` watermark**, low alpha — screenshots get cropped and shared out of context.

### 2.6 Input and transport

- **Drag the rule** (Pointer Events, `setPointerCapture`, grab anywhere on the canvas — forgiving). **On coarse pointers canvas dragging is disabled entirely**; `touch-action: none` full-width would eat vertical page scroll.
- **A real `<input type="range">`**, styled as a calibrated track but never hidden — it is the keyboard/AT interface. Live `aria-valuetext="4.5 standard deviations — 31 false alarms per day, 2 of 7 events caught"`. Arrows ±0.05, PageUp/Down ±0.5, Home/End.
- **No wheel handler.** Window length is three buttons: 15 s / 60 s / 5 min.
- **Time is not scroll-linked.** The section is `position: sticky`; the trace runs on its own clock so the visitor can hold still and experiment.
- **Autopilot tour**, because a day at legible speed takes hours and at 900× is a smear: ~15 stops (each true event plus the 8 strongest artefacts), ~8 s each, with a fast sprint between. Whole day in ~2 minutes. A draggable 24 h day-bar shows position and accumulates alarm ticks.
- **The counters are computed over the full 24 h from the ROC table, not from what has been shown**, and captioned as such. Otherwise the number is a lie by omission.

### 2.7 Drawing

**Min/max envelope decimation**: per device-pixel column emit exactly two vertices (column min and max). A 1400 px lane is 2800 vertices at any zoom. One `Path2D` per lane, one `stroke()`. Five lanes ≈ 14 k vertices, under 2 ms. This is how real EEG viewers work, and the vertical fuzz band it produces is a large part of why it reads as EEG.

---

## 3. The other pieces

### 3.1 Movements 01–02 — the trace (Canvas 2D, initial bundle, ~3 KB)

Paints on the **first frame**, before three.js has begun downloading. Largest first-paint win in the build.

- `p` 0 → 0.35: one line, born at the left edge, drifting, warm-neutral.
- 0.35 → 0.75: it **splits** — truth in bone, as-reported in phosphor teal, divergence `smoothstep(0.35, 0.9, p)`. The residual between them fills with one low-alpha closed `fill()`.
- 0.75 → 1: the pair drifts down and out, handing to movement 03.

**The waveform comes from `src/signal/` at coarse resolution** — the hero literally shows the same recording the instrument later plays. "As reported" = truth + drift + gain error + slow bias. The thesis is the geometry, not a caption. One generator serves movements 01, 02, 03, 05, the noscript SVG and the tests.

### 3.2 Movement 04 — WITHHELD (WebGL)

~16 plates on a gentle S-curve in Z, sharing one `PlaneGeometry`, connected by thin quads with travelling flow dots; camera dollies along the curve. Textures are one procedurally-drawn **2048² `CanvasTexture` atlas** (16 cells at 512×256, drawn 2× for crispness): hairline border, mono stage index, and a row of black bars whose widths come from the seeded PRNG so they read as struck-out words of varying length. `SRGBColorSpace`, mipmaps, max anisotropy.

**One plate is legible** — `SeizeIT2 · behind-the-ear · 125 patients · 2,912 h`. Public dataset properties, explicitly green-listed. The contrast is the argument.

Raycast picking on 16 planes, `pointermove` throttled to once per frame, only when active and `(pointer: fine)`. **Cache the canvas bounding rect on resize** — calling it per pointermove is a real 60→45 fps regression. Coarse pointers get an auto-cycling role caption instead.

Hover returns **a role only**, from `content/strings.ts`: `input` · `per-modality front end` · `alignment` · `combination` · `temporal context` · `decision` · `post-processing` · `public dataset`. Deliberately *not* `gating stage` — too close to a component name. **This vocabulary needs the author's explicit sign-off (Phase 12); a grep cannot judge it.**

`plate-atlas.ts` draws to a plain 2D canvas, so the no-WebGL fallback reuses it verbatim as a flat 2D row. Free fallback.

### 3.3 Movement 05 — THE AUDIT (Canvas 2D, same lazy chunk as 03)

Making a reversal read as *deliberate* rather than broken is three problems, and the reversal is only one:

1. **Announce intent before motion.** A line lands first — *"I stopped and went back to the raw recordings."* — and only then does the scrub begin. Stated intent converts "broken" into "authored".
2. **Show the mechanism.** A mono transport counting *down* (`t −02:41:18`), a `REWIND` state chip, and the day-bar playhead travelling right-to-left while the page's own progress rail travels down. **The juxtaposition of the two opposed indicators is the entire effect.** Without the readouts it looks like a bug; with them it is a tape machine.
3. **Make it a de-derivation, not a time reversal.** As the scrub runs backward the derived layers **peel off in reverse order** — decisions, then alarms, then scores, then features — until only the raw trace remains and the last word on screen is `raw`. Then it re-derives forward, fast, and settles on a quieter score expressed **without a single number**.

Texture: a subtle horizontal shear/tear sweeping (VHS head-switch), 3–4× time compression. Damped follow at `k=6` with a velocity clamp so it never overshoots.

### 3.4 Movement 06 — THE CEILING (WebGL, no composer)

`InstancedMesh` of a billboard quad — **not `THREE.Points`**, which is what produced the historical "empty void" bug; instance sizes come from real world units and cannot go sub-pixel. 1800 instances high / 700 low, one draw call. Per-instance: position, lever category (the seven), closeness. A hairline plane across the top that nothing crosses; a few near-misses get thin vertical hairlines up to it — the only warm elements in the frame. The settle spring is computed **in the vertex shader** from `uProgress`; zero CPU per frame. The camera descends and rotates so the ceiling goes from a distant line to oppressively overhead.

**No axes, no ticks, no numerals anywhere in this piece.** CI greps `pieces/ceiling/**` for digit-bearing string literals.

---

## 4. Art direction

*This is the part that makes it feel expensive. It is not decoration; each choice below is load-bearing.*

### 4.1 Palette — four semantic roles, nothing decorative

| Token | Value | Means |
|---|---|---|
| `--void` | `#06080a` | ground. Faint cool cast, **never pure black** |
| `--raised` | `#0c0f11` | raised surfaces |
| `--bone` | `#ece7de` | **truth** — what is actually happening. Also primary text |
| `--body` | `#b9b2a8` | body copy — *lightened from `#a49c92`* |
| `--faint` | `#8a8279` | secondary — *lightened from `#6f6862`, which fails WCAG AA at ~3.3:1* |
| `--phosphor` | `#4fb0a8` | **the instrument** — what is reported |
| `--phosphor-hi` / `-lo` | `#9fe0d6` / `#2c6b64` | hover / eyebrows |
| `--alarm` | `#d1533f` | **failure.** Used in exactly two places on the whole site |

`--alarm` appears only when the false-alarm budget is breached (03) and on the struck-through invalidated figures (05). Scarcity is what makes it land. Bone-vs-phosphor carries the thesis everywhere else — including in the 3D scene, where the true signal is bone and the reported signal is phosphor.

Retire the misleading `--brass*` names from the old CSS (they hold teal). Also: the plate textures in `world.js` still render amber while the CSS is teal — the rebuild unifies on the table above.

### 4.2 Type

- **Display → `Fraunces` variable** (SIL OFL; `opsz`, `wght`, `SOFT`, `WONK` axes). Instrument Serif is elegant but is on a thousand sites in 2026; Fraunces has genuine optical-size correctness and reads institute-annual-report rather than trendy. **Ship a specimen page in Phase 0 showing the hero and one section set in both**, so this is a one-token revert if he dislikes it.
- **Body → Space Grotesk at weight 400**, not 300. The 300 is a meaningful part of why the current page reads thin.
- **Mono → JetBrains Mono.** Unchanged. It is the instrument's voice and it is correct.
- **Tabular figures (`font-variant-numeric: tabular-nums`) on every readout.** Non-negotiable — proportional digits in a live counter jitter, and jitter is the difference between an instrument and a widget.
- Body measure 62ch, lede 56ch. Optical margin alignment on pulled quotes and eyebrows.

### 4.3 Motion vocabulary — five distinct entrances, not one

The single biggest perceptual upgrade. Assign deliberately; never mix within a section.

| Name | Applied to | Behaviour |
|---|---|---|
| `rise` | display headings | SplitText **lines**, masked, from 110% of their own baseline, 0.09 s stagger |
| `settle` | body prose | opacity + 12px, one block, no stagger — prose should not perform |
| `draw` | rules, borders, connectors | `scaleX(0→1)` from the leading edge, `--i × 0.07s` |
| `latch` | readouts, facts, mono labels | no travel at all. Digits roll from a scrambled state to their value. Mechanical, not organic |
| `wake` | list rows | 3px translate + a hairline drawing under, `--i` staggered |

Eases: define **three** `CustomEase` curves once in `motion/eases.ts` and use nothing else. One entrance ease (long tail), one UI ease (short), one instrument ease (near-linear with a settle). Ad-hoc cubic-beziers scattered through the code is exactly what makes a site feel unauthored.

### 4.4 The boot — sub-second, no curtain

He complained the previous 2.9 s ignition felt laggy, and the brief demands instant start. **So there is no overlay and no preloader.** The page is present and readable immediately. What "arrives" is the *instrument coming up*, over ~900 ms, entirely non-blocking:

1. `0 ms` — HTML and CSS are painted. All copy is present and legible. Nothing is hidden.
2. `~80 ms` — the hero trace canvas paints its first frame: a flat baseline, finding zero.
3. `~200–900 ms` — the baseline steadies and begins to drift; display lines `rise`; topbar readouts `latch` from `0000`; the progress rail draws in.

Any input at any point skips straight to the settled state. Under `prefers-reduced-motion` step 3 does not happen at all. **Nothing blocks interaction at any point** — this is a state the page passes through, not a gate in front of it.

### 4.5 Detail work

- **Cursor**: no custom cursor sprite (they lag and they are a 2021 tell). Instead, native cursors chosen precisely — `ew-resize` over the threshold rule, `grab`/`grabbing` on the day-bar, `progress` never.
- **Grain**: one 128² tiled noise as a DOM layer, `mix-blend-mode: overlay`, opacity 0.05, **unanimated** — so the grain is identical across the WebGL canvas, the 2D instrument and the DOM. Off on mobile (real compositing cost).
- **Vignette**: CSS radial on the atmosphere layer, not a composer pass — cheaper, and it applies to the whole page.
- **Banding** in dark gradients is genuine at these luminances on 8-bit panels. 1/255 blue-noise dither in `shaders/background.frag`, and a matching CSS-side noise for DOM gradients.
- **Focus rings**: a 2px phosphor ring with a 2px void offset. Visible, on-brand, never removed.
- **Selection**: `rgba(79,176,168,0.28)` on `--bone`.

---

## 5. Motion + WebGL architecture

### 5.1 Lenis ↔ ScrollTrigger — one rAF for the entire site

**Do not call `ScrollTrigger.scrollerProxy()`.** Lenis v1 with default `wrapper: window` drives the *real* document scroll; ScrollTrigger's default scroller already reads it correctly. A proxy double-maps and produces the classic wrong-position-after-refresh bug.

```ts
gsap.registerPlugin(ScrollTrigger, SplitText, Observer, CustomEase);

const lenis = reduced ? null : new Lenis({
  autoRaf: false,            // we own the loop
  duration: 1.05,
  easing: (t) => 1 - Math.pow(1 - t, 3),
  smoothWheel: true,
  syncTouch: false,          // never smooth native touch — it fights momentum
  touchMultiplier: 1.6,
});

lenis?.on('scroll', ScrollTrigger.update);

gsap.ticker.lagSmoothing(0);           // mandatory with Lenis
gsap.ticker.add((time /* seconds */) => {
  lenis?.raf(time * 1000);             // 1. advance scroll → ScrollTrigger.update fires synchronously
  director.frame(gsap.ticker.deltaRatio(60) / 60);   // 2. render whatever is active
});
```

Enforced by CI grep: **zero `requestAnimationFrame` in `src/`**, **`renderer.setAnimationLoop` never called**, **`autoRaf: false` present**.

### 5.2 ScrollTrigger never animates WebGL

For anything on a canvas, ScrollTrigger is a **measuring device**, not an animator. One trigger per piece:

```ts
ScrollTrigger.create({
  trigger: sectionEl,
  start: 'top bottom', end: 'bottom top',
  onUpdate: (self) => { piece.target = self.progress; },      // a plain number, no tween
  onToggle: (self) => { director.setActive(piece, self.isActive); },
});
```

The piece runs its own frame-rate-independent damped follow in `frame(dt)`:

```ts
this.p += (this.target - this.p) * (1 - Math.exp(-8 * dt));
```

Not `scrub`, because: `scrub` renders one frame behind `ScrollTrigger.update` under this wiring; `1 - exp(-k·dt)` is frame-rate independent where `lerp(a,b,0.1)` is not; there is nothing to invalidate on `refresh()`; and it cannot jitter, because the follower is continuous by construction. **GSAP animates the DOM. Pieces animate themselves. Two domains, no overlap.**

### 5.3 Kill the shared corridor

**Abandon `world.js`'s single 1500-unit depth corridor** — it directly caused three of the nine historical bugs. Replace with **one `WebGLRenderer` on one canvas, but N independent `Scene`s and `Camera`s**, one per piece, each with a *local* 0..1 progress. There is no shared depth axis, so nothing can bleed.

A `Director` holds the registry. Each frame: collect actives; **if zero → `renderer.clear()` once, then `canvas.style.visibility = 'hidden'`, return** (this is the antidote to the canvas-retains-its-last-frame bug, the most-reported visual failure on the old site); if ≥1 → make visible and render in registration order. `active` is set by `onToggle` only — never by distance from a centre point, never by depth band.

### 5.4 Every historical bug, under the new stack

| Old bug | Status | Handling |
|---|---|---|
| Entrances from frame loop, not IntersectionObserver | **Real fix is different** | ScrollTrigger doesn't use IO, so tab-throttling doesn't apply. The actual root cause was **CSS-baked hidden state surviving a JS failure**. Hard rule: **no `opacity:0` / `visibility:hidden` on any content element in CSS, ever.** Initial states come from `gsap.set()`. If JS dies, everything is visible. Plus a safety sweep on `load` and every `refreshInit` force-marking anything above the fold as entered. |
| `offsetTop` lies | Moot | ScrollTrigger computes its own positions. **Ban `offsetTop` in `src/` by CI grep.** |
| Frame loop taking the rAF timestamp | Moot | No self-scheduling loop exists |
| `gl_PointSize` sub-pixel void | **Class eliminated** | `InstancedMesh` billboards, never `Points`. Sizes are real world units. Phase 8 reads the framebuffer to prove non-background pixels exist. |
| Fixed chrome needs its own scrim | Still real (CSS) | `.topbar` owns a gradient scrim + `backdrop-filter: blur(10px)` at `z-index: 40`; atmosphere stays at `z-index: 3` behind content |
| Set pieces must scale on narrow viewports | Still real | Every piece implements `fit(w,h)`: `scale = clamp(w/1440, 0.55, 1)` plus FOV widening in portrait. Verified by the 390px screenshots. |
| Depth-band bleed / nested stations | Moot by construction | Per-section scenes, per-section triggers, no station resolution exists |
| A line pointing at the camera is a dot | Moot | The trace is 2D and always side-on. Rule for remaining 3D: no line within 20° of the view axis. |

**New pitfalls this stack introduces:**

- **Delete `scroll-behavior: smooth`** from CSS (currently `css/main.css` ~line 85) — it fights Lenis. Anchors go through `lenis.scrollTo(target, { duration: 1.1 })`.
- **Zero `pin: true` in this build.** ScrollTrigger pinning is the largest source of layout-jump and refresh bugs. Sections that hold the viewport use `position: sticky; top: 0; height: 100svh` on an inner wrapper inside a tall section — CSS-native, survives resize, needs no refresh.
- **Never `ScrollTrigger.normalizeScroll()`** with Lenis.
- `history.scrollRestoration = 'manual'`; honour `location.hash` via `lenis.scrollTo(hash, { immediate: true })` after fonts. Removes a real three-way fight and makes the screenshot harness deterministic.
- `100vh` → `100svh` with a `100vh` fallback.

### 5.5 Boot order and resize

```ts
ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

await document.fonts.ready;   // 1. metrics settle
splitDisplayLines();          // 2. SplitText, autoSplit: true (needs GSAP ≥ 3.13)
buildEntrances();             // 3. gsap.set initial states + ScrollTrigger.batch
ScrollTrigger.refresh();      // 4. one measurement of a settled layout
window.__ready = true;        // 5. the harness waits on this
```

Resize: debounce 150 ms, compare to last committed size. Width changed **or** height by >120px → `setSize` + every `fit()` + `refresh()`. Height by ≤120px (mobile URL bar) → `fit()` only, **no refresh**. `orientationchange` → always refresh after a 300 ms settle.

---

## 6. Performance and degradation

### 6.1 Bundle budgets (gzipped, enforced in CI by `scripts/size-check.mjs`)

| Chunk | Contents | Budget |
|---|---|---|
| entry | shell, Lenis (~3), GSAP core + ScrollTrigger (~30), SplitText (~4), Observer (~2), CustomEase (~1.5), hero trace, entrances | **≤ 70 KB** |
| `instrument` (lazy) | signal generator, instrument, audit | **≤ 22 KB** |
| `webgl` (lazy) | three tree-shaken (~150–165), postprocessing (~30), topology + ceiling + shaders | **≤ 210 KB** |
| CSS | all of it, one file | **≤ 16 KB** |
| Fonts | 3 preloaded faces | **≤ 130 KB** |
| **Total JS across a full scroll** | | **≤ 300 KB** |

Drop GSAP `Flip` — nothing needs it. Be honest about three.js: tree-shaking saves less than people expect because `WebGLRenderer` pulls most of the renderer graph. ~150–165 KB gz is the floor, which is precisely why it is lazy and why only two sections use it.

### 6.2 Post-processing — the chain, and what is deliberately rejected

```ts
composer = new EffectComposer(renderer, {
  frameBufferType: HalfFloatType,          // required, or bloom bands in the dark gradient
  multisampling: tier === 'high' ? 4 : 0,
});
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera, new BloomEffect({
  luminanceThreshold: 0.72, luminanceSmoothing: 0.15,
  intensity: 0.6, mipmapBlur: true, radius: 0.62,
})));
```

- **Bloom — yes.** The legible plate and the flow dots are the only bright things in frame; bloom makes them read emissive and everything else matte, which *is* the story. `0.6` because nothing may glare.
- **Depth of field — no.** Costs 2–3 ms at 1080p and it makes text unreadable, which is catastrophic when the entire point is that one plate is legible. Use `scene.fog = new FogExp2(bg, 0.0018)` instead — free, and it does the depth job. *Fog instead of DoF.*
- **Noise, vignette — no, not in the composer.** DOM layers (§4.5), so they are consistent across all three rendering surfaces and cost one less pass each.
- **SMAA — no.** WebGL2 MSAA×4 on the composer buffer is cheaper and better for thin plate edges. Off on mid/low.
- **Tone mapping — `NoToneMapping`**, `outputColorSpace = SRGBColorSpace`. ACES crushes blacks and desaturates, which fights a low-contrast dark palette. Author the colours directly.
- Movement 06 uses **no composer at all** — bloom smears the field and costs a pass. The composer is built lazily the first time movement 04 activates. Every piece's `render()` supports both paths from day one.

### 6.3 Tiers, mobile, reduced motion, no-WebGL

**Tier score** (`core/tier.ts`, once): `+2` if `hardwareConcurrency ≥ 8` (`+1` if ≥6); `+1` if `deviceMemory ≥ 8`; `−2` if coarse pointer and `innerWidth < 900`; `−1` if `dpr > 2.5`; `−3` if no WebGL2. `≥3` high, `≥1` mid, else low. `saveData` → force low and never load the WebGL chunk.

**Runtime demotion**: EMA of frame time; if avg FPS < 45 for 2 continuous seconds while a WebGL piece is active, demote **once** (DPR→1, bloom off, instances halved) and never promote back. One-way, so it cannot oscillate.

**DPR caps**: WebGL high `min(dpr,2)` / mid `1.5` / low `1`. The 2D instrument high+mid `min(dpr,2)` / low `1.25` — hairlines need resolution more than the 3D does.

**Mobile** (<760px or coarse): topology 9 plates, no bloom, no hover (auto-cycling caption); ceiling 700 instances with a short scripted camera move; instrument 3 lanes, 30 s window, slider only; grain layer off.

**`prefers-reduced-motion`**, per movement:

| | |
|---|---|
| 01 / 02 | one static frame at `p = 0.6` (already split, residual visible); no rAF work at all |
| 03 | no autopilot, static 60 s window containing one event and two artefacts. **The threshold stays fully interactive** — the interaction *is* the content; only the motion is removed. Readouts snap instead of rolling. |
| 04 | one frame at the mid pose, then stop; re-render only on hover or resize; no flow dots |
| 05 | no reversal — two labelled stills side by side (`as first evaluated` / `as re-derived from raw`) plus a static layer-stack diagram |
| 06 | one static frame at the final pose |
| 07–11 | opacity-only 150 ms fades, no transforms |

Globally: **Lenis is not instantiated**, native scroll, ScrollTrigger unchanged. All of it in one `gsap.matchMedia()` context so it re-evaluates if the OS setting changes mid-session.

**No WebGL / context loss**: probe `WebGL2RenderingContext`, guard `createContext` in try/catch. On absence or `webglcontextlost` (`preventDefault()` it), swap in `fallback-2d/topology-2d.ts` and `ceiling-2d.ts`; rebuild on `webglcontextrestored`. An unhandled context loss leaves a frozen black canvas over the page — that happens on real machines when the GPU resets.

**Lazy loading**: `instrument` chunk at `start: 'top bottom+=150%'`, `once: true`. `webgl` chunk on `requestIdleCallback` after `load`, or movement 04 within 2 viewports, whichever first; skipped entirely on low tier / `saveData` / `?nogl=1`. Only the 3 fonts are preloaded — the WebGL chunk must not compete with them for bandwidth.

---

## 7. Repo, build, deploy, verification

### 7.1 Where copy lives

The obvious answer is a typed `content/` module. **Reject it** — a JS-rendered page has no content with JS off, which breaks the site's own promise, the `<noscript>` story, and crawlability. For a page a recruiter may open in a hardened browser, that is a real cost.

- **All long-form prose lives in `index.html`** as static semantic markup — in the delivered document, works without JS, one grep target. `index.html` contains **markup and copy only**: no inline `<script>` beyond the module entry, no inline styles. Header comment: `COPY IS SOURCE OF TRUTH. Do not edit prose in this file as part of a code change.`
- **JS-injected micro-copy** (plate roles, readout labels, the disclosure caption, transport states) lives in `src/content/strings.ts`, typed, `as const`.
- Rule: anything longer than a phrase goes in HTML.

### 7.2 Tree

```
site/
├─ index.html                    # ALL long-form copy + the 11-movement structure. Prose source of truth.
├─ package.json  tsconfig.json  vite.config.ts  playwright.config.ts
├─ docs/SPEC.md                  # this file, copied in at Phase 0
├─ public/
│  ├─ .nojekyll
│  ├─ fonts/*.woff2              # self-hosted; /fonts/… so static preload links stay valid
│  └─ audio/*.opus               # fetched only after the toggle is switched on
├─ src/
│  ├─ main.ts                    # entry: register plugins, boot, schedule lazy chunks, set window.__ready
│  ├─ core/
│  │  ├─ ticker.ts               # THE single rAF. gsap.ticker → lenis.raf → director.frame
│  │  ├─ smooth-scroll.ts        # Lenis init (skipped under reduce), anchors, the ScrollTrigger bridge
│  │  ├─ viewport.ts             # size/DPR state, debounced resize, guarded refresh()
│  │  ├─ tier.ts                 # device tier + one-way runtime FPS demotion
│  │  ├─ state.ts                # the plain mutable object pieces read
│  │  ├─ rng.ts                  # mulberry32 + hash32 — the ONLY randomness in the app
│  │  └─ reduced-motion.ts       # single source of truth for the reduce flag
│  ├─ motion/
│  │  ├─ entrances.ts            # the five entrance types (§4.3). Initial states via gsap.set, never CSS
│  │  ├─ split-lines.ts          # SplitText line masks, autoSplit, inside document.fonts.ready
│  │  ├─ counters.ts             # gsap.quickTo numeric roll for readouts
│  │  └─ eases.ts                # exactly three CustomEase curves, named once
│  ├─ pieces/
│  │  ├─ piece.ts                # SetPiece: mount/unmount/fit/frame/renderOnce/active/target
│  │  ├─ director.ts             # registry, activation gating, canvas visibility, FPS monitor
│  │  ├─ trace/                  # 01–02, Canvas 2D, initial bundle
│  │  ├─ instrument/             # 03 — piece, draw-trace, controls, readouts, roc-inset, reveal
│  │  ├─ audit/                  # 05 — reverse transport + de-derivation stack
│  │  ├─ topology/               # 04 — piece, plates, connectors, pick, plate-atlas
│  │  ├─ ceiling/                # 06 — piece, field
│  │  └─ fallback-2d/            # topology-2d, ceiling-2d
│  ├─ gl/
│  │  ├─ renderer.ts             # the single WebGLRenderer, context-loss handling, DPR
│  │  ├─ composer.ts             # lazily built, tier-gated
│  │  └─ shaders/{field.vert,field.frag,background.frag}
│  ├─ signal/                    # NO DOM. Serves 01, 02, 03, 05, the noscript SVG, and the tests.
│  │  ├─ seed.ts  schedule.ts  events.ts  waveform.ts  feature.ts  detector.ts  roc.ts
│  ├─ audio/audio.ts             # one AudioContext, created inside the first gesture only
│  ├─ content/strings.ts         # ONLY JS-injected micro-copy
│  └─ styles/{tokens,base,layout,chrome,movements,atmosphere}.css
├─ disclosure/
│  ├─ redlist.sha256             # SHA-256 of each normalised term. The terms never enter the repo.
│  └─ allow.txt                  # exact permitted sentences containing near-miss vocabulary
├─ scripts/{disclosure-check.mjs, size-check.mjs, gen-fallback-svg.mjs}
├─ tests/{signal.spec.ts, shots.spec.ts}
├─ .githooks/{pre-commit, commit-msg}
└─ .github/workflows/deploy.yml
```

### 7.3 The disclosure check

A literal deny-list file **is itself a disclosure**, and this repo is public. So: `disclosure/redlist.sha256` stores **SHA-256 of each normalised term, never the term**. The checker normalises scanned text (lowercase, collapse whitespace, strip punctuation), enumerates every 1–6-word n-gram, hashes, and compares — ~200 KB of text is ~240 k hashes, ≈0.3 s in Node. An `--add` mode reads a term from stdin, hashes it, appends, and **never echoes it**. On a hit it reports `redlist hash match #7 at src/…:214` and **never prints the matched term**, so CI logs stay clean.

Plus a publishable regex layer for whole categories: `/\bAUROC\b/i`, `/\bevent[- ]?F1\b/i`, `/\bablation\b/i`, `/\bsensitivity\s*(of|=|:)?\s*\d/i`, `/\d+(\.\d+)?\s*%\s*(precision|recall|F1|AUROC)/i`, `/\b(kernel|layers?|hidden|embedding|heads?)\s*[:=]\s*\d+/i`, `/\bgap\s*\d\b/i`, `/CGPA/i`, phone-number shapes.

And `disclosure/allow.txt` — exact permitted sentences containing near-miss vocabulary: the attributed 59%, the two-per-day clinical bar, the patent number `202541081235`, the SeizeIT2 facts, the Esteller attribution. Matches inside an allowlisted sentence are skipped.

**Scope**: `index.html`, `src/**/*.{ts,css,glsl}`, `scripts/**`, `README.md`, all `*.json`, `dist/**/*.{html,js,css}` post-build, and `git log -1 --pretty=%B`. **Hooks**: `.githooks/pre-commit` (staged files) and `.githooks/commit-msg` (pre-commit cannot see the message), enabled dependency-free via `"prepare": "git config core.hooksPath .githooks"`.

### 7.4 Vite and Actions

```ts
export default defineConfig({
  base: '/',                                  // user-pages repo → served at root
  plugins: [glsl({ compress: true })],
  build: {
    target: 'es2020', modulePreload: { polyfill: false },
    cssCodeSplit: false, assetsInlineLimit: 2048, sourcemap: true,
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('node_modules/three') || id.includes('node_modules/postprocessing')) return 'webgl';
    }}},
  },
});
```

Only `three` + `postprocessing` are forced into a chunk. Do **not** split gsap/lenis — they are critical-path and a second request buys nothing. The `webgl` chunk is only lazy because the pieces importing three are behind `import()`; **a single static `from 'three'` anywhere reachable from `main.ts` silently makes it eager — CI greps for exactly that.**

Actions workflow (`push: [main]`, `permissions: pages:write, id-token:write`, `concurrency: pages`): checkout → node 22 → `npm ci` → `check:disclosure` → `typecheck` → `test` → `build` → `check:size` → `playwright install chromium` → `shots:ci` → upload `shots/` artifact → `check:disclosure:dist` → `upload-pages-artifact dist` → `deploy-pages`.

> **One-time manual step, and it is the classic gotcha:** Settings → Pages → Source must be set to **"GitHub Actions"**. Until it is, deployment silently keeps serving the old branch contents.

### 7.5 The screenshot harness — the most important tool in the build

Every visual bug this site has ever had was invisible in code and obvious in an image. Use `@playwright/test` (not raw CDP): `webServer`, per-project viewports, native `reducedMotion` emulation, traces, HTML report — one dependency.

**What makes it work is a test API.** Lenis scrolling is asynchronous and animated; a harness that calls `scrollTo` and sleeps produces flaky mid-animation shots. Expose, gated on `DEV || location.search.includes('__test')`:

```ts
window.__test = {
  ready, goTo(id | {id,p}), freeze(), tick(n),
  setThreshold(z), state(), traceBounds(), fpsOver(frames),
};
```

`freeze()` (`gsap.ticker.sleep()`) + `tick(n)` at fixed `dt = 1/60` make screenshots **byte-deterministic**, which is what later makes visual-regression diffing viable at all.

Projects: `desktop 1440×900`, `wide 1920×1080`, `tablet 768×1024`, `narrow 390×844`, plus `reduced` and `nogl`. Per project, per movement, plus `p = 0.15 / 0.5 / 0.85` inside movements 03–06.

Assertions attached **before** `goto`:
- zero `console.error`, zero `pageerror`, zero `requestfailed`
- **zero requests to any origin but the preview origin** — the mechanical enforcement of the zero-third-party-request rule
- zero requests to `/audio/` while the toggle is off (default)
- no horizontal overflow: `scrollWidth <= innerWidth + 1` at every viewport
- axe-core (`@axe-core/playwright`) at each movement: zero serious/critical
- the trace canvas's drawn band never intersects the `<h1>` rect (movement 01)

**Emit `shots/index.html`, a contact sheet** — one file showing all ~120 images grouped by viewport. This is what converts "look at the screenshots" from an aspiration into a two-second habit. **Open it at the end of every phase.**

`npm run verify` = `check:disclosure && typecheck && test && build && check:size && shots`. Nothing is pushed without it green *and* the contact sheet reviewed.

---

## 8. Build order

Sequenced so the two genuinely uncertain things — the scroll/render spine, and the guaranteed-failure generator — are proven before a single pixel of polish exists. **Every phase leaves a working, deployable site.**

**Phase 0 — ground truth and guard rails.** `git tag v0-static && git push --tags` first (the working tree has uncommitted changes to `index.html` and `js/intro.js` — commit or stash them). Scaffold Vite + TS, fonts to `public/fonts/`, port copy into the 11 movements, write the disclosure checker + both hooks + size check + the Playwright harness against the plain page. Also ship the **type specimen page** (§4.2).
*Done:* 11 movements as plain scrolling HTML with correct fonts; `npm run verify` green end-to-end; contact sheet has 11 desktop + 11 narrow shots, zero console errors. **Prove the checker works** — paste a known red-list term in, watch CI fail, revert.

**Phase 1 — the spine.** `core/*`, `piece.ts`, `director.ts`, `entrances.ts`, `split-lines.ts`, `window.__test`. Register **11 debug pieces**, each drawing its own name and progress.
*Done:* greps prove zero `requestAnimationFrame` / `setAnimationLoop` / `offsetTop` in `src/`. Scrolling top→bottom every debug progress runs 0→1 monotonically and reads 0 or 1 outside its section; exactly one piece draws at a time; canvas is `visibility: hidden` when none is active. Resize 1440↔390 fires `refresh()` exactly once each way. Reduced-motion project: no Lenis, instant entrances, all text present.

**Phase 2 — the generator and the failure invariant.** All of `src/signal/**` + `tests/signal.spec.ts`. Pure logic, no UI. **The phase most likely to be quietly wrong.**
*Done — all seven:* (1) determinism across fresh module instances and independent of request order; (2) no discontinuity >3σ at 200 random block boundaries; (3) plausibility — test-side DFT shows quiet-wake PSD falling as `1/f^1.2 ± 0.4`, an alpha bump in drowsy segments, ECG autocorrelation peaking at the expected RR; (4) closed-form `feature(t)` within 12% of real line-length over 100 random 8 s windows; (5) the invariant, asserted over the full ROC table; (6) not rigged — some θ reaches sensitivity ≥ 0.5, and 1.0 is reachable; (7) the 200-threshold sweep under 250 ms on CI.
Ship a temporary `?debug=signal` page plotting the ROC and score histogram and **screenshot it. A human must look at that curve before Phase 4.**

**Phase 3 — movements 01–02, the trace.** *Done:* shots at hero / mid / end show one line → two diverging → filled residual. `traceBounds()` never intersects the `<h1>` rect. With JS disabled the hero copy is fully present. Entry chunk ≤ 70 KB gz.

**Phase 4 — movement 03, the instrument.** Three sub-phases.
*4a rendering* — multi-lane decimation, day-bar, transport, autopilot. *Done:* `fpsOver(120) ≥ 55` at 1440×900; a pixel read confirms a hairline occupies exactly one device-pixel row at DPR 1.
*4b controls + readouts + a11y* — *Done:* keyboard-only reaches and changes the threshold and `aria-valuetext` updates; readouts equal `roc.at(θ)` exactly at 5 sampled thresholds; under coarse-pointer emulation the canvas does not capture vertical scroll.
*4c the reveal + disclosure furniture + ROC inset* — *Done:* caption strip, `SYNTHETIC` watermark and the noscript paragraph all present; the clinically-useful box renders **empty**; the reveal fires on interaction and on a 20 s no-interaction timeout.

**Phase 5 — the WebGL layer.** `gl/renderer.ts`, `composer.ts`, context loss, the dynamic import, the no-WebGL branch, with a *placeholder* piece in movement 04's slot.
*Done:* `page.on('request')` proves the `webgl` chunk is not requested until movement 04 is within 2 viewports, and never with `?nogl=1` or `saveData`. Forcing `WEBGL_lose_context` swaps to the 2D fallback within a second with nothing on `console.error`. No banding in the dark background at 1440×900.

**Phase 6 — movement 04, the topology.** *Done:* shots at `p = 0.15/0.5/0.85` desktop and narrow show every plate inside the viewport with exactly one legible. Three hover positions give three different role captions. Raycast under 0.3 ms. Bloom-off on `low` verified by screenshot. Every string in `plates.ts` originates in `content/strings.ts` and is allowlisted.

**Phase 7 — movement 05, the audit.** *Done:* at `p = 0/0.33/0.66/1.0` the transport shows strictly decreasing times and the layer stack has lost exactly one layer per third. Scrolling *backwards* runs it forward with no jump larger than one frame of damped travel. And the one subjective gate: **look at the four-frame sequence and confirm it reads as rewind, not as a stall.**

**Phase 8 — movement 06, the ceiling.** *Done:* a framebuffer pixel-count assertion proves instances are ≥2 device pixels at both 1440×900 and 390×844 — the direct antidote to the historical empty void. A unit test proves no instance's Y crosses the ceiling. A grep of `pieces/ceiling/**` finds no digit-bearing string literals.

**Phase 9 — movements 07–11, chrome, a11y, meta.** Method, other work, everything-else, him, contact. Topbar with its own scrim, progress rail, skip link, focus rings, JSON-LD `Person`, OG tags, favicon, the generated `<noscript>` SVG.
*Done:* axe-core zero serious/critical at all 11 movements. Tab order reaches every link and the slider. Body-copy contrast **measured** ≥ 4.5:1 (the old `--faint #6f6862` on `#09090a` is ~3.3:1 and fails — §4.1 already carries the fix). No horizontal overflow at any of four viewports. Zero third-party requests.

**Phase 10 — audio.** Six ~40 KB Opus samples: low room tone, a relay click on threshold detents, a soft blip per false alarm, a tape whirr for 05, a struck tone for the ceiling. **One `AudioContext`, constructed only inside the first user gesture** — earlier leaves it suspended and logs a warning, which fails the harness.
*Done:* with the toggle off (default), zero requests to `/audio/` and `AudioContext` never constructed — both asserted. Toggle has a real `aria-pressed` and an accessible name.

**Phase 11 — deploy.** Set Pages source to GitHub Actions. Push.
*Done:* green Actions run including the harness. Run the harness against the live origin (`SHOTS_BASE=https://beyondinfinity1610.github.io npm run shots`) for the same zero-error, zero-third-party result. Contact sheet reviewed.

**Phase 12 — content pass (author, not code).** See §10.

---

## 9. Copy work

The existing copy is the source of truth and most of it carries forward verbatim — it is genuinely good, and it is in his voice. What needs writing:

- **Movement 03 in full** — new section. Eyebrow, headline, the problem framing (why chewing looks like a seizure, what the <2/day bar means), the instrument's own labels, the disclosure paragraph (§2.5), and the reveal copy after failure.
- **The 03→04→05→06 connective tissue** — these were four separate sections and are now four acts. Each needs an opening line that hands off from the previous.
- **Movement 08** — the four other projects, re-weighted now that the seizure work is a whole act rather than an entry. KYFR gets real space (he asked for it specifically, and it is the strongest evidence he ships production systems); the licence-plate detector does not get the same visual weight as a patent.
- **Trim**: the current `#work` entry 01 and `#redaction` foot copy partly duplicate what movements 03–06 now say by showing.

Voice rules, unchanged: first person, direct, technically precise, understated, willing to state a negative result. Never marketing language, no superlatives about himself.

---

## 10. Open items needing the author before going public

A grep cannot judge these. Track as a checklist, not as code.

1. **The plate role vocabulary** (§3.2) — eight strings that must reveal structure without revealing components.
2. **"Twenty-eight tuning experiments"** — currently on the live site. It is a count of *his* ablation runs, adjacent to the banned ablation table. Keep, soften, or cut?
3. **The ROC-inset framing** — the plot shows a curve derived from *synthetic* data, but the shape of the argument is real. Confirm he is comfortable.
4. **The type decision** (§4.2) — Fraunces vs. Instrument Serif, from the Phase 0 specimen.
5. **`Math is fine, but check the 59%`** — confirm the human-expert sensitivity figure and its citation before it is stated on a public page as someone else's published number.

---

## 11. Verification

The single gate is `npm run verify`, which runs disclosure → typecheck → signal tests → build → size budgets → the full Playwright harness, and writes `shots/index.html`.

Beyond that, at the end of every phase:

1. **Open the contact sheet.** Not the terminal output — the images. This is the rule that would have caught every visual bug the previous site ever shipped.
2. `npm run dev`, scroll the whole page slowly on a real mouse wheel, then on a trackpad. Then scroll it *fast*. Console silent at every position.
3. Resize from 1440 to 390 and back while mid-page. Nothing jumps.
4. Toggle OS reduced-motion mid-session. The page adapts without reload.
5. Load with `?nogl=1`. Everything still works.
6. Disable JavaScript entirely. All copy is present and readable; the `<noscript>` SVG shows the instrument's argument as a static image.
7. Tab through the page from the top. Every interactive element is reachable and its focus ring visible.

---

## Reference material

| Path | What it is |
|---|---|
| `site/index.html` | **The copy.** Source of truth, carries forward, becomes Vite's entry |
| `site/README.md` | The nine historical bugs + the disclosure rule. Rewrite for the new stack using §5.4 as its replacement |
| `site/css/main.css` | Palette, type scale, `@font-face` block → port into `src/styles/`. Also where `scroll-behavior: smooth` must die |
| `site/js/world.js` | Read for set-piece *intent* and the `fit()`/DPR logic. **Discard its single-corridor architecture entirely** |
| `site/vendor/fonts/` | Eight woff2 faces → `public/fonts/` |
| `brief/Thejeshwaar_Master_Brief.docx` | The compiled factual record. Part VI is the green/amber/red list |
| `brief/WEBSITE_BUILD_PROMPT.md` | Prior direction. Superseded by this file, but §2.1 and §3 are still the disclosure and redaction rationale |
| `Desktop/kyfr-work/README.md` | KYFR facts for movement 08 |
| `Desktop/things to learn.txt` | Source for the "what I'm learning next" copy in movement 10 |

**Highest-risk new files, in order:** `src/signal/roc.ts` + `tests/signal.spec.ts` (the failure invariant), `src/core/ticker.ts` (the single rAF), `src/pieces/director.ts` (activation gating and the stale-frame guard), `scripts/disclosure-check.mjs` and `tests/shots.spec.ts` (the two gates).
