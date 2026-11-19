import { useEffect, useRef } from 'react';

// Root keeps the learner company through lessons and exercises: a still picture in the corner
// that changes with what just happened. Screens do not have to tell it: the sounds and buzzes
// that already mark a right answer or a slip are what it listens to (see lib/sfx and lib/audio).
// Nothing here knows about React state, so it can be called from anywhere.

export type BuddyEvent = 'correct' | 'wrong' | 'win';

type Listener = (e: BuddyEvent) => void;
const listeners = new Set<Listener>();

export const buddy = {
  /** Tell Root what happened. Safe to call when no Root is on screen. */
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

/** Subscribe a component to what happens for as long as it is mounted. */
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
