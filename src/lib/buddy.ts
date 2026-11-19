import { useEffect, useRef } from 'react';

// Root is a companion, not decoration: screens tell it what just happened and
// whichever Root is on screen (a Sidekick in an exercise, a Peek on a card)
// reacts. Nothing here knows about React state, so it can be called from
// anywhere: a store action, a timer, an event handler.

export type BuddyEvent =
  | 'correct' // a right answer
  | 'wrong' // a miss: Root winces, then encourages
  | 'combo' // several right in a row
  | 'hint' // the learner asked for a cue
  | 'start' // a session or lesson begins
  | 'finish' // a session or lesson ends
  | 'unlock' // something was earned
  | 'poke'; // Root was tapped

type Listener = (e: BuddyEvent) => void;
const listeners = new Set<Listener>();

export const buddy = {
  /** Tell Root what happened. Safe to call when no Root is mounted. */
  react(e: BuddyEvent) {
    listeners.forEach((l) => {
      try {
        l(e);
      } catch {
        // a listener must never break the caller
      }
    });
  },
};

/** Subscribe a component to buddy events for as long as it is mounted. */
export function useBuddyEvent(cb: (e: BuddyEvent) => void): void {
  const latest = useRef(cb);
  useEffect(() => {
    latest.current = cb;
  });
  useEffect(() => {
    const l: Listener = (e) => latest.current(e);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}

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
