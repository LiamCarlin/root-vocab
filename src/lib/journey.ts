// The journey: one chapter is ten stops and ten new words. Pure functions over state.

import { BANK_BY_ID } from '@/data/words';
import { pickNewWords, stopTodo, stopWords } from './engine';
import { lexemeFor } from './lexicon';
import type { Data, Stop, StopKind } from './store';

export { stopTodo, stopWords } from './engine';

/**
 * A chapter: two word sets, a Find round, a third set, the chest, a hands-on round, a fourth set, a Spell
 * round, the last set, then the challenge that clears the fog. Practice always comes after something to practise.
 */
export const CHAPTER_SHAPE: StopKind[] = ['learn', 'learn', 'find', 'learn', 'chest', 'hands', 'learn', 'spell', 'learn', 'challenge'];
/** How many words one learn stop teaches. */
export const SET_SIZE = 2;

type ForPicking = Pick<Data, 'words' | 'skill' | 'profile' | 'patterns' | 'journey' | 'counters' | 'mod'>;

const patternOf = (id: string) => BANK_BY_ID[id]?.tricky.pattern;

/**
 * Splits the picked words into sets. Where it can, a set shares a spelling pattern: the pattern is then met
 * twice in a row in two different words, which is how a pattern (rather than a single spelling) is learned.
 * The order the words were picked in is otherwise kept, so the learner's own words still come first.
 */
function intoSets(ids: string[], size: number): string[][] {
  const left = ids.slice();
  const out: string[][] = [];
  while (left.length) {
    const set = [left.shift()!];
    const pattern = patternOf(set[0]);
    while (set.length < size && left.length) {
      const twin = pattern ? left.findIndex((id) => patternOf(id) === pattern) : -1;
      set.push(left.splice(Math.max(0, twin), 1)[0]);
    }
    out.push(set);
  }
  return out;
}

/**
 * The stops for chapter `n`, with a set of words chosen for each learn stop. If the bank ever runs out of new
 * words, the learn stops that are left over become practice stops, so a chapter is never stuck.
 */
export function buildChapter(s: ForPicking, n: number): Stop[] {
  void n; // every chapter has the same shape; the number is here for callers and for future variety
  const fresh = { ...s, journey: { ...s.journey, stops: [] } };
  const sets = intoSets(pickNewWords(fresh, CHAPTER_SHAPE.filter((k) => k === 'learn').length * SET_SIZE), SET_SIZE);
  let i = 0;
  let spare = 0;
  return CHAPTER_SHAPE.map((kind): Stop => {
    if (kind !== 'learn') return { kind };
    const words = sets[i++];
    if (words?.length) return { kind, words };
    return { kind: spare++ % 2 === 0 ? 'find' : 'spell' };
  });
}

/** The words of the current chapter, in path order. */
export const chapterWords = (s: Pick<Data, 'journey'>): string[] => s.journey.stops.filter((st) => st.kind === 'learn').flatMap(stopWords);

/** The spelling pattern every word of a set shares, if they share one. */
export function sharedPattern(ids: string[]) {
  const first = ids.length > 1 ? patternOf(ids[0]) : undefined;
  return first && ids.every((id) => patternOf(id) === first) ? first : undefined;
}

/**
 * Gives a new word to any learn stop still ahead that can no longer teach one of its own: the word was learned
 * somewhere else, marked known or removed; the stop has no word at all; or the word no longer exists (a bank
 * entry renamed between builds, or a backup from another build). Words the stop has already taught are left
 * alone. Without this a strictly linear path could be stuck for good.
 */
export function refreshStops(s: ForPicking): Stop[] {
  const stale = (st: Stop): string[] =>
    st.kind !== 'learn' || st.done
      ? []
      : stopTodo(st).filter((id) => {
          const w = s.words[id];
          return !lexemeFor(id, w) || (!!w && w.status !== 'queued');
        });
  /** How many new words the stop needs. */
  const short = (st: Stop) => (st.kind !== 'learn' || st.done ? 0 : stopWords(st).length === 0 ? SET_SIZE : stale(st).length);
  if (!s.journey.stops.some((st) => short(st) > 0)) return s.journey.stops;

  const kept = s.journey.stops.map((st): Stop => {
    if (short(st) === 0) return st;
    const gone = stale(st);
    const next: Stop = { kind: 'learn', words: stopWords(st).filter((id) => !gone.includes(id)) };
    if (st.got?.length) next.got = st.got;
    return next;
  });
  const picks = pickNewWords({ ...s, journey: { ...s.journey, stops: kept } }, s.journey.stops.reduce((n, st) => n + short(st), 0));
  let i = 0;
  return kept.map((st, at): Stop => {
    const need = short(s.journey.stops[at]);
    if (need === 0) return st;
    const words = [...stopWords(st), ...picks.slice(i, i + need)];
    i += need;
    // Nothing left to teach and nothing taught: the stop becomes practice. (With something already taught it stays, and opening it finishes it.)
    if (!words.length) return { kind: 'find' };
    return { ...st, words };
  });
}
