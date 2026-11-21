import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';

import { buzz } from '@/lib/audio';
import { layoutLetters, nearestOn, pathOf, pointAt, type Placed, type Track } from '@/lib/glyphs';
import { useTheme } from '@/theme';
import { PAD_RADIUS, WordStrip } from './kit';

// ── Trace ─────────────────────────────────────────────────────────────────
// Finger tracing is the oldest move in multisensory teaching: the hand forms the letter while
// the eye follows it and the ear hears its name. So the finger here does not scribble over a
// printed word: it follows each letter the way that letter is written, stroke by stroke, from
// the dot, in the direction of the arrow.
//
//   one beat at a time, so the letters are big and the word arrives in its chunks
//   the pen dot marks where to be; ink fills in behind the finger
//   on the stroke: a soft tick every few points · off it: one firm buzz, nothing lost
//   each finished letter is named, each finished beat is said (by the caller)
//
// `assist` is for anyone who cannot drag accurately: one touch on a letter writes it.

type Step = { li: number; track: Track };
export type TraceEvent = 'on' | 'off' | 'idle';

const STRIP = 50;

export function TracePad({ text, parts, onPart, onDone, onState, assist, height = 280 }: { text: string; parts: string[]; onPart: (i: number) => void; onDone: () => void; onState?: (e: TraceEvent) => void; assist?: boolean; height?: number }) {
  const { c, e1, reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const [beat, setBeat] = useState(0);
  const [k, setK] = useState(0);
  const [s, setS] = useState(0);
  const [off, setOff] = useState(false);

  const kRef = useRef(0);
  const sRef = useRef(0);
  const ticked = useRef(0);
  const busy = useRef(false);
  const wasOff = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finished = beat >= parts.length;
  const boxH = height - STRIP - 12;
  const chars = useMemo(() => (finished ? text.split('') : (parts[beat] ?? '').split('')), [finished, text, parts, beat]);
  const lay = useMemo(() => (w ? layoutLetters(chars, w, boxH, { pad: finished ? 22 : 30, maxScale: finished ? 0.9 : 1.3 }) : null), [chars, w, boxH, finished]);
  const steps = useMemo<Step[]>(() => (lay && !finished ? lay.letters.flatMap((l, li) => l.tracks.map((track) => ({ li, track }))) : []), [lay, finished]);

  const strokeW = lay ? Math.max(9, 15 * lay.scale) : 12;
  const tol = lay ? Math.max(22, 34 * lay.scale) : 24;

  const report = (e: TraceEvent) => {
    const isOff = e === 'off';
    if (isOff !== wasOff.current) {
      wasOff.current = isOff;
      setOff(isOff);
      if (isOff) buzz.strong();
    }
    onState?.(e);
  };

  const finishBeat = () => {
    busy.current = true;
    const b = beat;
    // The last letter gets its name out before the beat is said.
    timers.current.push(
      setTimeout(() => {
        buzz.good();
        onPart(b);
      }, 420),
      setTimeout(
        () => {
          kRef.current = 0;
          sRef.current = 0;
          ticked.current = 0;
          setK(0);
          setS(0);
          setBeat(b + 1);
          busy.current = false;
          if (b + 1 >= parts.length) onDone();
        },
        reduceMotion ? 700 : 1050,
      ),
    );
  };

  const completeTrack = () => {
    const cur = steps[kRef.current];
    const next = kRef.current + 1;
    const letterDone = next >= steps.length || steps[next].li !== cur.li;
    if (letterDone && lay) {
      buzz.tap();
    }
    kRef.current = next;
    sRef.current = 0;
    ticked.current = 0;
    setK(next);
    setS(0);
    if (next >= steps.length) finishBeat();
  };

  // A beat whose letters have no drawing (a character outside the alphabet) is passed straight through.
  useEffect(() => {
    if (lay && !finished && !steps.length && !busy.current) finishBeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lay, steps.length, finished]);

  const touch = (e: GestureResponderEvent, starting: boolean) => {
    if (busy.current || finished || !lay) return;
    const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY - STRIP };
    const cur = steps[kRef.current];
    if (!cur) return;

    if (assist) {
      if (!starting) return;
      const l = lay.letters[cur.li];
      if (p.x < l.x - tol || p.x > l.x + l.w + tol) return;
      // Write the whole letter at once.
      while (kRef.current < steps.length && steps[kRef.current].li === cur.li) completeTrack();
      return;
    }

    const t = cur.track;
    if (t.dot) {
      if (Math.hypot(t.pts[0].x - p.x, t.pts[0].y - p.y) <= tol * 1.3) {
        report('on');
        completeTrack();
      }
      return;
    }
    // Only a little way ahead of the pen counts, so the finger has to travel the stroke, not hop along it.
    const near = nearestOn(t, p, Math.max(0, sRef.current - 10), sRef.current + tol * 1.5);
    if (near.dist <= tol) {
      report('on');
      if (near.s > sRef.current) {
        sRef.current = near.s;
        setS(near.s);
        if (near.s - ticked.current > 16) {
          ticked.current = near.s;
          buzz.light();
        }
      }
      // A stroke is finished a little before its very end: nobody lifts a finger on the exact last point.
      if (sRef.current >= t.len - tol * 0.45) completeTrack();
    } else if (nearestOn(t, p, 0, t.len).dist > tol * 1.7) {
      report('off');
    }
  };

  const release = () => {
    report('idle');
    // Lifting the finger just short of the end still finishes the stroke.
    const cur = steps[kRef.current];
    if (cur && !cur.track.dot && !busy.current && !assist && sRef.current >= cur.track.len - tol) completeTrack();
  };

  const cur = steps[k];
  const nib = cur ? pointAt(cur.track, s) : null;
  const nibR = Math.max(10, strokeW * 0.62);

  const letterDone = (li: number) => finished || (cur ? li < cur.li : true);
  const trackDone = (li: number, ti: number, letter: Placed) => {
    if (letterDone(li)) return true;
    if (!cur || li !== cur.li) return false;
    return letter.tracks.indexOf(cur.track) > ti;
  };

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: PAD_RADIUS, backgroundColor: c.surface, borderWidth: off ? 2.5 : 1, borderColor: off ? c.orange : c.line, overflow: 'hidden' }, e1]}
      accessible
      accessibilityLabel={finished ? `${text}, traced` : `Trace ${parts[beat]}, beat ${beat + 1} of ${parts.length} of ${text}`}>
      <View style={{ height: STRIP, justifyContent: 'center', paddingHorizontal: 18 }}>
        <WordStrip parts={parts} text={text} cur={Math.min(beat, parts.length - 1)} done={beat} />
      </View>

      {lay && (
        <Animated.View key={finished ? 'whole' : beat} entering={reduceMotion ? undefined : FadeIn.duration(220)} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: STRIP, height: boxH }}>
          <Svg width={w} height={boxH}>
            {/* Ruled lines, as on handwriting paper: where small letters start and where every letter sits. */}
            <Line x1={18} x2={w - 18} y1={lay.xh} y2={lay.xh} stroke={c.line} strokeWidth={1.5} strokeDasharray="3 7" />
            <Line x1={18} x2={w - 18} y1={lay.base} y2={lay.base} stroke={c.line} strokeWidth={1.5} />

            {/* The model: one plain grey track per stroke. The letter being written is a clear, solid
                track; letters still to come are lighter but still easy to see. No colour, no ghosting. */}
            {lay.letters.map((l, li) =>
              l.tracks.map((t, ti) => {
                const active = !finished && cur && li === cur.li;
                const op = active ? 0.24 : 0.12;
                return t.dot ? <Circle key={`g${li}-${ti}`} cx={t.pts[0].x} cy={t.pts[0].y} r={strokeW * 0.6} fill={c.ink} opacity={op} /> : <Path key={`g${li}-${ti}`} d={pathOf(t)} stroke={c.ink} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={op} />;
              }),
            )}

            {/* The ink: what has been written. */}
            {lay.letters.map((l, li) =>
              l.tracks.map((t, ti) => {
                const done = trackDone(li, ti, l);
                const live = !done && cur && cur.track === t;
                if (!done && !live) return null;
                if (t.dot) return done ? <Circle key={`i${li}-${ti}`} cx={t.pts[0].x} cy={t.pts[0].y} r={strokeW * 0.42} fill={c.ink} /> : null;
                if (live && s <= 0.5) return null;
                return <Path key={`i${li}-${ti}`} d={pathOf(t, done ? Infinity : s)} stroke={c.ink} strokeWidth={strokeW * 0.56} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
              }),
            )}

            {/* The pen: where to be, and which way to go. */}
            {nib && cur && !assist && (
              <>
                                <Circle cx={nib.p.x} cy={nib.p.y} r={nibR} fill={off ? c.orange : c.ink} />
                <Circle cx={nib.p.x} cy={nib.p.y} r={nibR * 0.34} fill={c.surface} />
                {!cur.track.dot && s < cur.track.len - nibR * 3 && <Arrow at={pointAt(cur.track, s + nibR * 2.6)} size={nibR * 0.8} color={c.ink} />}
              </>
            )}
          </Svg>
        </Animated.View>
      )}

      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          touch(e, true);
        }}
        onResponderMove={(e) => touch(e, false)}
        onResponderRelease={release}
        onResponderTerminate={release}
      />
    </View>
  );
}

/** A small arrowhead on the stroke, pointing the way the pen travels. */
function Arrow({ at, size, color }: { at: { p: { x: number; y: number }; dir: { x: number; y: number } }; size: number; color: string }) {
  const { p, dir } = at;
  const nx = -dir.y, ny = dir.x;
  const tip = `${p.x + dir.x * size},${p.y + dir.y * size}`;
  const a = `${p.x - dir.x * size * 0.6 + nx * size * 0.8},${p.y - dir.y * size * 0.6 + ny * size * 0.8}`;
  const b = `${p.x - dir.x * size * 0.6 - nx * size * 0.8},${p.y - dir.y * size * 0.6 - ny * size * 0.8}`;
  return <Polygon points={`${tip} ${a} ${b}`} fill={color} />;
}
