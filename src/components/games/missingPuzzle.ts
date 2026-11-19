import { buildPieces, shuffled, type Lexeme } from '@/lib/lexicon';

// The puzzle behind the Missing piece game, kept free of UI so it can be checked against the whole bank.

export type Puzzle = { segs: string[]; gap: number; real: string; options: string[]; byBeat: boolean };

const low = (s: string) => s.toLowerCase().replace(/\s+/g, '');
const SWAP: Record<string, string> = { a: 'e', e: 'a', i: 'e', o: 'u', u: 'o', y: 'i' };

/** Believable wrong versions of a piece, for when the bank's misspellings do not land on it. */
function variants(piece: string): string[] {
  const p = piece.toLowerCase();
  const out: string[] = [];
  if (/(.)\1/.test(p)) out.push(p.replace(/(.)\1/, '$1'));
  if (p.includes('ei')) out.push(p.replace('ei', 'ie'));
  else if (p.includes('ie')) out.push(p.replace('ie', 'ei'));
  const v = p.search(/[aeiouy]/);
  if (v >= 0) {
    out.push(p.slice(0, v) + SWAP[p[v]] + p.slice(v + 1));
    out.push(p.slice(0, v) + (p[v] === 'a' ? 'u' : 'a') + p.slice(v + 1));
  }
  const cons = p.search(/[bcdfglmnprst](?=[aeiouy])/);
  if (cons >= 0 && !/(.)\1/.test(p)) out.push(p.slice(0, cons + 1) + p[cons] + p.slice(cons + 1));
  out.push(p + 'e', p + p[p.length - 1]);
  return out;
}

/** Fragments that are fine inside a word and not fine alone on a big tile. */
const RUDE = new Set(['ass', 'arse', 'tit', 'tits', 'cum', 'fag', 'sex', 'pis', 'piss', 'poo', 'bum', 'dic', 'dik', 'cok', 'nob', 'wank', 'slut', 'hor']);

const common = (a: string, b: string) => {
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return { p, s };
};

/** Blank the tricky beat (or, for a one-beat word, the letters people get wrong) and find two wrong pieces for it. */
export function puzzleFor(lex: Lexeme): Puzzle {
  const decoys: string[] = [];
  let segs: string[];
  let gap: number;
  let real: string;
  const byBeat = lex.parts.length > 1;

  if (byBeat) {
    gap = Math.max(0, Math.min(lex.parts.length - 1, lex.tricky?.part ?? 0));
    segs = lex.parts;
    real = lex.parts[gap];
    const pre = low(lex.parts.slice(0, gap).join(''));
    const post = low(lex.parts.slice(gap + 1).join(''));
    // What each real-world misspelling puts in this beat.
    for (const w of lex.wrong) {
      const lw = low(w);
      if (lw.startsWith(pre) && lw.endsWith(post) && lw.length > pre.length + post.length) decoys.push(lw.slice(pre.length, lw.length - post.length));
    }
    for (const piece of buildPieces(lex)) if (piece.key.startsWith('d') && piece.slot === gap) decoys.push(piece.text.toLowerCase());
  } else {
    const word = lex.text;
    const lw = low(word);
    const diffs = lex.wrong.map((w) => ({ w: low(w), ...common(lw, low(w)) }));
    let p = diffs.length ? Math.min(...diffs.map((d) => d.p)) : Math.max(0, lw.search(/[aeiouy]/));
    let s = diffs.length ? Math.min(...diffs.map((d) => d.s)) : Math.max(0, lw.length - p - (lw.slice(p).match(/^[aeiouy]+/)?.[0].length ?? 1));
    const mids = () => [lw.slice(p, lw.length - s), ...diffs.map((d) => d.w.slice(p, d.w.length - s))];
    // Nobody can pick an empty tile: widen the gap until every option has a letter in it.
    while (mids().some((m) => m.length === 0) && (p > 0 || s > 0)) {
      if (p > 0) p--;
      else s--;
    }
    real = word.slice(p, word.length - s);
    decoys.push(...mids().slice(1));
    const before = word.slice(0, p);
    const after = word.slice(word.length - s);
    segs = [before, real, after].filter((x, i) => i === 1 || x.length > 0);
    gap = before.length ? 1 : 0;
  }

  const taken = new Set([real.toLowerCase()]);
  const two: string[] = [];
  const hasQ = real.toLowerCase().includes('q');
  for (const d of [...decoys, ...variants(real)]) {
    if (two.length >= 2) break;
    // No empty tiles, no repeats, and no "q" without its u (a letter-flip decoy that no one would write).
    if (!d || taken.has(d) || RUDE.has(d) || (!hasQ && /q(?!u)/.test(d))) continue;
    taken.add(d);
    two.push(d);
  }
  // Always three tiles, whatever the word: fall back to plain letter swaps.
  for (const d of [real.toLowerCase() + 'e', 'e' + real.toLowerCase(), real.toLowerCase() + 's']) {
    if (two.length >= 2) break;
    if (!taken.has(d)) {
      taken.add(d);
      two.push(d);
    }
  }
  // Keep the real piece's capital on the decoys, so a capital letter is never the giveaway.
  const cased = (d: string) => (real[0] !== real[0].toLowerCase() ? d[0].toUpperCase() + d.slice(1) : d);
  return { segs, gap, real, options: shuffled([real, ...two.map(cased)]), byBeat };
}
