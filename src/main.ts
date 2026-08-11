import './styles/index.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Observer } from 'gsap/Observer';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';
import type Lenis from 'lenis';

import { state } from './core/state';
import { computeTier, dprCap } from './core/tier';
import { isReducedMotion } from './core/reduced-motion';
import { initSmoothScroll, getLenis, honourHash } from './core/smooth-scroll';
import { startTicker, onFrame, freezeTicker, tickFrames } from './core/ticker';
import { initViewport, onResize } from './core/viewport';
import './core/test-api';
import { splitDisplayLines } from './motion/split-lines';
import { buildEntrances } from './motion/entrances';
import { playIgnition } from './motion/ignition';
import { Director } from './pieces/director';
import { DebugPiece } from './pieces/debug-piece';
import { TracePiece } from './pieces/trace/trace-piece';
import { Topology2DPiece } from './pieces/fallback-2d/topology-2d';
import { Ceiling2DPiece } from './pieces/fallback-2d/ceiling-2d';
import type { InstrumentInstance } from './pieces/instrument/piece';
import type { AuditPiece } from './pieces/audit/piece';
import type { WebglDirector } from './gl/webgl-director';
import type { TopologyPiece } from './pieces/topology/piece';
import type { CeilingPiece } from './pieces/ceiling/piece';
import { setAudioEnabled, isAudioEnabled, audioContextConstructed, getSoundPlayLog, clearSoundPlayLog } from './audio/audio';
import { AUDIO_TOGGLE_ON_LABEL, AUDIO_TOGGLE_OFF_LABEL } from './content/strings';

gsap.registerPlugin(ScrollTrigger, SplitText, Observer, CustomEase);

// Movements 01-02 (drift, lie) share one continuous piece — the trace,
// spec §3.1 — rather than one debug piece each. Method, work, else, him
// and contact are all "Canvas: —" (spec §1's table): no piece is
// registered for them, so the canvas correctly goes hidden once ceiling's
// trigger exits, and stays hidden for the rest of the page. 'withheld' gets
// Topology2DPiece instead of a generic debug piece (registered below,
// alongside these) — it's the free no-WebGL fallback (spec §3.2), shown
// before the WebGL chunk loads and again if WebGL is unavailable or its
// context is lost.
// 'audit' (movement 05) and 'ceiling' (movement 06) are wired separately
// below, each onto a real lazily-loaded piece — the same treatment
// 'withheld' got in Phase 6.
const DEBUG_PIECE_MOVEMENT_IDS = ['try'] as const;

ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

let refreshCount = 0;
function refresh(): void {
  refreshCount++;
  ScrollTrigger.refresh();
}

async function boot(): Promise<void> {
  if (new URLSearchParams(location.search).get('debug') === 'signal') {
    const { mountSignalDebug } = await import('./debug/signal-debug');
    mountSignalDebug();
    window.__ready = true;
    return;
  }

  state.tier = computeTier();
  state.reduced = isReducedMotion();

  const canvas = document.getElementById('world') as HTMLCanvasElement;
  const director = new Director(canvas);

  // Two triggers per piece, deliberately split: progress is measured over
  // the full "top bottom" → "bottom top" sweep (spec §5.2's example — right
  // for animation, since a piece should keep animating for as long as any
  // part of it is on screen). Exclusivity is a different question and needs
  // a different window: for a section exactly one viewport tall (the hero),
  // the full-sweep window overlaps its neighbour's by construction, so two
  // adjacent pieces would both read active at once. A section's ownership
  // of the single shared canvas instead follows which section currently
  // spans the viewport's centre line — sections tile the document with no
  // gaps, so that centre point is inside exactly one section at a time.
  const triggers = new Map<string, ScrollTrigger>();

  const driftEl = document.getElementById('drift');
  const lieEl = document.getElementById('lie');
  let tracePiece: TracePiece | null = null;
  if (driftEl && lieEl) {
    tracePiece = new TracePiece(director);
    director.register(tracePiece);

    // One piece, one combined trigger spanning both sections — endTrigger
    // lets the end boundary live on a different element than the start.
    const traceProgress = ScrollTrigger.create({
      trigger: driftEl,
      start: 'top bottom',
      endTrigger: lieEl,
      end: 'bottom top',
      onUpdate: (self) => {
        tracePiece!.target = self.progress;
      },
    });
    triggers.set('trace', traceProgress);
    triggers.set('drift', traceProgress);
    triggers.set('lie', traceProgress);

    ScrollTrigger.create({
      trigger: driftEl,
      start: 'top center',
      endTrigger: lieEl,
      end: 'bottom center',
      onToggle: (self) => {
        director.setActive(tracePiece!, self.isActive);
      },
    });
  }

  // Two triggers per debug piece, deliberately split: progress is measured
  // over the full "top bottom" → "bottom top" sweep (spec §5.2's example —
  // right for animation, since a piece should keep animating for as long
  // as any part of it is on screen). Exclusivity is a different question
  // and needs a different window: for a section exactly one viewport tall,
  // the full-sweep window overlaps its neighbour's by construction, so two
  // adjacent pieces would both read active at once. A section's ownership
  // of the single shared canvas instead follows which section currently
  // spans the viewport's centre line — sections tile the document with no
  // gaps, so that centre point is inside exactly one section at a time.
  for (const id of DEBUG_PIECE_MOVEMENT_IDS) {
    const sectionEl = document.getElementById(id);
    if (!sectionEl) continue;
    const piece = new DebugPiece(id, director);
    director.register(piece);

    const progressTrigger = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        piece.target = self.progress;
      },
    });
    triggers.set(id, progressTrigger);

    ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        director.setActive(piece, self.isActive);
      },
    });
  }

  // Movement 04 (withheld) routes through a swappable target — spec §5's
  // no-WebGL branch means responsibility for this section can move from
  // the 2D fallback to the real WebGL topology and back (on context loss)
  // after these triggers already exist, so onUpdate/onToggle delegate
  // through a mutable indirection rather than assuming either backend.
  const withheldEl = document.getElementById('withheld');
  const withheldTriggers: { progress: ScrollTrigger | null; activation: ScrollTrigger | null } = {
    progress: null,
    activation: null,
  };

  const withheldDebugPiece = withheldEl ? new Topology2DPiece(director) : null;
  if (withheldDebugPiece) director.register(withheldDebugPiece);

  let withheldTarget = {
    setProgress: (p: number) => {
      if (withheldDebugPiece) withheldDebugPiece.target = p;
    },
    setActive: (a: boolean) => {
      if (withheldDebugPiece) director.setActive(withheldDebugPiece, a);
    },
  };

  if (withheldEl) {
    const progressTrigger = ScrollTrigger.create({
      trigger: withheldEl,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => withheldTarget.setProgress(self.progress),
    });
    triggers.set('withheld', progressTrigger);
    withheldTriggers.progress = progressTrigger;

    withheldTriggers.activation = ScrollTrigger.create({
      trigger: withheldEl,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => withheldTarget.setActive(self.isActive),
    });
  }

  // Movement 06 (ceiling) — same swappable-target shape as withheld above:
  // the 2D fallback owns the section until the lazy WebGL piece (or
  // context-loss recovery) hands it off.
  const ceilingEl = document.getElementById('ceiling');
  const ceilingTriggers: { progress: ScrollTrigger | null; activation: ScrollTrigger | null } = {
    progress: null,
    activation: null,
  };

  const ceilingDebugPiece = ceilingEl ? new Ceiling2DPiece(director) : null;
  if (ceilingDebugPiece) director.register(ceilingDebugPiece);

  let ceilingTarget = {
    setProgress: (p: number) => {
      if (ceilingDebugPiece) ceilingDebugPiece.target = p;
    },
    setActive: (a: boolean) => {
      if (ceilingDebugPiece) director.setActive(ceilingDebugPiece, a);
    },
  };

  if (ceilingEl) {
    const progressTrigger = ScrollTrigger.create({
      trigger: ceilingEl,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => ceilingTarget.setProgress(self.progress),
    });
    triggers.set('ceiling', progressTrigger);
    ceilingTriggers.progress = progressTrigger;

    ceilingTriggers.activation = ScrollTrigger.create({
      trigger: ceilingEl,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => ceilingTarget.setActive(self.isActive),
    });
  }

  // The WebGL layer — spec §5/§8 Phase 5-6. Lazily loaded only when movement
  // 04 is within 2 viewports (this is the deterministic, testable half of
  // spec §6.3's dual trigger; the requestIdleCallback prefetch path was
  // dropped deliberately — it can fire before any scroll at all on an
  // otherwise-idle page, which directly contradicts the done-test's "not
  // requested until within 2 viewports"). Never with ?nogl=1, saveData, or
  // on the low tier.
  const nogl = new URLSearchParams(location.search).get('nogl') === '1';
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const webglAllowed = !nogl && !saveData && state.tier !== 'low';

  let glDirector: WebglDirector | null = null;
  let webglPiece: TopologyPiece | null = null;
  let ceilingPiece: CeilingPiece | null = null;

  // Both movement 04 and movement 06 lazily create the ONE shared
  // WebglDirector/renderer (webgl-director.ts's own header comment: "the
  // registry for the WebGL pieces (movements 04, 06)") the first time
  // either's own "2 viewports before" trigger fires — a fast scroll, or a
  // direct #ceiling deep link (honourHash() below), can fire both around
  // the same tick. Memoizing the in-flight PROMISE, not just the eventual
  // result, is what keeps that race from constructing two WebGLRenderers
  // against the same canvas: whichever trigger asks first starts the
  // work, and the second one awaits the same promise instead of racing it.
  let glDirectorPromise: Promise<WebglDirector | null> | null = null;
  function ensureGlDirector(): Promise<WebglDirector | null> {
    if (!glDirectorPromise) {
      glDirectorPromise = (async () => {
        const { WebglDirector } = await import('./gl/webgl-director');
        const glCanvas = document.getElementById('world-gl') as HTMLCanvasElement;
        const director2 = new WebglDirector(glCanvas);
        if (!director2.init()) return null; // WebGL2 unavailable — stay on the 2D fallback
        glDirector = director2;
        director2.fit(window.innerWidth, window.innerHeight, dprForCurrentTier());
        return director2;
      })();
    }
    return glDirectorPromise;
  }

  if (withheldEl && webglAllowed) {
    ScrollTrigger.create({
      trigger: withheldEl,
      start: 'top bottom+=200%', // 2 viewports
      once: true,
      onEnter: async () => {
        const [director2, { TopologyPiece }, { createComposer }] = await Promise.all([
          ensureGlDirector(),
          import('./pieces/topology/piece'),
          import('./gl/composer'),
        ]);
        if (!director2) return; // WebGL2 unavailable — stay on the 2D fallback

        const glCanvas = document.getElementById('world-gl') as HTMLCanvasElement;
        webglPiece = new TopologyPiece(glCanvas);
        webglPiece.setComposerFactory((renderer, scene, camera) => createComposer(renderer, scene, camera, state.tier));
        director2.register(webglPiece);
        director2.fit(window.innerWidth, window.innerHeight, dprForCurrentTier());

        // Hand responsibility from the 2D fallback to the WebGL piece,
        // seeded with whatever the 2D piece's trigger currently reads —
        // onUpdate/onToggle only fire on change, not continuously.
        if (withheldDebugPiece) director.setActive(withheldDebugPiece, false);
        webglPiece.target = withheldTriggers.progress?.progress ?? 0;
        webglPiece.active = withheldTriggers.activation?.isActive ?? false;
        withheldTarget = {
          setProgress: (p) => {
            webglPiece!.target = p;
          },
          setActive: (a) => {
            director2.setActive(webglPiece!, a);
          },
        };

        // Context loss: an unhandled loss leaves a frozen black canvas
        // over the page — a real failure mode when the GPU resets (spec
        // §6.3). Fall back to the 2D piece immediately; rebuild on
        // restoration rather than leaving the page stuck on the fallback.
        const handle = director2.rendererHandle;
        handle?.onContextLost(() => {
          director2.setActive(webglPiece!, false);
          const p = withheldTriggers.progress?.progress ?? 0;
          const a = withheldTriggers.activation?.isActive ?? false;
          if (withheldDebugPiece) {
            withheldDebugPiece.target = p;
            director.setActive(withheldDebugPiece, a);
          }
          withheldTarget = {
            setProgress: (pp) => {
              if (withheldDebugPiece) withheldDebugPiece.target = pp;
            },
            setActive: (aa) => {
              if (withheldDebugPiece) director.setActive(withheldDebugPiece, aa);
            },
          };
        });
        handle?.onContextRestored(() => {
          if (withheldDebugPiece) director.setActive(withheldDebugPiece, false);
          const p = withheldTriggers.progress?.progress ?? 0;
          const a = withheldTriggers.activation?.isActive ?? false;
          webglPiece!.target = p;
          director2.setActive(webglPiece!, a);
          withheldTarget = {
            setProgress: (pp) => {
              webglPiece!.target = pp;
            },
            setActive: (aa) => {
              director2.setActive(webglPiece!, aa);
            },
          };
        });
      },
    });
  }

  // Movement 06's own lazy WebGL trigger — independent of withheld's, so a
  // direct #ceiling deep link (honourHash(), below) still loads the real
  // piece without requiring the visitor to have scrolled past movement 04
  // first. ensureGlDirector() (above) is what keeps this from racing
  // withheld's trigger into building a second renderer if both fire close
  // together.
  if (ceilingEl && webglAllowed) {
    ScrollTrigger.create({
      trigger: ceilingEl,
      start: 'top bottom+=200%', // 2 viewports
      once: true,
      onEnter: async () => {
        const [director2, { CeilingPiece }] = await Promise.all([
          ensureGlDirector(),
          import('./pieces/ceiling/piece'),
        ]);
        if (!director2) return; // WebGL2 unavailable — stay on the 2D fallback

        const glCanvas = document.getElementById('world-gl') as HTMLCanvasElement;
        ceilingPiece = new CeilingPiece(glCanvas);
        director2.register(ceilingPiece);
        // Director.fit() only runs at boot and on resize — a piece
        // registered later, lazily, between those events never gets an
        // initial size otherwise and every frame's aspect-ratio-dependent
        // projection silently renders nothing (no console error). Movement
        // 04's WebGL piece re-fits its director for the same reason right
        // after registering; this is that same fix, applied from day one
        // rather than found after shipping a blank canvas.
        director2.fit(window.innerWidth, window.innerHeight, dprForCurrentTier());

        if (ceilingDebugPiece) director.setActive(ceilingDebugPiece, false);
        ceilingPiece.target = ceilingTriggers.progress?.progress ?? 0;
        ceilingPiece.active = ceilingTriggers.activation?.isActive ?? false;
        ceilingTarget = {
          setProgress: (p) => {
            ceilingPiece!.target = p;
          },
          setActive: (a) => {
            director2.setActive(ceilingPiece!, a);
          },
        };

        // Context loss — same recovery shape as withheld's, spec §6.3: an
        // unhandled loss leaves a frozen black canvas over the page.
        const handle = director2.rendererHandle;
        handle?.onContextLost(() => {
          director2.setActive(ceilingPiece!, false);
          const p = ceilingTriggers.progress?.progress ?? 0;
          const a = ceilingTriggers.activation?.isActive ?? false;
          if (ceilingDebugPiece) {
            ceilingDebugPiece.target = p;
            director.setActive(ceilingDebugPiece, a);
          }
          ceilingTarget = {
            setProgress: (pp) => {
              if (ceilingDebugPiece) ceilingDebugPiece.target = pp;
            },
            setActive: (aa) => {
              if (ceilingDebugPiece) director.setActive(ceilingDebugPiece, aa);
            },
          };
        });
        handle?.onContextRestored(() => {
          if (ceilingDebugPiece) director.setActive(ceilingDebugPiece, false);
          const p = ceilingTriggers.progress?.progress ?? 0;
          const a = ceilingTriggers.activation?.isActive ?? false;
          ceilingPiece!.target = p;
          director2.setActive(ceilingPiece!, a);
          ceilingTarget = {
            setProgress: (pp) => {
              ceilingPiece!.target = pp;
            },
            setActive: (aa) => {
              director2.setActive(ceilingPiece!, aa);
            },
          };
        });
      },
    });
  }

  function dprForCurrentTier(): number {
    return dprCap(state.tier);
  }

  // Movement 03's instrument — lazily loaded, spec §6.3: "instrument chunk
  // at start: 'top bottom+=150%', once: true." A dynamic import here (never
  // a static one anywhere reachable from main.ts) is what makes Vite split
  // it into its own ≤22KB chunk instead of inflating the eager entry.
  let instrument: InstrumentInstance | null = null;
  const instrumentMount = document.getElementById('instrument-mount');
  if (instrumentMount) {
    ScrollTrigger.create({
      trigger: instrumentMount,
      start: 'top bottom+=150%',
      once: true,
      onEnter: async () => {
        const { mountInstrument } = await import('./pieces/instrument/piece');
        instrument = mountInstrument(instrumentMount);
        instrument.fit();
      },
    });
  }

  // Movement 05 (audit) — spec §3.3, wired the same way movement 04
  // (withheld) was rewired off DebugPiece in Phase 6: two triggers exist
  // from boot (progress full-sweep, activation centre-line), routed
  // through a mutable indirection until the piece itself finishes its
  // lazy import (same "instrument" chunk per spec §6.1 — signal/**'s
  // heavier modules must not bloat the eager entry). Once loaded, the
  // indirection is swapped to the real piece and seeded from whatever the
  // triggers currently read, exactly like withheldTarget's swap above.
  const auditEl = document.getElementById('audit');
  const auditTriggers: { progress: ScrollTrigger | null; activation: ScrollTrigger | null } = {
    progress: null,
    activation: null,
  };
  let auditPiece: AuditPiece | null = null;
  let auditTarget = {
    setProgress: (_p: number) => {},
    setActive: (_a: boolean) => {},
  };

  if (auditEl) {
    const progressTrigger = ScrollTrigger.create({
      trigger: auditEl,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => auditTarget.setProgress(self.progress),
    });
    triggers.set('audit', progressTrigger);
    auditTriggers.progress = progressTrigger;

    auditTriggers.activation = ScrollTrigger.create({
      trigger: auditEl,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => auditTarget.setActive(self.isActive),
    });

    ScrollTrigger.create({
      trigger: auditEl,
      start: 'top bottom+=150%',
      once: true,
      onEnter: async () => {
        const { AuditPiece: RealAuditPiece } = await import('./pieces/audit/piece');
        const piece = new RealAuditPiece(director);
        director.register(piece);
        // Director.fit() only runs at boot and on resize (main.ts's own
        // fitAll) — a piece registered later, lazily, between those events
        // never gets an initial size otherwise, and draw() bails out on
        // w===0 forever. Movement 04's WebGL piece re-fits its director
        // for the same reason right after registering; this is that same
        // fix for the 2D director.
        piece.fit(window.innerWidth, window.innerHeight);
        piece.target = auditTriggers.progress?.progress ?? 0;
        piece.setSectionActive(auditTriggers.activation?.isActive ?? false);
        auditPiece = piece;
        auditTarget = {
          setProgress: (p) => {
            piece.target = p;
          },
          // setSectionActive (not director.setActive) — it also flips the
          // piece's own HUD DOM visibility, which Director.setActive alone
          // doesn't know about (see the method's own doc comment).
          setActive: (a) => piece.setSectionActive(a),
        };
      },
    });
  }

  // The progress rail — spec §4.4/§8 Phase 9. A plain document-length
  // ScrollTrigger, not a piece: it drives a DOM element directly (gsap.set
  // on scaleX), which is squarely "GSAP animates the DOM" (spec §5.2) —
  // there's no canvas involved, so the piece/frame(dt) damped-follow
  // machinery that rule exists for doesn't apply here.
  const progressRailFill = document.getElementById('progress-rail-fill');
  let progressRailValue = 0;
  if (progressRailFill) {
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progressRailValue = self.progress;
        gsap.set(progressRailFill, { scaleX: self.progress });
      },
    });
  }

  // The audio toggle — spec §1/§8 Phase 10: "muted by default, visible
  // toggle, never autoplay." setAudioEnabled(true) is called synchronously
  // from inside this click handler — a real user gesture — which is the
  // only place the shared AudioContext is ever constructed (spec: "earlier
  // leaves it suspended and logs a warning, which fails the harness").
  const audioToggleEl = document.getElementById('audio-toggle') as HTMLButtonElement | null;
  const audioToggleStateEl = audioToggleEl?.querySelector('.audio-toggle-state') ?? null;
  audioToggleEl?.addEventListener('click', () => {
    const next = !isAudioEnabled();
    setAudioEnabled(next);
    audioToggleEl.setAttribute('aria-pressed', String(next));
    if (audioToggleStateEl) audioToggleStateEl.textContent = next ? AUDIO_TOGGLE_ON_LABEL : AUDIO_TOGGLE_OFF_LABEL;
  });

  const dpr = dprCap(state.tier);
  const fitAll = (w: number, h: number) => director.fit(w, h, dpr);
  fitAll(window.innerWidth, window.innerHeight);

  onResize((w, h, full) => {
    fitAll(w, h);
    if (full) refresh();
    instrument?.fit();
    glDirector?.fit(w, h, dprForCurrentTier());
  });
  initViewport();

  const lenis: Lenis | null = initSmoothScroll();

  onFrame((dt) => {
    // audit's own simulate() runs before director.frame(dt) so its
    // localP (and HUD) are already current by the time Director asks it
    // to draw, if it's active this tick — see AuditPiece.simulate()'s
    // doc comment for why this can't just be Director-gated frame(dt).
    auditPiece?.simulate(dt);
    director.frame(dt);
    instrument?.frame(dt);
    glDirector?.frame(dt);
  });
  startTicker();

  // Boot order — spec §5.5.
  await document.fonts.ready;
  // Fonts swapping in (fallback serif → Fraunces) can reflow the h1 that
  // trace-piece.ts measures for its collision margin — re-fit once metrics
  // are final, before anything else reads layout.
  fitAll(window.innerWidth, window.innerHeight);
  // Cold-start: the instrument grid and the hero's own trace power on
  // before any copy enters (motion/ignition.ts). Awaited here so
  // buildEntrances()'s hero reveal — which is otherwise already visible
  // above the fold at boot, per sweepAboveFold() — starts only once the
  // instrument has actually switched on, not simultaneously with it.
  await playIgnition();
  splitDisplayLines();
  buildEntrances();
  refresh();
  honourHash();

  state.ready = true;
  window.__ready = true;

  window.__test = {
    ready: () => state.ready,
    goTo(target) {
      const id = typeof target === 'string' ? target : target.id;
      const p = typeof target === 'string' ? 0.5 : target.p ?? 0.5;
      const st = triggers.get(id);
      if (!st) return;
      const scrollPos = st.start + (st.end - st.start) * p;
      const current = getLenis();
      if (current) current.scrollTo(scrollPos, { immediate: true });
      else window.scrollTo(0, scrollPos);
    },
    freeze: freezeTicker,
    tick: (n = 1, dt = 1 / 60) => tickFrames(n, dt),
    state: () => ({ ...state }),
    pieces: () => [
      ...director.list().map((p) => ({ id: p.id, active: p.active, p: p.p, target: p.target })),
      // Movement 04's ownership can move from the 2D debug piece to the
      // WebGL placeholder mid-session (spec §5's no-WebGL/context-loss
      // branch) — report whichever is actually live so a test checking
      // "exactly one piece active" isn't blind to the WebGL half.
      ...(glDirector?.list().map((p) => ({ id: p.id, active: p.active, p: 0, target: p.target })) ?? []),
    ],
    refreshCount: () => refreshCount,
    traceBounds: () => tracePiece?.getBounds() ?? null,
    instrumentState: () => instrument?.getTestState() ?? null,
    setThreshold: (z) => instrument?.setThresholdForTest(z),
    auditState: () => auditPiece?.getTestState() ?? null,
    auditSetTarget: (p) => auditPiece?.setTargetForTest(p),
    fpsOver: (frames) =>
      new Promise<number>((resolve) => {
        let count = 0;
        let elapsed = 0;
        const off = onFrame((dt) => {
          count++;
          elapsed += dt;
          if (count >= frames) {
            off();
            resolve(count / elapsed);
          }
        });
      }),
    topologyState: () =>
      webglPiece
        ? { plateCount: webglPiece.plateCount(), hasBloom: webglPiece.hasBloom(), captionText: webglPiece.getCaptionText() }
        : null,
    topologyProjectPlate: (index) => {
      if (!webglPiece || !glDirector) return null;
      const { w, h } = glDirector.currentSize();
      return webglPiece.projectPlateToScreen(index, w, h);
    },
    topologySimulateHover: (index) => {
      if (!webglPiece) return null;
      webglPiece.simulateHoverForTest(index);
      return webglPiece.getCaptionText();
    },
    topologyRaycastMs: () => webglPiece?.raycastTimingMs() ?? null,
    ceilingState: () =>
      ceilingPiece
        ? {
            instanceCount: ceilingPiece.instanceCount(),
            nearMissCount: ceilingPiece.nearMissCount(),
            hasComposer: ceilingPiece.hasComposer(),
            mobileScripted: ceilingPiece.isMobileScripted(),
          }
        : null,
    ceilingProjectInstance: (index) => {
      if (!ceilingPiece || !glDirector) return null;
      const { w, h } = glDirector.currentSize();
      return ceilingPiece.projectInstanceToScreen(index, w, h);
    },
    ceilingClosestInstance: () => {
      if (!ceilingPiece || !glDirector) return null;
      const { w, h } = glDirector.currentSize();
      const glCanvas = document.getElementById('world-gl') as HTMLCanvasElement | null;
      if (!glCanvas) return null;
      // glCanvas.height is the canvas's real backing-store size (already
      // scaled by devicePixelRatio via renderer.setSize's setPixelRatio
      // call, gl/renderer.ts) — the actual device-pixel count spec §8
      // Phase 8's done-test asks about, not the CSS pixel height `h`.
      return ceilingPiece.closestInstanceScreenInfo(w, h, glCanvas.height);
    },
    progressRail: () => (progressRailFill ? progressRailValue : null),
    audioContextConstructed,
    audioEnabled: isAudioEnabled,
    soundPlayLog: getSoundPlayLog,
    clearSoundPlayLog,
  };

  void lenis; // kept for parity with later phases that read it directly
}

boot();
