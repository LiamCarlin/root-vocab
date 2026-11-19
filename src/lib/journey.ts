// The journey: one chapter is nine stops and five new words. Pure functions over state.

import { pickNewWords } from './engine';
import { lexemeFor } from './lexicon';
import type { Data, Stop, StopKind } from './store';

/** learn, learn, practise finding, learn, a chest, practise spelling, learn, learn, then the chapter challenge. */
export const CHAPTER_SHAPE: StopKind[] = ['learn', 'learn', 'find', 'learn', 'chest', 'spell', 'learn', 'learn', 'challenge'];

type ForPicking = Pick<Data, 'words' | 'skill' | 'profile' | 'patterns' | 'journey' | 'counters' | 'mod'>;

/**
 * The stops for chapter `n`, with a word chosen for each learn stop. If the bank ever runs out of new words,
 * the learn stops that are left over become practice stops, so a chapter is never stuck.
 */
export function buildChapter(s: ForPicking, n: number): Stop[] {
  void n; // every chapter has the same shape; the number is here for callers and for future variety
  const fresh = { ...s, journey: { ...s.journey, stops: [] } };
  const words = pickNewWords(fresh, CHAPTER_SHAPE.filter((k) => k === 'learn').length);
  let i = 0;
  let spare = 0;
  return CHAPTER_SHAPE.map((kind): Stop => {
    if (kind !== 'learn') return { kind };
    const wordId = words[i++];
    if (wordId) return { kind, wordId };
    return { kind: spare++ % 2 === 0 ? 'find' : 'spell' };
  });
}

/** The words of the current chapter, in path order. */
export const chapterWords = (s: Pick<Data, 'journey'>): string[] => s.journey.stops.filter((st) => st.kind === 'learn' && st.wordId).map((st) => st.wordId!);

/**
 * Gives a new word to any learn stop still ahead that can no longer teach its own: the word was learned somewhere
 * else, marked known or removed; the stop has no word at all; or the word no longer exists (a bank entry renamed
 * between builds, or a backup from another build). Without this a strictly linear path could be stuck for good.
 */
export function refreshStops(s: ForPicking): Stop[] {
  const stale = (st: Stop) => {
    if (st.kind !== 'learn' || st.done) return false;
    if (!st.wordId) return true;
    const w = s.words[st.wordId];
    if (!lexemeFor(st.wordId, w)) return true;
    return !!w && w.status !== 'queued';
  };
  if (!s.journey.stops.some(stale)) return s.journey.stops;
  const keep = s.journey.stops.filter((st) => !stale(st));
  const picks = pickNewWords({ ...s, journey: { ...s.journey, stops: keep } }, s.journey.stops.filter(stale).length);
  let i = 0;
  return s.journey.stops.map((st) => {
    if (!stale(st)) return st;
    const wordId = picks[i++];
    return wordId ? { kind: 'learn' as const, wordId } : { kind: 'find' as const };
  });
}
