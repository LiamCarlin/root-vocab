import { ArrowRight, CircleDot, Hand, PenLine, Pointer, RotateCcw, Smartphone, Undo2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Coach, Segmented } from '@/components/hands/kit';
import { MarbleRun } from '@/components/hands/MarbleRun';
import { SandTray } from '@/components/hands/SandTray';
import { TracePad, type TraceEvent } from '@/components/hands/TracePad';
import { Controls } from '@/components/learn';
import { Btn, IconBtn } from '@/components/ui';
import { beatMs, hum, say, sayHum } from '@/lib/audio';
import { canPlay } from '@/lib/engine';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { StepScreen } from './Frame';
import type { StepProps } from './types';

type Mode = 'trace' | 'marble' | 'sand';
const MODES: { id: Mode; icon: typeof PenLine; label: string; a11y: string }[] = [
  { id: 'trace', icon: PenLine, label: 'Trace', a11y: 'Trace each letter with a finger' },
  { id: 'marble', icon: CircleDot, label: 'Marble', a11y: 'Tip the phone to roll a marble along each letter' },
  { id: 'sand', icon: Hand, label: 'Sand', a11y: 'Write the word in sand from memory' },
];

/**
 * Move: the word through the hand. Three ways, the learner's choice: trace each letter the way it is
 * written, tip the phone to roll a marble along the letters, or smooth a tray of sand and write the
 * word from memory. Each finished beat is said and hummed. The way a word starts with rotates from
 * word to word, so all three are met.
 */
export function Move({ lex, top, next, skip, addRetry }: StepProps) {
  const { height } = useWindowDimensions();
  const bump = useStore((s) => s.bump);
  // A word with a character there is no drawing for (or a very long beat) can still be written in sand.
  const [modes] = useState(() => MODES.filter((m) => canPlay(lex, m.id)));
  const [mode, setMode] = useState<Mode>(() => (modes.length ? modes[lex.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % modes.length].id : 'sand'));
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const [assist, setAssist] = useState(false);
  const [off, setOff] = useState(false);
  const [input, setInput] = useState<'tilt' | 'touch'>('touch');
  const stopHum = useRef<(() => void) | null>(null);
  const wholeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const says = lex.says;
  const text = lex.text;

  useEffect(
    () => () => {
      stopHum.current?.();
      if (wholeTimer.current) clearTimeout(wholeTimer.current);
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

  const finish = useCallback(
    (wholeAfter: number) => {
      setDone(true);
      // Counts toward the day's quests and the hands-on badge.
      bump(mode);
      sfx.play('good');
      // Let the last beat (or letter) finish before the whole word.
      if (wholeTimer.current) clearTimeout(wholeTimer.current);
      wholeTimer.current = setTimeout(() => {
        stopHum.current?.();
        stopHum.current = sayHum(text, says);
      }, wholeAfter);
    },
    [text, says, mode, bump],
  );
  const onDone = useCallback(() => finish(480), [finish]);
  const onTrace = useCallback((e: TraceEvent) => setOff(e === 'off'), []);

  const restart = () => {
    if (wholeTimer.current) clearTimeout(wholeTimer.current);
    setDone(false);
    setOff(false);
    setRun((r) => r + 1);
  };

  const pick = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    restart();
  };

  const replay = () => {
    stopHum.current?.();
    stopHum.current = sayHum(text, says);
  };

  // The pad takes what the screen can spare, so nothing has to scroll under a moving finger.
  const padH = Math.max(220, Math.min(mode === 'marble' ? 330 : 300, height - (mode === 'sand' ? 560 : 500)));
  const padKey = `${mode}-${run}-${assist ? 'a' : 'f'}`;

  return (
    <StepScreen
      top={top}
      pose={mode === 'trace' ? 'trace' : mode === 'marble' ? 'marble' : 'write'}
      scroll={false}
      gap={12}
      footer={
        <>
          <Controls onReplay={replay} onSkip={skip} />
          <Btn icon={ArrowRight} a11y="Next" onPress={next} disabled={!done} />
        </>
      }>
      {modes.length > 1 && <Segmented options={modes} value={mode} onChange={pick} a11y="How to move through the word" />}

      {mode === 'sand' ? (
        <View pointerEvents={done ? 'none' : 'auto'}>
          <SandTray key={padKey} text={text} parts={lex.parts} height={padH} onDone={() => finish(200)} onRetry={addRetry} />
        </View>
      ) : (
        <>
          <View pointerEvents={done ? 'none' : 'auto'}>
            {mode === 'trace' && <TracePad key={padKey} text={text} parts={lex.parts} onPart={onPart} onDone={onDone} onState={onTrace} assist={assist} height={padH} />}
            {mode === 'marble' && <MarbleRun key={padKey} text={text} parts={lex.parts} onPart={onPart} onDone={onDone} onInput={setInput} height={padH} />}
          </View>

          {mode === 'trace' && <Coach icon={off ? Undo2 : assist ? Pointer : Hand} text={done ? 'Traced.' : off ? 'Back to the dot.' : assist ? 'Touch each letter to write it.' : 'Start at the dot. Follow the arrow.'} tone={done ? 'good' : off ? 'warn' : 'plain'} />}
          {mode === 'marble' && <Coach icon={input === 'tilt' ? Smartphone : Hand} text={done ? 'Rolled.' : input === 'tilt' ? 'Tip the phone the way the letter goes.' : 'Drag on the board to tip it.'} tone={done ? 'good' : 'plain'} />}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {mode === 'trace' && (
              <IconBtn
                icon={Pointer}
                label="Touch a letter to write it, instead of tracing"
                active={assist}
                size={48}
                onPress={() => {
                  setAssist((t) => !t);
                  setDone(false);
                }}
              />
            )}
            <IconBtn icon={RotateCcw} label="Start again" size={48} onPress={restart} />
          </View>
        </>
      )}
    </StepScreen>
  );
}
