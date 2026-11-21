import { Volume2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { useElapsed, useOnce } from '@/components/play/hooks';
import { Option, type OptionState } from '@/components/play/Option';
import { Block, IconBtn, Txt } from '@/components/ui';
import { BANK } from '@/data/words';
import { buzz, say } from '@/lib/audio';
import { exampleFor, shuffled, splitAround, type Lexeme } from '@/lib/lexicon';
import { useStore } from '@/lib/store';
import { ON_BLOCK } from '@/theme';
import type { GameProps } from './types';

/** The word as the sentence uses it, its look-alikes, and one unrelated word of about the same level. */
function choices(lex: Lexeme, answer: string): string[] {
  const taken = new Set([answer.toLowerCase(), lex.text.toLowerCase()]);
  const out = [answer];
  for (const l of lex.lookalikes) {
    if (out.length >= 3 || taken.has(l.toLowerCase())) continue;
    taken.add(l.toLowerCase());
    out.push(l);
  }
  const pool = shuffled(BANK.filter((b) => !taken.has(b.text.toLowerCase()) && Math.abs(b.level - lex.level) <= 1 && (!lex.pos || b.pos === lex.pos)));
  for (const b of pool) {
    if (out.length >= 4) break;
    out.push(b.text);
  }
  return shuffled(out);
}

/**
 * Fill the gap: a sentence with the word missing, and a few words that could go there.
 * Meaning in context pulls the word out. First pick right is clean; a second pick still counts.
 */
export function Gap({ lex, onResult, done }: GameProps) {
  const interests = useStore((s) => s.profile.interests);
  const elapsed = useElapsed();
  const sentence = useOnce(() => exampleFor(lex, interests)?.text ?? lex.life);
  const [before, answer, after] = splitAround(sentence);
  const word = answer || lex.text;
  const options = useOnce(() => choices(lex, word));
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const sent = useRef(false);
  const open = solved || done;

  const pick = (opt: string) => {
    if (sent.current) return;
    if (opt === word) {
      sent.current = true;
      setSolved(true);
      onResult({ r: wrong.length === 0 ? 1 : 0.5, ms: elapsed() });
      return;
    }
    buzz.nudge();
    const next = [...wrong, opt];
    setWrong(next);
    if (next.length >= 2) {
      sent.current = true;
      setSolved(true);
      onResult({ r: 0, ms: elapsed() });
    }
  };

  const stateOf = (opt: string): OptionState => (opt === word ? (open ? 'right' : 'idle') : wrong.includes(opt) ? 'wrong' : open ? 'dim' : 'idle');
  const prompt = answer ? null : lex.meaning; // a word with no example falls back to its meaning

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <Block pad={20} style={{ gap: 14 }}>
        <Txt v="title" accessibilityLabel={prompt ?? `${before} ${open ? word : 'blank'} ${after}`}>
          {prompt ?? (
            <>
              {before}
              {open ? (
                <Text style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: ON_BLOCK.ink }}> {word} </Text>
              ) : (
                <Text style={{ color: ON_BLOCK.ink3 }} accessibilityElementsHidden>
                  {'_'.repeat(Math.max(5, Math.min(9, word.length)))}
                </Text>
              )}
              {after}
            </>
          )}
        </Txt>
        <View style={{ alignItems: 'flex-start' }}>
          <IconBtn icon={Volume2} label="Hear the sentence" kind="glass" size={48} onPress={() => say(prompt ?? `${before}${open ? word : ', blank, '}${after}`)} />
        </View>
      </Block>

      <View style={{ gap: 10 }}>
        {options.map((opt) => (
          <Option key={opt} label={opt} big state={stateOf(opt)} disabled={open} onPress={() => pick(opt)} />
        ))}
      </View>
    </View>
  );
}
