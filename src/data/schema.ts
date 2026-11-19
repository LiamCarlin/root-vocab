// The word bank: general English vocabulary, levelled.
//
// Every word carries what the three strands need:
//   KNOW  — a plain meaning, an example, a web of related ideas
//   FIND  — a clue that points at the word without saying it (word recall)
//   SPELL — syllables, a respelling, the one tricky beat and why it is spelled so
//
// Words are split by SYLLABLE (one piece per beat), never by spelling pattern,
// so the tiles, the "sounds like" line and the audio always agree. `says` is a
// plain respelling: what the learner reads under each tile and what the speech
// engine is asked to say for a single part.

/** 1 everyday · 2 common · 3 educated everyday · 4 formal · 5 advanced · 6 rare. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export type Topic = 'home' | 'food' | 'people' | 'feelings' | 'body' | 'nature' | 'money' | 'work' | 'travel' | 'tech' | 'arts' | 'sport' | 'mind' | 'society';

/** Spelling patterns, the unit the learner model tracks to find what to teach next. */
export type PatternId =
  | 'double' // doubled consonants: accommodate, embarrass
  | 'silent' // silent letters: receipt, subtle, knowledge
  | 'schwa' // a lazy vowel that could be any letter: separate, definite
  | 'ei-ie' // receive, achieve, weird
  | 'vowel-team' // two or three vowels, one sound: beautiful, manoeuvre
  | 'soft-cg' // c saying s, g saying j: conscience, genuine
  | 'shun' // the "sh" sound spelled ti / ci / si / ssi: patience, suspicious
  | 'ough' // ough, augh, eigh: thorough, daughter
  | 'able-ible' // -able or -ible: responsible, reliable
  | 'ant-ent' // -ant/-ent, -ance/-ence, -ary/-ery: independent, stationery
  | 'ph-ch' // ph saying f, ch saying k or sh: chaos, chauffeur
  | 'y-vowel' // y doing a vowel's job: rhythm, syllable
  | 'ending' // adding an ending: drop the e, change y to i, -ly, -ful
  | 'prefix' // where a prefix joins: misspell, unnecessary, disappear
  | 'r-vowel' // er / ar / or / ur sounding alike: calendar, grammar
  | 'odd'; // borrowed or irregular: colonel, bureaucracy

export const PATTERNS: Record<PatternId, { label: string; eg: string }> = {
  double: { label: 'Double letters', eg: 'embarrass' },
  silent: { label: 'Silent letters', eg: 'receipt' },
  schwa: { label: 'Lazy vowels', eg: 'separate' },
  'ei-ie': { label: 'ei or ie', eg: 'receive' },
  'vowel-team': { label: 'Vowel teams', eg: 'beautiful' },
  'soft-cg': { label: 'Soft c and g', eg: 'genuine' },
  shun: { label: 'The “sh” sound', eg: 'patience' },
  ough: { label: 'ough and augh', eg: 'thorough' },
  'able-ible': { label: 'able or ible', eg: 'responsible' },
  'ant-ent': { label: 'ant or ent', eg: 'independent' },
  'ph-ch': { label: 'ph and ch', eg: 'chaos' },
  'y-vowel': { label: 'y as a vowel', eg: 'rhythm' },
  ending: { label: 'Adding endings', eg: 'truly' },
  prefix: { label: 'Prefix joins', eg: 'misspell' },
  'r-vowel': { label: 'er, ar, or', eg: 'calendar' },
  odd: { label: 'Rule breakers', eg: 'colonel' },
};

export type Pos = 'noun' | 'verb' | 'adjective' | 'adverb';

export type BankWord = {
  id: string;
  text: string;
  /** How common the word is. Drives the KNOW and FIND strands. */
  level: Level;
  /** How hard it is to spell. Drives the SPELL strand. "necessary" is level 1 to know, 4 to spell. */
  spell: Level;
  pos: Pos;
  parts: string[];
  says: string[];
  /** Plain meaning, 12 words or fewer, no harder words than the word itself. */
  meaning: string;
  /** A recall prompt: points at the word without using it or a form of it. One sentence. */
  clue: string;
  /** Everyday example. The word sits in {braces} so the gap-fill can blank it. */
  life: string;
  /** Extra examples flavoured by interest, also with {braces}. */
  also?: Partial<Record<Topic, string>>;
  topics: Topic[];
  /** Four things that belong with the word: a category, where you meet it, what it does, a near neighbour. One or two words each. */
  links: string[];
  /** Three things that clearly do not belong. One or two words each. */
  not: string[];
  same?: string;
  opposite?: string;
  /** Two REAL words that look or sound similar (gap-fill distractors, "did you mean"). */
  lookalikes: string[];
  /** Two plausible MISSPELLINGS of this word, the ones people actually write. */
  wrong: string[];
  /** The beat most people get wrong, which pattern it is, and a memorable reason or trick. */
  tricky: { part: number; pattern: PatternId; why: string };
  /** Three emoji that could stand for the word: the learner picks one as a picture hook. */
  pics: string[];
  /** Hand-picked decoy for a part in the Build step, with the reason it does not fit. */
  decoys?: Record<string, [string, string]>;
};

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const POS: Record<string, Pos> = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };

export type WordExtra = {
  topics: Topic[];
  links: [string, string, string, string];
  not: [string, string, string];
  same?: string;
  opposite?: string;
  lookalikes: [string, string];
  wrong: [string, string];
  /** [index of the tricky part, pattern, why] */
  tricky: [number, PatternId, string];
  pics: [string, string, string];
  also?: Partial<Record<Topic, string>>;
  decoys?: Record<string, [string, string]>;
};

/**
 * One bank entry.
 * w(level, spell, 'separate', 'sep|a|rate', 'sep|uh|rayt', 'v', meaning, clue, life, { … })
 */
export function w(level: Level, spell: Level, text: string, parts: string, says: string, pos: 'n' | 'v' | 'adj' | 'adv', meaning: string, clue: string, life: string, x: WordExtra): BankWord {
  const { tricky, ...rest } = x;
  return { id: slug(text), text, level, spell, pos: POS[pos], parts: parts.split('|'), says: says.split('|'), meaning, clue, life, ...rest, tricky: { part: tricky[0], pattern: tricky[1], why: tricky[2] } };
}
