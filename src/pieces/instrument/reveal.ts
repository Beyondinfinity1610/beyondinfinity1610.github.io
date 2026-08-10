// The reveal fires on interaction and on a 20s no-interaction timeout —
// spec §8 Phase 4c's done-test. Once revealed, the ROC inset (spec §2.4)
// becomes visible and stays that way; this only ever fires once.

export interface RevealController {
  markInteraction(): void;
  isRevealed(): boolean;
  dispose(): void;
}

export function createRevealController(onReveal: () => void, timeoutMs = 20_000): RevealController {
  let revealed = false;
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => fire(), timeoutMs);

  function fire(): void {
    if (revealed) return;
    revealed = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    onReveal();
  }

  return {
    markInteraction() {
      fire();
    },
    isRevealed() {
      return revealed;
    },
    dispose() {
      if (timer) clearTimeout(timer);
    },
  };
}
