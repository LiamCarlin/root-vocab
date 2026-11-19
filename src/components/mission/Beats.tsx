import { ArrowRight, ChevronsRight, MousePointerClick } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Coach } from '@/components/hands/kit';
import { TapSweep } from '@/components/hands/TapSweep';
import { Controls, SylWord } from '@/components/learn';
import { Btn } from '@/components/ui';
import { sayHum } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { wordSize } from '@/theme';
import { StepScreen } from './Frame';
import type { StepProps } from './types';

/**
 * Beats: tap the word out, one finger for every beat, then sweep across them to blend the beats
 * back into the word. The rhythm goes in through the hand. A one-beat word is a single tap and a sweep.
 */
export function Beats({ lex, top, next, skip }: StepProps) {
  const bump = useStore((s) => s.bump);
  const [done, setDone] = useState(false);
  const [beats, setBeats] = useState(0);
  const stop = useRef<(() => void) | null>(null);
  const after = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      stop.current?.();
      if (after.current) clearTimeout(after.current);
    },
    [],
  );

  const replay = () => {
    stop.current?.();
    stop.current = sayHum(lex.text, lex.says);
  };

  const finish = () => {
    setDone(true);
    bump('tap');
    sfx.play('good');
    // The sweep ends in the whole word.
    after.current = setTimeout(replay, 120);
  };

  const sweeping = beats >= lex.parts.length;
  return (
    <StepScreen
      top={top}
      gap={22}
      footer={
        <>
          <Controls onReplay={replay} onSkip={skip} />
          <Btn icon={ArrowRight} a11y="Next" onPress={next} disabled={!done} />
        </>
      }>
      <View style={{ marginTop: 6 }}>
        <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 38, 320)} active={done || sweeping ? -1 : beats} />
      </View>
      <View pointerEvents={done ? 'none' : 'auto'}>
        <TapSweep parts={lex.parts} says={lex.says} onBeat={(i) => setBeats(i + 1)} onDone={finish} />
      </View>
      <Coach icon={sweeping ? ChevronsRight : MousePointerClick} text={done ? 'Tapped and blended.' : sweeping ? 'Now sweep across to blend them.' : 'One tap for each beat, left to right.'} tone={done ? 'good' : 'plain'} />
    </StepScreen>
  );
}
