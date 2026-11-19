import { ArrowRight, CircleDot, CircleQuestionMark, Hand, Pencil, Pointer, RotateCcw, RotateCw, Smartphone, Type, Vibrate, WandSparkles, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Controls, MarbleBoard, SkyPad, TracePad } from '@/components/learn';
import { Btn, IconBtn, Sheet, Txt } from '@/components/ui';
import { beatMs, buzz, hum, say, sayHum } from '@/lib/audio';
import { buddy } from '@/lib/buddy';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { ON_BLOCK, useTheme } from '@/theme';
import { Sparks, StepScreen } from './Frame';
import type { StepProps } from './types';

type Mode = 'trace' | 'marble' | 'sky';
const MODES: { id: Mode; icon: LucideIcon; label: string }[] = [
  { id: 'trace', icon: Pencil, label: 'Trace it with a finger' },
  { id: 'marble', icon: CircleDot, label: 'Roll a marble through it' },
  { id: 'sky', icon: WandSparkles, label: 'Write it in the air' },
];

// How each way works, as pictograms: an icon and a few words, nothing more.
const HELP: Record<Mode, { icon: LucideIcon; text: string }[]> = {
  trace: [
    { icon: Pencil, text: 'Part by part' },
    { icon: Vibrate, text: 'Buzz: off track' },
    { icon: Pointer, text: 'Or tap' },
  ],
  marble: [
    { icon: Smartphone, text: 'Lay flat' },
    { icon: RotateCw, text: 'Tip to roll' },
    { icon: CircleDot, text: 'Touch each dot' },
    { icon: Hand, text: 'Or drag' },
  ],
  sky: [
    { icon: Hand, text: 'Thumb down' },
    { icon: Smartphone, text: 'Sweep the phone' },
    { icon: Type, text: 'Big letters' },
    { icon: Pencil, text: 'Or finger-draw' },
  ],
};

/** Which way a word starts with. It rotates from word to word, so learners meet all three. */
const firstMode = (id: string): Mode => MODES[id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % MODES.length].id;

/**
 * Move: one word, three ways to move through it. Trace it with a finger,
 * tilt the phone to roll a marble through its letters, or write it in the
 * air with the phone as a wand. Each finished beat is said and hummed.
 */
export function Move({ lex, top, next, skip }: StepProps) {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  const bump = useStore((s) => s.bump);
  const [mode, setMode] = useState<Mode>(() => firstMode(lex.id));
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const [tapMode, setTapMode] = useState(false);
  const [help, setHelp] = useState(false);
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
      stopHum.current = hum(beatMs(says[i]));
      say(says[i]);
    },
    [says],
  );

  const onDone = useCallback(() => {
    setDone(true);
    // Counts toward the marble and sky-writing badges and the day's quests.
    bump(mode);
    buzz.good();
    sfx.play('good');
    buddy.react('correct');
    // Let the last beat (or letter) finish before the whole word.
    if (wholeTimer.current) clearTimeout(wholeTimer.current);
    wholeTimer.current = setTimeout(() => {
      stopHum.current?.();
      stopHum.current = sayHum(text, says);
    }, 480);
  }, [text, says, mode, bump]);

  const restart = () => {
    if (wholeTimer.current) clearTimeout(wholeTimer.current);
    setDone(false);
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
  const padH = Math.max(210, Math.min(mode === 'sky' ? 340 : mode === 'marble' ? 300 : 240, height - 520));
  const padKey = `${mode}-${run}-${tapMode ? 't' : 'f'}`;

  return (
    <StepScreen
      top={top}
      scroll={false}
      gap={14}
      footer={
        <>
          <Controls onReplay={replay} onSkip={skip} />
          <Btn icon={ArrowRight} a11y="Next" onPress={next} disabled={!done} />
        </>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {MODES.map((m) => (
          <IconBtn key={m.id} icon={m.icon} label={m.label} active={mode === m.id} onPress={() => pick(m.id)} />
        ))}
        <View style={{ flex: 1 }} />
        <IconBtn icon={CircleQuestionMark} label="How it works" kind="soft" size={44} onPress={() => setHelp(true)} />
      </View>

      <View>
        {mode === 'trace' && <TracePad key={padKey} text={text} parts={lex.parts} onPart={onPart} onDone={onDone} tapMode={tapMode} height={padH} />}
        {mode === 'marble' && <MarbleBoard key={padKey} text={text} parts={lex.parts} onPart={onPart} onDone={onDone} height={padH} />}
        {mode === 'sky' && <SkyPad key={padKey} text={text} onDone={onDone} height={padH} />}
        <Sparks on={done} size={300} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, flex: 1 }}>
        {mode === 'trace' && (
          <IconBtn
            icon={Pointer}
            label="Tap instead of tracing"
            active={tapMode}
            size={48}
            onPress={() => {
              setTapMode((t) => !t);
              setDone(false);
            }}
          />
        )}
        <IconBtn icon={RotateCcw} label="Start again" size={48} onPress={restart} />
      </View>

      <Sheet visible={help} onClose={() => setHelp(false)} title="How it works">
        {HELP[mode].map((h) => (
          <View key={h.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}>
              <h.icon size={24} color={ON_BLOCK.ink} strokeWidth={2.3} />
            </View>
            <Txt v="heading" style={{ flex: 1 }}>
              {h.text}
            </Txt>
          </View>
        ))}
      </Sheet>
    </StepScreen>
  );
}
