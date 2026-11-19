import type { ReactNode } from 'react';

import type { Lexeme } from '@/lib/lexicon';
import type { LessonStats } from '@/lib/store';

// One word, seven ways in: hear it, link it, drum it, build it, move through it, spell it, use it.
export type StepId = 'hear' | 'link' | 'beats' | 'build' | 'move' | 'spell' | 'use';
export const STEP_ORDER: StepId[] = ['hear', 'link', 'beats', 'build', 'move', 'spell', 'use'];

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
