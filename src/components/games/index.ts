import { ArrowLeftRight, BookOpen, CircleDot, Ear, EyeOff, Network, PenLine, Puzzle, Search, Shuffle, SpellCheck, TextCursorInput, WandSparkles, type LucideIcon } from 'lucide-react-native';
import type { ComponentType } from 'react';

import type { Strand } from '@/data/profile';
import type { GameId } from '@/lib/engine';
import type { BlockTone } from '@/theme/tokens';
import { Clue } from './Clue';
import { Cover } from './Cover';
import { Dictate } from './Dictate';
import { Gap } from './Gap';
import { Meaning } from './Meaning';
import { Missing } from './Missing';
import { Pair } from './Pair';
import { Proof } from './Proof';
import { Scramble } from './Scramble';
import { MarbleGame, SkyGame, TraceGame } from './Sensory';
import type { GameProps } from './types';
import { Web } from './Web';

export type { GameProps, GameResult } from './types';

export type GameDef = {
  Comp: ComponentType<GameProps>;
  /** Two words at most. */
  name: string;
  /** For screen readers: what you do in it. */
  a11y: string;
  icon: LucideIcon;
  strand: Strand;
  tone: BlockTone;
};

/** Every exercise in the app. The runner and the arcade both read from here. */
export const GAMES: Record<GameId, GameDef> = {
  // Find: get the word out
  clue: { Comp: Clue, name: 'Tip of tongue', a11y: 'Find the word from a clue', icon: Search, strand: 'find', tone: 'pink' },
  gap: { Comp: Gap, name: 'Fill the gap', a11y: 'Find the word that fits the sentence', icon: TextCursorInput, strand: 'find', tone: 'pink' },
  // Know: what it means and what it sits with
  web: { Comp: Web, name: 'Word web', a11y: 'Pick what belongs with the word', icon: Network, strand: 'know', tone: 'brand' },
  pair: { Comp: Pair, name: 'Same or opposite', a11y: 'Decide if two words mean the same or the opposite', icon: ArrowLeftRight, strand: 'know', tone: 'brand' },
  meaning: { Comp: Meaning, name: 'Meaning', a11y: 'Pick the meaning', icon: BookOpen, strand: 'know', tone: 'brand' },
  // Spell
  cover: { Comp: Cover, name: 'Look, cover, write', a11y: 'Look at the word, then write it from memory', icon: EyeOff, strand: 'spell', tone: 'mint' },
  missing: { Comp: Missing, name: 'Missing piece', a11y: 'Pick the piece that completes the word', icon: Puzzle, strand: 'spell', tone: 'mint' },
  proof: { Comp: Proof, name: 'Spot it', a11y: 'Pick the correct spelling', icon: SpellCheck, strand: 'spell', tone: 'mint' },
  dictate: { Comp: Dictate, name: 'Hear and write', a11y: 'Hear the word and write it', icon: Ear, strand: 'spell', tone: 'mint' },
  scramble: { Comp: Scramble, name: 'Unscramble', a11y: 'Put the beats in order', icon: Shuffle, strand: 'spell', tone: 'mint' },
  // Spell, with the whole body
  trace: { Comp: TraceGame, name: 'Trace', a11y: 'Trace the letters with a finger', icon: PenLine, strand: 'spell', tone: 'butter' },
  marble: { Comp: MarbleGame, name: 'Marble', a11y: 'Tilt the phone to roll a marble through the letters', icon: CircleDot, strand: 'spell', tone: 'butter' },
  sky: { Comp: SkyGame, name: 'Sky writing', a11y: 'Write the letters in the air with your phone', icon: WandSparkles, strand: 'spell', tone: 'butter' },
};
