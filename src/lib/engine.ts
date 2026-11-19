// The learner model. Pure functions over state: no React, no storage, no randomness
// that is not seeded from the state itself, so the same state always gives the same answer.

import type { DayId, Strand } from '@/data/profile';
import { BANK, BANK_BY_ID, type BankWord, type PatternId, type Topic } from '@/data/words';
import { addDays, diffDays, todayKey } from './dates';
import { lexemeFor, type Lexeme } from './lexicon';
import { traceable } from './glyphs';
import { aim, bestHour, HOUR_NAMES, insight, knows, mainSlip, predict, sense, slipGames, spanShift, struggling, weight, type Ask, type Mind, type SlipKind } from './mind';
import type { Data, Mem, Stop } from './store';

export type GameId = 'clue' | 'web' | 'pair' | 'meaning' | 'gap' | 'cover' | 'missing' | 'proof' | 'dictate' | 'scramble' | 'trace' | 'marble' | 'sand' | 'tap' | 'echo';
export type SessionKind = 'find' | 'spell' | 'mix' | 'challenge' | 'game' | 'hands';
export type Exercise = { key: string; game: GameId; wordId: string; strand: Strand };

/** Which strand an answer in each game counts towards. */
export const GAME_STRAND: Record<GameId, Strand> = {
  clue: 'find', gap: 'find',
  web: 'know', pair: 'know', meaning: 'know',
  cover: 'spell', missing: 'spell', proof: 'spell', dictate: 'spell', scramble: 'spell', trace: 'spell', marble: 'spell', sand: 'spell', tap: 'spell',
  echo: 'find',
};
/**
 * The hands-on games: the word goes in through the hand, the arm and the voice. They are supported practice
 * (the word is in front of the learner), so finishing one counts as right-with-help, never as recall.
 * This is also the order a hands-on round runs them in: break it into beats, write it, say it, roll it, write it from memory.
 */
export const HANDS: GameId[] = ['tap', 'trace', 'echo', 'marble', 'sand'];
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
 * `top` remembers the highest box ever reached. `gap` is the learner's own multiplier on the wait.
 */
export function nextMem(mem: Mem, r: 0 | 0.5 | 1, today: string, gap = 1): Mem {
  const tomorrow = addDays(today, 1);
  const top = mem.top ?? mem.box;
  const base = { ...mem, seen: mem.seen + 1, ok: mem.ok + (r === 1 ? 1 : 0), last: today, top };
  if (r === 1) {
    const due = !mem.due || mem.due <= today;
    if (mem.last === today || !due) return { ...base, due: mem.due && mem.due > today ? mem.due : tomorrow };
    const box = Math.min(4, mem.box + 1);
    // `gap` stretches or shrinks the wait to suit this learner and this answer (see mind.gapFor). Never less than a day.
    return { ...base, box, top: Math.max(top, box), due: addDays(today, Math.max(1, Math.round((mem.box >= 4 ? KEEP_DAYS : INTERVALS[box]) * gap))) };
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

/**
 * One question, described for the model: whose level, how hard the word is, whether it has been taught and how well
 * it is held, and everything about the word the model has learned to care about. null for a word that does not exist.
 */
export function askFor(s: Pick<Data, 'words' | 'skill' | 'mod'>, id: string, strand: Strand, game?: GameId, at: { pos?: number; hour?: number } = {}): Ask | null {
  const w = s.words[id];
  const lex = lexemeFor(id, w);
  if (!lex) return null;
  const taught = !!w && (w.status === 'learning' || w.status === 'known');
  const m = w?.mem?.[strand];
  const t = dayOf(s);
  const overdue = taught && m?.due && m.due < t ? diffDays(t, m.due) / Math.max(1, INTERVALS[Math.min(4, m.box)]) : 0;
  return { strand, game, skill: s.skill[strand], hard: difficulty(lex, strand), taught, box: m?.box ?? 0, overdue, pattern: lex.tricky?.pattern, topics: lex.topics, letters: lex.text.replace(/[^a-z]/gi, '').length, ...at };
}

/** The model's guess at whether the learner would get this right, 0 … 1. 0.5 for a word that does not exist. */
export function chanceOf(s: Pick<Data, 'words' | 'skill' | 'mod' | 'mind'>, id: string, strand: Strand, game?: GameId): number {
  const ask = askFor(s, id, strand, game);
  return ask ? predict(s.mind, ask) : 0.5;
}

/**
 * Might the learner already have this word? True when the model thinks they would both know it and spell it
 * cold, for a word they did not ask for themselves. The lesson then opens with a two-question check, and a
 * word that passes is rooted on the spot and swapped for a harder one.
 */
export function shouldProbe(s: Pick<Data, 'words' | 'skill' | 'mod' | 'mind'>, id: string): boolean {
  const w = s.words[id];
  const lex = lexemeFor(id, w);
  if (!lex || lex.custom || (w && (w.status !== 'queued' || w.origin === 'finder' || w.origin === 'typed'))) return false;
  if (!canPlay(lex, 'meaning') || !canPlay(lex, 'dictate')) return false;
  return chanceOf(s, id, 'know') >= 0.6 && chanceOf(s, id, 'spell') >= 0.5;
}

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
      // Every letter has to have a drawing, and the word has to fit the pad a beat at a time.
      return traceable(lex.text) && lex.parts.every((p) => p.length <= 7);
    case 'sand':
      return lex.text.trim().length > 0 && lex.text.length <= 16;
    case 'tap':
      return lex.parts.length >= 2 && lex.parts.length <= 6;
    case 'echo':
      return lex.text.trim().length > 0;
    case 'cover':
    case 'dictate':
      return lex.text.trim().length > 0;
  }
}

// ── Journey stops ─────────────────────────────────────────────────────────
/** The words a learn stop teaches. A stop saved by an older build holds a single `wordId`. */
export const stopWords = (st: Pick<Stop, 'words' | 'wordId'>): string[] => st.words ?? (st.wordId ? [st.wordId] : []);
/** The words of a learn stop still to be taught, in order. */
export const stopTodo = (st: Pick<Stop, 'words' | 'wordId' | 'got'>): string[] => stopWords(st).filter((id) => !st.got?.includes(id));

// ── Choosing what to teach next ───────────────────────────────────────────
const lexOfState = (s: Pick<Data, 'words'>, id: string) => lexemeFor(id, s.words[id]);

function weakPatterns(s: Pick<Data, 'patterns'>): Set<string> {
  return new Set(Object.entries(s.patterns).filter(([, p]) => p.seen >= 4 && p.ok / p.seen < 0.6).map(([k]) => k));
}

/**
 * How well a word's difficulty suits a target: 1 on the target, falling away on both sides. The long straight
 * tail matters when the target is past every word that is left: the nearest word must still win.
 */
const zone = (hard: number, target: number) => {
  const d = Math.abs(hard - target);
  return 0.6 * Math.exp(-(d * d) / (2 * 0.85 * 0.85)) + 0.4 * Math.max(0, 1 - d / 5);
};

type ForPick = Pick<Data, 'words' | 'skill' | 'profile' | 'patterns' | 'journey' | 'counters' | 'mod' | 'mind'>;

/**
 * The next `n` words to teach, chosen for this learner as they are right now.
 *
 * The learner's own queued words come first (ones they looked up, then ones the placement showed they did not
 * have). After that every bank word is scored and the best taken:
 *
 *   - REACH. The word should sit just past what they can already do: the level the model reads for them, plus
 *     `stretch` (which rises while answers come easily and quickly and falls when they do not). A topic they
 *     have shown they know well makes its words count as easier, so they are given harder ones there; a
 *     spelling pattern they keep missing makes its words count as harder.
 *   - USE. Words from what they said they like, what their days are made of, and what they have chosen to
 *     look at; words that come with a sentence from their own world; and, other things being equal, the more
 *     everyday word.
 *   - NEED. Spelling patterns they are weak on.
 *
 * `ease` lowers the target by that many levels, for a word that should feel comfortable. A small day-seeded
 * shuffle keeps two learners at the same level from getting an identical list.
 */
export function pickNewWords(s: ForPick, n: number, exclude: string[] = [], ease = 0): string[] {
  const out: string[] = [];
  const skip = new Set(exclude);
  for (const st of s.journey.stops) for (const id of stopWords(st)) skip.add(id);

  const queued = Object.values(s.words)
    .filter((w) => w.status === 'queued' && !skip.has(w.id))
    .sort((a, b) => Number(a.origin === 'assess') - Number(b.origin === 'assess') || a.addedAt - b.addedAt);
  for (const w of queued) {
    if (out.length >= n) return out;
    out.push(w.id);
  }

  const { mind } = s;
  const goals = s.profile.goals;
  const wv = !goals.length || goals.includes('know') || goals.includes('find') ? 1 : 0.5;
  const ws = !goals.length || goals.includes('spell') ? 1 : 0.5;
  // Kept inside what the bank holds, so a learner past the top still gets its hardest words rather than a shuffle.
  const tv = clamp((sense(mind, 'know', s.skill.know) + sense(mind, 'find', s.skill.find)) / 2 + mind.stretch - ease, 0.8, 6.4);
  const ts = clamp(sense(mind, 'spell', s.skill.spell) + mind.stretch - ease, 0.8, 6.4);
  const interests = new Set<Topic>(s.profile.interests);
  const dayTopics = new Set<Topic>(s.profile.days.flatMap((d) => DAY_TOPICS[d] ?? []));
  const weak = weakPatterns(s);
  const seed = `${dayOf(s)}:${s.counters.lessons ?? 0}`;

  const pool = BANK.filter((b) => !s.words[b.id] && !skip.has(b.id)).map((b) => {
    // What the model has learned about the word's topics and its spelling pattern shifts how hard it really is for this learner.
    const known = b.topics.filter((t) => knows(mind, `t:${t}`));
    const topicEase = known.length ? known.reduce((sum, t) => sum + weight(mind, `t:${t}`), 0) / known.length : 0;
    const patternEase = knows(mind, `p:${b.tricky.pattern}`) ? weight(mind, `p:${b.tricky.pattern}`) : 0;
    let score = (wv * zone(b.level - topicEase, tv) + ws * zone(b.spell - patternEase, ts)) / (wv + ws);
    if (b.topics.some((t) => interests.has(t))) score += 0.22;
    else if (b.topics.some((t) => dayTopics.has(t))) score += 0.1;
    score += 0.18 * Math.tanh(Math.max(0, ...b.topics.map((t) => mind.like[t] ?? 0)) / 3);
    if (b.also && Object.keys(b.also).some((t) => interests.has(t as Topic))) score += 0.08;
    if (weak.has(b.tricky.pattern) || patternEase < -0.3) score += 0.15 * ws;
    score += 0.05 * ((6 - b.level) / 5);
    score += unit(`${b.id}:${seed}`) * 0.08;
    return { b, score };
  });

  // Greedy, with a small penalty for repeating a spelling pattern, so one chapter is not five double-letter words.
  const taken: Record<string, number> = {};
  while (out.length < n && pool.length) {
    let best = 0;
    for (let i = 1; i < pool.length; i++) {
      if (pool[i].score - (taken[pool[i].b.tricky.pattern] ?? 0) * 0.15 > pool[best].score - (taken[pool[best].b.tricky.pattern] ?? 0) * 0.15) best = i;
    }
    const [{ b }] = pool.splice(best, 1);
    taken[b.tricky.pattern] = (taken[b.tricky.pattern] ?? 0) + 1;
    out.push(b.id);
  }
  return out;
}

/**
 * The words for one learn stop, chosen at the moment it is opened. Where it can, the set shares a spelling
 * pattern, so the pattern is met twice in a row in two different words. When the learner is having a hard
 * time the second word is a comfortable one, well inside their level: one stretch, one win.
 */
export function pickSet(s: ForPick, size: number, exclude: string[] = []): string[] {
  const shortlist = pickNewWords(s, size + 4, exclude);
  if (shortlist.length <= 1 || size <= 1) return shortlist.slice(0, size);
  const set = [shortlist[0]];
  const rest = shortlist.slice(1);
  const own = (id: string) => !!s.words[id]; // the learner's own queued words keep their order
  while (set.length < size && rest.length) {
    let at = 0;
    if (!own(rest[0])) {
      if (struggling(s.mind)) {
        const easy = pickNewWords(s, 1, [...exclude, ...set], 1.2)[0];
        if (easy && !set.includes(easy)) {
          set.push(easy);
          continue;
        }
      }
      const pattern = BANK_BY_ID[set[0]]?.tricky.pattern;
      const twin = pattern ? rest.findIndex((id) => !own(id) && BANK_BY_ID[id]?.tricky.pattern === pattern) : -1;
      if (twin > 0) at = twin;
    }
    set.push(rest.splice(at, 1)[0]);
  }
  return set;
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
export function buildSession(s: Pick<Data, 'words' | 'skill' | 'mod' | 'mind'>, kind: SessionKind, opts: { size?: number; game?: GameId; words?: string[] } = {}): Exercise[] {
  if (kind === 'hands') return buildHands(s, opts);
  const single = kind === 'game' ? (opts.game ?? 'clue') : null;
  const t = dayOf(s);
  const strands: Strand[] = single ? [GAME_STRAND[single]] : kind === 'find' ? ['find', 'know'] : kind === 'spell' ? ['spell'] : ['find', 'know', 'spell'];
  // A round is as long as suits this learner: shorter if their accuracy falls away late or they leave rounds half-way, longer if it holds.
  const shift = opts.size === undefined && !single ? spanShift(s.mind) : 0;
  const baseWant = Math.max(1, opts.size ?? Math.max(4, (kind === 'challenge' ? 8 : 6) + shift));

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

  const want = Math.max(1, opts.size ?? (kind === 'mix' ? clamp(due.length, 6, 12) + shift : baseWant));
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

  // Now a game for each. The model guesses how each game the word can play would go for this learner, and the one
  // nearest the chance a round should aim at is chosen: easier formats (picking) when things are going badly, harder
  // ones (recalling, writing) when they are going well. Games that work on the kind of slip this learner makes get
  // a small pull, and a game already used a lot this round is pushed back, so a round stays mixed.
  const used = new Set<string>();
  const times: Partial<Record<GameId, number>> = {};
  const target = aim(s.mind);
  const helps = new Set(slipGames(s.mind));
  const hour = new Date().getHours();
  const out: Exercise[] = [];
  for (const it of chosen) {
    const games = gamesOf(it.id, it.strand).filter((g) => !used.has(`${it.id}:${g}`));
    let game: GameId | null = null;
    let bestScore = Infinity;
    for (const g of games) {
      const ask = askFor(s, it.id, it.strand, g, { pos: out.length, hour });
      const score = (ask ? Math.abs(predict(s.mind, ask) - target) : 0.3) + (times[g] ?? 0) * 0.14 - (helps.has(g) ? 0.1 : 0) + unit(`${it.id}:${g}:${t}`) * 0.06;
      if (score < bestScore) {
        game = g;
        bestScore = score;
      }
    }
    if (!game) continue; // every game this word can play in this strand has been used: never repeat the identical exercise
    used.add(`${it.id}:${game}`);
    times[game] = (times[game] ?? 0) + 1;
    out.push({ key: `${out.length}-${game}-${it.id}`, game, wordId: it.id, strand: GAME_STRAND[game] });
  }

  // A word that came out wrong when it was said aloud gets one more go at being said, at the end of a mixed round.
  if (!single && (kind === 'mix' || kind === 'find')) {
    const again = Object.keys(s.mind.sayBad).find((id) => isTaught(s, id) && !!lexOfState(s, id) && canPlay(lexOfState(s, id)!, 'echo'));
    if (again) out.push({ key: `${out.length}-echo-${again}`, game: 'echo', wordId: again, strand: GAME_STRAND.echo });
  }
  return out;
}

/**
 * A hands-on round: one go at each hands-on game, each on a different word where there are enough words.
 * The words are the chapter's (`opts.words`), then anything learned, then bank words near the learner's level.
 */
function buildHands(s: Pick<Data, 'words' | 'skill' | 'mod' | 'mind'>, opts: { size?: number; words?: string[] }): Exercise[] {
  const learned = Object.values(s.words).filter((w) => w.status === 'learning' || w.status === 'known').map((w) => w.id);
  const ids = Array.from(new Set([...(opts.words ?? []), ...learned, ...nearLevel(s, 'spell', 6)])).filter((id) => !!lexOfState(s, id));
  const want = Math.max(1, opts.size ?? HANDS.length);
  const out: Exercise[] = [];
  const used = new Set<string>();
  for (let i = 0; out.length < want && i < want * 2; i++) {
    const game = HANDS[i % HANDS.length];
    // The first word that can play this game and has not been used yet; failing that, any word that can.
    const can = ids.filter((id) => canPlay(lexOfState(s, id)!, game));
    const id = can.find((x) => !used.has(x)) ?? can[out.length % Math.max(1, can.length)];
    if (!id) continue;
    used.add(id);
    out.push({ key: `${out.length}-${game}-${id}`, game, wordId: id, strand: GAME_STRAND[game] });
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
  const pending = s.journey.stops.filter((st) => st.kind === 'learn' && !st.done).flatMap(stopTodo).filter((id) => !s.words[id] || s.words[id].status === 'queued');
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


// ── What Root has noticed ─────────────────────────────────────────────────
export type FindingIcon = 'guess' | 'reach' | 'gap' | 'speed' | 'clock' | 'slip' | 'ear' | 'place' | 'voice' | 'listen' | 'cue' | 'read' | 'round' | 'tire' | 'topic' | 'lean';
/** One thing the model has learned about the learner, in a few words. `detail` is a full sentence for screen readers and the line under the title. */
export type Finding = { id: string; icon: FindingIcon; title: string; value?: string; detail: string; game?: GameId; topic?: Topic };

const SLIP_TITLE: Record<SlipKind, [string, string]> = {
  swap: ['Swaps neighbours', 'Two letters side by side trade places.'],
  omit: ['Drops letters', 'A letter gets left out.'],
  extra: ['Adds letters', 'An extra letter slips in.'],
  double: ['Doubles trip', 'One letter where there are two, or two where there is one.'],
  vowel: ['Vowel mix-ups', 'One vowel written for another.'],
  mirror: ['Mirror letters', 'Letters that look alike turned round.'],
  sound: ['Sound-alike letters', 'A letter that makes the same sound.'],
  other: ['Mixed slips', 'No one kind stands out.'],
};
const share = (v: number) => `${Math.round(v * 100)}%`;

/**
 * The model, read back in plain words: only things there is enough evidence for, the most telling first.
 * Everything here comes from what the learner has done in the app; nothing is asked and nothing is guessed from outside it.
 */
export function portrait(s: Pick<Data, 'mind' | 'skill'>): Finding[] {
  const m: Mind = s.mind;
  const out: Finding[] = [];
  const rate = (r: { n: number; ok: number }) => (r.n ? r.ok / r.n : 0);

  const called = insight(m);
  if (called !== null) out.push({ id: 'guess', icon: 'guess', title: 'Root’s guesses', value: share(called), detail: `Root guessed ${share(called)} of your last answers before you gave them.` });

  if (m.n >= 12) {
    const up = m.stretch;
    out.push({ id: 'reach', icon: 'reach', title: up > 0.9 ? 'Reaching high' : up > 0.15 ? 'Reaching up' : 'Steady ground', value: `${up >= 0 ? '+' : '−'}${Math.abs(up).toFixed(1)}`, detail: up > 0.15 ? `New words aim ${up.toFixed(1)} levels above yours, because answers are coming easily.` : 'New words stay close to your level for now.' });
  }

  if (m.rev.n >= 8 && Math.abs(m.spacing - 1) >= 0.1) {
    out.push({ id: 'gap', icon: 'gap', title: m.spacing > 1 ? 'Long memory' : 'Sooner reviews', value: `×${m.spacing.toFixed(1)}`, detail: m.spacing > 1 ? 'Your words survive the wait, so reviews come further apart.' : 'Words come back a little sooner, so they do not slip.' });
  }

  const paces = (Object.entries(m.pace) as [GameId, { m: number; n: number }][]).filter(([, p]) => p.n >= 5).sort((a, b) => a[1].m - b[1].m);
  if (paces.length >= 2) out.push({ id: 'speed', icon: 'speed', title: 'Quickest at', game: paces[0][0], value: `${Math.max(1, Math.round(Math.exp(paces[0][1].m) / 1000))}s`, detail: 'The game you answer fastest.' });

  const best = bestHour(m);
  if (best) out.push({ id: 'clock', icon: 'clock', title: HOUR_NAMES[best.bucket], value: share(best.pct), detail: `${HOUR_NAMES[best.bucket]} is when your answers are surest.` });

  const slip = mainSlip(m);
  if (slip) {
    const pair = Object.entries(m.mix).sort((a, b) => b[1] - a[1])[0];
    const eg = pair && pair[1] >= 2 ? ` Most often ${pair[0].split('>')[0]} for ${pair[0].split('>')[1]}.` : '';
    out.push({ id: 'slip', icon: 'slip', title: SLIP_TITLE[slip.kind][0], value: share(slip.share), detail: `${SLIP_TITLE[slip.kind][1]}${slip.kind === 'vowel' || slip.kind === 'mirror' || slip.kind === 'sound' ? eg : ''}` });
  }
  if (m.phonetic.n >= 6 && rate(m.phonetic) > 0.5) out.push({ id: 'ear', icon: 'ear', title: 'Spells by ear', value: share(rate(m.phonetic)), detail: 'Your slips usually sound right. The look of the word is what needs work.' });

  const slipsAt = m.where[0] + m.where[1] + m.where[2];
  if (slipsAt >= 8) {
    const i = m.where.indexOf(Math.max(...m.where));
    if (m.where[i] / slipsAt >= 0.5) out.push({ id: 'place', icon: 'place', title: ['Slips at the start', 'Slips in the middle', 'Slips at the end'][i], value: share(m.where[i] / slipsAt), detail: ['The first letters of a word', 'The middle of a word', 'The last letters of a word'][i] + ' are where most slips fall.' });
  }

  const said = m.speech.exact + m.speech.close + m.speech.miss;
  if (said >= 5) {
    const clear = m.speech.exact / said;
    out.push({ id: 'voice', icon: 'voice', title: clear >= 0.7 ? 'Says it clearly' : 'Sounds to practice', value: share(clear), detail: clear >= 0.7 ? 'Words you say aloud come out as they should.' : 'Some words come out a little off when said aloud. They come back for another go.' });
  }

  if (m.n >= 15 && (m.ui.replay ?? 0) / m.n > 0.4) out.push({ id: 'listen', icon: 'listen', title: 'Listens twice', value: String(Math.round(m.ui.replay)), detail: 'You often ask to hear a word again. Hearing it is how it goes in.' });
  if (m.n >= 15 && (m.ui.cue ?? 0) / m.n > 0.25) out.push({ id: 'cue', icon: 'cue', title: 'Uses cues', value: String(Math.round(m.ui.cue)), detail: 'A first sound or a second look often gets you there.' });

  if (m.read.n >= 3) out.push({ id: 'read', icon: 'read', title: 'Reading pace', value: `${Math.round(60000 / m.read.ms)}`, detail: `About ${Math.round(60000 / m.read.ms)} words a minute on the story pages.` });

  if (m.sess.n >= 3) out.push({ id: 'round', icon: 'round', title: `Rounds of ${Math.max(1, Math.round(m.sess.len))}`, value: `${Math.max(1, Math.round(m.sess.ms / 60000))} min`, detail: 'How long a round usually runs for you.' });
  if (m.early.n >= 12 && m.late.n >= 12) {
    const drop = rate(m.early) - rate(m.late);
    if (Math.abs(drop) >= 0.08) out.push({ id: 'tire', icon: 'tire', title: drop > 0 ? 'Strong start' : 'Warms up', value: share(Math.abs(drop)), detail: drop > 0 ? 'You are surest early in a round, so rounds are kept short.' : 'You get surer as a round goes on.' });
  }

  const topicKnown = Object.entries(m.w).filter(([k, v]) => k.startsWith('t:') && v.n >= 5 && v.m > 0.25).sort((a, b) => b[1].m - a[1].m)[0];
  if (topicKnown) out.push({ id: 'topic', icon: 'topic', title: 'Knows', topic: topicKnown[0].slice(2) as Topic, detail: 'Words from here come easily, so harder ones are picked.' });
  const lean = Object.entries(m.like).filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1])[0];
  if (lean) out.push({ id: 'lean', icon: 'lean', title: 'Drawn to', topic: lean[0] as Topic, detail: 'What you choose to look at. More words come from here.' });

  return out;
}
