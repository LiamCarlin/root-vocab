import type { ReactNode } from 'react';

import type { Lexeme } from '@/lib/lexicon';

/**
 * Every exercise is one of these. The runner owns the screen, the top bar, the
 * feedback bar and the Continue button; a game only draws its own play area
 * (give it `flex: 1`) and reports once.
 */
export type GameResult = {
  /** 1 right first time · 0.5 right with a cue or a second try · 0 missed. */
  r: 0 | 0.5 | 1;
  /** Time to answer, measured quietly. Never shown as a timer. */
  ms?: number;
  /** How many cues were used. */
  cue?: number;
  skipped?: boolean;
  /** What the learner wrote or picked, when it was a spelling. The model reads the letters that were off; it is never shown again. */
  attempt?: string;
  /** Optional correction to show in the feedback bar: the right spelling, the reason, etc. */
  note?: ReactNode;
};

export type GameProps = {
  lex: Lexeme;
  /** Call exactly once, when the learner has answered (or given up). */
  onResult: (res: GameResult) => void;
  /** True once a result is in: freeze input and show the right answer in place. */
  done: boolean;
};
