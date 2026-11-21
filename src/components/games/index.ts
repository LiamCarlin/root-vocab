import { ArrowLeftRight, AudioLines, BookOpen, CircleDot, Ear, EyeOff, Fingerprint, Hand, Network, PenLine, Puzzle, Search, Shuffle, SpellCheck, TextCursorInput, type LucideIcon } from 'lucide-react-native';
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
import { EchoGame, MarbleGame, SandGame, TapGame, TraceGame } from './Sensory';
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
  clue: { Comp: Clue, name: 'Tip of tongue', a11y: 'Find the word from a clue', icon: Search, strand: 'find', tone: 'stone' },
  gap: { Comp: Gap, name: 'Fill the gap', a11y: 'Find the word that fits the sentence', icon: TextCursorInput, strand: 'find', tone: 'stone' },
  // Know: what it means and what it sits with
  web: { Comp: Web, name: 'Word web', a11y: 'Pick what belongs with the word', icon: Network, strand: 'know', tone: 'stone' },
  pair: { Comp: Pair, name: 'Same or opposite', a11y: 'Decide if two words mean the same or the opposite', icon: ArrowLeftRight, strand: 'know', tone: 'stone' },
  meaning: { Comp: Meaning, name: 'Meaning', a11y: 'Pick the meaning', icon: BookOpen, strand: 'know', tone: 'stone' },
  // Spell
  cover: { Comp: Cover, name: 'Look, cover, write', a11y: 'Look at the word, then write it from memory', icon: EyeOff, strand: 'spell', tone: 'stone' },
  missing: { Comp: Missing, name: 'Missing piece', a11y: 'Pick the piece that completes the word', icon: Puzzle, strand: 'spell', tone: 'stone' },
  proof: { Comp: Proof, name: 'Spot it', a11y: 'Pick the correct spelling', icon: SpellCheck, strand: 'spell', tone: 'stone' },
  dictate: { Comp: Dictate, name: 'Hear and write', a11y: 'Hear the word and write it', icon: Ear, strand: 'spell', tone: 'stone' },
  scramble: { Comp: Scramble, name: 'Unscramble', a11y: 'Put the beats in order', icon: Shuffle, strand: 'spell', tone: 'stone' },
  // Hands-on: the word through the hand, the arm and the voice
  tap: { Comp: TapGame, name: 'Tap and sweep', a11y: 'Tap one key for each beat, then sweep across to blend them', icon: Fingerprint, strand: 'spell', tone: 'stone' },
  trace: { Comp: TraceGame, name: 'Trace', a11y: 'Trace each letter the way it is written', icon: PenLine, strand: 'spell', tone: 'stone' },
  marble: { Comp: MarbleGame, name: 'Marble run', a11y: 'Tip the phone to roll a marble along each letter', icon: CircleDot, strand: 'spell', tone: 'stone' },
  sand: { Comp: SandGame, name: 'Sand tray', a11y: 'Write the word from memory with a finger, one beat at a time', icon: Hand, strand: 'spell', tone: 'stone' },
  echo: { Comp: EchoGame, name: 'Echo', a11y: 'Root says it, then you say it back, beat by beat', icon: AudioLines, strand: 'find', tone: 'stone' },
};
