// The Finder: "I know the word, I just can't get it."
//
// Two ways in. DESCRIBE it ("put off doing something") or type how it SOUNDS
// ("fizishun"). Online, both go to the free Datamuse API: no key, no account,
// and the only things ever sent are the text typed and an optional first
// letter. On this device (the fallback, and the choice for anyone who says no
// to online) the same two questions are asked of Root's own word bank.

import { BANK, BANK_BY_ID, type BankWord } from '@/data/words';
import { levenshtein, slug, soundKey, suggest, syllabify } from './lexicon';

export type FindMode = 'describe' | 'sounds';

export type Found = {
  id: string;
  text: string;
  /** One plain line. '' when nothing is known beyond the spelling. */
  meaning: string;
  pos?: string;
  beats: number;
  inBank: boolean;
};

export type FindResult = { results: Found[]; source: 'online' | 'device'; /** Online was wanted but could not be reached. */ fellBack: boolean };

const ENDPOINT = 'https://api.datamuse.com/words';
const TIMEOUT_MS = 6000;
const POS: Record<string, string> = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };

const fromBank = (b: BankWord): Found => ({ id: b.id, text: b.text, meaning: b.meaning, pos: b.pos, beats: b.parts.length, inBank: true });

// ── On this device ────────────────────────────────────────────────────────
const STOP = new Set(('a an the of to in on at for with by from and or but not no is are was were be been being am it its this that these those there here as into than then so such very too just ' +
  'you your i my me we our they their he she his her them who whom which what when where why how do does did doing done have has had can could would should will shall may might must ' +
  'word thing things something someone somebody stuff kind sort type like means meaning mean called call name feel feeling get gets getting make makes making').split(' '));

/** Lower-case words with the commonest endings taken off, so "delaying" meets "delay". */
function stems(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/[\s'-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 5 ? t.replace(/(ing|ed|es|ly|s)$/, '') : t.length > 3 ? t.replace(/s$/, '') : t));
}

const INDEX: { b: BankWord; strong: Set<string>; meaning: Set<string>; clue: Set<string> }[] = BANK.map((b) => ({
  b,
  strong: new Set(stems([...b.links, b.same ?? ''].join(' '))),
  meaning: new Set(stems(b.meaning)),
  clue: new Set(stems(b.clue)),
}));

/** Bank words whose meaning, clue or word web shares words with the description. Best first. */
function describeOnDevice(query: string, n = 8): Found[] {
  const q = Array.from(new Set(stems(query)));
  if (!q.length) return [];
  return INDEX.map((e) => {
    let score = 0;
    let hits = 0;
    for (const t of q) {
      const pts = (e.strong.has(t) ? 3 : 0) + (e.meaning.has(t) ? 2 : 0) + (e.clue.has(t) ? 1.5 : 0);
      score += pts;
      if (pts) hits++;
    }
    return { e, hits, score: score / Math.sqrt(q.length) };
  })
    // One shared word out of three ("small" in "fear of small spaces") is noise, not a match: at least half must land.
    .filter((x) => x.score >= 1.4 && x.hits >= Math.ceil(q.length / 2))
    .sort((a, b) => b.score - a.score || a.e.b.level - b.e.b.level)
    .filter((x, _i, all) => x.score >= all[0].score * 0.55) // nothing far weaker than the best match
    .slice(0, n)
    .map((x) => fromBank(x.e.b));
}

function soundsOnDevice(query: string, n = 6): Found[] {
  return suggest(query, n)
    .map((s) => BANK_BY_ID[s.id])
    .filter(Boolean)
    .map(fromBank);
}

export function findOnDevice(mode: FindMode, query: string, letter?: string): Found[] {
  const hits = mode === 'describe' ? describeOnDevice(query, letter ? 40 : 8) : soundsOnDevice(query, letter ? 20 : 6);
  return (letter ? hits.filter((h) => h.text.toLowerCase().startsWith(letter.toLowerCase())) : hits).slice(0, 8);
}

// ── Online ────────────────────────────────────────────────────────────────
type Raw = { word: string; score?: number; numSyllables?: number; tags?: string[]; defs?: string[] };

// A learning app keeps crude words out of its suggestions.
const CRUDE = /\((?:[^)]*\b)?(vulgar|obscene|ethnic slur|slur)\b/i;
const HARSH = /\((?:[^)]*\b)?(offensive|derogatory|pejorative)\b/i;
const NEVER = new Set(['ass', 'arse', 'booby', 'boob', 'tit', 'dick', 'cock', 'prick', 'pussy', 'shit', 'fuck', 'bitch', 'bastard', 'slut', 'whore', 'piss', 'crap', 'wank', 'twat', 'cunt']);
/** Entries that are not really a word to learn: names, abbreviations, variant spellings. */
const JUNK = /^(?:an? |the )?(?:(?:fe)?male given name|given name|surname|placename|place name|initialism|abbreviation|acronym|alternative (?:form|spelling|letter-case form)|obsolete (?:form|spelling)|archaic (?:form|spelling)|misspelling|eye dialect|plural of|simple past|past participle|present participle|third-person|a (?:city|town|village|river|county|state|province|language|surname))\b/i;

/** The same kinds of entry, spotted anywhere in the definition: "A unisex given name borne by…", "A character in Hindu mythology". */
const NAMEY = /\b(given name|surname|mythology|mythological|barangay|municipality|commune|genus|taxonomic|a character (?:in|from)|(?:city|town|village|river|district|region|province|island|suburb) (?:in|of|on))\b/i;

function clean(def: string): { text: string; pos?: string } {
  const [tag, ...rest] = def.split('\t');
  let text = (rest.length ? rest.join(' ') : tag).trim();
  // Leading usage labels say nothing a learner needs: "(transitive)", "(informal, of a person)".
  while (/^\([^)]{1,60}\)\s*/.test(text)) text = text.replace(/^\([^)]{1,60}\)\s*/, '');
  return { text, pos: rest.length ? POS[tag.trim()] : undefined };
}

/** "v\t(transitive) To delay taking action; to wait until later." → pos "verb", "to delay taking action". */
function readDef(defs: string[] | undefined): { meaning: string; pos?: string; blocked: boolean } {
  if (!defs?.length) return { meaning: '', blocked: false };
  if (defs.some((d) => CRUDE.test(d)) || HARSH.test(defs[0])) return { meaning: '', blocked: true };
  const pick = defs.map(clean).find((d) => d.text && !JUNK.test(d.text) && !NAMEY.test(d.text));
  if (!pick) return { meaning: '', blocked: true }; // only a name or an abbreviation
  let text = pick.text.split(/;\s|\.\s/)[0].replace(/[.;:,\s]+$/, '').trim();
  if (text.length > 110) text = `${text.slice(0, 107).replace(/\s+\S*$/, '')}…`;
  if (text) text = text.charAt(0).toLowerCase() + text.slice(1);
  return { meaning: text, pos: pick.pos, blocked: false };
}

/** Is `b` just `a` with an ending on it (or the other way round)? */
function sameFamily(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short === long) return true;
  if (long.length - short.length > 3) return false;
  const base = short.replace(/[ey]$/, '');
  return base.length >= 3 && long.startsWith(base) && /^(s|es|d|ed|ing|ies|ied|'s)?$/.test(long.slice(base.length).replace(/^[ey]/, ''));
}

const freqOf = (r: Raw) => Number(r.tags?.find((t) => t.startsWith('f:'))?.slice(2) ?? 0);

function tidy(raw: Raw[], query: string, minFreq = 0.06): Found[] {
  const out: Found[] = [];
  const asked = new Set(query.toLowerCase().split(/\s+/));
  for (const r of raw) {
    const word = (r.word ?? '').trim();
    if (!/^[a-z]{3,}$/.test(word) || NEVER.has(word)) continue; // single, plain, lower-case words only
    if (asked.has(word) && asked.size > 1) continue; // a word they typed in the description is not the word they are missing
    if (out.some((o) => sameFamily(o.text.toLowerCase(), word))) continue;
    const bank = BANK_BY_ID[slug(word)];
    if (bank) {
      out.push(fromBank(bank));
      continue;
    }
    if (r.tags?.includes('prop')) continue;
    const def = readDef(r.defs);
    // Without a meaning Root cannot teach it, and words almost nobody uses are rarely the one on the tip of the tongue.
    if (def.blocked || !def.meaning || freqOf(r) < minFreq) continue;
    out.push({ id: slug(word), text: word, meaning: def.meaning, pos: def.pos, beats: r.numSyllables ?? syllabify(word).length, inBank: false });
  }
  return out;
}

async function ask(params: Record<string, string>): Promise<Raw[]> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), TIMEOUT_MS);
  try {
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    const res = await Promise.race([
      fetch(`${ENDPOINT}?${qs}`, { signal: ctl?.signal, headers: { Accept: 'application/json' } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS + 200)),
    ]);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json: unknown = await res.json();
    if (!Array.isArray(json)) throw new Error('unexpected reply');
    return json as Raw[];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Look for the word. `online: false` never touches the network. The only things sent online are
 * the query text and the first-letter filter.
 */
export async function findWord(mode: FindMode, query: string, opts: { online: boolean; letter?: string }): Promise<FindResult> {
  const q = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  const letter = opts.letter && /^[a-z]$/i.test(opts.letter) ? opts.letter.toLowerCase() : undefined;
  if (!q) return { results: [], source: 'device', fellBack: false };
  const local = findOnDevice(mode, q, letter);
  if (!opts.online) return { results: local, source: 'device', fellBack: false };
  try {
    const params: Record<string, string> = mode === 'describe' ? { ml: q, max: '20', md: 'dsf' } : { sl: q.replace(/\s+/g, ''), max: '12', md: 'dsf' };
    // Typing a word by its sound means hunting a word you already know, so rare look-alikes ("nola", "noli") are only noise there.
    const minFreq = mode === 'sounds' ? 0.5 : 0.06;
    let found: Found[] = [];
    if (letter && mode === 'describe') {
      // Asking the search itself for "means this AND starts with a" returns loose matches ("about", "atom").
      // A wider plain search, narrowed here, keeps only words that really fit; the stricter query is the fallback.
      found = tidy(await ask({ ...params, max: '80' }), q, minFreq).filter((f) => f.text.toLowerCase().startsWith(letter));
    }
    if (!found.length) {
      if (letter) params.sp = `${letter}*`;
      found = tidy(await ask(params), q, minFreq);
    }
    if (mode === 'sounds') {
      // The sound search does not know how close each hit is. Measure it, put the nearest first, drop the far-fetched.
      const key = soundKey(q);
      const far = (f: Found) => levenshtein(key, soundKey(f.text)) / Math.max(key.length, soundKey(f.text).length, 1);
      const pool = [...found];
      for (const l of local) if (!pool.some((m) => m.id === l.id)) pool.push(l);
      const ranked = pool.map((f, i) => ({ f, i, d: far(f) })).filter((x) => x.d <= 0.5).sort((a, b) => a.d - b.d || Number(b.f.inBank) - Number(a.f.inBank) || a.i - b.i);
      return { results: ranked.map((x) => x.f).slice(0, 8), source: 'online', fellBack: false };
    }
    // Describing: keep the search's order, but lead with words Root can teach in full, and let the bank fill a short list.
    const merged = [...found];
    for (const l of local) if (!merged.some((m) => m.id === l.id) && merged.length < 5) merged.push(l);
    const ranked = merged.map((f, i) => ({ f, i })).sort((a, b) => Number(b.f.inBank) - Number(a.f.inBank) || a.i - b.i);
    // The search's tail is loosely related at best ("sea", "challenge" for a pasta strainer), so a short list is the honest one.
    return { results: ranked.map((x) => x.f).slice(0, 6), source: 'online', fellBack: false };
  } catch {
    return { results: local, source: 'device', fellBack: true };
  }
}
