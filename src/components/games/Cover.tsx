import { Check, Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Peek } from '@/components/Buddy';
import { Controls } from '@/components/learn';
import { Btn, Field, IconBtn } from '@/components/ui';
import { say, sayHum, speakable } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { radius, useTheme, wordSize } from '@/theme';
import { Letters, SpellNote, diffOf, WordBeats, editsFrom, sameWord, useReport } from './spellkit';
import type { GameProps } from './types';

/**
 * Look, say, cover, write, check: the classic routine for making a spelling stick.
 * Look for as long as you like, then Root climbs over the card and hides it while
 * you write from memory. A second look is always allowed and never timed: the word stays
 * in view until you cover it again or start typing. It just counts as a cue.
 */
export function Cover({ lex, onResult, done }: GameProps) {
  const { c, e1 } = useTheme();
  const report = useReport(onResult);
  const [phase, setPhase] = useState<'look' | 'write'>('look');
  const [covered, setCovered] = useState(false);
  const [peeks, setPeeks] = useState(0);
  const [attempt, setAttempt] = useState('');
  const [checked, setChecked] = useState<string | null>(null);
  const stopHum = useRef<(() => void) | null>(null);

  useEffect(() => {
    stopHum.current = sayHum(lex.text, lex.says);
    return () => {
      stopHum.current?.();
    };
  }, [lex.text, lex.says]);

  const locked = done || checked !== null;
  const hidden = covered && !locked;

  const cover = () => {
    sfx.play('whoosh');
    setCovered(true);
    setPhase('write');
  };

  const recover = () => {
    sfx.play('whoosh');
    setCovered(true);
  };

  /** Look again, for as long as you need; the same button (or the first letter typed) covers it back up. */
  const peek = () => {
    if (locked) return;
    if (!covered) {
      recover();
      return;
    }
    setPeeks((n) => n + 1);
    setCovered(false);
  };

  const write = (t: string) => {
    setAttempt(t);
    if (!covered && !locked) recover();
  };

  const check = () => {
    if (locked || !attempt.trim()) return;
    const exact = sameWord(attempt, lex.text);
    const near = !exact && editsFrom(attempt, lex.text) <= 1;
    setChecked(attempt);
    report({ r: exact ? (peeks ? 0.5 : 1) : near ? 0.5 : 0, cue: peeks, attempt, note: exact ? undefined : <SpellNote lex={lex} attempt={attempt} /> });
  };

  const wrote = checked ?? attempt;
  const off = checked !== null && !sameWord(checked, lex.text);

  return (
    <View style={{ flex: 1, gap: 16 }}>
      {/* The card. Root needs clear air above it to climb over, so the wrapper is not clipped. */}
      <View style={{ position: 'relative', marginTop: 86 }}>
        <View style={[{ minHeight: 132, borderRadius: radius.xl, backgroundColor: hidden ? c.surface2 : c.surface, borderWidth: hidden ? 2.5 : 1, borderColor: c.line, borderStyle: hidden ? 'dashed' : 'solid', paddingHorizontal: 18, paddingVertical: 22, alignItems: 'center', justifyContent: 'center' }, hidden ? null : e1]} accessible={hidden} accessibilityLabel={hidden ? 'The word is covered' : undefined}>
          {hidden ? <EyeOff size={40} color={c.ink3} strokeWidth={2.2} /> : <WordBeats lex={lex} size={wordSize(lex.text, 46, 300)} />}
        </View>
        {hidden && <Peek from="top" pose="calm" size={150} align="center" inset={0} show={0.56} onPress={peek} a11y="Root is covering the word. Tap to look again." />}
      </View>

      {phase === 'look' && !locked ? (
        <>
          <Controls onReplay={() => say(speakable(lex.text))} />
          <Btn icon={EyeOff} label="Cover" a11y="Cover the word and write it from memory" onPress={cover} />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Field big value={wrote} onChangeText={write} editable={!locked} autoFocus returnKeyType="done" onSubmitEditing={check} accessibilityLabel="Write the word" style={{ minWidth: 0 }} />
            </View>
            {!locked && <IconBtn icon={covered ? Eye : EyeOff} label={covered ? 'Look again' : 'Cover it again'} kind="butter" size={60} onPress={peek} />}
          </View>
          {off && checked !== null && (
            <View style={{ paddingHorizontal: 6 }}>
              <Letters text={checked} diff={diffOf(checked, lex.text)} size={26} />
            </View>
          )}
          {!locked && <Btn icon={Check} a11y="Check my spelling" disabled={!attempt.trim()} onPress={check} />}
        </>
      )}
    </View>
  );
}
