import { ArrowRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { BeatDrum, Controls, SylWord } from '@/components/learn';
import { Btn } from '@/components/ui';
import { buzz, sayHum } from '@/lib/audio';
import { buddy } from '@/lib/buddy';
import { sfx } from '@/lib/sfx';
import { wordSize } from '@/theme';
import { Sparks, StepScreen } from './Frame';
import type { StepProps } from './types';

/** Beats: drum the word, one tap for every syllable. The rhythm goes in through the hand. A one-beat word is a single tap. */
export function Beats({ lex, top, next, skip }: StepProps) {
  const [done, setDone] = useState(false);
  const [beat, setBeat] = useState(-1);
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
    buzz.good();
    sfx.play('good');
    buddy.react('correct');
    // The whole word once more, after the last beat has had its say.
    after.current = setTimeout(replay, 500);
  };

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
        <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 34, 320)} active={done ? -1 : beat} />
      </View>
      <View>
        <BeatDrum parts={lex.parts} says={lex.says} onBeat={setBeat} onDone={finish} />
        <Sparks on={done} size={300} />
      </View>
    </StepScreen>
  );
}
