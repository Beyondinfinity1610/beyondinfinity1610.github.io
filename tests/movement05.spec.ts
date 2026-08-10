import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import '../src/core/test-api';
import {
  AUDIT_LAYER_LABELS,
  AUDIT_INTENT_LINE,
  AUDIT_STATE_REWIND,
  AUDIT_RAW_LABEL,
} from '../src/content/strings';

// Movement 05 — the audit, spec §8 Phase 7's done-test:
// - at p = 0/0.33/0.66/1.0 the transport shows strictly decreasing times
//   and the layer stack has lost exactly one layer per third
// - scrolling backwards runs it forward with no jump larger than one
//   frame of damped travel
// - the one subjective gate: look at the four-frame sequence and confirm
//   it reads as rewind, not a stall (screenshots below feed the contact
//   sheet for that human review — spec §7.5)

const HERE = dirname(fileURLToPath(import.meta.url));

async function mountAudit(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__ready === true);
  // goTo (not scrollIntoViewIfNeeded) — the progress ScrollTrigger is
  // registered at boot, before the piece itself lazily loads, so this
  // works immediately. p=0.5 of the full "top bottom"→"bottom top" range
  // is comfortably past both the "top bottom+=150%" lazy-load trigger and
  // (verified directly — piece.ts's own comment on the dual-trigger
  // geometry) inside the narrower "top center"→"bottom center" activation
  // window, so the HUD is actually live (not just registered) by the time
  // this returns — scrollIntoViewIfNeeded's landing spot isn't guaranteed
  // to satisfy that second, narrower condition across every viewport.
  await page.evaluate(() => window.__test!.goTo({ id: 'audit', p: 0.5 }));
  await page.waitForFunction(() => window.__test!.auditState() !== null, { timeout: 10_000 });
  await page.waitForFunction(() => window.__test!.pieces().find((p) => p.id === 'audit')?.active === true, {
    timeout: 10_000,
  });
}

async function settleAt(page: import('@playwright/test').Page, p: number) {
  await page.evaluate((pp) => window.__test!.goTo({ id: 'audit', p: pp }), p);
  // real-time settle of the k=8 damped follow — exp(-8*0.6) is
  // negligible, well inside the margin LAYER_THRESHOLDS leaves around
  // each checkpoint (audit/piece.ts's own comment on that spacing).
  await page.waitForTimeout(600);
}

test.describe('the audit — Phase 7', () => {
  test('at p=0/0.33/0.66/1.0 the transport strictly decreases and the layer stack loses exactly one layer per third', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await mountAudit(page);

    const checkpoints = [0, 0.33, 0.66, 1.0];
    const samples: { p: number; transportSeconds: number; layersRemaining: number; removedLayers: string[] }[] = [];

    for (const p of checkpoints) {
      await settleAt(page, p);
      const s = await page.evaluate(() => window.__test!.auditState()!);
      samples.push({
        p,
        transportSeconds: s.transportSeconds,
        layersRemaining: s.layersRemaining,
        removedLayers: s.removedLayers,
      });
      if (['desktop', 'narrow'].includes(testInfo.project.name)) {
        await page.screenshot({ path: `shots/${testInfo.project.name}/audit-p${p}.png` });
      }
    }

    for (let i = 1; i < samples.length; i++) {
      expect(
        samples[i].transportSeconds,
        `transport should strictly decrease: ${JSON.stringify(samples)}`
      ).toBeLessThan(samples[i - 1].transportSeconds);
    }

    // layersRemaining should start at 3 (all of AUDIT_LAYER_LABELS present)
    // and lose exactly one at each successive checkpoint, reaching 0 —
    // spec's literal "one layer per third".
    expect(samples.map((s) => s.layersRemaining), JSON.stringify(samples)).toEqual([3, 2, 1, 0]);
    for (let i = 1; i < samples.length; i++) {
      expect(
        samples[i].removedLayers.length - samples[i - 1].removedLayers.length,
        `exactly one new layer removed between p=${samples[i - 1].p} and p=${samples[i].p}: ${JSON.stringify(samples)}`
      ).toBe(1);
    }
    // AUDIT_LAYER_LABELS' own declared order is the removal order (spec
    // §3.3: "decisions, then alarms, then scores").
    expect(samples[3].removedLayers).toEqual([...AUDIT_LAYER_LABELS]);
  });

  test('scrolling backwards runs it forward with no jump larger than one frame of damped travel', async ({ page }) => {
    test.setTimeout(60_000);
    await mountAudit(page);

    // setTargetForTest + freeze + tick, all inside one page.evaluate() so
    // no real wall-clock time elapses between them — goTo()'s real Lenis
    // scroll animation is exactly the timing this measurement needs to
    // NOT depend on (see setTargetForTest's doc comment in piece.ts).
    const before = await page.evaluate(() => {
      window.__test!.auditSetTarget(1.0);
      window.__test!.freeze();
      for (let i = 0; i < 120; i++) window.__test!.tick(1, 1 / 60); // settle, 2s worth
      return window.__test!.auditState()!.p;
    });
    expect(before).toBeGreaterThan(0.95);

    const after = await page.evaluate(() => {
      window.__test!.auditSetTarget(0.5);
      window.__test!.tick(1, 1 / 60); // exactly one more frame
      return window.__test!.auditState()!.p;
    });

    const k = 8;
    const dt = 1 / 60;
    const maxStep = Math.abs(0.5 - before) * (1 - Math.exp(-k * dt));
    const actualStep = Math.abs(after - before);

    expect(actualStep, `single-frame step (${actualStep}) should not exceed the damped-follow bound (${maxStep})`).toBeLessThanOrEqual(
      maxStep + 1e-6
    );
    // Moving toward the new target, not away from it or past it.
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThanOrEqual(0.5 - 1e-6);
  });

  test('four-frame sequence for human review (rewind, not a stall)', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(!['desktop', 'narrow'].includes(testInfo.project.name), 'contact-sheet review only needs one desktop + one narrow set');
    await mountAudit(page);

    for (const p of [0, 0.33, 0.66, 1.0]) {
      await settleAt(page, p);
      await page.screenshot({ path: `shots/${testInfo.project.name}/audit-review-p${p}.png` });
    }
  });
});

test.describe('the audit — content boundary (spec §7.1/§8 Phase 7)', () => {
  test('the HUD renders exactly the strings exported by content/strings.ts', async ({ page }) => {
    test.setTimeout(60_000);
    await mountAudit(page);

    const text = await page.evaluate(() => document.querySelector('.audit-hud')?.textContent ?? '');
    expect(text).toContain(AUDIT_INTENT_LINE);
    expect(text).toContain(AUDIT_STATE_REWIND);
    expect(text).toContain(AUDIT_RAW_LABEL);
    for (const layer of AUDIT_LAYER_LABELS) expect(text).toContain(layer);
  });

  test('piece.ts injects HUD copy via content/strings.ts imports, not inline literals', () => {
    const pieceSrc = readFileSync(join(HERE, '../src/pieces/audit/piece.ts'), 'utf8');
    expect(pieceSrc).not.toContain(AUDIT_INTENT_LINE);
    expect(pieceSrc).toContain("from '../../content/strings'");
  });
});
