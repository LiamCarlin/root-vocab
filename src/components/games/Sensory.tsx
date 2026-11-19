import { ChevronsRight, Hand, MousePointerClick, Pointer, RotateCcw, Smartphone, Undo2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Echo } from '@/components/hands/Echo';
import { Coach } from '@/components/hands/kit';
import { MarbleRun } from '@/components/hands/MarbleRun';
import { SandTray } from '@/components/hands/SandTray';
import { TapSweep } from '@/components/hands/TapSweep';
import { TracePad, type TraceEvent } from '@/components/hands/TracePad';
import { Controls, SylWord } from '@/components/learn';
import { IconBtn } from '@/components/ui';
import { sayBeat, sayHum } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { wordSize } from '@/theme';
import { useReport } from './spellkit';
import type { GameProps } from './types';

type Kind = 'trace' | 'marble' | 'sand' | 'tap' | 'echo';
const MAX_H: Record<'trace' | 'marble' | 'sand', number> = { trace: 300, marble: 330, sand: 300 };

/**
 * The hands-on games as exercises: trace the letters, roll a marble through them, write the word in
 * sand from memory, tap and sweep its beats, say it back. Each finished beat is said and hummed.
 * There is no wrong here: finishing is the win. Skipping is the runner's own skip control, which
 * records nothing.
 */
function Sensory({ kind, lex, onResult, done }: GameProps & { kind: Kind }) {
  const { height } = useWindowDimensions();
  const report = useReport(onResult);
  const bump = useStore((s) => s.bump);
  const [run, setRun] = useState(0);
  const [assist, setAssist] = useState(false);
  const [finished, setFinished] = useState(false);
  const [off, setOff] = useState(false);
  const [input, setInput] = useState<'tilt' | 'touch'>('touch');
  const [beats, setBeats] = useState(0);
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
      if (says[i]) stopHum.current = sayBeat(parts, says, i);
    },
    [parts, says],
  );

  /** `wholeAfter` is how long to wait before the whole word is said: long enough for the last beat or letter to finish. */
  const finish = useCallback(
    (wholeAfter: number | null) => {
      setFinished(true);
      bump(kind);
      // Supported practice, not recall: the word was in front of the learner, so it counts as a half.
      report({ r: 0.5 });
      if (wholeAfter === null) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        stopHum.current?.();
        stopHum.current = sayHum(text, says);
      }, wholeAfter);
    },
    [bump, kind, report, text, says],
  );
  const onDone = useCallback(() => finish(480), [finish]);
  const onTrace = useCallback((e: TraceEvent) => setOff(e === 'off'), []);

  const locked = done || finished;
  const padH = Math.max(230, Math.min(MAX_H[kind === 'marble' ? 'marble' : kind === 'sand' ? 'sand' : 'trace'], height - 470));
  const padKey = `${kind}-${run}-${assist ? 'a' : 'f'}`;
  const restart = () => setRun((r) => r + 1);

  if (kind === 'sand') {
    return (
      <View style={{ flex: 1 }} pointerEvents={done ? 'none' : 'auto'}>
        <SandTray text={text} parts={parts} height={Math.max(220, Math.min(300, height - 520))} onDone={() => finish(200)} />
      </View>
    );
  }

  if (kind === 'echo') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }} pointerEvents={done ? 'none' : 'auto'}>
        <Echo text={text} parts={parts} says={says} onDone={() => finish(null)} />
      </View>
    );
  }

  if (kind === 'tap') {
    const sweeping = beats >= parts.length;
    return (
      <View style={{ flex: 1, gap: 18 }}>
        <View style={{ marginTop: 6 }}>
          <SylWord text={text} parts={parts} size={wordSize(text, 36, 320)} active={finished || sweeping ? -1 : beats} />
        </View>
        <View pointerEvents={locked ? 'none' : 'auto'}>
          <TapSweep key={padKey} parts={parts} says={says} onBeat={(i) => setBeats(i + 1)} onDone={() => finish(120)} />
        </View>
        <Coach icon={sweeping ? ChevronsRight : MousePointerClick} text={finished ? 'Tapped and blended.' : sweeping ? 'Now sweep across to blend them.' : 'One tap for each beat, left to right.'} tone={finished ? 'good' : 'plain'} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconBtn
            icon={RotateCcw}
            label="Start again"
            disabled={locked}
            onPress={() => {
              setBeats(0);
              restart();
            }}
          />
          <View style={{ flex: 1 }} />
          <Controls onReplay={() => sayHum(text, says)} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: 12 }}>
      {/* Once it is done the pad stays as it finished, and stops taking touches. */}
      <View pointerEvents={locked ? 'none' : 'auto'}>
        {kind === 'trace' && <TracePad key={padKey} text={text} parts={parts} onPart={onPart} onDone={onDone} onState={onTrace} assist={assist} height={padH} />}
        {kind === 'marble' && <MarbleRun key={padKey} text={text} parts={parts} onPart={onPart} onDone={onDone} onInput={setInput} height={padH} />}
      </View>

      {kind === 'trace' && <Coach icon={off ? Undo2 : assist ? Pointer : Hand} text={finished ? 'Traced.' : off ? 'Back to the dot.' : assist ? 'Touch each letter to write it.' : 'Start at the dot. Follow the arrow.'} tone={finished ? 'good' : off ? 'warn' : 'plain'} />}
      {kind === 'marble' && <Coach icon={input === 'tilt' ? Smartphone : Hand} text={finished ? 'Rolled.' : input === 'tilt' ? 'Tip the phone the way the letter goes.' : 'Drag on the board to tip it.'} tone={finished ? 'good' : 'plain'} />}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {kind === 'trace' && <IconBtn icon={Pointer} label="Touch a letter to write it, instead of tracing" active={assist} disabled={locked} onPress={() => setAssist((t) => !t)} />}
        <IconBtn icon={RotateCcw} label="Start again" disabled={locked} onPress={restart} />
        <View style={{ flex: 1 }} />
        <Controls onReplay={() => sayHum(text, says)} />
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
export function SandGame(props: GameProps) {
  return <Sensory kind="sand" {...props} />;
}
export function TapGame(props: GameProps) {
  return <Sensory kind="tap" {...props} />;
}
export function EchoGame(props: GameProps) {
  return <Sensory kind="echo" {...props} />;
}
