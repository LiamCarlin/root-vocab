import { useCallback, useState } from 'react';

/**
 * Time since the exercise appeared, in ms. Measured quietly for the learner
 * model (recall speed is a signal); it is never shown as a timer.
 */
export function useElapsed(): () => number {
  const [t0] = useState(() => Date.now());
  return useCallback(() => Date.now() - t0, [t0]);
}

/** A random pick that stays the same for the life of the component. */
export function useOnce<T>(make: () => T): T {
  const [v] = useState(make);
  return v;
}
