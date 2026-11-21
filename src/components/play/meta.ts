import { Flag, Hand, PenLine, Search, Shuffle, type LucideIcon } from 'lucide-react-native';

import { GAMES } from '@/components/games';
import type { Pose } from '@/components/Mascot';
import type { Exercise, GameId, SessionKind } from '@/lib/engine';
import type { BlockTone } from '@/theme/tokens';

/** One answered exercise, as the runner remembers it. */
export type Played = { ex: Exercise; text: string; r: 0 | 0.5 | 1; retry: boolean };

export type SessionMeta = { icon: LucideIcon; name: string; a11y: string; tone: BlockTone; pose: Pose };

/** How a session introduces itself: icon, colour, a name of three words at most, and how Root arrives. */
export function sessionMeta(kind: SessionKind, game?: GameId): SessionMeta {
  switch (kind) {
    case 'find':
      return { icon: Search, name: 'Find', a11y: 'Find round: get the words out', tone: 'stone', pose: 'search' };
    case 'spell':
      return { icon: PenLine, name: 'Spell', a11y: 'Spelling round', tone: 'stone', pose: 'write' };
    case 'hands':
      return { icon: Hand, name: 'Hands-on', a11y: 'Hands-on round: tap, trace, say, roll and write this chapter’s words', tone: 'stone', pose: 'trace' };
    case 'challenge':
      return { icon: Flag, name: 'Clear the fog', a11y: 'Chapter challenge', tone: 'stone', pose: 'lantern' };
    case 'game': {
      const g = GAMES[game ?? 'clue'];
      return { icon: g.icon, name: g.name, a11y: g.a11y, tone: g.tone, pose: 'thumbs' };
    }
    case 'mix':
    default:
      return { icon: Shuffle, name: 'Daily mix', a11y: 'A mix of everything', tone: 'stone', pose: 'proud' };
  }
}

const RIGHT: Record<'know' | 'find' | 'spell', string[]> = {
  find: ['Got it', 'Nice find', 'Found it', 'There it is'],
  know: ['That’s it', 'Exactly', 'You know it', 'Spot on'],
  spell: ['Spot on', 'Letter perfect', 'Nailed it', 'Got it'],
};

/** A short, varied line for the feedback bar. Two or three words, never a sentence. */
export function praise(r: 0 | 0.5 | 1, strand: 'know' | 'find' | 'spell', retry: boolean, n: number): string {
  if (r === 0) return 'Now you know';
  if (retry) return 'Got it now';
  if (r === 0.5) return 'Got there';
  const list = RIGHT[strand];
  return list[n % list.length];
}
