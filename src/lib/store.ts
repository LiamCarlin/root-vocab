import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DayId, Strand } from '@/data/profile';
import type { Topic } from '@/data/words';
import type { FontId } from '@/theme/tokens';
import { addDays, diffDays } from './dates';
import { bumpSkill, dayOf, difficulty, emptyMem, levelOf, nextMem, SKILL_MAX, SKILL_MIN, STRAND_LIST, streakOf, type GameId, type SessionKind } from './engine';
import { buildChapter, refreshStops } from './journey';
import { lexemeFor, slug, type Lexeme } from './lexicon';
import { newBadgeUnlocks, QUEST_BY_ID, questsFor, questState } from './rewards';

export type { Strand } from '@/data/profile';
export type { GameId, SessionKind } from './engine';

// ── Types ─────────────────────────────────────────────────────────────────
/** How well one strand of one word is held. Box 0..4; a higher box comes back less often. */
export type Mem = { box: number; due: string | null; seen: number; ok: number; last?: string; /** The highest box this strand has ever reached. */ top?: number };
export type WordStatus = 'queued' | 'learning' | 'known' | 'removed';
export type Origin = 'path' | 'finder' | 'assess' | 'typed';
export type LessonStats = { hints: number; retries: number; skipped: string[] };

export type UserWord = {
  id: string;
  text: string;
  // For words Root has no bank entry for (found with the Finder, or typed in):
  meaning?: string;
  example?: string;
  parts?: string[];
  says?: string[];
  pos?: string;
  status: WordStatus;
  prevStatus?: WordStatus;
  /** Memory as it was before "I know this", so that can be undone. */
  prevMem?: Record<Strand, Mem>;
  origin: Origin;
  addedAt: number;
  /** The day the first lesson was finished. */
  learnedOn?: string;
  mem: Record<Strand, Mem>;
  /** The picture hook the learner chose (an emoji). */
  hook?: string;
  lesson?: LessonStats;
};

export type SlotId = 'morning' | 'lunch' | 'evening';
export const SLOT_LABEL: Record<SlotId, string> = { morning: 'Morning', lunch: 'Midday', evening: 'Evening' };

export type Profile = { name: string; guest: boolean; days: DayId[]; interests: Topic[]; goals: Strand[] };
export type Display = { font: FontId; size: 0 | 1 | 2; spacing: 0 | 1; theme: 'system' | 'light' | 'paper' | 'dark'; reduceMotion: boolean; haptics: boolean; sound: boolean; companion: 'lively' | 'calm' | 'off' };
export type CheckIn = { freq: 'daily' | 'three' | 'off'; days: number[]; slots: SlotId[]; times: Record<SlotId, string> };
export type Moderator = { micMiss: boolean; dayOffset: number };

export type Attempt = { d: string; id: string; strand: Strand; r: 0 | 0.5 | 1; game: GameId; ms?: number; cue?: number };
export type StopKind = 'learn' | 'find' | 'spell' | 'chest' | 'challenge';
export type Stop = { kind: StopKind; wordId?: string; /** Day key it was finished. */ done?: string };
export type Journey = { chapter: number; stops: Stop[]; prologueSeen: boolean; introSeen: boolean; cleared: number[] };
export type Unlock = { kind: 'badge'; id: string; tier: number } | { kind: 'chapter'; n: number } | { kind: 'streak'; n: number } | { kind: 'level'; strand: Strand; level: number };
export type Session = { day: string; kind: SessionKind; total: number; right: number; ms: number };
export type SessionSummary = { gems: number; streak: number; streakExtended: boolean; goalMet: boolean; goalJustMet: boolean; unlocks: Unlock[] };
export type StopOutcome = { chapterDone: boolean; gems: number; goalJustMet: boolean; streak: number; streakExtended: boolean };

export type Data = {
  onboarded: boolean;
  /** The placement has been done (or skipped). */
  placed: boolean;
  profile: Profile;
  checkIn: CheckIn;
  voice: 'coach' | 'quiet';
  slowAudio: boolean;
  display: Display;
  mod: Moderator;
  words: Record<string, UserWord>;
  /** The learner's level in each strand, 1.0 … 6.9. */
  skill: Record<Strand, number>;
  /** The highest whole level already celebrated in each strand. */
  levelSeen: Record<Strand, number>;
  /** Spelling attempts by PatternId. `ok` counts a right-with-help as a half. */
  patterns: Record<string, { seen: number; ok: number }>;
  /** The last 400 answers. */
  log: Attempt[];
  /** Lifetime counters. */
  counters: Record<string, number>;
  /** Today's counters. Stale (yesterday's) until the first action of a new day; read through `dailyCount`. */
  daily: { day: string; counters: Record<string, number>; stops: number; /** When today first counted as a practice day, and when today's goal was first met (ms). */ streakAt?: number; goalAt?: number };
  /** Stops per day. */
  goal: 1 | 2 | 3;
  practiceDays: string[];
  /** Missed days a streak freeze covered. */
  frozenDays: string[];
  freezes: number;
  /** The day each held freeze was bought, oldest first. A freeze only covers days it was already held on. */
  freezeBought: string[];
  gems: number;
  journey: Journey;
  quests: { day: string; ids: string[]; claimed: string[] };
  badges: Record<string, { tier: number; on: string }>;
  /** Celebrations waiting to be shown, oldest first. */
  unlocks: Unlock[];
  /** The last 60 practice sessions. */
  sessions: Session[];
  /** May the Finder look words up online? null = not asked yet. */
  finderOnline: boolean | null;
};

type AddOpts = Partial<Pick<UserWord, 'origin' | 'status' | 'meaning' | 'example' | 'parts' | 'says' | 'pos'>>;

type Actions = {
  patch: (p: Partial<Data>) => void;
  setProfile: (p: Partial<Profile>) => void;
  setDisplay: (p: Partial<Display>) => void;
  setCheckIn: (p: Partial<CheckIn>) => void;
  setMod: (p: Partial<Moderator>) => void;
  /** Adds a word to the learner's list (queued unless told otherwise). Returns its id, or '' for an empty word. */
  addWord: (text: string, opts?: AddOpts) => string;
  updateWord: (id: string, p: Partial<UserWord>) => void;
  removeWord: (id: string) => void;
  restoreWord: (id: string) => void;
  /** "I know this one": rooted now, checked again in a week. Works for a bank word that is not on the list yet. */
  markKnown: (id: string) => void;
  undoKnown: (id: string) => void;
  setHook: (id: string, emoji: string) => void;
  /** End of the placement: sets the levels, queues the words that were missed, and builds chapter 1. */
  place: (r: { skill: Record<Strand, number>; missed: string[] }) => void;
  /** One answer in any game. Moves the word's memory box, the strand level, the spelling-pattern stats and the counters. */
  recordAttempt: (a: Omit<Attempt, 'd'>) => void;
  /** The first lesson on a word is finished. */
  completeLesson: (id: string, stats: LessonStats) => void;
  /** Marks a journey stop done. Call this BEFORE finishSession so the session summary sees the goal as met. */
  completeStop: (index: number) => StopOutcome;
  /** `clean` = answers right first time with no cue; a round only counts as perfect when every answer was clean. */
  finishSession: (meta: { kind: SessionKind; total: number; right: number; ms: number; clean?: number }) => SessionSummary;
  /** Opens a chest stop (and completes it). Returns the gems inside, 0 if it was not an unopened chest. */
  openChest: (index: number) => number;
  /** Returns the gems paid out, 0 if the quest was not finished or already claimed. */
  claimQuest: (id: string) => number;
  /** 200 gems, two held at most. */
  buyFreeze: () => boolean;
  shiftUnlock: () => void;
  seeStory: (which: 'prologue' | 'intro') => void;
  /** After the outro: the place is cleared and the next chapter's stops are built. */
  nextChapter: () => void;
  /** Adds to a lifetime and a daily counter ('pokes', 'finder', 'marble', 'sky', 'trace', 'combo5', …). */
  bump: (counter: string, by?: number) => void;
  /** Rolls the day over if it has changed (fresh quests and daily counters, streak freezes) and repairs any stop that can no longer be played. Cheap; call on app focus. */
  tick: () => void;
  finishOnboarding: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
};

export type State = Data & Actions;

// ── Numbers ───────────────────────────────────────────────────────────────
/** Gems are earned, never taken away (except to buy a streak freeze). */
export const GEMS = { lesson: 20, session: 10, perRight: 2, stop: 5, chestMin: 30, chestStep: 10, freeze: 200 } as const;
export const MAX_FREEZES = 2;
export const STREAK_MARKS = [3, 7, 14, 30, 50, 100];
/** How fast the level moves on words Root has not taught yet (arcade play on bank words): evidence of what the learner already has. */
const K_SKILL = 0.18;
/**
 * On words Root has taught, practice volume says nothing about ability, so the level only moves on mastery:
 * up a little the first time a strand of a word at or above the learner's level reaches box 3 (right on three
 * separate, spaced days), down a little less when a well-held word at or below their level is missed outright.
 * How much "a little" is depends on how the word got there: straight through counts in full, a word that needed
 * many tries counts for less, and one that was right first time 60% of the time or less not at all (that is effort, not level).
 */
const MASTERY_UP = 0.08;
const LAPSE_DOWN = 0.04;
/** Share of answers right first time below which reaching box 3 says nothing about level. */
const EASE_FLOOR = 0.6;
/** A round has to be at least this long to count as a perfect one. */
const PERFECT_MIN = 4;

const initial: Data = {
  onboarded: false,
  placed: false,
  profile: { name: '', guest: false, days: [], interests: [], goals: [] },
  checkIn: { freq: 'daily', days: [1, 3, 5], slots: ['evening'], times: { morning: '07:45', lunch: '12:30', evening: '19:00' } },
  voice: 'coach',
  slowAudio: false,
  display: { font: 'lexend', size: 0, spacing: 0, theme: 'system', reduceMotion: false, haptics: true, sound: true, companion: 'lively' },
  mod: { micMiss: false, dayOffset: 0 },
  words: {},
  skill: { know: 2, find: 2, spell: 2 },
  levelSeen: { know: 2, find: 2, spell: 2 },
  patterns: {},
  log: [],
  counters: {},
  daily: { day: '', counters: {}, stops: 0 },
  goal: 2,
  practiceDays: [],
  frozenDays: [],
  freezes: 0,
  freezeBought: [],
  gems: 0,
  journey: { chapter: 1, stops: [], prologueSeen: false, introSeen: false, cleared: [] },
  quests: { day: '', ids: [], claimed: [] },
  badges: {},
  unlocks: [],
  sessions: [],
  finderOnline: null,
};
const DATA_KEYS = Object.keys(initial) as (keyof Data)[];

// ── Internal helpers (plain state in, plain state out) ────────────────────
const uniq = <T,>(a: T[]) => Array.from(new Set(a));
const clampSkill = (v: number) => Math.max(SKILL_MIN, Math.min(SKILL_MAX, Number.isFinite(v) ? v : 2));
const freshMem = (): Record<Strand, Mem> => ({ know: emptyMem(), find: emptyMem(), spell: emptyMem() });
const data = (s: Data): Data => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as Data;
const add = (rec: Record<string, number>, key: string, by = 1) => ({ ...rec, [key]: (rec[key] ?? 0) + by });

function newWord(text: string, n: number, opts: AddOpts = {}): UserWord {
  return { id: slug(text), text, status: 'queued', origin: 'typed', addedAt: Date.now() + n, mem: freshMem(), ...opts };
}

/**
 * Brings the state up to today: fresh daily counters and quests, and, if exactly the missed days can be covered
 * by the freezes held, spends them so the streak carries on. Returns the same object when nothing changed.
 */
function roll(s: Data): Data {
  const t = dayOf(s);
  if (s.daily.day === t && s.quests.day === t) return s;
  let { frozenDays, freezes } = s;
  let freezeBought = s.freezeBought ?? [];
  const last = [...s.practiceDays, ...s.frozenDays].reduce((m, d) => (d > m ? d : m), '');
  if (last && freezes > 0) {
    const gap = diffDays(t, last) - 1;
    if (gap >= 1 && gap <= freezes) {
      const missed = Array.from({ length: gap }, (_, i) => addDays(last, i + 1));
      // A freeze only covers a missed day it was already held on: buying one after a streak has broken cannot bring it back.
      // (Freezes with no recorded day came from before days were recorded and count as held all along.)
      const bought = [...freezeBought].sort().slice(-freezes);
      const held = [...Array.from({ length: freezes - bought.length }, () => ''), ...bought];
      if (missed.every((d, i) => held[i] <= d)) {
        frozenDays = [...frozenDays, ...missed].slice(-120);
        freezes -= gap;
        freezeBought = held.slice(gap).filter(Boolean);
      }
    }
  }
  return {
    ...s,
    frozenDays,
    freezes,
    freezeBought,
    daily: s.daily.day === t ? s.daily : { day: t, counters: {}, stops: 0 },
    quests: s.quests.day === t ? s.quests : { day: t, ids: questsFor(t), claimed: [] },
  };
}

const count = (s: Data, key: string, by = 1): Data => ({ ...s, counters: add(s.counters, key, by), daily: { ...s.daily, counters: add(s.daily.counters, key, by) } });
const practised = (s: Data): Data => (s.practiceDays.includes(dayOf(s)) ? s : { ...s, practiceDays: [...s.practiceDays, dayOf(s)].slice(-800), daily: { ...s.daily, streakAt: Date.now() } });

/**
 * "Just now" for the end-of-activity screens. A lesson, its stop and its session summary are recorded within a
 * moment of each other, and each of them should be able to say "the streak grew" or "goal met" for the same event.
 */
const JUST = 20000;
const justNow = (at: number | undefined) => !!at && Date.now() - at < JUST;
const streakJustGrew = (s: Data) => s.practiceDays.includes(dayOf(s)) && justNow(s.daily.streakAt);

/**
 * Queues the celebrations an action has earned: a streak milestone, a new level in a strand, new badge tiers.
 * Runs at natural stopping points (end of a lesson, a stop, a session), never in the middle of an answer.
 */
function celebrate(prev: Data, next: Data): Data {
  const t = dayOf(next);
  const fresh: Unlock[] = [];
  const was = streakOf(prev);
  const now = streakOf(next);
  let s = now > (next.counters.bestStreak ?? 0) ? { ...next, counters: { ...next.counters, bestStreak: now } } : next;

  const streakHit = now > was && STREAK_MARKS.includes(now);
  if (streakHit) fresh.push({ kind: 'streak', n: now });

  let levelSeen = s.levelSeen;
  for (const strand of STRAND_LIST) {
    const level = levelOf(s.skill[strand]);
    if (level > (levelSeen[strand] ?? 1)) {
      fresh.push({ kind: 'level', strand, level });
      levelSeen = { ...levelSeen, [strand]: level };
    }
  }
  s = { ...s, levelSeen };

  let badges = s.badges;
  for (const u of newBadgeUnlocks(s)) {
    if (u.kind !== 'badge') continue;
    badges = { ...badges, [u.id]: { tier: u.tier, on: t } };
    // The streak flame already celebrates the day; the badge is recorded without a second pop-up.
    if (!(u.id === 'streak' && streakHit)) fresh.push(u);
  }
  return { ...s, badges, unlocks: fresh.length ? [...s.unlocks, ...fresh] : s.unlocks };
}

/** Notes the moment the daily goal is first met. `just` stays true for the few seconds an end screen needs it. */
function goalCheck(s: Data): { s: Data; just: boolean; met: boolean } {
  const met = s.daily.stops >= s.goal;
  const next = met && !s.daily.goalAt ? { ...s, daily: { ...s.daily, goalAt: Date.now() } } : s;
  return { s: next, met, just: met && justNow(next.daily.goalAt) };
}

/** Marks a stop done, with everything that follows from it. Does not add gems. */
function finishStop(s0: Data, index: number): { s: Data; chapterDone: boolean } {
  const t = dayOf(s0);
  const stops = s0.journey.stops.map((st, i) => (i === index ? { ...st, done: t } : st));
  let s: Data = { ...s0, journey: { ...s0.journey, stops }, daily: { ...s0.daily, stops: s0.daily.stops + 1 } };
  s = count(practised(s), 'stops');
  s = { ...s, journey: { ...s.journey, stops: refreshStops(s) } };
  const chapterDone = s.journey.stops.length > 0 && s.journey.stops.every((st) => !!st.done);
  if (chapterDone) s = { ...s, unlocks: [...s.unlocks, { kind: 'chapter', n: s.journey.chapter }] };
  return { s, chapterDone };
}

// ── Reading a backup: nothing from outside goes into the store unchecked ───
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: WordStatus[] = ['queued', 'learning', 'known', 'removed'];
const ORIGINS: Origin[] = ['path', 'finder', 'assess', 'typed'];
const STOP_KINDS: StopKind[] = ['learn', 'find', 'spell', 'chest', 'challenge'];
const SESSION_KINDS: SessionKind[] = ['find', 'spell', 'mix', 'challenge', 'game'];
const SLOTS: SlotId[] = ['morning', 'lunch', 'evening'];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, dflt: number, lo = -Infinity, hi = Infinity) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt);
const str = (v: unknown, dflt = '') => (typeof v === 'string' ? v : dflt);
const dayKeyOf = (v: unknown): string | null => (typeof v === 'string' && DAY_RE.test(v) ? v : null);
const dayList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && DAY_RE.test(x)) : []);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const pick = <T,>(v: unknown, all: readonly T[], dflt: T): T => (all.includes(v as T) ? (v as T) : dflt);
const flag = (v: unknown, dflt: boolean) => (typeof v === 'boolean' ? v : dflt);
const tally = (v: unknown): Record<string, number> => (isObj(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]))) : {});

function cleanMem(v: unknown): Mem {
  if (!isObj(v)) return emptyMem();
  const box = Math.round(num(v.box, 0, 0, 4));
  const m: Mem = { box, due: dayKeyOf(v.due), seen: num(v.seen, 0, 0), ok: num(v.ok, 0, 0) };
  const last = dayKeyOf(v.last);
  if (last) m.last = last;
  if (typeof v.top === 'number' && Number.isFinite(v.top)) m.top = Math.max(box, Math.min(4, Math.round(v.top)));
  return m;
}
const cleanMems = (v: unknown): Record<Strand, Mem> => {
  const m = isObj(v) ? v : {};
  return { know: cleanMem(m.know), find: cleanMem(m.find), spell: cleanMem(m.spell) };
};

function cleanWord(v: unknown): UserWord | null {
  if (!isObj(v)) return null;
  const id = slug(str(v.id));
  const text = str(v.text).trim();
  if (!id || !text || !STATUSES.includes(v.status as WordStatus)) return null;
  const w: UserWord = { id, text, status: v.status as WordStatus, origin: pick(v.origin, ORIGINS, 'typed'), addedAt: num(v.addedAt, Date.now()), mem: cleanMems(v.mem) };
  for (const k of ['meaning', 'example', 'pos', 'hook'] as const) if (typeof v[k] === 'string' && v[k]) w[k] = v[k] as string;
  for (const k of ['parts', 'says'] as const) if (strList(v[k]).length) w[k] = strList(v[k]);
  const learnedOn = dayKeyOf(v.learnedOn);
  if (learnedOn) w.learnedOn = learnedOn;
  if (STATUSES.includes(v.prevStatus as WordStatus)) w.prevStatus = v.prevStatus as WordStatus;
  if (isObj(v.prevMem)) w.prevMem = cleanMems(v.prevMem);
  if (isObj(v.lesson)) w.lesson = { hints: num(v.lesson.hints, 0, 0), retries: num(v.lesson.retries, 0, 0), skipped: strList(v.lesson.skipped) };
  return w;
}

/**
 * Turns whatever a backup code decoded to into a state that is safe to load, or null if it is not a Root backup.
 * Anything missing or of the wrong shape falls back to its default; words and stops that cannot be used are dropped;
 * levels are clamped. A backup made before the placement still gets one (`placed` is kept as saved).
 */
export function sanitizeImport(raw: unknown): Data | null {
  if (!isObj(raw) || raw.root !== 4 || !isObj(raw.words)) return null;
  const d = raw;

  const words: Record<string, UserWord> = {};
  for (const v of Object.values(d.words as Record<string, unknown>)) {
    const w = cleanWord(v);
    if (w) words[w.id] = w;
  }

  const sk = isObj(d.skill) ? d.skill : {};
  const skill = { know: clampSkill(num(sk.know, initial.skill.know)), find: clampSkill(num(sk.find, initial.skill.find)), spell: clampSkill(num(sk.spell, initial.skill.spell)) };
  const seen = isObj(d.levelSeen) ? d.levelSeen : {};
  const levelSeen = { know: Math.round(num(seen.know, levelOf(skill.know), 1, 6)), find: Math.round(num(seen.find, levelOf(skill.find), 1, 6)), spell: Math.round(num(seen.spell, levelOf(skill.spell), 1, 6)) };

  const pr = isObj(d.profile) ? d.profile : {};
  const profile: Profile = { name: str(pr.name).slice(0, 60), guest: false, days: strList(pr.days) as DayId[], interests: strList(pr.interests) as Topic[], goals: strList(pr.goals).filter((g): g is Strand => STRAND_LIST.includes(g as Strand)) };

  const di = isObj(d.display) ? d.display : {};
  const display: Display = {
    font: pick<FontId>(di.font, ['lexend', 'jakarta', 'atkinson'], initial.display.font),
    size: pick<0 | 1 | 2>(di.size, [0, 1, 2], initial.display.size),
    spacing: pick<0 | 1>(di.spacing, [0, 1], initial.display.spacing),
    theme: pick<Display['theme']>(di.theme, ['system', 'light', 'paper', 'dark'], initial.display.theme),
    reduceMotion: flag(di.reduceMotion, initial.display.reduceMotion),
    haptics: flag(di.haptics, initial.display.haptics),
    sound: flag(di.sound, initial.display.sound),
    companion: pick<Display['companion']>(di.companion, ['lively', 'calm', 'off'], initial.display.companion),
  };

  const ci = isObj(d.checkIn) ? d.checkIn : {};
  const times = isObj(ci.times) ? ci.times : {};
  const time = (k: SlotId) => (typeof times[k] === 'string' && /^\d{2}:\d{2}$/.test(times[k] as string) ? (times[k] as string) : initial.checkIn.times[k]);
  const slots = strList(ci.slots).filter((x): x is SlotId => SLOTS.includes(x as SlotId));
  const checkIn: CheckIn = {
    freq: pick<CheckIn['freq']>(ci.freq, ['daily', 'three', 'off'], initial.checkIn.freq),
    days: Array.isArray(ci.days) ? ci.days.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6) : initial.checkIn.days,
    slots: slots.length ? slots : initial.checkIn.slots,
    times: { morning: time('morning'), lunch: time('lunch'), evening: time('evening') },
  };

  const patterns: Data['patterns'] = {};
  if (isObj(d.patterns)) for (const [k, v] of Object.entries(d.patterns)) if (isObj(v)) patterns[k] = { seen: num(v.seen, 0, 0), ok: num(v.ok, 0, 0) };

  const log: Attempt[] = (Array.isArray(d.log) ? d.log : [])
    .filter(isObj)
    .filter((a) => dayKeyOf(a.d) && typeof a.id === 'string' && STRAND_LIST.includes(a.strand as Strand) && (a.r === 0 || a.r === 0.5 || a.r === 1) && typeof a.game === 'string')
    .map((a) => ({ d: a.d as string, id: a.id as string, strand: a.strand as Strand, r: a.r as 0 | 0.5 | 1, game: a.game as GameId }))
    .slice(-400);

  const da = isObj(d.daily) ? d.daily : {};
  const daily: Data['daily'] = { day: dayKeyOf(da.day) ?? '', counters: tally(da.counters), stops: Math.round(num(da.stops, 0, 0)) };

  const jo = isObj(d.journey) ? d.journey : {};
  const stops: Stop[] = (Array.isArray(jo.stops) ? jo.stops : [])
    .filter(isObj)
    .filter((st) => STOP_KINDS.includes(st.kind as StopKind))
    .map((st) => {
      const stop: Stop = { kind: st.kind as StopKind };
      if (typeof st.wordId === 'string' && slug(st.wordId)) stop.wordId = slug(st.wordId);
      const done = dayKeyOf(st.done);
      if (done) stop.done = done;
      return stop;
    });
  const journey: Journey = {
    chapter: Math.round(num(jo.chapter, 1, 1, 100000)),
    stops,
    prologueSeen: flag(jo.prologueSeen, false),
    introSeen: flag(jo.introSeen, false),
    cleared: Array.isArray(jo.cleared) ? jo.cleared.filter((n): n is number => Number.isInteger(n) && n >= 1) : [],
  };

  const qu = isObj(d.quests) ? d.quests : {};
  const badges: Data['badges'] = {};
  if (isObj(d.badges)) for (const [k, v] of Object.entries(d.badges)) if (isObj(v) && typeof v.tier === 'number' && Number.isFinite(v.tier)) badges[k] = { tier: Math.round(v.tier), on: dayKeyOf(v.on) ?? '' };

  const sessions: Session[] = (Array.isArray(d.sessions) ? d.sessions : [])
    .filter(isObj)
    .filter((x) => dayKeyOf(x.day) && SESSION_KINDS.includes(x.kind as SessionKind))
    .map((x) => ({ day: x.day as string, kind: x.kind as SessionKind, total: Math.round(num(x.total, 0, 0)), right: Math.round(num(x.right, 0, 0)), ms: Math.round(num(x.ms, 0, 0)) }))
    .slice(-60);

  const freezes = Math.round(num(d.freezes, 0, 0, MAX_FREEZES));
  let s: Data = {
    ...initial,
    onboarded: true,
    placed: flag(d.placed, false),
    profile,
    checkIn,
    voice: pick<Data['voice']>(d.voice, ['coach', 'quiet'], initial.voice),
    slowAudio: flag(d.slowAudio, initial.slowAudio),
    display,
    words,
    skill,
    levelSeen,
    patterns,
    log,
    counters: tally(d.counters),
    daily,
    goal: pick<1 | 2 | 3>(d.goal, [1, 2, 3], initial.goal),
    practiceDays: dayList(d.practiceDays).slice(-800),
    frozenDays: dayList(d.frozenDays).slice(-120),
    freezes,
    freezeBought: freezes ? dayList(d.freezeBought).slice(-freezes) : [],
    gems: Math.round(num(d.gems, 0, 0)),
    journey,
    quests: { day: dayKeyOf(qu.day) ?? '', ids: strList(qu.ids), claimed: strList(qu.claimed) },
    badges,
    sessions,
    finderOnline: typeof d.finderOnline === 'boolean' ? d.finderOnline : null,
  };
  // A path that can be walked: a chapter if there is none, and a word for every learn stop that has lost its own.
  if (!s.journey.stops.length) s = { ...s, journey: { ...s.journey, stops: buildChapter(s, s.journey.chapter) } };
  s = { ...s, journey: { ...s.journey, stops: refreshStops(s) } };
  return s;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      patch: (p) => set(p),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setDisplay: (p) => set((s) => ({ display: { ...s.display, ...p } })),
      setCheckIn: (p) => set((s) => ({ checkIn: { ...s.checkIn, ...p } })),
      setMod: (p) => set((s) => ({ mod: { ...s.mod, ...p } })),

      addWord: (text, opts = {}) => {
        const clean = text.trim();
        const id = slug(clean);
        if (!id) return '';
        set((s) => {
          const prev = s.words[id];
          if (prev && prev.status !== 'removed') return { words: { ...s.words, [id]: { ...prev, ...opts, status: opts.status ?? prev.status } } };
          const word = { ...newWord(lexemeFor(id)?.text ?? clean, Object.keys(s.words).length, opts), ...(prev ? { mem: prev.mem, learnedOn: prev.learnedOn, hook: prev.hook } : {}) };
          return { words: { ...s.words, [id]: word } };
        });
        return id;
      },
      updateWord: (id, p) => set((s) => (s.words[id] ? { words: { ...s.words, [id]: { ...s.words[id], ...p } } } : s)),
      removeWord: (id) =>
        set((s) => {
          const w = s.words[id];
          if (!w || w.status === 'removed') return s;
          const next = { ...data(s), words: { ...s.words, [id]: { ...w, prevStatus: w.status, status: 'removed' as const } } };
          return { words: next.words, journey: { ...next.journey, stops: refreshStops(next) } };
        }),
      restoreWord: (id) =>
        set((s) => {
          const w = s.words[id];
          return w ? { words: { ...s.words, [id]: { ...w, status: w.prevStatus && w.prevStatus !== 'removed' ? w.prevStatus : 'queued', prevStatus: undefined } } } : s;
        }),
      markKnown: (id) =>
        set((s) => {
          const lex = lexemeFor(id, s.words[id]);
          const w = s.words[id] ?? (lex ? newWord(lex.text, Object.keys(s.words).length, { origin: 'path' }) : null);
          if (!w) return s;
          const t = dayOf(s);
          const strong = (m: Mem): Mem => ({ ...m, box: Math.max(m.box, 3), due: addDays(t, 7) });
          const word: UserWord = { ...w, prevStatus: w.status === 'known' ? w.prevStatus : w.status, prevMem: w.status === 'known' ? w.prevMem : w.mem, status: 'known', mem: { know: strong(w.mem.know), find: strong(w.mem.find), spell: strong(w.mem.spell) } };
          const next = { ...data(s), words: { ...s.words, [id]: word } };
          return { words: next.words, journey: { ...next.journey, stops: refreshStops(next) } };
        }),
      undoKnown: (id) =>
        set((s) => {
          const w = s.words[id];
          if (!w || w.status !== 'known') return s;
          const back = w.prevStatus && w.prevStatus !== 'known' && w.prevStatus !== 'removed' ? w.prevStatus : 'queued';
          return { words: { ...s.words, [id]: { ...w, status: back, mem: w.prevMem ?? freshMem(), prevStatus: undefined, prevMem: undefined } } };
        }),
      setHook: (id, emoji) => set((s) => (s.words[id] ? { words: { ...s.words, [id]: { ...s.words[id], hook: emoji } } } : s)),

      place: (r) => {
        let s = roll(data(get()));
        const skill = { know: clampSkill(r.skill.know), find: clampSkill(r.skill.find), spell: clampSkill(r.skill.spell) };
        const words = { ...s.words };
        for (const raw of r.missed) {
          const id = slug(raw);
          const lex = lexemeFor(id, words[id]);
          if (!lex || (words[id] && words[id].status !== 'removed')) continue;
          words[id] = newWord(lex.text, Object.keys(words).length, { origin: 'assess' });
        }
        s = { ...s, placed: true, skill, levelSeen: { know: levelOf(skill.know), find: levelOf(skill.find), spell: levelOf(skill.spell) }, words };
        // A retake keeps a chapter that is already under way.
        const started = s.journey.stops.some((st) => st.done);
        if (!started) s = { ...s, journey: { ...s.journey, stops: buildChapter(s, s.journey.chapter), introSeen: false } };
        set(s);
      },

      recordAttempt: (a) => {
        let s = roll(data(get()));
        const t = dayOf(s);
        const w = s.words[a.id];
        const lex = lexemeFor(a.id, w);

        const taught = !!w && (w.status === 'learning' || w.status === 'known');
        const hard = difficulty(lex, a.strand);
        let skill = s.skill;
        let patterns = s.patterns;
        if (a.strand === 'spell' && lex?.tricky) {
          const p = patterns[lex.tricky.pattern] ?? { seen: 0, ok: 0 };
          patterns = { ...patterns, [lex.tricky.pattern]: { seen: p.seen + 1, ok: p.ok + a.r } };
        }
        let words = s.words;
        if (w && taught) {
          const was = w.mem[a.strand] ?? emptyMem();
          const now = nextMem(was, a.r, t);
          // The level follows mastery, not how much was practised today (see MASTERY_UP). Never on a same-day repeat.
          if (was.last !== t) {
            const level = levelOf(skill[a.strand]);
            const ease = Math.max(0, Math.min(1, (now.ok / Math.max(1, now.seen) - EASE_FLOOR) / (1 - EASE_FLOOR)));
            if (now.box >= 3 && (was.top ?? was.box) < 3 && hard >= level) skill = { ...skill, [a.strand]: clampSkill(skill[a.strand] + MASTERY_UP * ease) };
            else if (a.r === 0 && was.box >= 2 && hard <= level) skill = { ...skill, [a.strand]: clampSkill(skill[a.strand] - LAPSE_DOWN) };
          }
          const mem = { ...w.mem, [a.strand]: now };
          const rooted = STRAND_LIST.every((k) => mem[k].box >= 3);
          words = { ...words, [a.id]: { ...w, mem, status: rooted ? 'known' : 'learning' } };
        } else {
          // A word Root has not taught: the answer is evidence of what the learner already has. Once a day per word and strand.
          let again = false;
          for (let i = s.log.length - 1; i >= 0 && s.log[i].d === t; i--) {
            if (s.log[i].id === a.id && s.log[i].strand === a.strand) {
              again = true;
              break;
            }
          }
          if (!again) skill = { ...skill, [a.strand]: bumpSkill(skill[a.strand], hard, a.r, K_SKILL) };
          if (w && w.status === 'queued') {
            // Note that it was seen; leave the boxes and the status alone.
            const m = w.mem[a.strand] ?? emptyMem();
            words = { ...words, [a.id]: { ...w, mem: { ...w.mem, [a.strand]: { ...m, seen: m.seen + 1, ok: m.ok + (a.r === 1 ? 1 : 0) } } } };
          }
        }
        s = { ...s, skill, patterns, words, log: [...s.log, { ...a, d: t }].slice(-400) };
        if (a.r > 0) s = count(s, a.strand);
        if (a.r === 1) s = count(s, `${a.strand}.clean`);
        set(s);
      },

      completeLesson: (id, stats) => {
        const before = roll(data(get()));
        const t = dayOf(before);
        let s = before;
        const lex = lexemeFor(id, s.words[id]);
        const w = s.words[id] ?? (lex ? newWord(lex.text, Object.keys(s.words).length, { origin: 'path' }) : null);
        if (w) {
          // A lesson taken again (after "teach me again", or a word removed and brought back) is not a first lesson: no second reward.
          const first = !w.learnedOn;
          const taught = (m: Mem): Mem => (m.box >= 1 ? { ...m, seen: m.seen + 1, last: t, due: m.due ?? addDays(t, 1) } : { ...m, box: 1, due: addDays(t, 1), seen: m.seen + 1, ok: m.ok + 1, last: t });
          const mem = { know: taught(w.mem.know), find: taught(w.mem.find), spell: taught(w.mem.spell) };
          const rooted = STRAND_LIST.every((k) => mem[k].box >= 3);
          s = { ...s, words: { ...s.words, [id]: { ...w, status: rooted ? 'known' : 'learning', prevStatus: undefined, learnedOn: w.learnedOn ?? t, lesson: stats, mem } } };
          if (first) s = { ...count(s, 'lessons'), gems: s.gems + GEMS.lesson };
        }
        set(celebrate(before, practised(s)));
      },

      completeStop: (index) => {
        const before = roll(data(get()));
        const stop = before.journey.stops[index];
        if (!stop || stop.done) {
          return { chapterDone: before.journey.stops.length > 0 && before.journey.stops.every((st) => !!st.done), gems: 0, goalJustMet: false, streak: streakOf(before), streakExtended: false };
        }
        const done = finishStop(before, index);
        const goal = goalCheck({ ...done.s, gems: done.s.gems + GEMS.stop });
        const s = celebrate(before, goal.s);
        set(s);
        return { chapterDone: done.chapterDone, gems: GEMS.stop, goalJustMet: goal.just, streak: streakOf(s), streakExtended: streakJustGrew(s) };
      },

      finishSession: (meta) => {
        const before = roll(data(get()));
        const t = dayOf(before);
        const right = Math.max(0, Math.min(meta.total, meta.right));
        const gems = GEMS.session + GEMS.perRight * right;
        let s: Data = { ...before, gems: before.gems + gems, sessions: [...before.sessions, { day: t, kind: meta.kind, total: meta.total, right, ms: Math.round(meta.ms) }].slice(-60) };
        s = count(practised(s), 'sessions');
        const clean = meta.clean === undefined ? right : Math.max(0, Math.min(meta.total, meta.clean));
        if (meta.total >= PERFECT_MIN && clean === meta.total) s = count(s, 'perfect');
        const goal = goalCheck(s);
        s = celebrate(before, goal.s);
        set(s);
        return { gems, streak: streakOf(s), streakExtended: streakJustGrew(s), goalMet: goal.met, goalJustMet: goal.just, unlocks: s.unlocks.slice(before.unlocks.length) };
      },

      openChest: (index) => {
        const before = roll(data(get()));
        const stop = before.journey.stops[index];
        if (!stop || stop.kind !== 'chest' || stop.done) return 0;
        const gems = GEMS.chestMin + GEMS.chestStep * ((before.journey.chapter + (before.counters.chests ?? 0)) % 4);
        const done = finishStop(count({ ...before, gems: before.gems + gems }, 'chests'), index);
        set(celebrate(before, goalCheck(done.s).s));
        return gems;
      },

      claimQuest: (id) => {
        const s = roll(data(get()));
        const def = QUEST_BY_ID[id];
        const st = questState(s, id);
        if (!def || !s.quests.ids.includes(id) || !st.done || st.claimed) return 0;
        set({ ...s, gems: s.gems + def.gems, quests: { ...s.quests, claimed: [...s.quests.claimed, id] }, counters: add(s.counters, 'quests') });
        return def.gems;
      },

      buyFreeze: () => {
        const s = get();
        if (s.gems < GEMS.freeze || s.freezes >= MAX_FREEZES) return false;
        set({ gems: s.gems - GEMS.freeze, freezes: s.freezes + 1, freezeBought: [...(s.freezeBought ?? []), dayOf(s)].slice(-MAX_FREEZES) });
        return true;
      },
      shiftUnlock: () => set((s) => ({ unlocks: s.unlocks.slice(1) })),
      seeStory: (which) => set((s) => ({ journey: { ...s.journey, ...(which === 'prologue' ? { prologueSeen: true } : { introSeen: true }) } })),

      nextChapter: () => {
        const before = roll(data(get()));
        const n = before.journey.chapter;
        let s: Data = { ...before, journey: { ...before.journey, cleared: uniq([...before.journey.cleared, n]), chapter: n + 1, stops: [], introSeen: false } };
        s = { ...s, journey: { ...s.journey, stops: buildChapter(s, n + 1) } };
        set(celebrate(before, s));
      },

      bump: (counter, by = 1) => {
        const before = roll(data(get()));
        const s = count(before, counter, by);
        // Things that happen outside a lesson or a round still deserve their badge straight away.
        set(counter === 'pokes' || counter === 'finder' ? celebrate(before, s) : s);
      },

      tick: () => {
        const s = data(get());
        let next = roll(s);
        const stops = refreshStops(next);
        if (stops !== next.journey.stops) next = { ...next, journey: { ...next.journey, stops } };
        if (next !== s) set(next);
      },

      finishOnboarding: () =>
        set((s) => {
          const d = data(s);
          return { onboarded: true, journey: d.journey.stops.length ? d.journey : { ...d.journey, stops: buildChapter(d, d.journey.chapter) } };
        }),

      exportData: () => {
        const d = data(get());
        return JSON.stringify({ root: 4, ...Object.fromEntries(DATA_KEYS.filter((k) => k !== 'mod' && k !== 'unlocks').map((k) => [k, d[k]])) });
      },
      importData: (json) => {
        let raw: unknown;
        try {
          raw = JSON.parse(json);
        } catch {
          return false;
        }
        const s = sanitizeImport(raw);
        if (!s) return false;
        set(s);
        return true;
      },
      resetAll: () => set({ ...initial }),
    }),
    {
      name: 'root-v4',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function')) as unknown as State,
      // Nested settings keep any defaults added after the data was saved.
      merge: (saved, current) => {
        const p = (saved ?? {}) as Partial<Data>;
        return {
          ...current,
          ...p,
          profile: { ...current.profile, ...p.profile },
          display: { ...current.display, ...p.display },
          checkIn: { ...current.checkIn, ...p.checkIn },
          mod: { ...current.mod, ...p.mod },
          skill: { ...current.skill, ...p.skill },
          levelSeen: { ...current.levelSeen, ...p.levelSeen },
          journey: { ...current.journey, ...p.journey },
          daily: { ...current.daily, ...p.daily },
          quests: { ...current.quests, ...p.quests },
        };
      },
    },
  ),
);

// ── Selectors (plain functions over state) ────────────────────────────────
export const today = (s: Pick<Data, 'mod'>) => dayOf(s);
export { levelOf } from './engine';

export const lexOf = (s: Pick<Data, 'words'>, id: string): Lexeme | null => lexemeFor(id, s.words[id]);

export const activeWords = (s: Pick<Data, 'words'>) => Object.values(s.words).filter((w) => w.status !== 'removed');
/** Words that have had their lesson: still growing, or rooted. */
export const learnedWords = (s: Pick<Data, 'words'>) => Object.values(s.words).filter((w) => w.status === 'learning' || w.status === 'known');
/** Words waiting for a lesson. The learner's own come before the ones the placement queued. */
export const queuedWords = (s: Pick<Data, 'words'>) =>
  Object.values(s.words)
    .filter((w) => w.status === 'queued')
    .sort((a, b) => Number(a.origin === 'assess') - Number(b.origin === 'assess') || a.addedAt - b.addedAt);

const isDue = (m: Mem | undefined, t: string) => !!m?.due && m.due <= t;
const firstDue = (w: UserWord, strand?: Strand) => (strand ? (w.mem[strand].due ?? '9') : STRAND_LIST.map((k) => w.mem[k].due ?? '9').sort()[0]);

/** Learned words due for practice today, oldest first. With a strand: due in that strand; without: due in any. */
export function dueFor(s: Pick<Data, 'words' | 'mod'>, strand?: Strand): UserWord[] {
  const t = today(s);
  return learnedWords(s)
    .filter((w) => (strand ? isDue(w.mem[strand], t) : STRAND_LIST.some((k) => isDue(w.mem[k], t))))
    .sort((a, b) => (firstDue(a, strand) < firstDue(b, strand) ? -1 : firstDue(a, strand) > firstDue(b, strand) ? 1 : 0));
}
export const dueCount = (s: Pick<Data, 'words' | 'mod'>) => dueFor(s).length;

/** 0..1: how firmly a word is held across the three strands. */
export const strength = (w: Pick<UserWord, 'mem'>) => STRAND_LIST.reduce((sum, k) => sum + Math.min(4, w.mem[k]?.box ?? 0), 0) / 12;

/** 0 seed (waiting) · 1 sprout · 2 leafing · 3 rooted. */
export function growth(w: Pick<UserWord, 'status' | 'mem'>): 0 | 1 | 2 | 3 {
  if (w.status === 'known') return 3;
  if (w.status !== 'learning') return 0;
  return STRAND_LIST.reduce((sum, k) => sum + (w.mem[k]?.box ?? 0), 0) / 3 >= 2 ? 2 : 1;
}

/** Practice days in a row. A frozen day keeps the run going without adding to it. */
export const streak = (s: Pick<Data, 'practiceDays' | 'frozenDays' | 'mod'>) => streakOf(s);

/** A counter for today, 0 if nothing has happened yet today. */
export const dailyCount = (s: Pick<Data, 'daily' | 'mod'>, key: string) => (s.daily.day === today(s) ? (s.daily.counters[key] ?? 0) : 0);

export function goalProgress(s: Pick<Data, 'daily' | 'goal' | 'mod'>): { done: number; goal: number; met: boolean } {
  const done = s.daily.day === today(s) ? s.daily.stops : 0;
  return { done, goal: s.goal, met: done >= s.goal };
}

/** Index of the first stop not yet done, -1 when the chapter is finished (or not built). */
export const currentStop = (s: Pick<Data, 'journey'>) => s.journey.stops.findIndex((st) => !st.done);

/** Index of the stop still waiting to teach this word, -1 if there is none. */
export const stopForWord = (s: Pick<Data, 'journey'>, id: string) => s.journey.stops.findIndex((st) => st.kind === 'learn' && !st.done && st.wordId === id);
