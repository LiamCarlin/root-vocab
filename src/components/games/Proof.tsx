import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Pop, Wiggle } from '@/components/fx';
import { Controls } from '@/components/learn';
import { Tap, Txt } from '@/components/ui';
import { say, speakable } from '@/lib/audio';
import { shuffled } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { Letters, SpellNote, diffOf, sameWord, useReport } from './spellkit';
import type { GameProps } from './types';

/**
 * Spot it: the right spelling and the two ways people most often get it wrong.
 * One tap. Afterwards the letters that differ are lit, so the eye learns exactly
 * where the wrong ones go wrong.
 */
export function Proof({ lex, onResult, done }: GameProps) {
  const { c, e1 } = useTheme();
  const report = useReport(onResult);
  // Shuffled once. The respelling ("frend") is never shown here: for some words it IS one of the wrong options.
  const [options] = useState(() => shuffled([lex.text, ...lex.wrong.filter((w) => !sameWord(w, lex.text)).slice(0, 2)]));
  const [picked, setPicked] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    say(speakable(lex.text));
  }, [lex.text]);

  const shown = done || picked !== null;

  const pick = (opt: string) => {
    if (shown) return;
    const right = sameWord(opt, lex.text);
    setPicked(opt);
    if (right) sfx.play('pop');
    else setShake((n) => n + 1);
    report({ r: right ? 1 : 0, note: right ? undefined : <SpellNote lex={lex} attempt={opt} /> });
  };

  const size = lex.text.length > 13 ? 21 : lex.text.length > 10 ? 24 : 28;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={{ gap: 12, marginTop: 6 }}>
        <Txt v="heading">{lex.meaning}</Txt>
        <Controls onReplay={() => say(speakable(lex.text))} />
      </View>

      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {options.map((opt) => {
          const right = sameWord(opt, lex.text);
          const mine = picked === opt;
          const card = (
            <Tap
              onPress={() => pick(opt)}
              disabled={shown}
              accessibilityRole="radio"
              accessibilityLabel={`Spelled ${opt.split('').join(' ')}`}
              accessibilityState={{ checked: mine, disabled: shown }}
              style={[
                { minHeight: 78, borderRadius: radius.lg, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: shown && right ? c.mint : shown && mine ? c.sun : c.surface, borderWidth: 2, borderColor: shown && right ? ON_BLOCK.ink : c.line, borderBottomWidth: shown ? 2 : 6, opacity: shown && !right && !mine ? 0.6 : 1 },
                shown ? null : e1,
              ]}>
              <View style={{ flex: 1 }}>
                {/* After the answer, the wrong spellings show which letters are off. */}
                <Letters text={opt} diff={shown && !right ? diffOf(opt, lex.text) : undefined} size={size} quiet={shown && right ? ON_BLOCK.ink : undefined} />
              </View>
              {shown && right && (
                <Pop>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={20} color="#FFFFFF" strokeWidth={3.2} />
                  </View>
                </Pop>
              )}
            </Tap>
          );
          return mine && !right ? (
            <Wiggle key={opt} trigger={shake}>
              {card}
            </Wiggle>
          ) : (
            <View key={opt}>{card}</View>
          );
        })}
      </View>
    </View>
  );
}
