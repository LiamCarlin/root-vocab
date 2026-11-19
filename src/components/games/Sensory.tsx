import { Pointer, RotateCcw } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Controls, MarbleBoard, SkyPad, TracePad } from '@/components/learn';
import { IconBtn } from '@/components/ui';
import { beatMs, hum, say, sayHum } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { useReport } from './spellkit';
import type { GameProps } from './types';

type Kind = 'trace' | 'marble' | 'sky';
const MAX_H: Record<Kind, number> = { trace: 250, marble: 310, sky: 350 };

/**
 * The whole-body spelling games as exercises: trace the letters with a finger,
 * roll a marble through them by tilting the phone, or write them in the air.
 * Each finished beat is said and hummed. There is no wrong here: finishing is
 * the win. Skipping is the runner's own skip control, which records nothing.
 */
function Sensory({ kind, lex, onResult, done }: GameProps & { kind: Kind }) {
  const { height } = useWindowDimensions();
  const report = useReport(onResult);
  const bump = useStore((s) => s.bump);
  const [run, setRun] = useState(0);
  const [tapMode, setTapMode] = useState(false);
  const [finished, setFinished] = useState(false);
  const stopHum = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { text, says, parts } = lex;

  useEffect(
    () => () => {
      stopHum.current?.();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onPart = useCallback(
    (i: number) => {
      stopHum.current?.();
      stopHum.current = hum(beatMs(says[i] ?? ''));
      if (says[i]) say(says[i]);
    },
    [says],
  );

  const onDone = useCallback(() => {
    setFinished(true);
    bump(kind);
    // Supported practice, not recall: the letters were on screen the whole time, so it counts as a half.
    report({ r: 0.5 });
    // Let the last beat (or letter) finish before the whole word.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      stopHum.current?.();
      stopHum.current = sayHum(text, says);
    }, 480);
  }, [bump, kind, report, text, says]);

  const locked = done || finished;
  const padH = Math.max(210, Math.min(MAX_H[kind], height - 470));
  const padKey = `${kind}-${run}-${tapMode ? 't' : 'f'}`;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      {/* Once it is done the pad stays as it finished, and stops taking touches. */}
      <View pointerEvents={locked ? 'none' : 'auto'}>
        {kind === 'trace' && <TracePad key={padKey} text={text} parts={parts} onPart={onPart} onDone={onDone} tapMode={tapMode} height={padH} />}
        {kind === 'marble' && <MarbleBoard key={padKey} text={text} parts={parts} onPart={onPart} onDone={onDone} height={padH} />}
        {kind === 'sky' && <SkyPad key={padKey} text={text} onDone={onDone} height={padH} />}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {kind === 'trace' && <IconBtn icon={Pointer} label="Tap instead of tracing" active={tapMode} disabled={locked} onPress={() => setTapMode((t) => !t)} />}
        <IconBtn icon={RotateCcw} label="Start again" disabled={locked} onPress={() => setRun((r) => r + 1)} />
        <View style={{ flex: 1 }} />
        <Controls onReplay={() => say(text)} />
      </View>
    </View>
  );
}

export function TraceGame(props: GameProps) {
  return <Sensory kind="trace" {...props} />;
}
export function MarbleGame(props: GameProps) {
  return <Sensory kind="marble" {...props} />;
}
export function SkyGame(props: GameProps) {
  return <Sensory kind="sky" {...props} />;
}
