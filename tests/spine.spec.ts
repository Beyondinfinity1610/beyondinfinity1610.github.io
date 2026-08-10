import { test, expect } from '@playwright/test';
import '../src/core/test-api';

const ALL_MOVEMENTS = [
  'drift', 'lie', 'try', 'withheld', 'audit', 'ceiling', 'method', 'work', 'else', 'him', 'contact',
] as const;

// Only these own a canvas piece — spec §1's table marks method, work, else,
// him and contact "Canvas: —". No piece is registered for them. drift and
// lie share one combined piece (id "trace", spec §3.1) rather than one
// debug piece each, so goTo("drift"/"lie") both resolve to the same
// underlying trigger and should both show "trace" as the active piece.
const GOTO_TARGETS = [
  { goTo: 'drift', expectActiveId: 'trace' },
  { goTo: 'lie', expectActiveId: 'trace' },
  { goTo: 'try', expectActiveId: 'try' },
  { goTo: 'withheld', expectActiveId: 'withheld' },
  { goTo: 'audit', expectActiveId: 'audit' },
  { goTo: 'ceiling', expectActiveId: 'ceiling' },
] as const;

test.describe('scroll/render spine — Phase 1', () => {
  test('exactly one piece is active at each section centre, progress runs 0→1', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    for (const { goTo, expectActiveId } of GOTO_TARGETS) {
      await page.evaluate((movementId) => window.__test!.goTo({ id: movementId, p: 0.5 }), goTo);
      // let ScrollTrigger's synchronous onUpdate/onToggle settle
      await page.waitForTimeout(50);

      // 'audit' (movement 05, spec §3.3) is lazily loaded in the same chunk
      // as the instrument (spec §6.1) — unlike every other id here, no
      // piece is registered under that id until the dynamic import
      // resolves. Everything else already has an eagerly-registered piece
      // (or, for 'withheld', its free 2D fallback) at the 50ms mark above.
      if (goTo === 'audit') {
        await page.waitForFunction(() => window.__test!.pieces().some((p) => p.id === 'audit'), { timeout: 10_000 });
      }

      const pieces = await page.evaluate(() => window.__test!.pieces());
      const active = pieces.filter((p) => p.active);

      expect(active.length, `active piece count at ${goTo} centre: ${JSON.stringify(active)}`).toBe(1);
      expect(active[0].id, `wrong piece active at ${goTo} centre`).toBe(expectActiveId);
      expect(active[0].target, `${goTo} target should be near mid-progress`).toBeGreaterThan(0);
      expect(active[0].target).toBeLessThan(1);
    }
  });

  test('canvas hides once scrolled past the last movement (no stale frame)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    // scroll past the very end — beyond contact's "bottom top"
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);

    const visibility = await page.evaluate(
      () => (document.getElementById('world') as HTMLCanvasElement).style.visibility
    );
    expect(visibility).toBe('hidden');
  });

  test('resize 1440→390→1440 fires refresh() exactly once each way', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    const before = await page.evaluate(() => window.__test!.refreshCount());

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250); // clear the 150ms debounce
    const afterNarrow = await page.evaluate(() => window.__test!.refreshCount());
    expect(afterNarrow - before, 'refresh count after 1440→390').toBe(1);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);
    const afterWide = await page.evaluate(() => window.__test!.refreshCount());
    expect(afterWide - afterNarrow, 'refresh count after 390→1440').toBe(1);
  });

  test('reduced-motion project: no Lenis, entrances instant, all text present', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'reduced', 'only meaningful under the reduced project');
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    const heroOpacity = await page.evaluate(() => {
      const h1 = document.querySelector('h1.display')!;
      return getComputedStyle(h1).opacity;
    });
    expect(heroOpacity).toBe('1');

    for (const id of ALL_MOVEMENTS) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
  });

  test('freeze + tick advances pieces deterministically', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    // p:0.5 — safely inside both the (wider) progress window goTo positions
    // against and the (narrower, centre-based) activation window, so the
    // piece is actually active and receiving frame(dt) during the tick loop.
    await page.evaluate(() => window.__test!.goTo({ id: 'lie', p: 0.5 }));
    await page.waitForTimeout(50);

    await page.evaluate(() => {
      window.__test!.freeze();
      for (let i = 0; i < 120; i++) window.__test!.tick(1); // 2s at 60fps
    });

    const pieces = await page.evaluate(() => window.__test!.pieces());
    const trace = pieces.find((p) => p.id === 'trace')!;
    // after 2s of damped-follow at rate 8, p should have converged very close to target
    expect(Math.abs(trace.p - trace.target)).toBeLessThan(0.01);
  });
});
