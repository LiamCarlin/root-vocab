import { useEffect } from 'react';

// ── Holding celebrations ──────────────────────────────────────────────────
// Unlock celebrations must never land in the middle of an answer. A screen that
// is mid-exercise holds them; the UnlockHost waits until nobody is holding.
let holds = 0;
const holdListeners = new Set<() => void>();
export const unlocksHeld = () => holds > 0;
export function onHoldChange(cb: () => void): () => void {
  holdListeners.add(cb);
  return () => {
    holdListeners.delete(cb);
  };
}
/** While `hold` is true, queued unlock celebrations wait. Use it in the exercise runner and the lesson: `useHoldUnlocks(!showingSummary)`. */
export function useHoldUnlocks(hold: boolean): void {
  useEffect(() => {
    if (!hold) return;
    holds += 1;
    holdListeners.forEach((l) => l());
    return () => {
      holds = Math.max(0, holds - 1);
      holdListeners.forEach((l) => l());
    };
  }, [hold]);
}
