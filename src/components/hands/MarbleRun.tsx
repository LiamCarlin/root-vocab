import { Crosshair, Hand, Smartphone } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { IconBtn } from '@/components/ui';
import { buzz, say } from '@/lib/audio';
import { layoutLetters, pathOf, pointAt, type Track } from '@/lib/glyphs';
import { motionAvailable, watchTilt } from '@/lib/motion';
import { useTheme } from '@/theme';
import { BOARD, PAD_RADIUS, WordStrip, letterName } from './kit';

// ── Marble run ────────────────────────────────────────────────────────────
// The letters are grooves cut into a board, and a marble runs along them in the order and
// direction each letter is written. Tipping the phone is what moves it, so the whole forearm
// learns the shape: down the stem, round the bowl, up and over the arch.
//
//   the marble cannot leave the groove or roll back along it; it only needs tipping the way the letter goes
//   "level" is however the phone is being held when the board appears, not flat on a table
//   a tick as it rolls, the letter's name when it reaches the end, the beat when a beat is done
//   no motion sensor (a simulator, a browser, a denied permission): drag on the board to tip it
//
// One beat at a time, like tracing, so the grooves are big enough to roll through.

type Step = { li: number; track: Track };
const STRIP = 50;
/** Points per second squared at a full tilt. With the drag below, a gentle tip rolls a letter in two or three seconds. */
const PULL = 2300;
const DRAG = 0.1;
const DEAD = 0.035;

export function MarbleRun({ text, parts, onPart, onDone, onInput, height = 320 }: { text: string; parts: string[]; onPart: (i: number) => void; onDone: () => void; /** Told once whether the board is tipped by the phone or by a finger. */ onInput?: (kind: 'tilt' | 'touch') => void; height?: number }) {
  const { c, syl, reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const [beat, setBeat] = useState(0);
  const [k, setK] = useState(0);
  const [s, setS] = useState(0);
  const [sensor, setSensor] = useState(false);

  const finished = beat >= parts.length;
  const boxH = height - STRIP - 12;
  const chars = useMemo(() => (finished ? text.split('') : (parts[beat] ?? '').split('')), [finished, text, parts, beat]);
  const lay = useMemo(() => (w ? layoutLetters(chars, w, boxH, { pad: finished ? 24 : 34, maxScale: finished ? 0.9 : 1.3 }) : null), [chars, w, boxH, finished]);
  const steps = useMemo<Step[]>(() => (lay && !finished ? lay.letters.flatMap((l, li) => l.tracks.map((track) => ({ li, track }))) : []), [lay, finished]);
  const strokeW = lay ? Math.max(12, 19 * lay.scale) : 14;
  const R = strokeW * 0.56;
  const tone = syl(Math.min(beat, parts.length - 1));

  // Everything the physics loop reads lives in refs: it runs every frame and must never be stale.
  const raw = useRef({ x: 0, y: 0 });
  const zero = useRef({ x: 0, y: 0 });
  const samples = useRef(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const run = useRef({ k: 0, s: 0, v: 0, hop: 0, from: { x: 0, y: 0 }, busy: false, ticked: 0, shown: 0 });
  const stepsRef = useRef<Step[]>([]);
  const cb = useRef({ onPart, onDone, onInput });
  useEffect(() => {
    cb.current = { onPart, onDone, onInput };
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const mx = useSharedValue(-100);
  const my = useSharedValue(-100);
  const bx = useSharedValue(0);
  const by = useSharedValue(0);

  // Tilt, measured from how the phone was being held when the board appeared.
  useEffect(() => {
    let stop = () => {};
    let alive = true;
    motionAvailable().then((ok) => {
      if (!alive) return;
      setSensor(ok);
      cb.current.onInput?.(ok ? 'tilt' : 'touch');
      if (!ok) return;
      stop = watchTilt((x, y) => {
        raw.current = { x, y };
        if (samples.current < 10) {
          samples.current += 1;
          zero.current = { x: zero.current.x + (x - zero.current.x) / samples.current, y: zero.current.y + (y - zero.current.y) / samples.current };
        }
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const level = () => {
    zero.current = { ...raw.current };
    buzz.tap();
  };

  // New grooves (a new beat, or a new size): the loop reads them from here, and the marble is put where it stands.
  useEffect(() => {
    stepsRef.current = steps;
    const r = run.current;
    r.busy = false;
    const cur = steps[r.k];
    if (cur) {
      const p = pointAt(cur.track, Math.min(r.s, cur.track.len)).p;
      mx.set(p.x);
      my.set(p.y);
    }
  }, [steps, mx, my]);

  useEffect(() => {
    if (!lay || finished) return;
    let raf = 0;
    let last = 0;
    const beatNow = beat;

    const endBeat = () => {
      const r = run.current;
      r.busy = true;
      timers.current.push(
        setTimeout(() => {
          buzz.good();
          cb.current.onPart(beatNow);
        }, 420),
        setTimeout(
          () => {
            // The next beat starts from its first groove. `busy` stays set until those grooves are in place.
            run.current = { ...run.current, k: 0, s: 0, v: 0, hop: 0, ticked: 0, shown: 0 };
            setK(0);
            setS(0);
            setBeat(beatNow + 1);
            if (beatNow + 1 >= parts.length) cb.current.onDone();
          },
          reduceMotion ? 700 : 1050,
        ),
      );
    };

    const nextTrack = (at: { x: number; y: number }) => {
      const r = run.current;
      const all = stepsRef.current;
      const cur = all[r.k];
      const n = r.k + 1;
      if (n >= all.length || all[n].li !== cur.li) {
        buzz.tap();
        say(letterName(lay.letters[cur.li].ch));
      }
      r.k = n;
      r.s = 0;
      r.v = 0;
      r.ticked = 0;
      r.shown = 0;
      setK(n);
      setS(0);
      if (n >= all.length) endBeat();
      else {
        // The marble is lifted across to where the next stroke begins.
        r.from = at;
        r.hop = 1;
      }
    };

    const loop = (t: number) => {
      const dt = last ? Math.min(0.034, (t - last) / 1000) : 0.016;
      last = t;
      const r = run.current;
      const all = stepsRef.current;
      const cur = all[r.k];
      const d = drag.current;
      const tx = d ? d.x : raw.current.x - zero.current.x;
      const ty = d ? d.y : raw.current.y - zero.current.y;
      const mag = Math.hypot(tx, ty);
      const lim = mag > 1 ? 1 / mag : 1;
      bx.set(tx * lim);
      by.set(ty * lim);

      // A beat with nothing to roll through (a character outside the alphabet) is passed straight on.
      if (!cur && !r.busy && all.length === 0) endBeat();

      if (cur && !r.busy) {
        const track = cur.track;
        if (r.hop > 0) {
          r.hop = Math.max(0, r.hop - dt / 0.22);
          const to = track.pts[0];
          const e = 1 - r.hop;
          const ease = e * e * (3 - 2 * e);
          mx.set(r.from.x + (to.x - r.from.x) * ease);
          my.set(r.from.y + (to.y - r.from.y) * ease);
        } else if (track.dot) {
          // A dot has nowhere to roll: the marble settles on it and moves on.
          mx.set(track.pts[0].x);
          my.set(track.pts[0].y);
          r.s += dt;
          if (r.s > 0.28) nextTrack(track.pts[0]);
        } else {
          const here = pointAt(track, r.s);
          const along = mag < DEAD ? 0 : (tx * here.dir.x + ty * here.dir.y) * lim;
          r.v += along * PULL * dt;
          r.v *= Math.pow(DRAG, dt);
          // The groove is one-way. Where a letter doubles back on itself (up a stem and down it again) "down" would
          // otherwise mean both onward and back the way it came, and the marble could be rolled out of the letter backwards.
          if (r.v < 0) r.v = 0;
          r.s += r.v * dt;
          if (r.s >= track.len) {
            const end = track.pts[track.pts.length - 1];
            mx.set(end.x);
            my.set(end.y);
            nextTrack(end);
          } else {
            const p = pointAt(track, r.s).p;
            mx.set(p.x);
            my.set(p.y);
            if (Math.abs(r.s - r.ticked) > 30) {
              r.ticked = r.s;
              buzz.light();
            }
            // The lit part of the groove follows the furthest point reached, a few times a second.
            if (r.s - r.shown > 5) {
              r.shown = r.s;
              setS(r.s);
            }
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [lay, finished, beat, parts.length, reduceMotion, mx, my, bx, by]);

  const marble = useAnimatedStyle(() => ({ transform: [{ translateX: mx.value - R }, { translateY: my.value + STRIP - R }] }));
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateX: bx.value * 11 }, { translateY: by.value * 11 }] }));

  // No sensor: the board is tipped toward wherever the finger is pulled from where it went down.
  const origin = useRef({ x: 0, y: 0 });
  const pull = (e: GestureResponderEvent, start: boolean) => {
    const p = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    if (start) origin.current = p;
    const dx = p.x - origin.current.x, dy = p.y - origin.current.y;
    const d = Math.hypot(dx, dy);
    const amount = Math.min(1, d / 90) * 0.6;
    drag.current = d < 4 ? { x: 0, y: 0 } : { x: (dx / d) * amount, y: (dy / d) * amount };
  };

  const cur = steps[k];
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height, borderRadius: PAD_RADIUS, backgroundColor: BOARD.bg, borderWidth: 1, borderColor: BOARD.rim, overflow: 'hidden' }}
      accessible
      accessibilityLabel={finished ? `${text}, rolled` : `Roll the marble through ${parts[beat]}, beat ${beat + 1} of ${parts.length} of ${text}`}>
      <View style={{ height: STRIP, justifyContent: 'center', paddingHorizontal: 60 }}>
        <WordStrip parts={parts} text={text} cur={Math.min(beat, parts.length - 1)} done={beat} dark />
      </View>

      {lay && (
        <Animated.View key={finished ? 'whole' : beat} entering={reduceMotion ? undefined : FadeIn.duration(220)} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: STRIP, height: boxH }}>
          <Svg width={w} height={boxH}>
            <Line x1={18} x2={w - 18} y1={lay.base} y2={lay.base} stroke={BOARD.rim} strokeWidth={1.5} />
            {/* The grooves: a dark channel with a lit edge, so they read as cut into the board. */}
            {lay.letters.map((l, li) =>
              l.tracks.map((t, ti) =>
                t.dot ? (
                  <Circle key={`g${li}-${ti}`} cx={t.pts[0].x} cy={t.pts[0].y} r={strokeW * 0.6} fill={BOARD.groove} stroke={BOARD.rim} strokeWidth={1.5} />
                ) : (
                  <Path key={`g${li}-${ti}`} d={pathOf(t)} stroke={cur && li === cur.li ? BOARD.lit : BOARD.rim} strokeWidth={strokeW + 3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                ),
              ),
            )}
            {lay.letters.map((l, li) => l.tracks.map((t, ti) => (t.dot ? null : <Path key={`c${li}-${ti}`} d={pathOf(t)} stroke={BOARD.groove} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" fill="none" />)))}
            {/* Where the marble has been, in the beat's colour. */}
            {lay.letters.map((l, li) =>
              l.tracks.map((t, ti) => {
                const done = finished || !cur || li < cur.li || (li === cur.li && l.tracks.indexOf(cur.track) > ti);
                const live = !done && cur && cur.track === t;
                if (!done && !live) return null;
                if (t.dot) return done ? <Circle key={`d${li}-${ti}`} cx={t.pts[0].x} cy={t.pts[0].y} r={strokeW * 0.36} fill={tone} /> : null;
                if (live && s <= 0.5) return null;
                return <Path key={`d${li}-${ti}`} d={pathOf(t, done ? Infinity : s)} stroke={tone} strokeWidth={strokeW * 0.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
              }),
            )}
            {/* The far end of the stroke the marble is on. */}
            {cur && !cur.track.dot && <Circle cx={cur.track.pts[cur.track.pts.length - 1].x} cy={cur.track.pts[cur.track.pts.length - 1].y} r={strokeW * 0.24} fill={BOARD.dim} />}
          </Svg>
        </Animated.View>
      )}

      {!finished && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: R * 2, height: R * 2, borderRadius: R, backgroundColor: c.orange, boxShadow: '0px 3px 8px rgba(0,0,0,0.55)' }, marble]}>
          <View style={{ position: 'absolute', left: R * 0.36, top: R * 0.28, width: R * 0.6, height: R * 0.44, borderRadius: R * 0.3, backgroundColor: 'rgba(255,255,255,0.7)' }} />
        </Animated.View>
      )}

      {!sensor && !finished && (
        <View
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => pull(e, true)}
          onResponderMove={(e) => pull(e, false)}
          onResponderRelease={() => (drag.current = null)}
          onResponderTerminate={() => (drag.current = null)}
        />
      )}

      {/* A spirit level: which way the board is tipped right now. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 8, width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: BOARD.rim, backgroundColor: BOARD.groove, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: BOARD.ink }, bubble]} />
      </View>
      <View style={{ position: 'absolute', right: 8, top: 5 }}>
        {sensor ? (
          <IconBtn icon={Crosshair} label="Set level to how the phone is held now" kind="glass" size={40} onPress={level} />
        ) : (
          <View pointerEvents="none" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel="Drag on the board to tip it">
            <Hand size={18} color={BOARD.dim} />
          </View>
        )}
      </View>
      {sensor && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 54, top: 16 }}>
          <Smartphone size={16} color={BOARD.dim} />
        </View>
      )}
    </View>
  );
}
