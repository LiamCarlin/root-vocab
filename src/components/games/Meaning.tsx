import { Volume2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { SylWord } from '@/components/learn';
import { useElapsed, useOnce } from '@/components/play/hooks';
import { Option, type OptionState } from '@/components/play/Option';
import { Block, IconBtn } from '@/components/ui';
import { BANK } from '@/data/words';
import { buzz, say, speakable } from '@/lib/audio';
import { shuffled, type Lexeme } from '@/lib/lexicon';
import { ON_BLOCK, wordSize } from '@/theme';
import type { GameProps } from './types';

/** The word's own meaning and two from other words of about the same level, mixed. */
function meanings(lex: Lexeme): string[] {
  const near = BANK.filter((b) => b.id !== lex.id && b.meaning !== lex.meaning && Math.abs(b.level - lex.level) <= 1);
  const samePos = near.filter((b) => b.pos === lex.pos);
  const pool = shuffled(samePos.length >= 2 ? samePos : near.length >= 2 ? near : BANK.filter((b) => b.id !== lex.id));
  return shuffled([lex.meaning, ...pool.slice(0, 2).map((b) => b.meaning)]);
}

/** Meaning: the word, heard and seen, and three things it could mean. */
export function Meaning({ lex, onResult, done }: GameProps) {
  const elapsed = useElapsed();
  const options = useOnce(() => meanings(lex));
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const sent = useRef(false);
  const open = solved || done;

  useEffect(() => {
    const t = setTimeout(() => say(speakable(lex.text)), 350);
    return () => clearTimeout(t);
  }, [lex.text]);

  const pick = (opt: string) => {
    if (sent.current) return;
    if (opt === lex.meaning) {
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

  const stateOf = (opt: string): OptionState => (opt === lex.meaning ? (open ? 'right' : 'idle') : wrong.includes(opt) ? 'wrong' : open ? 'dim' : 'idle');

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <Block tone="brand" pad={20} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 120 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 40, 200)} color={ON_BLOCK.ink} on="brand" />
        </View>
        <IconBtn icon={Volume2} label={`Hear ${lex.text}`} kind="ink" size={56} onPress={() => say(speakable(lex.text))} />
      </Block>
      <View style={{ gap: 10 }}>
        {options.map((opt) => (
          <Option key={opt} label={opt} state={stateOf(opt)} disabled={open} onPress={() => pick(opt)} />
        ))}
      </View>
    </View>
  );
}
