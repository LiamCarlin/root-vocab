import { Check, Mic, Volume2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { SylWord } from '@/components/learn';
import { Txt } from '@/components/ui';
import { beatMs, buzz, hum, humWord, listenOnce, micAvailable, sayBeat, sayHum, stopListening, stopSpeaking } from '@/lib/audio';
import { judgeSpoken, slug } from '@/lib/lexicon';
import { note } from '@/lib/signals';
import { ON_BLOCK, useTheme, wordSize } from '@/theme';

// ── Echo: my turn, your turn ──────────────────────────────────────────────
// A word is not learned until the mouth has made it. The routine is the one every structured
// literacy lesson opens with: the teacher says it, the learner says it back. Root says a beat;
// the learner holds the button and says the same beat, feeling it hum in the hand for as long
// as it lasts; then the next beat; then the whole word.
//
//   Root's turn   the beat lights in the word, is said, and hums
//   your turn     hold the button and say it. Letting go moves on.
//   last turn     the whole word. Where the phone can listen it does, and says if it heard the
//                 word; where it cannot, saying it is enough. Nothing here ever blocks.

type Turn = 'root' | 'you';

/** A round talk button: hold to speak. It hums under the thumb while it is held. */
export function HoldToSay({ active, held, onIn, onOut, size = 128, done }: { active: boolean; held: boolean; onIn: () => void; onOut: () => void; size?: number; done?: boolean }) {
  const { c, reduceMotion } = useTheme();
  const ring = useSharedValue(0);
  useEffect(() => {
    if (held && !reduceMotion) ring.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }), -1, false));
    else {
      cancelAnimation(ring);
      ring.set(0);
    }
  }, [held, reduceMotion, ring]);
  const wave = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ring.value * 0.5 }], opacity: held ? 0.35 * (1 - ring.value) : 0 }));
  const bg = done ? c.mint : held ? c.orange : active ? c.press : c.surface2;
  const fg = done || held ? ON_BLOCK.ink : active ? c.onInk : c.ink3;
  const Icon = done ? Check : active ? Mic : Volume2;
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: c.orange }, wave]} />
      <Pressable
        onPressIn={active && !done ? onIn : undefined}
        onPressOut={active && !done ? onOut : undefined}
        disabled={!active || done}
        accessibilityRole="button"
        accessibilityLabel={done ? 'Said' : active ? 'Hold and say it' : 'Listen'}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', transform: [{ scale: held ? 0.96 : 1 }] }}>
        <Icon size={size * 0.36} color={fg} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

export function Echo({ text, parts, says, onDone, whole, quiet }: { text: string; parts: string[]; says: string[]; /** `heard` is true when the phone listened and recognised the word, false when it listened and did not, null when it could not listen. */ onDone: (heard: boolean | null) => void; /** Only the whole word, no beat-by-beat turns. */ whole?: boolean; /** For a screen that has already said the word: Root does not say it first, and the button sits in a row with its label. */ quiet?: boolean }) {
  const { c } = useTheme();
  // Turn i < beats is a beat; the last turn is the whole word. A one-beat word has only the last turn.
  const beats = whole || parts.length < 2 ? 0 : parts.length;
  const [i, setI] = useState(0);
  const [turn, setTurn] = useState<Turn>(quiet ? 'you' : 'root');
  const [held, setHeld] = useState(false);
  const [done, setDone] = useState(false);
  const [miss, setMiss] = useState(false);
  const [mic] = useState(() => micAvailable());
  const stopHum = useRef<(() => void) | null>(null);
  const downAt = useRef(0);
  const tries = useRef(0);
  const listening = useRef<Promise<boolean | null> | null>(null);
  const alive = useRef(true);
  const isWhole = i >= beats;

  const model = useCallback(
    (idx: number) => {
      setTurn('root');
      stopHum.current?.();
      const next = () => alive.current && setTurn('you');
      if (idx >= beats) {
        stopHum.current = sayHum(text, says, { onDone: next });
      } else {
        stopHum.current = sayBeat(parts, says, idx, { onDone: next });
      }
    },
    [beats, parts, says, text],
  );

  useEffect(() => {
    alive.current = true;
    const t = quiet ? null : setTimeout(() => model(0), 450);
    return () => {
      alive.current = false;
      if (t) clearTimeout(t);
      stopHum.current?.();
      stopListening();
    };
  }, [model, quiet]);

  const pressIn = () => {
    stopSpeaking();
    downAt.current = Date.now();
    setHeld(true);
    setMiss(false);
    stopHum.current?.();
    // The hum under the thumb lasts about as long as the beat does, so its length is felt while it is said.
    stopHum.current = isWhole ? humWord(says, true, text) : hum(beatMs(says[i], true));
    if (isWhole && mic) {
      listening.current = listenOnce({ hints: [text], maxMs: 6000 }).then((h) => {
        if (!h.ok) return h.reason === 'nothing' ? false : null;
        // How the word came out is kept for the model: a word that came out wrong comes back to be said again.
        const res = judgeSpoken(h.transcript, text);
        note({ k: 'say', id: slug(text), res });
        return res !== 'miss';
      });
    }
  };

  const pressOut = async () => {
    setHeld(false);
    stopHum.current?.();
    // A brush of the button is not a turn.
    if (Date.now() - downAt.current < 220) {
      stopListening();
      listening.current = null;
      return;
    }
    if (!isWhole) {
      buzz.tap();
      const n = i + 1;
      setI(n);
      setTimeout(() => alive.current && model(n), 260);
      return;
    }
    let heard: boolean | null = null;
    if (listening.current) {
      stopListening();
      heard = await listening.current;
      listening.current = null;
      if (!alive.current) return;
    }
    tries.current += 1;
    // Heard something else: Root says it once more and the learner has another go. Twice is enough.
    if (heard === false && tries.current < 2) {
      buzz.nudge();
      setMiss(true);
      setTimeout(() => alive.current && model(i), 500);
      return;
    }
    buzz.good();
    setDone(true);
    onDone(heard);
  };

  const label = done ? 'Said it' : turn === 'root' ? 'Listen' : held ? '' : miss ? 'Once more' : isWhole ? 'Hold and say the word' : 'Hold and say it';

  if (quiet) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
        <HoldToSay active={turn === 'you'} held={held} onIn={pressIn} onOut={pressOut} done={done} size={72} />
        <View style={{ flex: 1, gap: 2 }}>
          {/* Says exactly what to say: the word, not the sentence. When it is done, it says so. */}
          <Txt v="heading">{done ? `Done: you said “${text}”` : held ? 'Listening…' : miss ? `Try “${text}” once more` : turn === 'root' ? 'Listen' : `Hold the button and say “${text}”`}</Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <SylWord text={text} parts={parts} size={wordSize(text, 40, 320)} active={done || isWhole ? -1 : i} />
      {beats > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }} accessible accessibilityLabel={`Turn ${Math.min(i + 1, beats + 1)} of ${beats + 1}`}>
          {Array.from({ length: beats + 1 }, (_, k) => (
            <View key={k} style={{ width: k === i && !done ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k < i || done ? c.ink : k === i ? c.orange : c.line }} />
          ))}
        </View>
      )}
      <HoldToSay active={turn === 'you'} held={held} onIn={pressIn} onOut={pressOut} done={done} />
      <View style={{ height: 26, justifyContent: 'center' }}>
        <Txt v="heading" color={turn === 'root' && !done ? 'ink3' : 'ink'} center>
          {label}
        </Txt>
      </View>
    </View>
  );
}
