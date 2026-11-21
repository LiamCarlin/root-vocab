import { BANK, BANK_BY_ID, type BankWord, type PatternId, type Topic } from '@/data/words';

/** A word as the lessons and games see it: a bank entry, or the learner's own word filled in as far as it can be. */
export type Lexeme = {
  id: string;
  text: string;
  parts: string[];
  says: string[];
  pos: string;
  meaning: string;
  /** A recall prompt that never contains the word. For the learner's own words this is their meaning. */
  clue: string;
  /** Everyday example with the word in {braces}, or ''. */
  life: string;
  /** 1–6: how common the word is (know, find). */
  level: number;
  /** 1–6: how hard it is to spell. */
  spell: number;
  topics: Topic[];
  links: string[];
  not: string[];
  same?: string;
  opposite?: string;
  lookalikes: string[];
  wrong: string[];
  tricky?: { part: number; pattern: PatternId; why: string };
  pics: string[];
  custom: boolean;
  bank?: BankWord;
};

/** The fields of a learner's own word that a Lexeme can be built from (a UserWord fits). */
export type OwnWord = { text: string; meaning?: string; example?: string; parts?: string[]; says?: string[]; pos?: string };

export const slug = (t: string) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Rough syllable split for words Root has no entry for. One piece per vowel group. */
export function syllabify(word: string): string[] {
  const out: string[] = [];
  for (const chunk of word.trim().split(/\s+/)) {
    if (/^[A-Z]{2,5}$/.test(chunk)) {
      out.push(...chunk.split(''));
      continue;
    }
    const m = chunk.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
    out.push(...(m && m.join('').length === chunk.length ? m : [chunk]));
  }
  return out.length ? out : [word];
}

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Puts {braces} round the word in a learner's own example, if it is there and not already marked. */
function braced(example: string | undefined, text: string): string {
  if (!example) return '';
  if (example.includes('{')) return example;
  const re = new RegExp(`\\b(${escapeRe(text)})\\b`, 'i');
  return re.test(example) ? example.replace(re, '{$1}') : '';
}

/** A bank word, else one built from the learner's own word (rough syllables; the clue is their meaning). */
export function lexemeFor(id: string, user?: OwnWord | null): Lexeme | null {
  const b = BANK_BY_ID[id];
  if (b) {
    return {
      id: b.id, text: b.text, parts: b.parts, says: b.says, pos: b.pos, meaning: b.meaning, clue: b.clue, life: b.life,
      level: b.level, spell: b.spell, topics: b.topics, links: b.links, not: b.not, same: b.same, opposite: b.opposite,
      lookalikes: b.lookalikes, wrong: b.wrong, tricky: b.tricky, pics: b.pics, custom: false, bank: b,
    };
  }
  if (!user) return null;
  const parts = user.parts?.length ? user.parts : syllabify(user.text);
  const says = user.says?.length === parts.length ? user.says : parts;
  const letters = user.text.replace(/[^a-z]/gi, '').length;
  return {
    id, text: user.text, parts, says, pos: user.pos ?? '', meaning: user.meaning ?? '', clue: user.meaning ?? '', life: braced(user.example, user.text),
    level: 3, spell: Math.max(1, Math.min(6, Math.round(letters / 2.5))), topics: [], links: [], not: [], lookalikes: [], wrong: [], pics: [], custom: true,
  };
}

/** An example sentence: one flavoured by the learner's interests when the bank has it, else the everyday one. */
export function exampleFor(lex: Lexeme, interests: Topic[]): { text: string; topic?: Topic } | null {
  for (const t of interests) {
    const s = lex.bank?.also?.[t];
    if (s) return { text: s, topic: t };
  }
  return lex.life ? { text: lex.life } : null;
}

export const plain = (s: string) => s.replace(/[{}]/g, '');
export const gapped = (s: string) => s.replace(/\{[^}]+\}/, '______');
export function splitAround(s: string): [string, string, string] {
  const m = s.match(/^(.*)\{([^}]+)\}(.*)$/);
  return m ? [m[1], m[2], m[3]] : [s, '', ''];
}

// ── Build pieces ──────────────────────────────────────────────────────────
export type Piece = { key: string; text: string; slot: number; why?: string };

const RULES: [RegExp, string, string][] = [
  [/tion$/, 'shun', 'It sounds like “shun”, but it is spelled t-i-o-n.'],
  [/sion$/, 'shun', 'It sounds like “shun”, but it is spelled s-i-o-n.'],
  [/ph/, 'f', 'The f sound here is spelled p-h.'],
  [/cy$/, 'sy', 'It sounds like “see”, but it is spelled c-y.'],
  [/ble$/, 'bul', 'It sounds like “bul”, but it is spelled b-l-e.'],
  [/ate$/, 'ait', 'Same sound, but it is spelled a-t-e.'],
  [/t$/, 'd', 'This part ends with a t sound, not d.'],
  [/d$/, 't', 'This part ends with a d sound, not t.'],
  [/m$/, 'n', 'This part ends with an m sound, not n.'],
  [/n$/, 'm', 'This part ends with an n sound, not m.'],
  [/b/, 'd', 'Look closely: this part has a b, not a d.'],
  [/d/, 'b', 'Look closely: this part has a d, not a b.'],
  [/p/, 'q', 'Look closely: this part has a p, not a q.'],
  [/ei/, 'ie', 'Here it is e before i.'],
  [/ie/, 'ei', 'Here it is i before e.'],
  [/e/, 'a', 'Listen to the vowel: it is e, not a.'],
  [/a/, 'e', 'Listen to the vowel: it is a, not e.'],
  [/i/, 'e', 'Listen to the vowel: it is i, not e.'],
  [/o/, 'u', 'Listen to the vowel: it is o, not u.'],
  [/u/, 'o', 'Listen to the vowel: it is u, not o.'],
];
const LETTER_SWAP: Record<string, string> = { B: 'P', P: 'B', D: 'T', T: 'D', M: 'N', N: 'M', F: 'S', S: 'F', I: 'Y', A: 'E', E: 'A', R: 'A', O: 'U', C: 'K', K: 'C' };

function decoyFor(part: string, lex: Lexeme): [string, string] | null {
  const hand = lex.bank?.decoys?.[part];
  if (hand) return hand;
  if (/^[A-Z]$/.test(part)) {
    const sw = LETTER_SWAP[part];
    return sw ? [sw, `Listen again: the letter is ${part}.`] : null;
  }
  for (const [re, to, why] of RULES) {
    if (re.test(part)) return [part.replace(re, to), why];
  }
  return null;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = (seed || 1) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    // Math.imul keeps the multiply in 32 bits (a plain * loses the low bits in a double, which made
    // the shuffle badly lopsided); the high bits are the random ones, so pick from those.
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = (s >>> 16) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const shuffled = <T,>(arr: T[]) => shuffle(arr, Math.floor(Math.random() * 1e9));

/** The real parts plus up to three look-alike decoys, mixed. Each decoy knows which slot it imitates and why it is wrong. */
export function buildPieces(lex: Lexeme): Piece[] {
  const real: Piece[] = lex.parts.map((t, i) => ({ key: `p${i}`, text: t, slot: i }));
  const taken = new Set(lex.parts.map((p) => p.toLowerCase()));
  const decoys: Piece[] = [];
  const order = lex.bank?.decoys ? lex.parts.map((p, i) => [p, i] as const).sort((a, b) => Number(!!lex.bank!.decoys![b[0]]) - Number(!!lex.bank!.decoys![a[0]])) : lex.parts.map((p, i) => [p, i] as const);
  for (const [part, i] of order) {
    if (decoys.length >= Math.min(3, Math.max(2, lex.parts.length))) break;
    const d = decoyFor(part, lex);
    if (!d || taken.has(d[0].toLowerCase())) continue;
    taken.add(d[0].toLowerCase());
    decoys.push({ key: `d${i}`, text: d[0], slot: i, why: d[1] });
  }
  let mixed = shuffled([...real, ...decoys]);
  // Never hand the answer over in reading order.
  if (mixed.filter((p) => p.key.startsWith('p')).every((p, i, arr) => i === 0 || arr[i - 1].slot < p.slot) && mixed.length > 2) mixed = mixed.reverse();
  return mixed;
}

// ── Fuzzy matching: spelling should not matter ────────────────────────────
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Spelling to sounds, consonants only: the vowels are left as written for the two keys below to deal with. */
function consonantSounds(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/^(kn|gn|pn|mn)/, 'n')
    .replace(/^ps/, 's')
    .replace(/^wr/, 'r')
    .replace(/^wh/, 'w')
    .replace(/ph/g, 'f')
    .replace(/tion|sion|cian|tian|cean/g, 'shn')
    .replace(/[ct]i(?=[aou])/g, 'sh')
    .replace(/xi(?=[aou])/g, 'ksh') // anxious
    .replace(/tur(?=e$|es$|ed$|al$|ally$)/, 'chr') // furniture, natural
    .replace(/ck/g, 'k')
    .replace(/qu/g, 'kw')
    .replace(/x/g, 'ks')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/dg(?=[eiy])/g, 'j')
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/gh/g, '')
    .replace(/([aeiou])w/g, '$1')
    .replace(/z/g, 's');
}

/** Collapses a spelling toward its sound, so "kontinjensy" lands near "contingency". Vowels are dropped (bar a leading one). */
export function soundKey(s: string): string {
  return consonantSounds(s)
    .replace(/[aeiouy]+/g, (m, off) => (off === 0 ? 'a' : ''))
    .replace(/(.)\1+/g, '$1');
}

/** A stricter key that keeps the vowel sounds: equal only for words that are said the same ("sealing", "ceiling"). */
function sayKey(s: string): string {
  return consonantSounds(s)
    .replace(/e$/, '')
    .replace(/ea|ee|ei|ie|ey/g, 'i')
    .replace(/ai|ay/g, 'a')
    .replace(/oa|oe/g, 'o')
    .replace(/oo|ou|ue|ew/g, 'u')
    .replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

export type Suggestion = { text: string; id: string; meaning: string; says: string[]; inBank: boolean; score: number };

const LEXICON: { text: string; meaning: string; id: string; says: string[]; inBank: boolean }[] = BANK.map((b) => ({ text: b.text, meaning: b.meaning, id: b.id, says: b.says, inBank: true }));

export function exactMatch(input: string): Suggestion | null {
  const q = input.trim().toLowerCase();
  const hit = LEXICON.find((l) => l.text.toLowerCase() === q);
  return hit ? { ...hit, score: 0 } : null;
}

/** Up to `n` closest known words by spelling and by sound. */
export function suggest(input: string, n = 3): Suggestion[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  const qk = soundKey(q);
  return LEXICON.map((l) => {
    const t = l.text.toLowerCase();
    const spell = levenshtein(q, t) / Math.max(q.length, t.length);
    const sound = levenshtein(qk, soundKey(t)) / Math.max(qk.length, soundKey(t).length, 1);
    const prefix = t.startsWith(q.slice(0, 3)) ? -0.08 : 0;
    return { ...l, score: Math.min(spell, sound * 0.9 + 0.05) + prefix };
  })
    .filter((s) => s.score < 0.5)
    .sort((a, b) => a.score - b.score)
    .slice(0, n);
}

/** Did the mic hear the target, a close form of it ("mitigated"), or something else? */
export function judgeSpoken(heard: string, target: string): 'exact' | 'close' | 'miss' {
  const h = heard.trim().toLowerCase().replace(/[^a-z\s]/g, '');
  const t = target.toLowerCase();
  if (!h) return 'miss';
  if (h === t || h.split(/\s+/).includes(t) || h.replace(/\s+/g, '') === t.replace(/\s+/g, '')) return 'exact';
  // Accents and recognisers split a word ("act knowledge" for "acknowledge"), so every run of up to
  // three neighbouring words is also tried joined up, and judged by sound as well as by letters.
  const words = h.split(/\s+/).filter(Boolean);
  const tries = new Set<string>([h, ...words]);
  for (let i = 0; i < words.length; i++) for (let n = 2; n <= 3 && i + n <= words.length; n++) tries.add(words.slice(i, i + n).join(''));
  const tt = t.replace(/\s+/g, '');
  const room = Math.max(2, Math.floor(tt.length * 0.3));
  for (const x of tries) if (levenshtein(x, tt) <= room || soundKey(x) === soundKey(tt)) return 'close';
  return 'miss';
}

/** Edit distance where swapping two neighbouring letters counts as one slip, not two. */
function slips(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

const tidy = (x: string) => x.trim().toLowerCase().replace(/[^a-z\s-]/g, '').replace(/[\s-]+/g, ' ');
const BANK_WORDS = new Set(BANK.map((b) => tidy(b.text)));
/** The ways a spelling can be said: "gh" after ou/au is silent in "though" and an f in "enough". */
const soundKeys = (x: string) => Array.from(new Set([soundKey(x), soundKey(x.replace(/([ao]u)gh/g, '$1f'))]));

/**
 * For FIND games: did they get the word, however they spelled it? True when the attempt is the word, sounds like it,
 * or is only a letter or two off. A different real word is not the word: another bank word is never accepted, and
 * a look-alike passed in `not` only when it is a same-sounding slip ("breath" for "breathe", "sealing" for
 * "ceiling"), because then it is a spelling mistake, and spelling must not fail a recall.
 */
export function closeEnough(attempt: string, target: string, not: string[] = []): boolean {
  const a = tidy(attempt);
  const t = tidy(target);
  if (!a || !t) return false;
  if (a === t || a.replace(/\s/g, '') === t.replace(/\s/g, '')) return true;
  const kas = soundKeys(a);
  const kts = soundKeys(t);
  const sameSound = kas.some((k) => kts.includes(k));
  // A look-alike is a real word of its own. It passes only as a slip of the pen: the same consonant sounds with one
  // letter out or two swapped ("breath" for "breathe", "wired" for "weird"), or said exactly the same ("sealing" for
  // "ceiling"). Never as a different word ("calendar" for "colander", "litigate" for "mitigate").
  if (not.some((n) => tidy(n) === a)) return (sameSound && slips(a, t) <= 1) || sayKey(a) === sayKey(t);
  if (BANK_WORDS.has(a)) return false;
  if (a[0] !== t[0] && !kas.some((k) => kts.some((q) => q[0] === k[0]))) return false;
  if (sameSound) return true;
  const letters = t.replace(/\s/g, '').length;
  const off = levenshtein(a, t);
  // One sound out (or two sounds swapped), as long as the letters are not a different word altogether ("spatula" is not "subtle").
  const kt = kts[0];
  if (kt.length >= 4 && Math.min(...kas.map((k) => slips(k, kt))) <= 1 && off <= Math.floor(letters * 0.45)) return true;
  return off <= (letters <= 4 ? 1 : letters <= 8 ? 2 : 3);
}

// ── Spelling feedback: point at the letter, not the whole word ────────────
export type Mark = { ch: string; ok: boolean; kind?: 'wrong' | 'extra' | 'missing' };

/** Aligns an attempt with the target. Returns both strings letter by letter, with the letters that need attention flagged. */
export function alignSpelling(attempt: string, target: string): { yours: Mark[]; theirs: Mark[]; right: number } {
  const a = attempt.trim().toLowerCase(), b = target.toLowerCase();
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const yours: Mark[] = [], theirs: Mark[] = [];
  let i = m, j = n, right = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      yours.unshift({ ch: a[i - 1], ok: true }); theirs.unshift({ ch: b[j - 1], ok: true }); right++; i--; j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      yours.unshift({ ch: a[i - 1], ok: false, kind: 'wrong' }); theirs.unshift({ ch: b[j - 1], ok: false, kind: 'wrong' }); i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      yours.unshift({ ch: a[i - 1], ok: false, kind: 'extra' }); i--;
    } else {
      theirs.unshift({ ch: b[j - 1], ok: false, kind: 'missing' }); j--;
    }
  }
  return { yours, theirs, right };
}

/** Which syllable holds the first letter that is off, so the explanation can name the beat. */
export function partOfLetter(lex: Lexeme, theirs: Mark[]): number {
  const idx = theirs.findIndex((mk) => !mk.ok);
  if (idx < 0) return -1;
  const joined = lex.text.toLowerCase();
  let pos = 0;
  for (let p = 0; p < lex.parts.length; p++) {
    while (joined[pos] === ' ') pos++;
    pos += lex.parts[p].length;
    if (idx < pos) return p;
  }
  return lex.parts.length - 1;
}

export const meaningOf = (text: string): string | undefined => BANK_BY_ID[slug(text)]?.meaning;
