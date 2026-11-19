import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Controls } from '@/components/learn';
import { Btn, Field, Txt } from '@/components/ui';
import { sayHum } from '@/lib/audio';
import { exampleFor, splitAround } from '@/lib/lexicon';
import { useStore } from '@/lib/store';
import { radius, useTheme } from '@/theme';
import { Letters, SpellNote, diffOf, editsFrom, sameWord, useReport } from './spellkit';
import type { GameProps } from './types';

/**
 * Hear and write: the word is spoken (again, and slower, as often as you like),
 * with a sentence that shows where it fits. Typed spelling is checked letter by letter.
 */
export function Dictate({ lex, onResult, done }: GameProps) {
  const { c, font } = useTheme();
  const report = useReport(onResult);
  const interests = useStore((s) => s.profile.interests);
  const [example] = useState(() => exampleFor(lex, interests)?.text ?? '');
  const [attempt, setAttempt] = useState('');
  const [checked, setChecked] = useState<string | null>(null);
  const stopHum = useRef<(() => void) | null>(null);

  const speak = () => {
    stopHum.current?.();
    stopHum.current = sayHum(lex.text, lex.says);
  };

  useEffect(() => {
    stopHum.current = sayHum(lex.text, lex.says);
    return () => stopHum.current?.();
  }, [lex.text, lex.says]);

  const locked = done || checked !== null;
  const [before, word, after] = splitAround(example);
  const exact = checked !== null && sameWord(checked, lex.text);

  const check = () => {
    if (locked || !attempt.trim()) return;
    const ok = sameWord(attempt, lex.text);
    const near = !ok && editsFrom(attempt, lex.text) <= 1;
    setChecked(attempt);
    report({ r: ok ? 1 : near ? 0.5 : 0, note: ok ? undefined : <SpellNote lex={lex} attempt={attempt} /> });
  };

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ marginTop: 8 }}>
        <Controls onReplay={speak} />
      </View>

      {!!word && (
        <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 18 }}>
          <Txt v="body">
            {before}
            {locked ? (
              <Text style={{ fontFamily: font('b'), color: c.ink }}>{word}</Text>
            ) : (
              <Text accessibilityLabel="blank" style={{ color: c.ink3 }}>
                {' '.repeat(2)}
                {'_'.repeat(Math.max(5, Math.min(9, word.length)))}
                {' '.repeat(2)}
              </Text>
            )}
            {after}
          </Txt>
        </View>
      )}

      <Field big value={checked ?? attempt} onChangeText={setAttempt} editable={!locked} autoFocus returnKeyType="done" onSubmitEditing={check} accessibilityLabel="Write the word you hear" style={{ minWidth: 0 }} />

      {checked !== null && !exact && (
        <View style={{ paddingHorizontal: 6 }}>
          <Letters text={checked} diff={diffOf(checked, lex.text)} size={26} />
        </View>
      )}

      {!locked && <Btn icon={Check} a11y="Check my spelling" disabled={!attempt.trim()} onPress={check} />}
    </View>
  );
}
