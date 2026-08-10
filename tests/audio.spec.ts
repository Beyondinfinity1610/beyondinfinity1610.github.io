import { test, expect } from '@playwright/test';
import '../src/core/test-api';

// Audio — spec §8 Phase 10's done-test (docs/SPEC.md):
// "with the toggle off (default), zero requests to /audio/ and
// AudioContext never constructed — both asserted. Toggle has a real
// aria-pressed and an accessible name."
//
// Also covers the flip side (not explicitly in the done-test's own
// wording, but load-bearing for the same paragraph's "One AudioContext,
// constructed only inside the first user gesture"): clicking the toggle,
// a real Playwright page.click() gesture, actually constructs the context
// and fires requests to /audio/.

function isAudioRequest(url: string): boolean {
  return /\/audio\/[\w-]+\.opus/.test(url);
}

test.describe('audio — Phase 10', () => {
  test('toggle off (default): zero /audio/ requests, AudioContext never constructed', async ({ page }) => {
    const audioRequests: string[] = [];
    page.on('request', (req) => {
      if (isAudioRequest(req.url())) audioRequests.push(req.url());
    });

    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    // Scroll the whole page — every movement, including the ones with
    // wired sound hooks (instrument, audit, topology, ceiling) — with the
    // toggle left untouched. Nothing should ever fetch /audio/ or
    // construct the shared AudioContext.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    expect(audioRequests, `unexpected /audio/ requests with the toggle off: ${audioRequests.join(', ')}`).toHaveLength(0);

    const constructed = await page.evaluate(() => window.__test!.audioContextConstructed());
    expect(constructed, 'AudioContext must never be constructed while the toggle is off').toBe(false);
  });

  test('the toggle has a real aria-pressed and an accessible name', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    const toggle = page.locator('#audio-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    const accessibleName = await toggle.evaluate((el) => el.getAttribute('aria-label'));
    expect(accessibleName, 'toggle needs a real accessible name').toBeTruthy();
    expect(accessibleName!.trim().length).toBeGreaterThan(0);
  });

  test('clicking the toggle (a real gesture) constructs the AudioContext and fires /audio/ requests', async ({ page }) => {
    const audioRequests: string[] = [];
    page.on('request', (req) => {
      if (isAudioRequest(req.url())) audioRequests.push(req.url());
    });

    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    const constructedBefore = await page.evaluate(() => window.__test!.audioContextConstructed());
    expect(constructedBefore).toBe(false);

    // page.click() dispatches a real trusted pointer/mouse event sequence
    // — this counts as the "first user gesture" spec §8 Phase 10 requires
    // AudioContext construction to happen inside.
    const toggle = page.locator('#audio-toggle');
    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    const constructedAfter = await page.evaluate(() => window.__test!.audioContextConstructed());
    expect(constructedAfter, 'clicking the toggle must construct the AudioContext').toBe(true);

    // setAudioEnabled(true) kicks off a fetch+decode for all six sounds
    // immediately — give the network a moment to actually complete them.
    await page.waitForTimeout(800);
    expect(audioRequests.length, 'no /audio/ requests fired after enabling').toBeGreaterThan(0);

    // No console warning about a suspended/unresumed AudioContext — spec's
    // own stated failure mode for constructing outside a gesture.
    const consoleWarnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && /audiocontext/i.test(msg.text())) consoleWarnings.push(msg.text());
    });
    await page.waitForTimeout(200);
    expect(consoleWarnings).toEqual([]);

    const state = await page.evaluate(() => window.__test!.audioEnabled());
    expect(state).toBe(true);
  });

  test('toggling off again stops future /audio/ activity and flips aria-pressed back', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    const toggle = page.locator('#audio-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    const state = await page.evaluate(() => window.__test!.audioEnabled());
    expect(state).toBe(false);
  });

  test('relay click fires on a threshold detent crossing once audio is enabled', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    // Enable audio first (a real gesture) — before scrolling to the
    // instrument, matching a visitor who turns sound on from the topbar
    // at any point in the page.
    await page.locator('#audio-toggle').click();

    await page.locator('#try').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForFunction(() => window.__test!.instrumentState() !== null, { timeout: 10_000 });
    await page.waitForTimeout(400); // let the six-sound prefetch settle before clearing the log

    await page.evaluate(() => window.__test!.clearSoundPlayLog());

    // Drive the REAL range input end to end — controls.ts's detent logic
    // (24 evenly spaced detents across the drag range) lives inside
    // setThreshold(), which the input's own 'input' listener calls;
    // setThresholdForTest() bypasses that path entirely, so this test
    // exercises the actual input, not the test-only shortcut.
    // Setting .value + dispatching 'input' directly (rather than
    // Locator.fill(), which enforces the native step="0.01" grid against a
    // non-round min like 0.10095398873090744 and rejects most values as
    // "malformed") — this is also a closer match to what a real pointer
    // drag actually does: controls.ts's canvas-drag path sets arbitrary
    // continuous z values, never snapped to the input's step either.
    const range = page.locator('#instrument-threshold');
    const min = Number(await range.getAttribute('min'));
    const max = Number(await range.getAttribute('max'));
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const z = min + ((max - min) * i) / steps;
      await range.evaluate((el: HTMLInputElement, value: number) => {
        el.value = String(value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, z);
    }
    await page.waitForTimeout(400);

    const log = await page.evaluate(() => window.__test!.soundPlayLog());
    expect(log.filter((s) => s === 'relay-click').length, `play log: ${log.join(', ')}`).toBeGreaterThan(0);
  });

  test('plate hover fires the sixth sound (movement 04) once audio is enabled', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);
    await page.locator('#audio-toggle').click();

    await page.evaluate(() => window.__test!.goTo({ id: 'withheld', p: 0.5 }));
    await page.waitForFunction(() => window.__test!.topologyState() !== null, { timeout: 10_000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__test!.clearSoundPlayLog());

    await page.evaluate(() => window.__test!.topologySimulateHover(0));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__test!.topologySimulateHover(1));
    await page.waitForTimeout(400);

    const log = await page.evaluate(() => window.__test!.soundPlayLog());
    expect(log.filter((s) => s === 'plate-tone').length, `play log: ${log.join(', ')}`).toBeGreaterThan(0);
  });
});
