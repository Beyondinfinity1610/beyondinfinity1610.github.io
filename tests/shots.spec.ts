import { test, expect } from '@playwright/test';
import '../src/core/test-api';

// The 11-movement spine, spec §1. Phase 0: plain scrolling HTML, no
// window.__test API yet (that lands in Phase 1) — so this harness scrolls
// by anchor and waits for fonts rather than freezing a frame clock.
const MOVEMENTS = [
  'drift', 'lie', 'try', 'withheld', 'audit', 'ceiling', 'method', 'work', 'else', 'him', 'contact',
] as const;

test.describe('contact sheet', () => {
  for (const id of MOVEMENTS) {
    test(`movement ${id}`, async ({ page, baseURL }, testInfo) => {
      // withheld (movement 04) carries real per-frame WebGL cost now that
      // plates.ts's plates actually render (bloom composer + 16 mipmapped
      // textures) — under this sandbox's software rendering (no GPU,
      // SwiftShader) that's measured close to the default 30s budget at
      // 1440×900 and over it at 1920×1080. Real hardware isn't the
      // constraint here (same caveat as the instrument's fps test);
      // widen the ceiling rather than fight the renderer for it.
      test.setTimeout(60_000);
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];
      const thirdPartyRequests: string[] = [];
      const base = new URL(baseURL ?? 'http://localhost:4173');

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(String(err)));
      page.on('requestfailed', (req) => failedRequests.push(req.url()));
      page.on('request', (req) => {
        try {
          const url = new URL(req.url());
          if (url.origin !== base.origin) thirdPartyRequests.push(req.url());
        } catch {
          // data: URLs etc. — not a network request, ignore
        }
      });

      await page.goto('/');
      await page.waitForFunction(() => window.__ready === true, { timeout: 10_000 });
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      // Longest entrance is ~1.15s duration + up to ~4*0.07s stagger (spec
      // §4.3) — wait it out so the contact sheet shows settled state, not
      // mid-animation. True frame-perfect determinism via freeze()/tick()
      // needs gsap.ticker's own clock mocked too (it uses wall time even
      // under manual tick()) — revisit when a phase actually needs it.
      await page.waitForTimeout(1600);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth, `horizontal overflow on ${id}`).toBeLessThanOrEqual(innerWidth + 1);

      await testInfo.attach('screenshot', {
        body: await page.screenshot({ path: `shots/${testInfo.project.name}/${id}.png` }),
        contentType: 'image/png',
      });

      expect(consoleErrors, `console.error on ${id}: ${consoleErrors.join(' | ')}`).toEqual([]);
      expect(pageErrors, `pageerror on ${id}: ${pageErrors.join(' | ')}`).toEqual([]);
      expect(failedRequests, `requestfailed on ${id}: ${failedRequests.join(' | ')}`).toEqual([]);
      expect(thirdPartyRequests, `third-party request on ${id}: ${thirdPartyRequests.join(' | ')}`).toEqual([]);
    });
  }

  test('JS disabled — copy still present', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    for (const id of MOVEMENTS) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    await expect(page.locator('h1')).toContainText('drift');
    await context.close();
  });
});
