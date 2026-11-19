// The journey: one chapter is ten stops and ten new words, chosen as the learner reaches them. Pure functions over state.

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

type ForPicking = Pick<Data, 'words' | 'skill' | 'profile' | 'patterns' | 'journey' | 'counters' | 'mod' | 'mind'>;

const patternOf = (id: string) => BANK_BY_ID[id]?.tricky.pattern;

/**
 * The stops for chapter `n`. A learn stop starts with no words: they are chosen when the learner opens it
 * (`prepareStop` in the store), from what the model knows about them at that moment. A path that named its
 * words up front could not follow the learner; this one does.
 */
export function buildChapter(s: unknown, n: number): Stop[] {
  void s; // every chapter has the same shape; the state and the number are here for callers and for future variety
  void n;
  return CHAPTER_SHAPE.map((kind): Stop => ({ kind }));
}

/** The words of the current chapter, in path order. */
export const chapterWords = (s: Pick<Data, 'journey'>): string[] => s.journey.stops.filter((st) => st.kind === 'learn').flatMap(stopWords);

/** The spelling pattern every word of a set shares, if they share one. */
export function sharedPattern(ids: string[]) {
  const first = ids.length > 1 ? patternOf(ids[0]) : undefined;
  return first && ids.every((id) => patternOf(id) === first) ? first : undefined;
}

/**
 * Keeps the path walkable and honest.
 *
 * A learn stop that has been opened keeps its words, except any it can no longer teach: a word learned somewhere
 * else, marked known or removed, or one that no longer exists (a bank entry renamed between builds, or a backup
 * from another build). Those are swapped for new ones. Words the stop has already taught are left alone.
 *
 * A learn stop further along that was given words in advance (by an older build) and has not been started
 * gives them back, so they are chosen afresh when the learner gets there.
 */
export function refreshStops(s: ForPicking): Stop[] {
  const stops = s.journey.stops;
  const cur = stops.findIndex((st) => !st.done);
  const early = (st: Stop, i: number) => st.kind === 'learn' && !st.done && i > cur && !st.got?.length && stopWords(st).length > 0;
  const stale = (st: Stop): string[] =>
    st.kind !== 'learn' || st.done
      ? []
      : stopTodo(st).filter((id) => {
          const w = s.words[id];
          return !lexemeFor(id, w) || (!!w && w.status !== 'queued');
        });
  if (!stops.some((st, i) => early(st, i) || stale(st).length > 0)) return stops;

  const kept = stops.map((st, i): Stop => {
    if (early(st, i)) return { kind: 'learn' };
    const gone = stale(st);
    if (!gone.length) return st;
    const next: Stop = { kind: 'learn', words: stopWords(st).filter((id) => !gone.includes(id)) };
    if (st.got?.length) next.got = st.got;
    if (st.checked?.length) next.checked = st.checked;
    return next;
  });
  const need = stops.map((st, i) => (early(st, i) ? 0 : stale(st).length));
  const picks = pickNewWords({ ...s, journey: { ...s.journey, stops: kept } }, need.reduce((a, b) => a + b, 0));
  let at = 0;
  return kept.map((st, i): Stop => {
    if (!need[i]) return st;
    const words = [...stopWords(st), ...picks.slice(at, at + need[i])];
    at += need[i];
    // Nothing left to teach and nothing taught: the stop becomes practice. (With something already taught it stays, and opening it finishes it.)
    if (!words.length) return { kind: 'find' };
    return { ...st, words };
  });
}
