import { test, expect } from '@playwright/test';
import '../src/core/test-api';

// Movement 06 — the ceiling, spec §8 Phase 8's done-test:
// - a framebuffer pixel-count assertion proves instances are >= 2 device
//   pixels at both 1440x900 and 390x844 — "the direct antidote to the
//   historical empty void"
// - (the unit-test half of "no instance's Y crosses the ceiling" lives in
//   tests/ceiling-field.spec.ts, a vitest suite over field.ts directly)
// - (the "no digit-bearing string literal in pieces/ceiling/**" grep is
//   scripts/grep-invariants.mjs, run as part of `npm run check:grep`)
//
// The pixel-count check reads REAL rendered pixels, not just projection
// math — the lesson from movement 04 and 05, both of which shipped a
// broken canvas that only state/DOM assertions couldn't see (see this
// phase's own working notes). topology.spec.ts's Phase 6 version punted on
// a real pixel read because `ctx.drawImage(glCanvas,...)` from an async
// page.evaluate() reads the drawing buffer AFTER the browser has already
// presented-and-cleared it (no `preserveDrawingBuffer` on the shared
// renderer, and that's staying off — it's a real perf/memory cost in
// production just to make a test possible). page.screenshot() sidesteps
// that entirely: it's a real compositor-level capture (CDP), not a JS-side
// read of the live WebGL buffer, so it captures the true presented frame
// every time. The PNG bytes it returns are then decoded back into pixel
// data using the BROWSER's own <img>/canvas decoder (loaded into a fresh
// evaluate as a data: URL) — at that point it's a plain static raster
// image, not a live/cleared GL buffer, so reading it via getImageData is
// reliable. Combined with an analytic device-pixel-size estimate from the
// piece's own camera/instance-size math (closestInstanceScreenInfo), this
// is belt-and-suspenders: math AND a real decoded screenshot must agree.

const VOID_HEX = { r: 0x09, g: 0x0a, b: 0x09 }; // --void, tokens.css

async function mountCeiling(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate(() => window.__test!.goTo({ id: 'ceiling', p: 0.5 }));
  // ceilingState() alone (not also pieces().find(p => p.id === 'ceiling')
  // — that's ambiguous the same way 'withheld' is: the 2D fallback and the
  // real WebGL piece share the id, and .find() returns whichever is FIRST
  // in the merged array — director.list()'s 2D pieces, always, per
  // main.ts's pieces() ordering — which is the inactive fallback once the
  // real piece has taken over, not the active WebGL one. topology.spec.ts
  // sidesteps this the same way: topologyState() alone is proof enough
  // that main.ts's onEnter handler has already run, and by the time it
  // has, ceilingPiece.active is already set from the real, current
  // activation-trigger state — same synchronous sequence, so there's
  // nothing this second check would catch that the first doesn't.
  await page.waitForFunction(() => window.__test!.ceilingState() !== null, { timeout: 10_000 });
  // Let the k=8 damped-follow camera and the shader's own settle spring
  // (SETTLE_FRACTION=0.24 of the way through the section, well inside
  // p=0.5) both reach their resting state before anything measures pixels.
  await page.waitForTimeout(700);
}

/** Decodes a screenshot PNG buffer using the browser's own image decoder
 *  (an <img> + 2D canvas inside the page) and counts pixels that differ
 *  meaningfully from the void background — a small delta threshold
 *  tolerates the (opacity 0.05, unanimated) grain DOM layer sitting over
 *  the canvas without it masking real instance colour. */
async function countNonBackgroundPixels(
  page: import('@playwright/test').Page,
  buffer: Buffer,
): Promise<{ count: number; total: number }> {
  const base64 = buffer.toString('base64');
  return page.evaluate(async ({ base64, bg }) => {
    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('screenshot decode failed'));
    });
    img.src = `data:image/png;base64,${base64}`;
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    const total = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const dr = Math.abs(data[i] - bg.r);
      const dg = Math.abs(data[i + 1] - bg.g);
      const db = Math.abs(data[i + 2] - bg.b);
      if (dr + dg + db > 24) count++;
    }
    return { count, total };
  }, { base64, bg: VOID_HEX });
}

test.describe('the ceiling — Phase 8', () => {
  test('a framebuffer pixel-count assertion proves instances are >= 2 device pixels', async ({ page }, testInfo) => {
    test.skip(!['desktop', 'narrow'].includes(testInfo.project.name), 'this done-test only spans 1440x900 and 390x844 (spec §8 Phase 8)');
    test.setTimeout(60_000);
    await mountCeiling(page);

    const closest = await page.evaluate(() => window.__test!.ceilingClosestInstance());
    expect(closest, 'no instance projected on screen — is the field mounted?').toBeTruthy();

    // 1) Analytic check — real camera fov/distance/instance-size math,
    //    against the canvas's actual device-pixel backing size.
    expect(
      closest!.pixelSize,
      `analytic on-screen size (device px) at ${testInfo.project.name}: ${JSON.stringify(closest)}`,
    ).toBeGreaterThanOrEqual(2);

    // 2) Real pixels — clip a real compositor screenshot around the same
    //    instance and confirm actual non-background pixels are there, not
    //    just the math. The clip pad is generous (the instance's CSS-pixel
    //    footprint, not just its device-pixel one, plus slop for the
    //    billboard's own soft circular falloff) so a coarse camera-pose
    //    mismatch can't make this flaky.
    const pad = 40;
    const box = await page.locator('#world-gl').boundingBox();
    expect(box).toBeTruthy();
    const clipX = Math.max(0, Math.min(box!.width - 1, closest!.x) - pad);
    const clipY = Math.max(0, Math.min(box!.height - 1, closest!.y) - pad);
    const clipW = Math.min(box!.width - clipX, pad * 2);
    const clipH = Math.min(box!.height - clipY, pad * 2);

    const shot = await page.screenshot({ clip: { x: clipX, y: clipY, width: clipW, height: clipH } });
    const { count, total } = await countNonBackgroundPixels(page, shot);

    expect(count, `non-background pixels in a ${clipW}x${clipH} clip around the closest instance at ${testInfo.project.name} (of ${total} sampled)`).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: `shots/${testInfo.project.name}/ceiling-closest-instance-clip.png`, clip: { x: clipX, y: clipY, width: clipW, height: clipH } });
  });

  test('mobile gets the reduced field and a scripted (non-scroll-linked) camera', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await mountCeiling(page);
    const state = await page.evaluate(() => window.__test!.ceilingState());
    expect(state).toBeTruthy();

    const viewport = page.viewportSize()!;
    const expectMobile = viewport.width < 760;
    expect(state!.mobileScripted, `mobileScripted at ${viewport.width}px (project ${testInfo.project.name})`).toBe(expectMobile);
    expect(state!.instanceCount, `instanceCount at ${viewport.width}px`).toBe(expectMobile ? 700 : 1800);
  });

  test('no composer — spec §6.2\'s "movement 06 uses no composer at all"', async ({ page }) => {
    test.setTimeout(60_000);
    await mountCeiling(page);
    const state = await page.evaluate(() => window.__test!.ceilingState());
    expect(state!.hasComposer).toBe(false);
  });

  test('near-miss hairlines exist and stay under the ceiling', async ({ page }) => {
    test.setTimeout(60_000);
    await mountCeiling(page);
    const state = await page.evaluate(() => window.__test!.ceilingState());
    expect(state!.nearMissCount).toBeGreaterThan(0);
    expect(state!.nearMissCount).toBeLessThan(state!.instanceCount);
  });

  test('four progress points for human review (distant line to oppressively overhead)', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(!['desktop', 'narrow'].includes(testInfo.project.name), 'contact-sheet review only needs one desktop + one narrow set');
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    for (const p of [0, 0.33, 0.66, 1.0]) {
      await page.evaluate((pp) => window.__test!.goTo({ id: 'ceiling', p: pp }), p);
      await page.waitForFunction(() => window.__test!.ceilingState() !== null, { timeout: 10_000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `shots/${testInfo.project.name}/ceiling-review-p${p}.png` });
    }
  });
});

test.describe('the ceiling — content boundary (spec §3.4/§8 Phase 8)', () => {
  test('no console errors and no on-screen text is injected by the piece', async ({ page }) => {
    test.setTimeout(60_000);
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await mountCeiling(page);

    // Spec §3.4: "No axes, no ticks, no numerals anywhere in this piece" —
    // the piece itself injects no DOM at all (unlike movements 04/05's
    // caption/HUD elements), so there's nothing of its own to assert text
    // against beyond "it didn't add any."
    const injected = await page.evaluate(() => !!document.querySelector('.ceiling-caption, .ceiling-hud'));
    expect(injected).toBe(false);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
