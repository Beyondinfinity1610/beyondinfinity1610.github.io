// SplitText line masks, inside document.fonts.ready — spec §5.5 boot order
// step 2. Uses `autoSplit: true` (requires GSAP ≥ 3.13 — installed 3.15,
// see docs/SPEC.md "Explicit uncertainties"). Every `.display` heading gets
// a per-line mask so `rise` (motion/entrances.ts) can animate each line
// from under its own baseline.

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const splits = new Map<Element, SplitText>();

export function splitDisplayLines(root: ParentNode = document): void {
  const headings = root.querySelectorAll<HTMLElement>('.display');
  headings.forEach((el) => {
    if (splits.has(el)) return;
    const split = new SplitText(el, {
      type: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      mask: 'lines',
    });
    splits.set(el, split);
  });
}

export function revertSplitLines(): void {
  splits.forEach((split) => split.revert());
  splits.clear();
}

export function linesOf(el: Element): Element[] {
  return splits.get(el)?.lines ?? [];
}
