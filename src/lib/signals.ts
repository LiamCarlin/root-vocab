// Small things the learner does (a tap, a replay, a look at the word again) are noted here and
// handed to the model in one go the next time something worth saving happens: an answer, the end
// of a lesson step, the end of a round. That way a tap never costs a write to storage.
//
// This file imports nothing from the app, so anything may call it: a button, the audio code, the store.

import type { Signal, UiKind } from './mind';
import type { Topic } from '@/data/words';

/** The time now, in ms. For event handlers that time something: it keeps the clock out of render code. */
export const clock = (): number => Date.now();

let waiting: Signal[] = [];
let taps = 0;
let tapBy: Record<string, number> = {};
let replays = 0;
let slows = 0;

/** Notes something for the model. It reaches the model with the next answer, step or round. */
export function note(s: Signal): void {
  if (waiting.length < 200) waiting.push(s);
}

/** Notes something the learner asked for or chose to do. */
export const noteUi = (what: UiKind, extra: { n?: number; topics?: Topic[] } = {}): void => note({ k: 'ui', what, ...extra });

/** A press on any button. `label` is the button's own name (never anything the learner typed). */
export function noteTap(label?: string): void {
  taps += 1;
  if (!label) return;
  // Asking to hear something again, or more slowly, is worth knowing in its own right.
  if (/^Hear\b/.test(label)) replays += 1;
  else if (/^Slower speech$/.test(label)) slows += 1;
  // Buttons are counted by what they do, not by the word they happen to carry: "Hear ladder" is "Hear".
  // An answer option carries learning content (a meaning, a word), not a name: every one of them counts as "Answer".
  const head = label.match(/^(Hear|Remove)\b/);
  const key = (head ? head[1] : /^[A-Z]/.test(label) ? label.split(/[:.,]/)[0].replace(/\d+/g, '').trim() : 'Answer').slice(0, 40);
  if (key) tapBy[key] = (tapBy[key] ?? 0) + 1;
}

/** Everything noted since the last call, oldest first. The store calls this as it saves. */
export function drain(): Signal[] {
  const out = waiting;
  if (replays > 0) out.push({ k: 'ui', what: 'replay', n: replays });
  if (slows > 0) out.push({ k: 'ui', what: 'slow', n: slows });
  if (taps > 0) out.push({ k: 'taps', n: taps, by: tapBy });
  waiting = [];
  taps = 0;
  tapBy = {};
  replays = 0;
  slows = 0;
  return out;
}
