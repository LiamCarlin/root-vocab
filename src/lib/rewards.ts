// Badges and daily quests: definitions and maths only. The components that draw them live in components/rewards.tsx.

import { BookOpen, CircleDot, Compass, FastForward, Flame, Hammer, Hand, Handshake, Map, PenLine, Puzzle, Repeat, ScanSearch, Search, Sprout, Target, type LucideIcon } from 'lucide-react-native';

import type { BlockTone } from '@/theme/tokens';
import { HANDS, dayOf, patternsMastered, streakOf } from './engine';
import type { Data, Unlock } from './store';

// ── Badges ────────────────────────────────────────────────────────────────
export type BadgeDef = {
  id: string;
  /** Two words at most. */
  name: string;
  icon: LucideIcon;
  tone: BlockTone;
  /** The values at which each tier is reached. */
  tiers: number[];
  /** What is being counted, for screen readers and the detail line: "words rooted". */
  unit: string;
  value: (s: Data) => number;
  /** Not shown until earned. */
  hidden?: boolean;
};

const count = (s: Data, key: string) => s.counters[key] ?? 0;

export const BADGES: BadgeDef[] = [
  { id: 'rooted', name: 'Deep roots', icon: Sprout, tone: 'brand', tiers: [5, 25, 50, 100, 200], unit: 'words rooted', value: (s) => Object.values(s.words).filter((w) => w.status === 'known').length },
  { id: 'streak', name: 'On a roll', icon: Flame, tone: 'brand', tiers: [3, 7, 14, 30, 60, 100], unit: 'days in a row', value: (s) => Math.max(count(s, 'bestStreak'), streakOf(s)) },
  { id: 'learner', name: 'Word collector', icon: BookOpen, tone: 'brand', tiers: [5, 20, 50, 100], unit: 'words learned', value: (s) => count(s, 'lessons') },
  { id: 'finder', name: 'Quick finder', icon: Search, tone: 'brand', tiers: [10, 50, 150, 400], unit: 'words found', value: (s) => count(s, 'find') },
  { id: 'speller', name: 'Sure speller', icon: PenLine, tone: 'brand', tiers: [10, 50, 150, 400], unit: 'words spelled', value: (s) => count(s, 'spell') },
  { id: 'perfect', name: 'Clean sweep', icon: Target, tone: 'brand', tiers: [1, 5, 20], unit: 'perfect rounds', value: (s) => count(s, 'perfect') },
  { id: 'explorer', name: 'Fog lifter', icon: Compass, tone: 'brand', tiers: [1, 3, 6], unit: 'places cleared', value: (s) => s.journey.cleared.length },
  { id: 'pattern', name: 'Pattern spotter', icon: Puzzle, tone: 'brand', tiers: [1, 3, 6], unit: 'spelling patterns mastered', value: (s) => patternsMastered(s) },
  { id: 'sleuth', name: 'Word sleuth', icon: ScanSearch, tone: 'brand', tiers: [1, 10, 30], unit: 'words tracked down', value: (s) => count(s, 'finder') },
  { id: 'marble', name: 'Steady hands', icon: CircleDot, tone: 'brand', tiers: [3, 15], unit: 'marble runs', value: (s) => count(s, 'marble') },
  { id: 'builder', name: 'Valley builder', icon: Hammer, tone: 'brand', tiers: [1, 6, 12, 18], unit: 'things rebuilt', value: (s) => s.built.length },
  { id: 'pledge', name: 'Kept my word', icon: Handshake, tone: 'brand', tiers: [1, 3, 10], unit: 'pledges kept', value: (s) => count(s, 'pledges') },
  { id: 'ahead', name: 'Ahead already', icon: FastForward, tone: 'brand', tiers: [1, 5, 20], unit: 'words already known', value: (s) => count(s, 'testedOut') },
  { id: 'hands', name: 'Hands-on', icon: Hand, tone: 'brand', tiers: [5, 25, 100], unit: 'words tapped, traced, rolled, written or said', value: (s) => HANDS.reduce((n, g) => n + count(s, g), 0) },
];
export const BADGE_BY_ID: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

/** Where the learner stands on a badge: tiers reached (0 = none yet), the count, and the next target (null at the top). */
export function badgeTier(s: Data, id: string): { tier: number; value: number; next: number | null } {
  const def = BADGE_BY_ID[id];
  if (!def) return { tier: 0, value: 0, next: null };
  const value = def.value(s);
  const tier = def.tiers.filter((t) => value >= t).length;
  return { tier, value, next: def.tiers[tier] ?? null };
}

/** Tiers that have been reached but not yet recorded in `s.badges`. One unlock per badge, at its highest new tier. */
export function newBadgeUnlocks(s: Data): Unlock[] {
  const out: Unlock[] = [];
  for (const def of BADGES) {
    const { tier } = badgeTier(s, def.id);
    if (tier > (s.badges[def.id]?.tier ?? 0)) out.push({ kind: 'badge', id: def.id, tier });
  }
  return out;
}

// ── Daily quests ──────────────────────────────────────────────────────────
export type QuestDef = {
  id: string;
  /** Four words at most. */
  label: string;
  icon: LucideIcon;
  /** The daily counter it watches. */
  counter: string;
  target: number;
  gems: number;
};

// Three groups, one quest from each every day: something new, something recalled, something spelled or played.
const GROUPS: QuestDef[][] = [
  [
    { id: 'learn1', label: 'Learn 1 word', icon: BookOpen, counter: 'lessons', target: 1, gems: 15 },
    { id: 'learn2', label: 'Learn 2 words', icon: BookOpen, counter: 'lessons', target: 2, gems: 30 },
    { id: 'stops2', label: 'Clear 2 stops', icon: Map, counter: 'stops', target: 2, gems: 20 },
  ],
  [
    { id: 'find5', label: 'Find 5 words', icon: Search, counter: 'find', target: 5, gems: 15 },
    { id: 'find3clean', label: 'Find 3 words with no hint', icon: Search, counter: 'find.clean', target: 3, gems: 20 },
    { id: 'know5', label: 'Link 5 meanings', icon: Puzzle, counter: 'know', target: 5, gems: 15 },
  ],
  [
    { id: 'spell5', label: 'Spell 5 words', icon: PenLine, counter: 'spell', target: 5, gems: 15 },
    { id: 'spell3clean', label: 'Spell 3 words first try', icon: PenLine, counter: 'spell.clean', target: 3, gems: 20 },
    { id: 'trace2', label: 'Trace 2 words', icon: PenLine, counter: 'trace', target: 2, gems: 15 },
    { id: 'tap2', label: 'Tap out 2 words', icon: Hand, counter: 'tap', target: 2, gems: 15 },
    { id: 'rounds2', label: 'Play 2 rounds', icon: Repeat, counter: 'sessions', target: 2, gems: 15 },
    { id: 'stops3', label: 'Clear 3 stops', icon: Map, counter: 'stops', target: 3, gems: 25 },
  ],
];
export const QUESTS: QuestDef[] = GROUPS.flat();
export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** The three quests for a day. The same day always gives the same three. */
export function questsFor(day: string): string[] {
  return GROUPS.map((g, i) => g[hash(`${day}:${i}`) % g.length].id);
}

/** Today's quest ids, even if nothing has touched the store yet today. */
export const questsToday = (s: Data): string[] => (s.quests.day === dayOf(s) && s.quests.ids.length ? s.quests.ids : questsFor(dayOf(s)));

export function questState(s: Data, id: string): { have: number; target: number; done: boolean; claimed: boolean } {
  const def = QUEST_BY_ID[id];
  if (!def) return { have: 0, target: 1, done: false, claimed: false };
  const t = dayOf(s);
  const have = Math.min(def.target, s.daily.day === t ? (s.daily.counters[def.counter] ?? 0) : 0);
  return { have, target: def.target, done: have >= def.target, claimed: s.quests.day === t && s.quests.claimed.includes(id) };
}
