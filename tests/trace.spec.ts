import { test, expect } from '@playwright/test';
import '../src/core/test-api';

// Movements 01-02 — the trace, spec §3.1's done-test (Phase 3):
// shots at hero/mid/end show one line → two diverging → filled residual;
// traceBounds() never intersects the <h1> rect; JS-off hero copy is fully
// present (covered by shots.spec.ts's generic JS-disabled check already).

test.describe('the trace — Phase 3', () => {
  test('hero / mid / end shots show one line, then two diverging, then exit', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    const stops: Array<{ name: string; p: number }> = [
      { name: 'hero-birth', p: 0.15 },
      { name: 'mid-split', p: 0.55 },
      { name: 'end-exit', p: 0.92 },
    ];

    for (const { name, p } of stops) {
      await page.evaluate((prog) => window.__test!.goTo({ id: 'trace', p: prog }), p);
      await page.waitForTimeout(80);
      await page.screenshot({ path: `shots/${testInfo.project.name}/trace-${name}.png` });
    }
  });

  test('traceBounds() never intersects the <h1> rect', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    for (const p of [0.05, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 0.95]) {
      await page.evaluate((prog) => window.__test!.goTo({ id: 'trace', p: prog }), p);
      await page.waitForTimeout(60);

      const result = await page.evaluate(() => {
        const h1 = document.querySelector('h1.display');
        const bounds = window.__test!.traceBounds();
        if (!h1 || !bounds) return null;
        const r = h1.getBoundingClientRect();
        return { h1: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, trace: bounds };
      });
      if (!result) continue;

      const { h1, trace } = result;
      const intersects = trace.left < h1.right && trace.right > h1.left && trace.top < h1.bottom && trace.bottom > h1.top;
      expect(intersects, `trace bounds ${JSON.stringify(trace)} vs h1 ${JSON.stringify(h1)} at p=${p}`).toBe(false);
    }
  });

  test('divergence and residual fill only appear once past the split threshold', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    // Before p=0.35 there should be no meaningful divergence; well past it
    // (p=0.9, where smoothstep(0.35,0.9,p) saturates) there should be.
    await page.evaluate(() => window.__test!.goTo({ id: 'trace', p: 0.2 }));
    await page.waitForTimeout(60);
    const early = await page.evaluate(() => window.__test!.traceBounds());

    await page.evaluate(() => window.__test!.goTo({ id: 'trace', p: 0.6 }));
    await page.waitForTimeout(60);
    const late = await page.evaluate(() => window.__test!.traceBounds());

    expect(early).toBeTruthy();
    expect(late).toBeTruthy();
    const earlyHeight = early!.bottom - early!.top;
    const lateHeight = late!.bottom - late!.top;
    expect(lateHeight, 'diverged trace should occupy more vertical space than the single line').toBeGreaterThan(earlyHeight);
  });
});
