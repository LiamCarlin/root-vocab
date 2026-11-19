// The learner model. Pure functions over state: no React, no storage, no randomness
// that is not seeded from the state itself, so the same state always gives the same answer.

import type { DayId, Strand } from '@/data/profile';
import { BANK, BANK_BY_ID, type BankWord, type PatternId, type Topic } from '@/data/words';
import { addDays, diffDays, todayKey } from './dates';
import { lexemeFor, type Lexeme } from './lexicon';
import type { Data, Mem } from './store';

export type GameId = 'clue' | 'web' | 'pair' | 'meaning' | 'gap' | 'cover' | 'missing' | 'proof' | 'dictate' | 'scramble' | 'trace' | 'marble' | 'sky';
export type SessionKind = 'find' | 'spell' | 'mix' | 'challenge' | 'game';
export type Exercise = { key: string; game: GameId; wordId: string; strand: Strand };

/** Which strand an answer in each game counts towards. */
export const GAME_STRAND: Record<GameId, Strand> = {
  clue: 'find', gap: 'find',
  web: 'know', pair: 'know', meaning: 'know',
  cover: 'spell', missing: 'spell', proof: 'spell', dictate: 'spell', scramble: 'spell', trace: 'spell', marble: 'spell', sky: 'spell',
};
export const STRAND_LIST: Strand[] = ['know', 'find', 'spell'];

/** What a kind of day tends to talk about. Mirrors DAYS in data/profile (kept here so this file stays free of UI imports). */
const DAY_TOPICS: Record<DayId, Topic[]> = {
  study: ['mind', 'society'],
  office: ['work', 'money', 'tech'],
  hands: ['work', 'home'],
  care: ['body', 'people', 'feelings'],
  service: ['people', 'money', 'food'],
  creative: ['arts', 'mind'],
  home: ['home', 'people', 'food'],
};

// ── Small tools ───────────────────────────────────────────────────────────
export const dayOf = (s: Pick<Data, 'mod'>) => todayKey(s.mod.dayOffset);

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h;
}
/** 0..1, fixed for a given string. */
const unit = (str: string) => (hash(str) % 10007) / 10007;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── Memory: five boxes, promoted only when due and once a day ─────────────
/** Days until a word comes back, by box. */
export const INTERVALS = [0, 1, 3, 7, 21] as const;
/** Once a word has been right at the top box, it only needs a look every couple of months. */
export const KEEP_DAYS = 60;
export const emptyMem = (): Mem => ({ box: 0, due: null, seen: 0, ok: 0 });

/**
 * Right first time moves up a box, but only when the word was due and only once a day: mastery is being right
 * on separate days, with the gaps the boxes ask for. Right on a word that was not due yet changes nothing
 * (it is extra practice). A cue or second try holds the box and brings the word back tomorrow. A miss drops a box.
 * `top` remembers the highest box ever reached.
 */
export function nextMem(mem: Mem, r: 0 | 0.5 | 1, today: string): Mem {
  const tomorrow = addDays(today, 1);
  const top = mem.top ?? mem.box;
  const base = { ...mem, seen: mem.seen + 1, ok: mem.ok + (r === 1 ? 1 : 0), last: today, top };
  if (r === 1) {
    const due = !mem.due || mem.due <= today;
    if (mem.last === today || !due) return { ...base, due: mem.due && mem.due > today ? mem.due : tomorrow };
    const box = Math.min(4, mem.box + 1);
    return { ...base, box, top: Math.max(top, box), due: addDays(today, mem.box >= 4 ? KEEP_DAYS : INTERVALS[box]) };
  }
  if (r === 0.5) return { ...base, due: tomorrow };
  return { ...base, box: Math.max(0, mem.box - 1), due: tomorrow };
}

// ── Skill: one number per strand, 1.0 … 6.9 ───────────────────────────────
export const SKILL_MIN = 1;
export const SKILL_MAX = 6.9;
/** The whole level a skill number sits in, 1..6. */
export const levelOf = (theta: number) => clamp(Math.floor(theta), 1, 6);
/** 0..1 of the way to the next level. */
export const levelProgress = (theta: number) => (theta >= 6 ? clamp((theta - 6) / (SKILL_MAX - 6), 0, 1) : clamp(theta - Math.floor(theta), 0, 1));

/** Elo-style: a right answer on a hard word moves the level more than one on an easy word. */
export function bumpSkill(theta: number, level: number, r: number, k = 0.18): number {
  const expected = 1 / (1 + Math.exp(-(theta - level)));
  return clamp(theta + k * (r - expected), SKILL_MIN, SKILL_MAX);
}

/** The difficulty of a word for a strand: how common it is for know and find, how hard to spell for spell. */
export const difficulty = (lex: Pick<Lexeme, 'level' | 'spell'> | null | undefined, strand: Strand) => (!lex ? 3 : strand === 'spell' ? lex.spell : lex.level);

// ── Streak ────────────────────────────────────────────────────────────────
/**
 * Practice days in a row, counting back from today (or yesterday, so a streak survives until midnight).
 * A frozen day keeps the run alive but does not add to the count.
 */
export function streakOf(s: Pick<Data, 'practiceDays' | 'frozenDays' | 'mod'>): number {
  const t = dayOf(s);
  const did = new Set(s.practiceDays);
  const frozen = new Set(s.frozenDays);
  let cur = did.has(t) ? t : addDays(t, -1);
  let n = 0;
  while (did.has(cur) || frozen.has(cur)) {
    if (did.has(cur)) n++;
    cur = addDays(cur, -1);
  }
  return n;
}

// ── What a game needs from a word ─────────────────────────────────────────
const lettersOnly = (t: string) => /^[a-z]+$/i.test(t.replace(/[\s-]/g, ''));

export function canPlay(lex: Lexeme, game: GameId): boolean {
  switch (game) {
    case 'clue':
      return lex.clue.trim().length > 0;
    case 'gap':
      return /\{[^}]+\}/.test(lex.life);
    case 'web':
      return lex.links.length >= 3 && lex.not.length >= 2;
    case 'pair':
      return !!(lex.same || lex.opposite);
    case 'meaning':
      return lex.meaning.trim().length > 0;
    case 'missing':
      return !!lex.tricky && lex.tricky.part < lex.parts.length;
    case 'proof':
      return lex.wrong.length >= 2;
    case 'scramble':
      return lex.text.replace(/[^a-z]/gi, '').length >= 3;
    case 'trace':
    case 'marble':
    case 'sky':
      return lettersOnly(lex.text) && lex.text.replace(/[\s-]/g, '').length <= 14;
    case 'cover':
    case 'dictate':
      return lex.text.trim().length > 0;
  }
}

// ── Choosing what to teach next ───────────────────────────────────────────
const lexOfState = (s: Pick<Data, 'words'>, id: string) => lexemeFor(id, s.words[id]);

function weakPatterns(s: Pick<Data, 'patterns'>): Set<string> {
  return new Set(Object.entries(s.patterns).filter(([, p]) => p.seen >= 4 && p.ok / p.seen < 0.6).map(([k]) => k));
}

/**
 * The next `n` words to teach. The learner's own queued words come first (ones they looked up, then ones the
 * placement showed they did not have). After that, bank words nearest their level: weighted towards their goals,
 * nudged towards their interests and the spelling patterns they find hard, with a small day-seeded shuffle so
 * two learners at the same level do not get an identical list.
 */
export function pickNewWords(s: Pick<Data, 'words' | 'skill' | 'profile' | 'patterns' | 'journey' | 'counters' | 'mod'>, n: number, exclude: string[] = []): string[] {
  const out: string[] = [];
  const skip = new Set(exclude);
  for (const st of s.journey.stops) if (st.wordId) skip.add(st.wordId);

  const queued = Object.values(s.words)
    .filter((w) => w.status === 'queued' && !skip.has(w.id))
    .sort((a, b) => Number(a.origin === 'assess') - Number(b.origin === 'assess') || a.addedAt - b.addedAt);
  for (const w of queued) {
    if (out.length >= n) return out;
    out.push(w.id);
  }

  const goals = s.profile.goals;
  const wv = !goals.length || goals.includes('know') || goals.includes('find') ? 1 : 0.5;
  const ws = !goals.length || goals.includes('spell') ? 1 : 0.5;
  const tv = (s.skill.know + s.skill.find) / 2 + 0.4;
  const ts = s.skill.spell + 0.4;
  const interests = new Set<Topic>(s.profile.interests);
  const dayTopics = new Set<Topic>(s.profile.days.flatMap((d) => DAY_TOPICS[d] ?? []));
  const weak = weakPatterns(s);
  const seed = `${dayOf(s)}:${s.counters.lessons ?? 0}`;

  const pool = BANK.filter((b) => !s.words[b.id] && !skip.has(b.id)).map((b) => {
    let score = (wv * Math.abs(b.level - tv) + ws * Math.abs(b.spell - ts)) / (wv + ws);
    if (b.topics.some((t) => interests.has(t))) score -= 0.35;
    else if (b.topics.some((t) => dayTopics.has(t))) score -= 0.15;
    if (weak.has(b.tricky.pattern)) score -= 0.3;
    score += unit(`${b.id}:${seed}`) * 0.5;
    return { b, score };
  });

  // Greedy, with a small penalty for repeating a spelling pattern, so one chapter is not five double-letter words.
  const taken: Record<string, number> = {};
  while (out.length < n && pool.length) {
    let best = 0;
    for (let i = 1; i < pool.length; i++) {
      if (pool[i].score + (taken[pool[i].b.tricky.pattern] ?? 0) * 0.4 < pool[best].score + (taken[pool[best].b.tricky.pattern] ?? 0) * 0.4) best = i;
    }
    const [{ b }] = pool.splice(best, 1);
    taken[b.tricky.pattern] = (taken[b.tricky.pattern] ?? 0) + 1;
    out.push(b.id);
  }
  return out;
}

/** Bank words around the learner's level for a strand: for the arcade before anything has been learned. */
function nearLevel(s: Pick<Data, 'words' | 'skill' | 'mod'>, strand: Strand, n: number, ok: (b: BankWord) => boolean = () => true): string[] {
  const theta = s.skill[strand];
  const seed = dayOf(s);
  return BANK.filter((b) => s.words[b.id]?.status !== 'removed' && ok(b))
    .map((b) => ({ id: b.id, score: Math.abs((strand === 'spell' ? b.spell : b.level) - theta) + unit(`${b.id}:${seed}:${strand}`) * 0.8 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.id);
}

// ── Building a practice session ───────────────────────────────────────────
/** The games that count towards each strand, in the order a session rotates through them. */
const STRAND_GAMES: Record<Strand, GameId[]> = { find: ['clue', 'gap'], know: ['web', 'meaning', 'pair'], spell: ['cover', 'missing', 'proof', 'dictate', 'scramble'] };
/** Which strand each filler slot asks for, once everything due has a place. */
const FILL: Record<'find' | 'spell' | 'mix', Strand[]> = { find: ['find', 'find', 'know'], spell: ['spell'], mix: ['find', 'spell', 'know'] };

type Item = { id: string; strand: Strand; /** Days overdue, counting today as 1; 0 when not due. */ over: number; box: number; last: string; tie: number };

const isTaught = (s: Pick<Data, 'words'>, id: string) => s.words[id]?.status === 'learning' || s.words[id]?.status === 'known';

/** How many (word, strand) pairs are due today among learned words. The warm-up is sized from this. */
export function dueItems(s: Pick<Data, 'words' | 'mod'>): number {
  const t = dayOf(s);
  let n = 0;
  for (const w of Object.values(s.words)) {
    if (w.status !== 'learning' && w.status !== 'known') continue;
    for (const k of STRAND_LIST) if (w.mem?.[k]?.due && w.mem[k].due! <= t) n++;
  }
  return n;
}

/** With more than this many (word, strand) pairs due, new words wait for a warm-up. One warm-up round is 12 at most. */
export const HOLD_AT = 12;
/** A round this long or longer counts as a warm-up. Shorter ones (one word practised from its own page) do not. */
export const WARM_MIN = 5;

/**
 * Should a new word wait? Yes while a lot is due and no practice round has been finished since the last new word.
 * So with a backlog it is one round, one new word, one round, one new word: review always outruns what is added.
 * It never depends on how the round went, only on doing it, so nothing here gates on ability.
 */
export const holdNew = (s: Pick<Data, 'words' | 'mod' | 'warmed'>): boolean => !s.warmed && dueItems(s) > HOLD_AT;

/**
 * A list of exercises, built from what most needs practice.
 *
 * Every (word, strand) pair that is due comes first, the most overdue first; only then is a game chosen for it.
 * `find` practises finding (with a share for knowing), `spell` practises spelling, `mix` and `challenge` take all
 * three strands (over `opts.words` when given: the chapter's words). Slots left over go to the weakest pairs that
 * are not due. `game` plays one game type and never asks the same word twice. A warm-up `mix` grows with the
 * backlog: six exercises, up to twelve when more than six pairs are due. Every exercise can be played by its word.
 * Falls back to bank words near the learner's level, so there is always something to play.
 */
export function buildSession(s: Pick<Data, 'words' | 'skill' | 'mod'>, kind: SessionKind, opts: { size?: number; game?: GameId; words?: string[] } = {}): Exercise[] {
  const single = kind === 'game' ? (opts.game ?? 'clue') : null;
  const t = dayOf(s);
  const strands: Strand[] = single ? [GAME_STRAND[single]] : kind === 'find' ? ['find', 'know'] : kind === 'spell' ? ['spell'] : ['find', 'know', 'spell'];
  const baseWant = Math.max(1, opts.size ?? (kind === 'challenge' ? 8 : 6));

  const lexes: Record<string, Lexeme> = {};
  const gamesOf = (id: string, strand: Strand): GameId[] => (single ? (canPlay(lexes[id], single) ? [single] : []) : STRAND_GAMES[strand].filter((g) => canPlay(lexes[id], g)));
  const usable = (id: string) => {
    const lex = lexes[id] ?? lexOfState(s, id);
    if (!lex) return false;
    lexes[id] = lex;
    return strands.some((k) => gamesOf(id, k).length > 0);
  };
  const learned = () => Object.values(s.words).filter((w) => w.status === 'learning' || w.status === 'known').map((w) => w.id);

  // A challenge is about the chapter's words, but it also clears what is overdue from earlier chapters.
  const focus = new Set(kind === 'challenge' ? (opts.words ?? []) : []);
  let pool = Array.from(new Set(opts.words?.length ? (focus.size ? [...opts.words, ...learned()] : opts.words) : learned())).filter(usable);
  if (!pool.length && opts.words?.length) pool = learned().filter(usable);
  if (!pool.length) pool = nearLevel(s, strands[0], baseWant, (b) => !single || canPlay(lexemeFor(b.id)!, single)).filter(usable);
  if (!pool.length) return [];

  // Every (word, strand) pair this session could ask about.
  const items: Item[] = [];
  for (const id of pool) {
    for (const strand of strands) {
      if (!gamesOf(id, strand).length) continue;
      const m = s.words[id]?.mem?.[strand];
      const over = isTaught(s, id) && m?.due && m.due <= t ? diffDays(t, m.due) + 1 : 0;
      items.push({ id, strand, over, box: m?.box ?? 0, last: m?.last ?? '', tie: unit(`${id}:${t}:${strand}`) });
    }
  }
  const due = items.filter((it) => it.over > 0).sort((a, b) => b.over - a.over || a.box - b.box || a.tie - b.tie);
  const inFocus = (it: Item) => (focus.size && !focus.has(it.id) ? 1 : 0);
  const rest = items.filter((it) => it.over === 0).sort((a, b) => inFocus(a) - inFocus(b) || a.box - b.box || (a.last < b.last ? -1 : a.last > b.last ? 1 : 0) || a.tie - b.tie);

  const want = Math.max(1, opts.size ?? (kind === 'mix' ? clamp(due.length, 6, 12) : baseWant));
  // One game type: each word once. Otherwise a word may come up again in another game, three times at most.
  const total = Math.min(want, single ? items.length : (focus.size ? Math.max(1, pool.filter((id) => focus.has(id)).length) : pool.length) * 3 + (focus.size ? due.filter((it) => !focus.has(it.id)).length : 0));

  // 1. What is due, most overdue first.
  const chosen: Item[] = [];
  if (kind === 'find') {
    const f = due.filter((it) => it.strand === 'find');
    const k = due.filter((it) => it.strand === 'know');
    const keep = Math.min(k.length, Math.floor(total / 3)); // knowing is practised here too: it gets a share of a full round
    chosen.push(...f.slice(0, total - keep));
    chosen.push(...k.slice(0, total - chosen.length));
    chosen.push(...f.slice(total - keep, total - keep + (total - chosen.length)));
  } else if (focus.size) {
    // Half the challenge is kept for the chapter's own words (due ones first, the filler below adds the rest).
    const own = due.filter((it) => focus.has(it.id));
    const others = due.filter((it) => !focus.has(it.id));
    const half = Math.ceil(total / 2);
    chosen.push(...own.slice(0, total));
    chosen.push(...others.slice(0, Math.max(0, Math.min(total - chosen.length, total - half))));
  } else {
    chosen.push(...due.slice(0, total));
  }

  // 2. Then the weakest pairs that are not due, taking turns between the strands.
  const turn = FILL[kind === 'find' || kind === 'spell' ? kind : 'mix'].filter((k) => strands.includes(k));
  const left = rest.slice();
  const per: Record<string, number> = {};
  for (const it of chosen) per[it.id] = (per[it.id] ?? 0) + 1;
  for (let i = 0; chosen.length < total && left.length; i++) {
    const asked = single ? strands[0] : turn[i % turn.length];
    const prev = chosen[chosen.length - 1]?.id;
    // Fewest appearances so far, then the asked-for strand, then not the word just shown; `left` is weakest first.
    let best = -1;
    let bestScore = Infinity;
    for (let j = 0; j < left.length; j++) {
      const score = (per[left[j].id] ?? 0) * 4 + (left[j].strand === asked ? 0 : 2) + (left[j].id === prev ? 1 : 0);
      if (score < bestScore) {
        best = j;
        bestScore = score;
      }
    }
    const [it] = left.splice(best, 1);
    per[it.id] = (per[it.id] ?? 0) + 1;
    chosen.push(it);
  }

  // 3. With only a word or two to practise, the same pair may come back in a different game.
  if (!single) {
    for (let round = 0; round < 2 && chosen.length < total; round++) {
      for (const it of items) {
        if (chosen.length >= total) break;
        if ((per[it.id] ?? 0) >= 3) continue;
        const have = chosen.filter((c) => c.id === it.id && c.strand === it.strand).length;
        if (have > round || have >= gamesOf(it.id, it.strand).length) continue;
        per[it.id] = (per[it.id] ?? 0) + 1;
        chosen.push(it);
      }
    }
  }

  // The same word is not asked twice in a row where that can be avoided.
  for (let i = 1; i < chosen.length; i++) {
    if (chosen[i].id !== chosen[i - 1].id) continue;
    const j = chosen.findIndex((c, n) => n > i && c.id !== chosen[i - 1].id);
    if (j > i) [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }

  // Now a game for each: the next one in that strand's rotation that this word can play and has not played this round.
  const used = new Set<string>();
  const at: Record<Strand, number> = { know: 0, find: 0, spell: 0 };
  const out: Exercise[] = [];
  for (const it of chosen) {
    const games = gamesOf(it.id, it.strand);
    const all = single ? games : STRAND_GAMES[it.strand];
    let game: GameId | null = null;
    for (let n = 0; n < all.length; n++) {
      const g = all[(at[it.strand] + n) % all.length];
      if (games.includes(g) && !used.has(`${it.id}:${g}`)) {
        game = g;
        at[it.strand] = (at[it.strand] + n + 1) % all.length;
        break;
      }
    }
    if (!game) continue; // every game this word can play in this strand has been used: never repeat the identical exercise
    used.add(`${it.id}:${game}`);
    out.push({ key: `${out.length}-${game}-${it.id}`, game, wordId: it.id, strand: GAME_STRAND[game] });
  }
  return out;
}

// ── Placement ─────────────────────────────────────────────────────────────
/** The next placement item: an unused bank word whose difficulty for this strand is nearest the running estimate. */
export function assessNext(strand: Strand, theta: number, used: string[]): BankWord | null {
  const taken = new Set(used);
  let best: BankWord | null = null;
  let bestScore = Infinity;
  for (const b of BANK) {
    if (taken.has(b.id)) continue;
    const score = Math.abs((strand === 'spell' ? b.spell : b.level) - theta) + unit(`${b.id}:${strand}:${used.length}`) * 0.45;
    if (score < bestScore) {
      best = b;
      bestScore = score;
    }
  }
  return best;
}

// ── What Root has learned about the learner ───────────────────────────────
export type PatternStat = { pattern: PatternId; pct: number; seen: number };
export type Insights = {
  levels: Record<Strand, number>;
  /** 0..1 of the way to the next level. */
  progress: Record<Strand, number>;
  weak: PatternStat[];
  strong: PatternStat[];
  rooted: number;
  learning: number;
  /** Share right over the last 30 answers in each strand, 0..1, or null before there are any. */
  accuracy: Record<Strand, number | null>;
  /** The next three words on the way. */
  next: string[];
};

/** Patterns answered right at least 80% of the time over 8 or more tries. */
export const patternsMastered = (s: Pick<Data, 'patterns'>) => Object.values(s.patterns).filter((p) => p.seen >= 8 && p.ok / p.seen >= 0.8).length;

export function insights(s: Data): Insights {
  const stats: PatternStat[] = Object.entries(s.patterns)
    .filter(([, p]) => p.seen >= 3)
    .map(([k, p]) => ({ pattern: k as PatternId, pct: Math.round((p.ok / p.seen) * 100), seen: p.seen }));
  const acc = (strand: Strand) => {
    const last = s.log.filter((a) => a.strand === strand).slice(-30);
    return last.length ? last.reduce((sum, a) => sum + a.r, 0) / last.length : null;
  };
  const words = Object.values(s.words);
  const pending = s.journey.stops.filter((st) => st.kind === 'learn' && !st.done && st.wordId && (!s.words[st.wordId] || s.words[st.wordId].status === 'queued')).map((st) => st.wordId!);
  const next = [...pending, ...pickNewWords(s, 3, pending)].slice(0, 3);
  return {
    levels: { know: levelOf(s.skill.know), find: levelOf(s.skill.find), spell: levelOf(s.skill.spell) },
    progress: { know: levelProgress(s.skill.know), find: levelProgress(s.skill.find), spell: levelProgress(s.skill.spell) },
    weak: stats.filter((p) => p.pct < 70).sort((a, b) => a.pct - b.pct || b.seen - a.seen).slice(0, 4),
    strong: stats.filter((p) => p.pct >= 80).sort((a, b) => b.pct - a.pct || b.seen - a.seen).slice(0, 4),
    rooted: words.filter((w) => w.status === 'known').length,
    learning: words.filter((w) => w.status === 'learning').length,
    accuracy: { know: acc('know'), find: acc('find'), spell: acc('spell') },
    next,
  };
}

/** For callers that only have an id: is this a word Root has a full entry for? */
export const inBank = (id: string) => !!BANK_BY_ID[id];

