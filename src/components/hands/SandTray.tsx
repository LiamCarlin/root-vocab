import { Check, Eraser, Eye, Hand, RotateCcw, ScanSearch } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { SylWord } from '@/components/learn';
import { Btn, Txt } from '@/components/ui';
import { buzz } from '@/lib/audio';
import { layoutLetters, pathOf, traceable, type Pt } from '@/lib/glyphs';
import { readBeat, type Read } from '@/lib/ink';
import { motionAvailable, watchShake } from '@/lib/motion';
import { sfx } from '@/lib/sfx';
import { useTheme, wordSize } from '@/theme';
import { Coach, PAD_RADIUS, SAND, WordStrip } from './kit';

// ── Sand tray ─────────────────────────────────────────────────────────────
// Writing a word in a tray of sand with one finger is a classroom staple of multisensory
// teaching: the drag of the sand is felt in the fingertip while the word is said. Here the
// phone is the tray, and the word is written one beat at a time, from memory.
//
// For each beat:
//   look   the beat lies written in the sand for a moment, then fades away by itself
//   write  write it from memory, as big as the tray (a shake, or Smooth, wipes the tray)
//   read   Root reads what was written (lib/ink) against the beat and its likely slips:
//            right     the beat is said and the next one comes
//            a slip    "That looks like 'bo'": write it again, or say it is right after all
//            unclear   Root shows the beat and the learner compares for themselves
// The learner always has the last word: the reader can be wrong about messy writing.

type Phase = 'look' | 'write' | 'read';
/** How long a beat stays in the sand before it fades. Long enough to read, short enough not to wait. */
const LOOK_MS = 2200;
/** How long a right beat stays up before the next one is shown. */
const NEXT_MS = 1100;

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

const pathFrom = (pts: Pt[]) => (pts.length === 1 ? `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}L${(pts[0].x + 0.1).toFixed(1)} ${pts[0].y.toFixed(1)}` : `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}`);

export function SandTray({ text, parts, onDone, onRetry, onPart, height = 300 }: { text: string; parts: string[]; /** `tries` is how many times a beat was written again before the word was done. */ onDone: (tries: number) => void; onRetry?: () => void; /** Called as each beat is written right, to say it. */ onPart?: (i: number) => void; height?: number }) {
  const { reduceMotion } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [beat, setBeat] = useState(0);
  const [phase, setPhase] = useState<Phase>('look');
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [live, setLive] = useState<Pt[]>([]);
  const [read, setRead] = useState<Read | null>(null);
  const [finished, setFinished] = useState(false);
  const liveRef = useRef<Pt[]>([]);
  const travelled = useRef(0);
  const tries = useRef(0);
  const phaseRef = useRef<Phase>('look');
  const fade = useSharedValue(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const part = parts[beat] ?? text;
  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // The beat being written, drawn large. A beat with a character there is no drawing for is shown in type.
  const model = useMemo(() => (size.w && traceable(part) ? layoutLetters(part.split(''), size.w, size.h, { pad: 30, maxScale: 1.3 }) : null), [part, size]);

  /** Smooth the tray: whatever is in the sand fades out. From `look`, that starts the writing. */
  const smooth = useCallback(() => {
    buzz.good();
    fade.set(withTiming(0, { duration: reduceMotion ? 0 : 300 }));
    timers.current.push(
      setTimeout(
        () => {
          liveRef.current = [];
          setLive([]);
          setStrokes([]);
          if (phaseRef.current === 'look') go('write');
          fade.set(1);
        },
        reduceMotion ? 0 : 320,
      ),
    );
  }, [fade, reduceMotion]);

  // The beat fades on its own: nobody has to work out that the sand must be smoothed first.
  const ready = size.w > 0;
  useEffect(() => {
    if (phase !== 'look' || !ready || finished) return;
    const t = setTimeout(smooth, reduceMotion ? LOOK_MS + 600 : LOOK_MS);
    return () => clearTimeout(t);
  }, [phase, ready, smooth, reduceMotion, beat, finished]);

  useEffect(() => {
    let stop = () => {};
    let alive = true;
    motionAvailable().then((ok) => {
      if (!alive || !ok) return;
      stop = watchShake(() => {
        if (phaseRef.current === 'write') smooth();
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [smooth]);

  const at = (e: GestureResponderEvent): Pt => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
  const begin = (e: GestureResponderEvent) => {
    if (phaseRef.current !== 'write') return;
    liveRef.current = [at(e)];
    setLive(liveRef.current);
    buzz.tap();
  };
  const move = (e: GestureResponderEvent) => {
    if (phaseRef.current !== 'write' || !liveRef.current.length) return;
    const p = at(e);
    const last = liveRef.current[liveRef.current.length - 1];
    const d = Math.hypot(p.x - last.x, p.y - last.y);
    if (d < 1.5) return;
    liveRef.current = [...liveRef.current, p];
    setLive(liveRef.current);
    // The grain: one fine tick for every few points of sand moved.
    travelled.current += d;
    if (travelled.current > 9) {
      travelled.current = 0;
      buzz.tap();
    }
  };
  const end = () => {
    const st = liveRef.current;
    liveRef.current = [];
    setLive([]);
    if (st.length) setStrokes((ss) => [...ss, st]);
  };

  /** The beat is right (read so, or the learner says so): say it, then the next beat, or the end. */
  const accept = (byLearner = false) => {
    if (byLearner) setRead({ verdict: 'match', beat: part, score: -1 });
    buzz.good();
    sfx.play('good');
    onPart?.(beat);
    timers.current.push(
      setTimeout(() => {
        if (beat + 1 >= parts.length) {
          setFinished(true);
          onDone(tries.current + 1);
          return;
        }
        setBeat(beat + 1);
        setStrokes([]);
        setRead(null);
        go('look');
      }, NEXT_MS),
    );
  };

  const check = () => {
    const r = readBeat(strokes, part);
    setRead(r);
    go('read');
    if (r.verdict === 'match') accept(false);
    else buzz.nudge();
  };

  /** Write this beat again: it is shown once more, then fades. */
  const again = () => {
    tries.current += 1;
    onRetry?.();
    setRead(null);
    setStrokes([]);
    go('look');
  };

  /** Bring the beat back for another look before writing it. */
  const peek = () => {
    setStrokes([]);
    go('look');
  };

  const sand = useAnimatedStyle(() => ({ opacity: fade.value }));
  const strokeW = model ? Math.max(8, 13 * model.scale) : 11;
  const wrote = strokes.length > 0 || live.length > 0;
  const right = read?.verdict === 'match';

  return (
    <View style={{ gap: 12 }}>
      {/* The whole word, with the beat being written marked. */}
      <WordStrip parts={parts} text={text} cur={Math.min(beat, parts.length - 1)} done={finished ? parts.length : beat} />

      <View
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ height, borderRadius: PAD_RADIUS, backgroundColor: SAND.bg, borderWidth: 3, borderColor: SAND.rim, overflow: 'hidden' }}
        accessible
        accessibilityLabel={phase === 'look' ? `${part}, written in sand` : phase === 'write' ? `Sand tray. Write ${part} with a finger.` : 'Your writing in the sand'}>
        <Svg style={{ position: 'absolute' }} width="100%" height="100%" pointerEvents="none">
          {GRAINS.map((g, i) => (
            <Circle key={i} cx={`${g.x * 100}%`} cy={`${g.y * 100}%`} r={g.r} fill={g.light ? SAND.light : SAND.grain} opacity={g.light ? 0.8 : 0.45} />
          ))}
        </Svg>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, sand]}>
          <Svg width="100%" height="100%">
            {phase === 'look' && model && model.letters.map((l, li) => l.tracks.map((t, ti) => (t.dot ? <Circle key={`${li}-${ti}`} cx={t.pts[0].x} cy={t.pts[0].y} r={strokeW * 0.6} fill={SAND.deep} stroke={SAND.light} strokeWidth={2} /> : <Groove key={`${li}-${ti}`} d={pathOf(t)} width={strokeW} />)))}
            {phase !== 'look' && strokes.map((st, i) => <Groove key={i} d={pathFrom(st)} width={11} />)}
            {phase !== 'look' && live.length > 0 && <Groove d={pathFrom(live)} width={11} />}
          </Svg>
          {phase === 'look' && !model && size.w > 0 && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <SylWord text={part} parts={[part]} size={wordSize(part, 44, size.w - 40)} color={SAND.ink} />
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

      {/* What to do now, or what Root read. */}
      {phase === 'look' && !finished && <Coach icon={Eye} text={`Look at “${part}”.`} />}
      {phase === 'write' && <Coach icon={Hand} text={`Now write “${part}” from memory.`} />}
      {phase === 'read' && read && (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)} accessibilityLiveRegion="polite" style={{ gap: 10 }}>
          {right ? (
            <Coach icon={Check} tone="good" text={read.score < 0 ? `Counted: “${part}”.` : `Root read “${part}”. Right.`} />
          ) : (
            <View style={{ gap: 8 }}>
              <Coach icon={ScanSearch} tone="warn" text={read.verdict === 'slip' ? `That looks like “${read.looksLike}”. Compare it with “${part}”:` : `Root could not read that clearly. Compare it with “${part}”:`} />
              <View style={{ alignItems: 'center' }}>
                <SylWord text={part} parts={[part]} size={wordSize(part, 40, Math.max(200, size.w - 40))} />
              </View>
            </View>
          )}
        </Animated.View>
      )}

      {!finished && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {phase === 'write' && (
            <>
              {wrote ? <Btn flex={1} kind="soft" icon={Eraser} label="Smooth" a11y="Smooth the sand and start this beat again" onPress={smooth} /> : <Btn flex={1} kind="soft" icon={Eye} label="Look" a11y={`Show ${part} again`} onPress={peek} />}
              <Btn flex={1} icon={ScanSearch} label="Check" a11y={`Check my writing of ${part}`} onPress={check} disabled={!wrote} />
            </>
          )}
          {phase === 'read' && !right && (
            <>
              <Btn flex={1} icon={RotateCcw} label="Write it again" onPress={again} />
              <Btn flex={1} kind="soft" icon={Check} label="Mine is right" a11y={`Mine says ${part}. Count it.`} onPress={() => accept(true)} />
            </>
          )}
        </View>
      )}
      {finished && <Txt v="heading" center>{`“${text}”, written beat by beat.`}</Txt>}
    </View>
  );
}
