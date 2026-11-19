import { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { Tag, Txt } from '@/components/ui';
import { PATTERNS } from '@/data/schema';
import { alignSpelling, levenshtein, type Lexeme, type Mark } from '@/lib/lexicon';
import { ON_BLOCK, SYLLABLE_TONES, useTheme } from '@/theme';
import type { GameResult } from './types';

// Shared by the spelling games. Nothing in here marks a whole word wrong: a
// miss lights the letters that are off and names the tricky beat.

/** Same word, ignoring case and stray spaces. "wednesday" is a right answer for "Wednesday". */
export const sameWord = (attempt: string, target: string) => tidy(attempt) === tidy(target);
export const tidy = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
/**
 * How many single-letter edits the attempt is from the word. Two neighbouring letters swapped
 * ("vauge" for "vague") count as one slip, not two: it is the commonest dyslexic error and the
 * learner plainly knows the letters.
 */
export const editsFrom = (attempt: string, target: string) => {
  const a = tidy(attempt), b = tidy(target);
  if (a.length === b.length) {
    const off: number[] = [];
    for (let i = 0; i < a.length && off.length <= 2; i++) if (a[i] !== b[i]) off.push(i);
    if (off.length === 2 && off[1] === off[0] + 1 && a[off[0]] === b[off[1]] && a[off[1]] === b[off[0]]) return 1;
  }
  return levenshtein(a, b);
};

/** Bold text inside a sentence, in the learner's chosen typeface. */
export function Bold({ children }: { children: string }) {
  const { font } = useTheme();
  return <Text style={{ fontFamily: font('b') }}>{children}</Text>;
}

/**
 * Reports once, with the time since the game appeared. Later calls do nothing,
 * so a double tap or a late timer can never send a second result.
 */
export function useReport(onResult: (res: GameResult) => void) {
  const t0 = useRef(0);
  const sent = useRef(false);
  useEffect(() => {
    t0.current = Date.now();
  }, []);
  return useCallback(
    (res: Omit<GameResult, 'ms'>) => {
      if (sent.current) return;
      sent.current = true;
      onResult({ ...res, ms: t0.current ? Date.now() - t0.current : undefined });
    },
    [onResult],
  );
}

/** Where each beat starts in the written word, allowing for spaces between words. */
function chunksOf(text: string, parts: string[]) {
  const out: { p: string; space: boolean }[] = [];
  let pos = 0;
  parts.forEach((p) => {
    let space = false;
    while (text[pos] === ' ') {
      pos++;
      space = true;
    }
    out.push({ p, space });
    pos += p.length;
  });
  return out;
}

/**
 * The word in big type, one colour bar per beat. The tricky beat sits on a soft
 * highlight with a heavier bar, so the eye lands where the spelling is hard.
 */
export function WordBeats({ lex, size = 44, mark = true }: { lex: Pick<Lexeme, 'text' | 'parts' | 'tricky'>; size?: number; mark?: boolean }) {
  const { c, font } = useTheme();
  const tricky = mark ? (lex.tricky?.part ?? -1) : -1;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }} accessible accessibilityRole="header" accessibilityLabel={lex.text}>
      {chunksOf(lex.text, lex.parts).map((ch, i) => {
        const hot = i === tricky && lex.parts.length > 1;
        return (
          <View key={i} style={{ marginLeft: ch.space ? size * 0.3 : 0, alignItems: 'stretch' }}>
            <View style={{ borderRadius: 10, backgroundColor: hot ? c.sun : 'transparent', paddingHorizontal: 1 }}>
              <Text style={{ fontFamily: font('b'), fontSize: size, lineHeight: size * 1.18, letterSpacing: 0.6, color: c.ink }}>{ch.p}</Text>
            </View>
            <View style={{ height: hot ? 10 : 7, borderRadius: 5, marginTop: hot ? 2 : 3.5, backgroundColor: c[SYLLABLE_TONES[i % SYLLABLE_TONES.length]], marginHorizontal: 1.5, borderWidth: hot ? 2 : 0, borderColor: c.ink }} />
          </View>
        );
      })}
    </View>
  );
}

/** What is off in an attempt: a mark per typed letter, and the places where a letter was left out. */
export function diffOf(attempt: string, target: string): { marks: Mark[]; gaps: number[] } {
  const { yours, theirs } = alignSpelling(attempt, target);
  const gaps: number[] = [];
  let i = 0;
  for (const t of theirs) {
    while (i < yours.length && yours[i].kind === 'extra') i++;
    if (t.kind === 'missing') gaps.push(i);
    else i++;
  }
  return { marks: yours, gaps };
}

/**
 * A spelling shown letter by letter, in its own capitals. Letters that are off are lit;
 * a small bar marks a place where a letter was left out.
 */
export function Letters({ text, diff, size = 26, quiet }: { text: string; diff?: { marks: Mark[]; gaps: number[] }; size?: number; /** Plain text colour for letters that are fine (for use on any background). */ quiet?: string }) {
  const { c, font } = useTheme();
  const chars = text.trim().split('');
  const aligned = !!diff && diff.marks.length === chars.length;
  const gap = (k: string) => <View key={k} style={{ width: 7, height: size * 0.92, borderRadius: 4, backgroundColor: c.orange, marginHorizontal: 2.5 }} />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }} accessible accessibilityLabel={text}>
      {chars.map((ch, i) => {
        const off = aligned && !diff!.marks[i].ok;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {aligned && diff!.gaps.includes(i) && gap(`g${i}`)}
            <View style={{ borderRadius: 8, backgroundColor: off ? c.orange : 'transparent', paddingHorizontal: off ? 3 : 0.5, marginHorizontal: off ? 1.5 : 0, minWidth: ch === ' ' ? size * 0.3 : undefined }}>
              <Text style={{ fontFamily: font('b'), fontSize: size, lineHeight: size * 1.3, letterSpacing: 0.6, color: off ? ON_BLOCK.ink : (quiet ?? c.ink) }}>{ch}</Text>
            </View>
          </View>
        );
      })}
      {aligned && diff!.gaps.includes(chars.length) && gap('gend')}
    </View>
  );
}

/** The right spelling with the letters the attempt missed lit up. Marks are for the target, so capitals are restored from it. */
function TargetLetters({ lex, theirs }: { lex: Pick<Lexeme, 'text'>; theirs: Mark[] }) {
  const { c, font } = useTheme();
  const chars = lex.text.split('');
  const aligned = theirs.length === chars.length;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }} accessible accessibilityLabel={`It is spelled ${lex.text.split('').join(' ')}`}>
      {chars.map((ch, i) => {
        const m = aligned ? theirs[i] : undefined;
        const off = !!m && !m.ok;
        return (
          <View key={i} style={{ minWidth: ch === ' ' ? 10 : 26, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, backgroundColor: off ? (m?.kind === 'missing' ? '#FFFFFF' : c.orange) : 'rgba(14,14,19,0.08)', borderWidth: off && m?.kind === 'missing' ? 2 : 0, borderColor: ON_BLOCK.ink }}>
            <Text style={{ fontFamily: font('b'), fontSize: 21, color: ON_BLOCK.ink }}>{ch}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * The one thing worth reading after a miss: which pattern it is and the hook for remembering it.
 * `onBlock` is for the feedback bar, which is always a pastel block: black text in every theme.
 */
export function Why({ lex, onBlock }: { lex: Pick<Lexeme, 'tricky'>; onBlock?: boolean }) {
  const { font } = useTheme();
  if (!lex.tricky) return null;
  const label = PATTERNS[lex.tricky.pattern]?.label;
  return (
    <View style={{ gap: 6, alignItems: 'flex-start' }}>
      {!!label &&
        (onBlock ? (
          <View style={{ backgroundColor: 'rgba(14,14,19,0.1)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontFamily: font('s'), fontSize: 13.5, color: ON_BLOCK.ink }}>{label}</Text>
          </View>
        ) : (
          <Tag label={label} tint="butter" color="ink" />
        ))}
      <Txt v="bodyS" color="ink" style={onBlock ? { color: ON_BLOCK.ink } : undefined}>
        {lex.tricky.why}
      </Txt>
    </View>
  );
}

/**
 * The correction handed to the runner's feedback bar: the right spelling with the
 * off letters lit, then why the tricky beat is spelled that way. With no attempt
 * (a pick, not typing) it is just the word and the reason.
 */
export function SpellNote({ lex, attempt }: { lex: Lexeme; attempt?: string }) {
  const theirs = attempt !== undefined && attempt.trim() ? alignSpelling(attempt, lex.text).theirs : lex.text.split('').map((ch) => ({ ch, ok: true }));
  return (
    <View style={{ gap: 10 }}>
      <TargetLetters lex={lex} theirs={theirs} />
      <Why lex={lex} onBlock />
    </View>
  );
}
