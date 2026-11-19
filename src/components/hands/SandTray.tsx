import { Check, Eraser, Eye, Hand, RotateCcw, Vibrate } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { SylWord } from '@/components/learn';
import { Btn } from '@/components/ui';
import { buzz } from '@/lib/audio';
import { layoutLetters, pathOf, traceable } from '@/lib/glyphs';
import { motionAvailable, watchShake } from '@/lib/motion';
import { useTheme, wordSize } from '@/theme';
import { Coach, PAD_RADIUS, SAND } from './kit';

// ── Sand tray ─────────────────────────────────────────────────────────────
// Writing a word in a tray of sand with one finger is a classroom staple of multisensory
// teaching: the drag of the sand is felt in the fingertip while the word is said. Here the
// phone is the tray. The grain is a stream of fine ticks under a moving finger, and the tray
// is smoothed the way a real one is: give it a shake.
//
//   look   the word lies written in the sand
//   shake  (or press Smooth) and it is gone
//   write  write it again from memory, as big as the tray
//   check  the word comes back above the tray; the learner compares and says how it went
//
// Nothing here tries to read handwriting. Checking your own work against the model is the
// point of the exercise, and it is the learner who decides.

type Phase = 'look' | 'write' | 'check';
type P = { x: number; y: number };

/** A fixed scatter of grains, so the tray looks like sand and not like a flat colour. */
const GRAINS = Array.from({ length: 150 }, (_, i) => ({ x: ((i * 7919) % 1000) / 1000, y: ((i * 4409 + 137) % 1000) / 1000, r: 0.6 + ((i * 31) % 10) / 12, light: i % 3 === 0 }));

function Groove({ d, width }: { d: string; width: number }) {
  // A furrow: the sand pushed aside is lighter on the far edge, the bottom of the cut is darker.
  return (
    <>
      <Path d={d} stroke={SAND.light} strokeWidth={width + 5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
      <Path d={d} stroke={SAND.deep} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke={SAND.rim} strokeWidth={Math.max(2, width * 0.3)} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.55} transform="translate(0 1)" />
    </>
  );
}

export function SandTray({ text, parts, onDone, onRetry, height = 300 }: { text: string; parts: string[]; /** `tries` is how many times the tray was written before it matched. */ onDone: (tries: number) => void; onRetry?: () => void; height?: number }) {
  const { reduceMotion } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [phase, setPhase] = useState<Phase>('look');
  const [paths, setPaths] = useState<string[]>([]);
  const [live, setLive] = useState('');
  const [canShake, setCanShake] = useState(false);
  const [finished, setFinished] = useState(false);
  const liveRef = useRef('');
  const last = useRef<P | null>(null);
  const travelled = useRef(0);
  const tries = useRef(1);
  const phaseRef = useRef<Phase>('look');
  const fade = useSharedValue(1);
  const wipe = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (wipe.current) clearTimeout(wipe.current);
  }, []);

  const model = useMemo(() => (size.w && traceable(text) ? layoutLetters(text.split(''), size.w, size.h, { pad: 26, maxScale: 1.1 }) : null), [text, size]);

  /** Smooth the tray: whatever is in the sand fades out. From `look`, that starts the writing. */
  const smooth = useCallback(() => {
    if (wipe.current) return;
    buzz.good();
    fade.set(withTiming(0, { duration: reduceMotion ? 0 : 320 }));
    wipe.current = setTimeout(
      () => {
        wipe.current = null;
        liveRef.current = '';
        setLive('');
        setPaths([]);
        if (phaseRef.current === 'look') {
          phaseRef.current = 'write';
          setPhase('write');
        }
        fade.set(1);
      },
      reduceMotion ? 0 : 340,
    );
  }, [fade, reduceMotion]);

  useEffect(() => {
    let stop = () => {};
    let alive = true;
    motionAvailable().then((ok) => {
      if (!alive || !ok) return;
      setCanShake(true);
      stop = watchShake(() => {
        if (phaseRef.current !== 'check') smooth();
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [smooth]);

  const at = (e: GestureResponderEvent): P => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
  const begin = (e: GestureResponderEvent) => {
    if (phaseRef.current !== 'write') return;
    const p = at(e);
    last.current = p;
    liveRef.current = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${(p.x + 0.1).toFixed(1)} ${p.y.toFixed(1)}`;
    setLive(liveRef.current);
    buzz.tap();
  };
  const move = (e: GestureResponderEvent) => {
    if (phaseRef.current !== 'write' || !last.current) return;
    const p = at(e);
    const d = Math.hypot(p.x - last.current.x, p.y - last.current.y);
    if (d < 1.5) return;
    last.current = p;
    liveRef.current += `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    setLive(liveRef.current);
    // The grain: one fine tick for every few points of sand moved.
    travelled.current += d;
    if (travelled.current > 9) {
      travelled.current = 0;
      buzz.tap();
    }
  };
  const end = () => {
    last.current = null;
    const d = liveRef.current;
    liveRef.current = '';
    setLive('');
    if (d) setPaths((ps) => [...ps, d]);
  };

  const check = () => {
    phaseRef.current = 'check';
    setPhase('check');
  };
  const again = () => {
    tries.current += 1;
    onRetry?.();
    phaseRef.current = 'look';
    setPhase('look');
    setPaths([]);
  };
  const matches = () => {
    if (finished) return;
    setFinished(true);
    buzz.good();
    onDone(tries.current);
  };

  const sand = useAnimatedStyle(() => ({ opacity: fade.value }));
  const strokeW = model ? Math.max(8, 13 * model.scale) : 11;
  const wrote = paths.length > 0 || !!live;

  return (
    <View style={{ gap: 12 }}>
      {/* The model word comes back above the tray to check against. Its place is kept, so the tray never jumps. */}
      <View style={{ height: 62, justifyContent: 'center' }}>
        {phase === 'check' ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(220)}>
            <SylWord text={text} parts={parts} size={wordSize(text, 34, 300)} />
          </Animated.View>
        ) : (
          <Coach
            icon={phase === 'look' ? (canShake ? Vibrate : Eye) : Hand}
            text={phase === 'look' ? (canShake ? 'Look at it. Then shake to smooth the sand.' : 'Look at it. Then smooth the sand.') : wrote ? 'Say each letter as you write it.' : 'Write it from memory, big.'}
          />
        )}
      </View>

      <View
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ height, borderRadius: PAD_RADIUS, backgroundColor: SAND.bg, borderWidth: 3, borderColor: SAND.rim, overflow: 'hidden', boxShadow: 'inset 0px 3px 10px rgba(74,59,34,0.35)' }}
        accessible
        accessibilityLabel={phase === 'look' ? `${text}, written in sand` : phase === 'write' ? 'Sand tray. Write the word with a finger.' : 'Your writing in the sand'}>
        <Svg style={{ position: 'absolute' }} width="100%" height="100%" pointerEvents="none">
          {GRAINS.map((g, i) => (
            <Circle key={i} cx={`${g.x * 100}%`} cy={`${g.y * 100}%`} r={g.r} fill={g.light ? SAND.light : SAND.grain} opacity={g.light ? 0.8 : 0.45} />
          ))}
        </Svg>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, sand]}>
          <Svg width="100%" height="100%">
            {phase === 'look' && model && model.letters.map((l, li) => l.tracks.map((t, ti) => (t.dot ? <Circle key={`${li}-${ti}`} cx={t.pts[0].x} cy={t.pts[0].y} r={strokeW * 0.6} fill={SAND.deep} stroke={SAND.light} strokeWidth={2} /> : <Groove key={`${li}-${ti}`} d={pathOf(t)} width={strokeW} />)))}
            {phase !== 'look' && paths.map((d, i) => <Groove key={i} d={d} width={11} />)}
            {phase !== 'look' && !!live && <Groove d={live} width={11} />}
          </Svg>
          {/* A word with a character there is no drawing for is shown in type instead. */}
          {phase === 'look' && !model && size.w > 0 && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <SylWord text={text} parts={parts} size={wordSize(text, 40, size.w - 40)} color={SAND.ink} />
            </View>
          )}
        </Animated.View>
        {phase === 'write' && !wrote && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Hand size={34} color={SAND.rim} strokeWidth={2} />
          </View>
        )}
        <View
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
          pointerEvents={phase === 'write' ? 'auto' : 'none'}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={begin}
          onResponderMove={move}
          onResponderRelease={end}
          onResponderTerminate={end}
        />
      </View>

      {!finished && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {phase === 'look' && <Btn flex={1} kind="soft" icon={Eraser} label="Smooth" a11y="Smooth the sand and write the word from memory" onPress={smooth} />}
          {phase === 'write' && (
            <>
              <Btn flex={1} kind="soft" icon={Eraser} label="Smooth" a11y="Smooth the sand and start again" onPress={smooth} disabled={!wrote} />
              <Btn flex={1} icon={Eye} label="Check" a11y="Show the word to check my writing against" onPress={check} disabled={!wrote} />
            </>
          )}
          {phase === 'check' && (
            <>
              <Btn flex={1} kind="soft" icon={RotateCcw} label="Again" a11y="Mine is not quite right. Look again and rewrite it." onPress={again} />
              <Btn flex={1} kind="mint" icon={Check} label="Matches" a11y="Mine matches the word" onPress={matches} />
            </>
          )}
        </View>
      )}
    </View>
  );
}
