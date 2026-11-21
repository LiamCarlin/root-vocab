import type { ReactNode } from 'react';

import type { Lexeme } from '@/lib/lexicon';
import type { LessonStats } from '@/lib/store';

// One word, five ways in: hear it (and its beats), link it, move through it, spell it, use it.
// It used to be seven. Beats (tap and sweep) and Build (put the pieces in order) both went over the
// syllables again right after Hear had done it, which made a lesson long and repetitive; the beats
// still come in through the hand in Hear (tap a tile) and in Move. The two ids stay in the type so
// lessons recorded before the change still read.
export type StepId = 'hear' | 'link' | 'beats' | 'build' | 'move' | 'spell' | 'use';
export const STEP_ORDER: StepId[] = ['hear', 'link', 'move', 'spell', 'use'];

/** The steps this word can run. A learner's own word has no web or pictures, so it skips Link. */
export const stepsFor = (lex: Pick<Lexeme, 'links' | 'pics'>): StepId[] => STEP_ORDER.filter((s) => s !== 'link' || lex.links.length > 0 || lex.pics.length > 0);

export type MissionStats = LessonStats;

export type StepProps = {
  lex: Lexeme;
  /** The shared top bar, so every step keeps the same header and progress. */
  top: ReactNode;
  next: () => void;
  skip: () => void;
  addHint: () => void;
  addRetry: () => void;
  /** The picture the learner picked for this word during the lesson, if any yet. */
  hook: string | null;
  pickHook: (emoji: string | null) => void;
};
