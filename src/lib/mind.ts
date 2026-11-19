// The mind: everything Root has worked out about one learner, and the arithmetic that works it out.
//
// It is a small model that is trained on the phone, one answer at a time, and never leaves it.
// Three things live here:
//
//   1. PREDICT. For any word, strand and game: how likely is this learner to get it right, right
//      now, and how long will it take them? That is a logistic model. The learner's level and the
//      word's difficulty go in as they are; everything else is a weight the model learns for this
//      one person: which games they find easy, which spelling patterns trip them, which topics
//      they already know a lot about, what time of day they are sharp, how they tire through a
//      round, how well taught words hold between visits.
//
//   2. OBSERVE. Every signal the app can see updates the model: answers (with their speed, cues
//      and the letters that were off), lesson steps, spoken attempts, reading, taps, replays,
//      skips, sessions. Nothing here reads anything outside the app.
//
//   3. STEER. Numbers the rest of the app reads to adapt: how far above their level new words
//      should aim (`stretch`), how long the gaps between reviews should be (`spacing`), how the
//      learner is doing right now (`mood`), which kinds of slip they make, how long a round suits.
//
// Pure functions over plain data: no React, no storage, no clock (the caller passes the hour).

import type { Strand } from '@/data/profile';
import type { PatternId, Topic } from '@/data/words';
import type { GameId } from './engine';

// ── What can be observed ──────────────────────────────────────────────────
export type Said = 'exact' | 'close' | 'miss';
export type UiKind = 'replay' | 'slow' | 'cue' | 'skip' | 'peek' | 'leave' | 'lookup' | 'wordpage' | 'hook' | 'own' | 'arcade' | 'known';

/** Everything the model needs to know about one question in order to guess its answer. */
export type Ask = {
  strand: Strand;
  game?: GameId;
  /** The learner's level in this strand (1 … 6.9). */
  skill: number;
  /** The word's difficulty for this strand (1 … 6). */
  hard: number;
  /** Has Root taught this word? If so: its memory box (0 … 4) and how overdue it is (0 = not, 1 = a whole interval late). */
  taught?: boolean;
  box?: number;
  overdue?: number;
  pattern?: PatternId;
  topics?: Topic[];
  /** Letters in the word (spelling only). */
  letters?: number;
  /** Hour of the day, 0 … 23. */
  hour?: number;
  /** How many questions into the round this one is, from 0. */
  pos?: number;
};

export type Signal =
  | { k: 'answer'; ask: Ask; id: string; r: 0 | 0.5 | 1; ms?: number; cue?: number; /** What was typed, and what it should have been. */ attempt?: string; target?: string; /** Was this word due for review today (a real test of the gap)? */ review?: boolean; /** A quick check before a lesson. */ probe?: boolean }
  | { k: 'step'; step: string; ms: number; hints: number; retries: number; skipped: boolean }
  | { k: 'lesson'; ms: number; hints: number; retries: number; skipped: number; topics?: Topic[] }
  | { k: 'say'; id: string; res: Said }
  | { k: 'read'; words: number; ms: number }
  | { k: 'session'; total: number; right: number; ms: number; hour: number; left?: boolean }
  | { k: 'ui'; what: UiKind; n?: number; topics?: Topic[]; game?: GameId }
  | { k: 'taps'; n: number; by?: Record<string, number> };

// ── What is kept ──────────────────────────────────────────────────────────
type W = { m: number; n: number };
type Rate = { n: number; ok: number };
export type SlipKind = 'swap' | 'omit' | 'extra' | 'double' | 'vowel' | 'mirror' | 'sound' | 'other';

export type Mind = {
  v: 1;
  /** Answers the model has learned from. */
  n: number;
  /** Learned weights. Keys: `a:<strand>` level correction · `g:<game>` · `p:<pattern>` · `t:<topic>` · `h:<0-3>` time of day · `late` tiring · `m0` `mb` `mo` memory · `len` word length. */
  w: Record<string, W>;
  /** Answer speed per game: mean and variance of ln(ms) for answers that got there. */
  pace: Record<string, { m: number; v: number; n: number }>;
  /** Levels above the learner's own that new words aim at. Rises when things come easily, falls when they do not. */
  stretch: number;
  /** -1 … 1: how the last dozen answers have gone. Right first time counts for, anything else against, so 0 is "half of them clean". */
  mood: number;
  /** Multiplier on the gaps between reviews. Above 1 when words survive the gaps comfortably. */
  spacing: number;
  /** Reviews on the day they were due: how often the word had survived the gap. */
  rev: Rate;
  /** Spelling slips by kind, the letters most often confused ("b>d"), and where in the word slips fall (start, middle, end). */
  slips: Record<SlipKind, number>;
  phonetic: Rate;
  mix: Record<string, number>;
  where: [number, number, number];
  /** Saying words aloud. `sayBad` holds the words that came out wrong and have not yet come out right. */
  speech: Record<Said, number>;
  sayBad: Record<string, number>;
  /** Reading pace in ms per word, from story pages. */
  read: { ms: number; n: number };
  /** Things asked for or done, by kind: replays, cues, skips, look-ups … */
  ui: Record<string, number>;
  taps: number;
  tapBy: Record<string, number>;
  /** Accuracy by time of day (night, morning, afternoon, evening), and early and late in a round. */
  hours: [Rate, Rate, Rate, Rate];
  early: Rate;
  late: Rate;
  /** Rounds: how many, how long they run, how many questions, how many were left half-way. */
  sess: { n: number; ms: number; len: number; left: number };
  /** Lesson steps: time and trouble on each. */
  steps: Record<string, { n: number; ms: number; hints: number; retries: number; skipped: number }>;
  /** Topics the learner leans towards, from what they choose to do (not what they said at setup). */
  like: Record<string, number>;
  /** Which games they pick when the choice is theirs. */
  chose: Record<string, number>;
  /** How good the guesses are: mean squared error, how often the call was right, and guessed-against-actual in five bands. */
  cal: { n: number; brier: number; hit: number; bins: { n: number; p: number; r: number }[] };
};

/** Where each weight starts before anything is known about the learner. Recognition is easier than recall; a taught word is far likelier than a cold one. */
const INIT: Record<string, number> = {
  m0: 1.4, mb: 0.45, mo: -0.5, len: -0.15,
  'g:meaning': 0.7, 'g:web': 0.4, 'g:pair': 0.5, 'g:gap': 0.6, 'g:clue': -0.1,
  'g:proof': 0.7, 'g:missing': 0.6, 'g:scramble': 0.5, 'g:cover': 0.5, 'g:dictate': -0.3,
};
/** How fast each family of weight learns. */
const RATE: Record<string, number> = { a: 0.1, g: 0.08, p: 0.1, t: 0.05, h: 0.04, late: 0.04, m0: 0.06, mb: 0.03, mo: 0.04, len: 0.03 };
const LIMIT: Record<string, number> = { a: 1.5 };

export const STRETCH_MIN = -1.5;
export const STRETCH_MAX = 1.6;
export const SPACING_MIN = 0.6;
export const SPACING_MAX = 1.8;
/** The share of answers that should come out right: hard enough to be worth doing, easy enough to keep going. */
export const SWEET = 0.82;

const rate = (): Rate => ({ n: 0, ok: 0 });

export function freshMind(): Mind {
  return {
    v: 1, n: 0, w: {}, pace: {}, stretch: 0.4, mood: 0.5, spacing: 1, rev: rate(),
    slips: { swap: 0, omit: 0, extra: 0, double: 0, vowel: 0, mirror: 0, sound: 0, other: 0 }, phonetic: rate(), mix: {}, where: [0, 0, 0],
    speech: { exact: 0, close: 0, miss: 0 }, sayBad: {}, read: { ms: 0, n: 0 }, ui: {}, taps: 0, tapBy: {},
    hours: [rate(), rate(), rate(), rate()], early: rate(), late: rate(), sess: { n: 0, ms: 0, len: 0, left: 0 }, steps: {}, like: {}, chose: {},
    cal: { n: 0, brier: 0.25, hit: 0.5, bins: Array.from({ length: 5 }, () => ({ n: 0, p: 0, r: 0 })) },
  };
}

// ── Small tools ───────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const fin = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const family = (key: string) => (key.includes(':') ? key.slice(0, key.indexOf(':')) : key);
export const hourBucket = (hour: number) => (hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3);
export const HOUR_NAMES = ['At night', 'In the morning', 'In the afternoon', 'In the evening'] as const;
/** The hands-on games are supported practice: the word is in front of the learner, so finishing one says nothing about recall. */
const SUPPORTED = new Set<string>(['tap', 'trace', 'marble', 'sand', 'echo']);

/** The weight for a key: learned if there is one, else where it starts. */
export const weight = (mind: Pick<Mind, 'w'>, key: string) => mind.w[key]?.m ?? INIT[key] ?? 0;
const seenOf = (mind: Pick<Mind, 'w'>, key: string) => mind.w[key]?.n ?? 0;

/** Keeps a record of counts to its `cap` biggest entries. */
function capped(rec: Record<string, number>, cap: number): Record<string, number> {
  const keys = Object.keys(rec);
  if (keys.length <= cap) return rec;
  return Object.fromEntries(keys.sort((a, b) => rec[b] - rec[a]).slice(0, cap).map((k) => [k, rec[k]]));
}
const add = (rec: Record<string, number>, key: string, by = 1, cap = 60) => capped({ ...rec, [key]: (rec[key] ?? 0) + by }, cap);

// ── Predict ───────────────────────────────────────────────────────────────
/** The features of a question, as [weight key, value]. */
function features(a: Ask): [string, number][] {
  const f: [string, number][] = [[`a:${a.strand}`, 1]];
  if (a.game && !SUPPORTED.has(a.game)) f.push([`g:${a.game}`, 1]);
  if (a.taught) {
    f.push(['m0', 1], ['mb', clamp(a.box ?? 0, 0, 4)]);
    if (a.overdue) f.push(['mo', clamp(a.overdue, 0, 3)]);
  }
  if (a.strand === 'spell') {
    if (a.pattern) f.push([`p:${a.pattern}`, 1]);
    if (a.letters) f.push(['len', clamp((a.letters - 7) / 4, -1, 2)]);
  }
  const topics = a.topics ?? [];
  for (const t of topics) f.push([`t:${t}`, 1 / topics.length]);
  if (a.hour !== undefined) f.push([`h:${hourBucket(a.hour)}`, 1]);
  if (a.pos) f.push(['late', clamp(a.pos / 10, 0, 2)]);
  return f;
}

const logit = (mind: Pick<Mind, 'w'>, a: Ask) => features(a).reduce((z, [k, x]) => z + weight(mind, k) * x, a.skill - a.hard);

/** The chance this learner gets this question right (as a score: a right-with-help counts half). */
export const predict = (mind: Pick<Mind, 'w'>, a: Ask): number => clamp(sigmoid(logit(mind, a)), 0.02, 0.98);

/** How long an answer in this game usually takes this learner, in ms. */
export function expectMs(mind: Pick<Mind, 'pace'>, game: GameId | undefined): number {
  const p = game ? mind.pace[game] : undefined;
  return p && p.n >= 3 ? Math.exp(p.m) : 9000;
}

/** How quick an answer was against the learner's own pace in that game. Positive is slow. null until there is a pace to compare with. */
export function speedZ(mind: Pick<Mind, 'pace'>, game: GameId | undefined, ms: number | undefined): number | null {
  const p = game ? mind.pace[game] : undefined;
  if (!p || p.n < 5 || !ms || ms <= 0) return null;
  return (Math.log(ms) - p.m) / Math.sqrt(Math.max(0.04, p.v));
}

/**
 * How much longer or shorter than usual the next gap should be after this answer. A word that came at once
 * can wait longer; one that had to be dug for comes back sooner, even though it was right.
 */
export function gapFor(mind: Pick<Mind, 'pace' | 'spacing'>, game: GameId | undefined, r: number, ms: number | undefined): number {
  const z = r === 1 ? speedZ(mind, game, ms) : null;
  const quick = z === null ? 1 : z < -0.6 ? 1.15 : z > 1.3 ? 0.8 : 1;
  return clamp(mind.spacing * quick, 0.5, 2.2);
}

/** The learner's level in a strand as the model sees it: the earned level plus the model's own correction. */
export const sense = (mind: Pick<Mind, 'w'>, strand: Strand, skill: number) => skill + weight(mind, `a:${strand}`);

// ── The twin: the learner, replayed ───────────────────────────────────────
/**
 * Answers a question the way the model expects this learner to: right, right with help, or missed, and how long it took.
 * `rnd` is a function returning 0 … 1. Used to rehearse a round before it is offered, and to test the model.
 */
export function twinAnswer(mind: Pick<Mind, 'w' | 'pace'>, a: Ask, rnd: () => number): { r: 0 | 0.5 | 1; ms: number } {
  const p = predict(mind, a);
  const clean = Math.pow(p, 1.3);
  const miss = Math.pow(1 - p, 1.3);
  const u = rnd();
  const r: 0 | 0.5 | 1 = u < clean ? 1 : u > 1 - miss ? 0 : 0.5;
  const pace = a.game ? mind.pace[a.game] : undefined;
  const mu = pace && pace.n >= 3 ? pace.m : Math.log(9000);
  const sd = Math.sqrt(pace && pace.n >= 3 ? pace.v : 0.2);
  // Two uniforms to one normal (Box–Muller); misses and helped answers run long.
  const g = Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd());
  return { r, ms: Math.round(Math.exp(mu + sd * g) * (r === 1 ? 1 : 1.35)) };
}

/** The share of a list of questions the learner is expected to get right. */
export const rehearse = (mind: Pick<Mind, 'w'>, asks: Ask[]): number => (asks.length ? asks.reduce((sum, a) => sum + predict(mind, a), 0) / asks.length : SWEET);

// ── Spelling slips ────────────────────────────────────────────────────────
const VOWELS = new Set('aeiouy'.split(''));
const MIRROR = new Set(['b>d', 'd>b', 'p>q', 'q>p', 'p>b', 'b>p', 'd>q', 'q>d', 'm>w', 'w>m', 'n>u', 'u>n', 'm>n', 'n>m']);
const SOUND = new Set(['c>k', 'k>c', 'c>s', 's>c', 's>z', 'z>s', 'g>j', 'j>g', 'f>v', 'v>f', 'd>t', 't>d', 'f>p', 'k>q', 'q>k', 'x>s', 'x>k']);

export type Slip = { kind: SlipKind; /** "typed>wanted", for a letter put in place of another. */ pair?: string; /** 0 start · 1 middle · 2 end. */ at: 0 | 1 | 2 };

/**
 * What went wrong between what was typed and the word, letter by letter: two neighbours swapped, a letter left
 * out or put in, a double halved or a single doubled, one vowel for another, a mirror letter (b for d), a
 * letter that makes the same sound, or something else. Empty when the spelling is right.
 */
export function slipsIn(attempt: string, target: string): Slip[] {
  const a = attempt.trim().toLowerCase().replace(/[^a-z]/g, '');
  const b = target.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!a || !b || a === b) return [];
  const m = a.length, n = b.length;
  const at = (j: number): 0 | 1 | 2 => (n < 3 ? 1 : j < n / 3 ? 0 : j >= (2 * n) / 3 ? 2 : 1);
  // Edit distance with neighbouring swaps (Damerau), then walk it back to name each edit.
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  const out: Slip[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      i--; j--;
    } else if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && d[i][j] === d[i - 2][j - 2] + 1) {
      out.push({ kind: 'swap', at: at(j - 2) });
      i -= 2; j -= 2;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      const pair = `${a[i - 1]}>${b[j - 1]}`;
      const kind: SlipKind = VOWELS.has(a[i - 1]) && VOWELS.has(b[j - 1]) ? 'vowel' : MIRROR.has(pair) ? 'mirror' : SOUND.has(pair) ? 'sound' : 'other';
      out.push({ kind, pair, at: at(j - 1) });
      i--; j--;
    } else if (j > 0 && (i === 0 || d[i][j] === d[i][j - 1] + 1)) {
      // A letter of the word is missing. If its twin is next to it, a double was written as a single.
      const twin = b[j - 1] === b[j] || b[j - 1] === b[j - 2];
      out.push({ kind: twin ? 'double' : 'omit', at: at(j - 1) });
      j--;
    } else {
      // An extra letter. If it repeats its neighbour, a single was doubled.
      const twin = a[i - 1] === a[i] || a[i - 1] === a[i - 2];
      out.push({ kind: twin ? 'double' : 'extra', at: at(Math.min(n - 1, Math.max(0, j - 1))) });
      i--;
    }
  }
  return out.slice(0, 6);
}

/** Collapses a spelling towards its sound. A cut-down copy of the one in lexicon, kept here so this file stands alone. */
const soundOf = (s: string) =>
  s.toLowerCase().replace(/[^a-z]/g, '').replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/z/g, 's').replace(/gh/g, '').replace(/[aeiouy]+/g, (v, off) => (off === 0 ? 'a' : '')).replace(/(.)\1+/g, '$1');

// ── Observe ───────────────────────────────────────────────────────────────
function learn(mind: Mind, a: Ask, y: number, p: number): Record<string, W> {
  const w = { ...mind.w };
  for (const [key, x] of features(a)) {
    const fam = family(key);
    const cur = w[key] ?? { m: INIT[key] ?? 0, n: 0 };
    const lr = (RATE[fam] ?? 0.05) * Math.max(0.4, 1 / Math.sqrt(1 + cur.n / 25));
    // On a taught word the answer is mostly about memory, so it says less about the learner's level. The first
    // visits after the lesson say the most: that is where a word that was out of reach shows itself.
    const scale = fam === 'a' && a.taught ? ((a.box ?? 0) <= 1 ? 0.7 : 0.35) : 1;
    const lim = LIMIT[fam] ?? 2.5;
    w[key] = { m: clamp(cur.m + lr * scale * (y - p) * x, -lim, lim), n: cur.n + 1 };
  }
  return w;
}

function onAnswer(mind: Mind, s: Extract<Signal, { k: 'answer' }>): Mind {
  const { ask: a, r } = s;
  const game = a.game;
  let next: Mind = mind;

  // Supported practice teaches the hand, not the model.
  if (!game || !SUPPORTED.has(game)) {
    const p = predict(mind, a);
    const z = r > 0 ? speedZ(mind, game, s.ms) : null;
    // Right, but it had to be dug for: weaker evidence than a word that came at once.
    const y = r === 1 && z !== null && z > 1.5 ? 0.85 : r;

    // How good was the guess? Kept before learning from it, so the score is honest.
    const kk = Math.max(0.05, 1 / (mind.cal.n + 1));
    const called = (p >= 0.5) === (r > 0) ? 1 : 0;
    const bi = Math.min(4, Math.floor(p * 5));
    const cal = {
      n: mind.cal.n + 1,
      brier: mind.cal.brier + kk * ((p - r) * (p - r) - mind.cal.brier),
      hit: mind.cal.hit + kk * (called - mind.cal.hit),
      bins: mind.cal.bins.map((b, i) => (i === bi ? { n: b.n + 1, p: b.p + p, r: b.r + r } : b)),
    };

    // Flow: aim for SWEET. Quick right answers push harder; a miss pulls back more than a hit pushes.
    const push = 0.035 * (y - SWEET) * (r === 1 && z !== null && z < -0.6 ? 1.5 : 1) + (s.probe && r === 1 ? 0.08 : 0);
    const mood = clamp(mind.mood * 0.9 + 0.1 * (r === 1 ? 1 : r === 0.5 ? -0.5 : -1), -1, 1);

    // Spacing: only a review on its due day tests the gap. SWEET of them should survive it.
    let { spacing, rev } = mind;
    if (s.review) {
      rev = { n: rev.n + 1, ok: rev.ok + (r === 1 ? 1 : r === 0.5 ? 0.5 : 0) };
      // Small steps: a few dozen reviews move it, one bad evening does not.
      spacing = clamp(spacing + 0.018 * (y - 0.85), SPACING_MIN, SPACING_MAX);
    }

    const hb = a.hour === undefined ? -1 : hourBucket(a.hour);
    const hours = mind.hours.map((h, i) => (i === hb ? { n: h.n + 1, ok: h.ok + r } : h)) as Mind['hours'];
    const pos = a.pos ?? -1;
    next = {
      ...mind,
      n: mind.n + 1,
      w: learn(mind, a, y, p),
      cal,
      stretch: clamp(mind.stretch + push, STRETCH_MIN, STRETCH_MAX),
      mood,
      spacing,
      rev,
      hours,
      early: pos >= 0 && pos < 4 ? { n: mind.early.n + 1, ok: mind.early.ok + r } : mind.early,
      late: pos >= 6 ? { n: mind.late.n + 1, ok: mind.late.ok + r } : mind.late,
    };

    // Pace: only answers that got there, and only plausible times (a phone put down is not thinking time).
    if (game && r > 0 && s.ms && s.ms >= 500 && s.ms <= 120000) {
      const cur = mind.pace[game] ?? { m: Math.log(s.ms), v: 0.2, n: 0 };
      const al = Math.max(0.06, 1 / (cur.n + 1));
      const dev = Math.log(s.ms) - cur.m;
      next = { ...next, pace: { ...next.pace, [game]: { m: cur.m + al * dev, v: clamp(cur.v + al * (dev * dev - cur.v), 0.03, 1.5), n: cur.n + 1 } } };
    }
  }

  if ((s.cue ?? 0) > 0) next = { ...next, ui: add(next.ui, 'cue', s.cue) };

  // What was typed, against the word: the fingerprint of this learner's spelling.
  if (a.strand === 'spell' && s.attempt && s.target) {
    const found = slipsIn(s.attempt, s.target);
    if (found.length) {
      const slips = { ...next.slips };
      const where: Mind['where'] = [...next.where];
      let mix = next.mix;
      for (const f of found) {
        slips[f.kind] += 1;
        where[f.at] += 1;
        if (f.pair) mix = add(mix, f.pair, 1, 40);
      }
      const sounded = soundOf(s.attempt) === soundOf(s.target) ? 1 : 0;
      next = { ...next, slips, where, mix, phonetic: { n: next.phonetic.n + 1, ok: next.phonetic.ok + sounded } };
    }
  }
  return next;
}

/** Folds one observation into the model. Returns a new model; the one passed in is untouched. */
export function observe(mind: Mind, s: Signal): Mind {
  switch (s.k) {
    case 'answer':
      return onAnswer(mind, s);
    case 'step': {
      const cur = mind.steps[s.step] ?? { n: 0, ms: 0, hints: 0, retries: 0, skipped: 0 };
      const ms = s.ms > 0 && s.ms < 600000 ? (cur.n ? cur.ms + Math.max(0.1, 1 / (cur.n + 1)) * (s.ms - cur.ms) : s.ms) : cur.ms;
      return { ...mind, steps: { ...mind.steps, [s.step]: { n: cur.n + 1, ms, hints: cur.hints + s.hints, retries: cur.retries + s.retries, skipped: cur.skipped + (s.skipped ? 1 : 0) } } };
    }
    case 'lesson': {
      // A lesson that went straight through says the words were within reach; one full of help says they were a stretch too far.
      const trouble = s.hints + s.retries + s.skipped * 2;
      const push = trouble === 0 ? 0.1 : trouble === 1 ? 0.03 : trouble === 2 ? -0.04 : trouble <= 4 ? -0.1 : -0.18;
      let like = mind.like;
      for (const t of s.topics ?? []) like = add(like, t, trouble <= 2 ? 0.25 : 0.1, 20);
      return { ...mind, stretch: clamp(mind.stretch + push, STRETCH_MIN, STRETCH_MAX), like };
    }
    case 'say': {
      const speech = { ...mind.speech, [s.res]: mind.speech[s.res] + 1 };
      const sayBad = { ...mind.sayBad };
      if (s.res === 'exact') delete sayBad[s.id];
      else sayBad[s.id] = (sayBad[s.id] ?? 0) + (s.res === 'miss' ? 1 : 0.5);
      return { ...mind, speech, sayBad: capped(sayBad, 40) };
    }
    case 'read': {
      const per = s.words > 3 ? s.ms / s.words : 0;
      // A page tapped straight through was not read; a page left open was not being read either.
      if (per < 90 || per > 2500) return mind;
      const al = Math.max(0.12, 1 / (mind.read.n + 1));
      return { ...mind, read: { ms: mind.read.n ? mind.read.ms + al * (per - mind.read.ms) : per, n: mind.read.n + 1 } };
    }
    case 'session': {
      const c = mind.sess;
      const al = Math.max(0.15, 1 / (c.n + 1));
      const left = s.left ? 1 : 0;
      return {
        ...mind,
        sess: { n: c.n + 1, ms: c.n ? c.ms + al * (s.ms - c.ms) : s.ms, len: c.n ? c.len + al * (s.total - c.len) : s.total, left: c.left + left },
        // Walking out of a round is the clearest sign it was too much.
        mood: left ? clamp(mind.mood - 0.25, -1, 1) : mind.mood,
        stretch: left ? clamp(mind.stretch - 0.08, STRETCH_MIN, STRETCH_MAX) : mind.stretch,
      };
    }
    case 'ui': {
      let next: Mind = { ...mind, ui: add(mind.ui, s.what, s.n ?? 1) };
      // Things done by choice say what the learner cares about.
      const lean = s.what === 'lookup' ? 1 : s.what === 'own' ? 0.6 : s.what === 'wordpage' || s.what === 'hook' ? 0.3 : 0;
      if (lean) for (const t of s.topics ?? []) next = { ...next, like: add(next.like, t, lean, 20) };
      if (s.what === 'arcade' && s.game) next = { ...next, chose: add(next.chose, s.game, 1, 20) };
      if (s.what === 'known') next = { ...next, stretch: clamp(next.stretch + 0.06, STRETCH_MIN, STRETCH_MAX) };
      if (s.what === 'skip') next = { ...next, mood: clamp(next.mood - 0.05, -1, 1) };
      return next;
    }
    case 'taps': {
      let tapBy = mind.tapBy;
      for (const [k, n] of Object.entries(s.by ?? {})) tapBy = add(tapBy, k.slice(0, 40), n, 60);
      return { ...mind, taps: mind.taps + s.n, tapBy };
    }
  }
}

export const observeAll = (mind: Mind, signals: Signal[]): Mind => signals.reduce(observe, mind);

// ── Steer ─────────────────────────────────────────────────────────────────
const pct = (r: Rate) => (r.n ? r.ok / r.n : 0);

/** Questions to add to or take off a round: shorter when accuracy falls away late or rounds get abandoned, longer when it holds. */
export function spanShift(mind: Pick<Mind, 'early' | 'late' | 'sess' | 'mood'>): number {
  if (mind.sess.n >= 3 && mind.sess.left / mind.sess.n > 0.34) return -2;
  if (mind.early.n < 12 || mind.late.n < 12) return 0;
  const drop = pct(mind.early) - pct(mind.late);
  if (drop > 0.18) return -2;
  if (drop > 0.1) return -1;
  if (drop < 0.03 && mind.mood > 0.6) return 2;
  return 0;
}

/** The chance a round's questions should aim at: gentler when things are going badly, harder when they are going well. */
export const aim = (mind: Pick<Mind, 'mood'>) => (mind.mood < 0.15 ? 0.9 : mind.mood > 0.7 ? 0.72 : SWEET);

/** Is the learner having a hard time right now? New words then come one comfortable, one stretching. */
export const struggling = (mind: Pick<Mind, 'mood'>) => mind.mood < 0.1;

/** The time of day the learner answers best, once there is enough to tell (two times of day, twenty answers each). */
export function bestHour(mind: Pick<Mind, 'hours'>): { bucket: number; pct: number } | null {
  const ok = mind.hours.map((h, i) => ({ bucket: i, pct: pct(h), n: h.n })).filter((h) => h.n >= 20);
  if (ok.length < 2) return null;
  const best = ok.reduce((a, b) => (b.pct > a.pct ? b : a));
  const worst = ok.reduce((a, b) => (b.pct < a.pct ? b : a));
  return best.pct - worst.pct >= 0.08 ? { bucket: best.bucket, pct: best.pct } : null;
}

/** The slip the learner makes most, once there are enough to call it a habit. */
export function mainSlip(mind: Pick<Mind, 'slips'>): { kind: SlipKind; share: number; n: number } | null {
  const total = Object.values(mind.slips).reduce((a, b) => a + b, 0);
  if (total < 6) return null;
  const [kind, n] = (Object.entries(mind.slips) as [SlipKind, number][]).filter(([k]) => k !== 'other').sort((a, b) => b[1] - a[1])[0];
  return n / total >= 0.25 ? { kind, share: n / total, n } : null;
}

/** The games that work on each kind of slip: sequencing for swaps, the tricky piece for dropped and doubled letters, the look of the word for sound-alike spellings. */
const SLIP_GAMES: Record<SlipKind, GameId[]> = {
  swap: ['scramble', 'tap'], omit: ['missing', 'cover'], extra: ['cover', 'proof'], double: ['missing', 'proof'],
  vowel: ['missing', 'proof'], mirror: ['trace', 'cover'], sound: ['proof', 'cover'], other: [],
};
/** Games this learner should meet a little more often, from how they slip. */
export function slipGames(mind: Pick<Mind, 'slips' | 'phonetic'>): GameId[] {
  const main = mainSlip(mind);
  const out = main ? [...SLIP_GAMES[main.kind]] : [];
  // Spells it the way it sounds: needs the look of the word, not its sound.
  if (mind.phonetic.n >= 6 && pct(mind.phonetic) > 0.5) out.push('proof', 'cover');
  return Array.from(new Set(out));
}

/**
 * When the model has been sure for a while that a strand's level is off by half a level or more, part of the
 * correction is handed over to the level itself. Returns the step to add to the level (and take off the
 * correction), or 0. This is how a placement that got someone wrong is put right for good.
 */
export function levelDrift(mind: Pick<Mind, 'w'>, strand: Strand): number {
  const w = mind.w[`a:${strand}`];
  if (!w || w.n < 30 || Math.abs(w.m) < 0.5) return 0;
  return w.m > 0 ? 0.25 : -0.25;
}
/** The model after `step` of a strand's correction has been moved into the level. */
export function settle(mind: Mind, strand: Strand, step: number): Mind {
  const key = `a:${strand}`;
  const w = mind.w[key];
  return w ? { ...mind, w: { ...mind.w, [key]: { ...w, m: w.m - step } } } : mind;
}

/** How well the guesses have been landing: the share of answers the model called correctly. null before there are enough. */
export const insight = (mind: Pick<Mind, 'cal'>): number | null => (mind.cal.n >= 20 ? mind.cal.hit : null);

// ── Reading a saved model ─────────────────────────────────────────────────
/** Rebuilds a model from anything: a save from an older build, a backup, or nothing at all. Every number is checked. */
export function cleanMind(raw: unknown): Mind {
  const base = freshMind();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const counts = (v: unknown, cap: number): Record<string, number> => capped(Object.fromEntries(Object.entries(obj(v)).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] >= 0)), cap);
  const rateOf = (v: unknown): Rate => ({ n: Math.max(0, fin(obj(v).n, 0)), ok: Math.max(0, fin(obj(v).ok, 0)) });

  const w: Mind['w'] = {};
  for (const [k, v] of Object.entries(obj(r.w)).slice(0, 120)) w[k] = { m: clamp(fin(obj(v).m, 0), -2.5, 2.5), n: Math.max(0, fin(obj(v).n, 0)) };
  const pace: Mind['pace'] = {};
  for (const [k, v] of Object.entries(obj(r.pace)).slice(0, 30)) pace[k] = { m: clamp(fin(obj(v).m, 9), 5, 13), v: clamp(fin(obj(v).v, 0.2), 0.03, 1.5), n: Math.max(0, fin(obj(v).n, 0)) };
  const steps: Mind['steps'] = {};
  for (const [k, v] of Object.entries(obj(r.steps)).slice(0, 20)) steps[k] = { n: Math.max(0, fin(obj(v).n, 0)), ms: Math.max(0, fin(obj(v).ms, 0)), hints: Math.max(0, fin(obj(v).hints, 0)), retries: Math.max(0, fin(obj(v).retries, 0)), skipped: Math.max(0, fin(obj(v).skipped, 0)) };
  const slips = { ...base.slips };
  for (const k of Object.keys(slips) as SlipKind[]) slips[k] = Math.max(0, fin(obj(r.slips)[k], 0));
  const speech = { exact: Math.max(0, fin(obj(r.speech).exact, 0)), close: Math.max(0, fin(obj(r.speech).close, 0)), miss: Math.max(0, fin(obj(r.speech).miss, 0)) };
  const where = Array.isArray(r.where) ? r.where : [];
  const hours = Array.isArray(r.hours) ? r.hours : [];
  const cal = obj(r.cal);
  const bins = Array.isArray(cal.bins) ? cal.bins : [];
  const sess = obj(r.sess);
  return {
    v: 1,
    n: Math.max(0, fin(r.n, 0)),
    w,
    pace,
    stretch: clamp(fin(r.stretch, base.stretch), STRETCH_MIN, STRETCH_MAX),
    mood: clamp(fin(r.mood, base.mood), -1, 1),
    spacing: clamp(fin(r.spacing, 1), SPACING_MIN, SPACING_MAX),
    rev: rateOf(r.rev),
    slips,
    phonetic: rateOf(r.phonetic),
    mix: counts(r.mix, 40),
    where: [Math.max(0, fin(where[0], 0)), Math.max(0, fin(where[1], 0)), Math.max(0, fin(where[2], 0))],
    speech,
    sayBad: counts(r.sayBad, 40),
    read: { ms: Math.max(0, fin(obj(r.read).ms, 0)), n: Math.max(0, fin(obj(r.read).n, 0)) },
    ui: counts(r.ui, 60),
    taps: Math.max(0, fin(r.taps, 0)),
    tapBy: counts(r.tapBy, 60),
    hours: [rateOf(hours[0]), rateOf(hours[1]), rateOf(hours[2]), rateOf(hours[3])],
    early: rateOf(r.early),
    late: rateOf(r.late),
    sess: { n: Math.max(0, fin(sess.n, 0)), ms: Math.max(0, fin(sess.ms, 0)), len: Math.max(0, fin(sess.len, 0)), left: Math.max(0, fin(sess.left, 0)) },
    steps,
    like: counts(r.like, 20),
    chose: counts(r.chose, 20),
    cal: {
      n: Math.max(0, fin(cal.n, 0)),
      brier: clamp(fin(cal.brier, 0.25), 0, 1),
      hit: clamp(fin(cal.hit, 0.5), 0, 1),
      bins: Array.from({ length: 5 }, (_, i) => ({ n: Math.max(0, fin(obj(bins[i]).n, 0)), p: Math.max(0, fin(obj(bins[i]).p, 0)), r: Math.max(0, fin(obj(bins[i]).r, 0)) })),
    },
  };
}

/** Has the model seen enough to trust what it says about a weight? */
export const knows = (mind: Pick<Mind, 'w'>, key: string, min = 4) => seenOf(mind, key) >= min;
