import { Crosshair, Hand, Lightbulb, Mic, SkipForward, Smartphone, Snail, Sparkles, Square, Volume2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutRectangle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { buzz, hum, beatMs, say } from '@/lib/audio';
import type { Mark } from '@/lib/lexicon';
import { motionAvailable, watchTilt, watchWand } from '@/lib/motion';
import { useStore } from '@/lib/store';
import { ON_BLOCK, SYLLABLE_TONES, motion, radius, trackSteps, useTheme, type BlockTone } from '@/theme';
import { IconBtn, Tap, Txt } from './ui';

// The multisensory kit. Each game puts one more sense behind the same word:
//   see   · every syllable keeps its own colour everywhere
//   hear  · the word, then each beat
//   feel  · the phone hums each beat; ticks while tracing
//   tap   · drum the beats with a finger
//   trace · run a finger through the letters
//   tilt  · roll a marble through the letters
//   sweep · write the letters in the air, phone as a wand

// ── Part tiles: one coloured tile per beat ────────────────────────────────
export function PartTiles({ parts, says, active = -1, onPress, states }: { parts: string[]; says?: string[]; active?: number; onPress?: (i: number) => void; states?: ('idle' | 'good' | 'off' | 'empty')[] }) {
  const { c, syl, font, scale } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {parts.map((p, i) => {
        const st = states?.[i] ?? 'idle';
        const on = i === active;
        const empty = st === 'empty';
        const bg = empty ? 'transparent' : st === 'off' ? c.errorTint : syl(i);
        return (
          <View key={i} style={{ flex: Math.max(p.length, 2.4), gap: 6 }}>
            <Tap
              onPress={onPress ? () => onPress(i) : undefined}
              disabled={!onPress}
              accessibilityRole="button"
              accessibilityLabel={empty ? `Empty slot ${i + 1}` : `Part ${i + 1}: ${p}`}
              style={{ height: 68, borderRadius: radius.md, backgroundColor: bg, borderWidth: empty ? 2.5 : on ? 3 : 0, borderColor: empty ? (on ? c.ink : c.line) : c.ink, borderStyle: empty ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center', transform: [{ translateY: on && !empty ? -4 : 0 }] }}>
              <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={{ fontFamily: font('b'), fontSize: (parts.length > 4 ? 17 : 22) * Math.min(scale, 1.1), color: st === 'off' ? c.ink : ON_BLOCK.ink, paddingHorizontal: 2 }}>
                {empty ? '' : p}
              </Text>
            </Tap>
            {says && (
              <Txt v="caption" color={on ? 'ink' : 'ink3'} center numberOfLines={1} style={{ fontSize: parts.length > 4 ? 11.5 : undefined }}>
                {says[i]}
              </Txt>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** The whole word in big type with a coloured bar under each syllable. */
export function SylWord({ text, parts, size = 44, active = -1, color, on }: { text: string; parts: string[]; size?: number; active?: number; color?: string; /** The block colour this sits on, so no bar disappears into it. */ on?: BlockTone }) {
  const { c, font } = useTheme();
  // The learner's letter-spacing setting reaches the big word too.
  const extra = trackSteps[useStore((s) => s.display.spacing)];
  const track = 0.6 + extra;
  // Wider spacing makes the word longer; a slightly smaller size keeps a word that fitted on one line on one line.
  const fs = extra ? Math.floor(size * 0.955) : size;
  const tones = SYLLABLE_TONES.filter((t) => t !== on);
  const syl = (i: number) => c[tones[i % tones.length]];
  const chunks = useMemo(() => {
    const out: { p: string; space: boolean }[] = [];
    let pos = 0;
    parts.forEach((p) => {
      let space = false;
      while (text[pos] === ' ') {
        pos++;
        space = true;
      }
      out.push({ p, space });
      pos += p.length;
    });
    return out;
  }, [text, parts]);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }} accessible accessibilityRole="header" accessibilityLabel={text}>
      {chunks.map((ch, i) => (
        <View key={i} style={{ marginLeft: ch.space ? size * 0.3 : 0, alignItems: 'stretch' }}>
          <Text style={{ fontFamily: font('b'), fontSize: fs, lineHeight: size * 1.18, letterSpacing: track, color: color ?? c.ink, opacity: active >= 0 && active !== i ? 0.35 : 1 }}>{ch.p}</Text>
          <View style={{ height: 7, borderRadius: 4, backgroundColor: syl(i), marginHorizontal: 1.5 }} />
        </View>
      ))}
    </View>
  );
}

// ── Controls: icons only, same place on every step ────────────────────────
export function Controls({ onReplay, onSkip, onHint }: { onReplay: () => void; onSkip?: () => void; onHint?: () => void }) {
  const slow = useStore((s) => s.slowAudio);
  const patch = useStore((s) => s.patch);
  return (
    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
      <IconBtn icon={Volume2} label="Hear it again" onPress={onReplay} />
      <IconBtn icon={Snail} label={slow ? 'Slower speech is on' : 'Slower speech'} active={slow} onPress={() => patch({ slowAudio: !slow })} />
      {onHint && <IconBtn icon={Lightbulb} label="Hint" kind="butter" onPress={onHint} />}
      {onSkip && <IconBtn icon={SkipForward} label="Skip this step" onPress={onSkip} />}
    </View>
  );
}

// ── Mic ───────────────────────────────────────────────────────────────────
export function MicButton({ listening, onPress, size = 92, disabled }: { listening: boolean; onPress: () => void; size?: number; disabled?: boolean }) {
  const { c, reduceMotion } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (listening && !reduceMotion) pulse.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false));
    else {
      cancelAnimation(pulse);
      pulse.set(0);
    }
  }, [listening, reduceMotion, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.6 }], opacity: listening ? 0.4 * (1 - pulse.value) : 0 }));
  return (
    <View style={{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: c.orange }, ring]} />
      <Tap onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Say it'} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: listening ? c.orange : c.ink, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
        {listening ? <Square size={size * 0.28} color={ON_BLOCK.ink} fill={ON_BLOCK.ink} /> : <Mic size={size * 0.4} color={c.onInk} strokeWidth={2.2} />}
      </Tap>
    </View>
  );
}

// ── Spelling, letter by letter ────────────────────────────────────────────
export function SpellingMarks({ marks, label }: { marks: Mark[]; label: string }) {
  const { c, font, scale } = useTheme();
  // The word stays on one line: tiles shrink to fit, so a long word is never broken in the middle.
  const [width, setWidth] = useState(0);
  const gap = 4;
  const n = Math.max(1, marks.length);
  const tile = width ? Math.max(14, Math.min(30 * scale, (width - gap * (n - 1)) / n)) : 30 * scale;
  const k = tile / (30 * scale);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap, alignSelf: 'stretch' }} accessible accessibilityLabel={`${label}: ${marks.map((m) => m.ch).join('')}`}>
      {marks.map((m, i) => (
        <View key={i} style={{ width: m.ch === ' ' ? tile * 0.4 : tile, height: Math.max(34, 48 * scale * k), borderRadius: 12 * Math.max(0.6, k), alignItems: 'center', justifyContent: 'center', backgroundColor: m.ok ? c.surface2 : m.kind === 'missing' ? c.butter : c.orange }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: font('b'), fontSize: Math.max(13, 24 * scale * k), color: m.ok ? c.ink : ON_BLOCK.ink }}>{m.ch}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Finger strokes ────────────────────────────────────────────────────────
type Pt = { x: number; y: number };

function useStrokes() {
  const [paths, setPaths] = useState<string[]>([]);
  const [live, setLive] = useState('');
  const liveRef = useRef('');
  const begin = useCallback((p: Pt) => {
    liveRef.current = `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${(p.x + 0.1).toFixed(1)} ${p.y.toFixed(1)}`;
    setLive(liveRef.current);
  }, []);
  const extend = useCallback((p: Pt) => {
    liveRef.current = liveRef.current ? `${liveRef.current} L${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    setLive(liveRef.current);
  }, []);
  const end = useCallback(() => {
    const d = liveRef.current;
    liveRef.current = '';
    setLive('');
    if (d) setPaths((ps) => [...ps, d]);
  }, []);
  const clear = useCallback(() => {
    liveRef.current = '';
    setLive('');
    setPaths([]);
  }, []);
  return { paths, live, begin, extend, end, clear };
}

function Ink({ paths, live, color, width = 9, opacity = 0.9 }: { paths: string[]; live: string; color: string; width?: number; opacity?: number }) {
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" pointerEvents="none">
      {paths.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={opacity} />
      ))}
      {!!live && <Path d={live} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={opacity} />}
    </Svg>
  );
}

const pt = (e: GestureResponderEvent): Pt => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

type Letter = { ch: string; part: number; spaceBefore: boolean };

function lettersOf(text: string, parts: string[]): Letter[] {
  const out: Letter[] = [];
  let pos = 0;
  parts.forEach((p, pi) => {
    let space = false;
    while (text[pos] === ' ') {
      pos++;
      space = true;
    }
    p.split('').forEach((ch, ci) => out.push({ ch, part: pi, spaceBefore: space && ci === 0 }));
    pos += p.length;
  });
  return out;
}

const speakLetter = (ch: string) => (/[a-z]/i.test(ch) ? ch.toUpperCase() : ch);

// ── Trace pad (finger) ────────────────────────────────────────────────────
// One part at a time, left to right. On the letters = light ticks. Off the
// letters = one strong buzz and an orange outline; nothing is lost. A letter
// counts once the finger has travelled about its own height inside it. When
// a part is done it takes its syllable colour and the phone hums it.
export type TraceState = { kind: 'idle' | 'on' | 'off' | 'wrongPart'; part: number };

export function TracePad({ text, parts, onPart, onDone, onState, tapMode, height = 230 }: { text: string; parts: string[]; onPart: (i: number) => void; onDone: () => void; onState?: (s: TraceState) => void; tapMode?: boolean; height?: number }) {
  const { c, e1, font, syl, reduceMotion } = useTheme();
  const letters = useMemo(() => lettersOf(text, parts), [text, parts]);
  const [padW, setPadW] = useState(0);
  const [cur, setCur] = useState(0);
  const [doneLetters, setDoneLetters] = useState<boolean[]>(() => letters.map(() => false));
  const [off, setOff] = useState(false);
  const strokes = useStrokes();

  const row = useRef<LayoutRectangle | null>(null);
  const boxes = useRef<(LayoutRectangle | null)[]>(letters.map(() => null));
  const ink = useRef<number[]>(letters.map(() => 0));
  const done = useRef<boolean[]>(letters.map(() => false));
  const last = useRef<{ p: Pt; idx: number } | null>(null);
  const curRef = useRef(0);
  const lastTick = useRef(0);
  const lastKind = useRef<TraceState['kind']>('idle');
  const finished = useRef(false);

  const spaces = letters.filter((l) => l.spaceBefore).length;
  const fontSize = padW ? Math.max(30, Math.min(72, (padW - 36) / (letters.length * 0.64 + spaces * 0.4))) : 44;

  const report = (kind: TraceState['kind']) => {
    if (lastKind.current !== kind) {
      lastKind.current = kind;
      onState?.({ kind, part: curRef.current });
      setOff(kind === 'off' || kind === 'wrongPart');
    }
  };

  const hit = (p: Pt, margin: number): number => {
    const r = row.current;
    if (!r) return -1;
    let best = -1;
    let bestDist = Infinity;
    boxes.current.forEach((b, i) => {
      if (!b) return;
      const x0 = r.x + b.x, y0 = r.y + b.y;
      if (p.x >= x0 - margin && p.x <= x0 + b.width + margin && p.y >= y0 - margin * 0.5 && p.y <= y0 + b.height + margin * 0.5) {
        const d = Math.abs(p.x - (x0 + b.width / 2));
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
    });
    return best;
  };

  const completePart = () => {
    const i = curRef.current;
    buzz.good();
    onPart(i);
    const next = i + 1;
    curRef.current = next;
    last.current = null;
    setTimeout(() => {
      strokes.clear();
      setCur(next);
    }, reduceMotion ? 0 : motion.part);
    if (next >= parts.length && !finished.current) {
      finished.current = true;
      setTimeout(onDone, 380);
    }
  };

  const handle = (p: Pt, starting: boolean) => {
    if (finished.current) return;
    const idx = hit(p, 12);
    const partOfHit = idx >= 0 ? letters[idx].part : -1;
    if (tapMode) {
      if (starting && partOfHit === curRef.current) {
        letters.forEach((l, i) => l.part === curRef.current && (done.current[i] = true));
        setDoneLetters(done.current.slice());
        completePart();
      }
      return;
    }
    if (partOfHit === curRef.current) {
      const prev = last.current;
      if (prev && prev.idx >= 0 && letters[prev.idx].part === curRef.current) ink.current[idx] += Math.hypot(p.x - prev.p.x, p.y - prev.p.y);
      last.current = { p, idx };
      const now = Date.now();
      if (now - lastTick.current > 110) {
        lastTick.current = now;
        buzz.light();
      }
      report('on');
      const b = boxes.current[idx];
      if (b && !done.current[idx] && ink.current[idx] >= Math.max(14, b.height * 0.34)) {
        done.current[idx] = true;
        setDoneLetters(done.current.slice());
        if (letters.every((l, i) => l.part !== curRef.current || done.current[i])) completePart();
      }
    } else {
      last.current = { p, idx: -1 };
      const kind = partOfHit >= 0 ? 'wrongPart' : 'off';
      if (lastKind.current !== kind) buzz.strong();
      report(kind);
    }
  };

  return (
    <View onLayout={(e) => setPadW(e.nativeEvent.layout.width)} style={[{ height, borderRadius: radius.xl, backgroundColor: c.surface, borderWidth: off ? 3 : 1, borderColor: off ? c.orange : c.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, e1]}>
      <View onLayout={(e) => (row.current = e.nativeEvent.layout)} style={{ flexDirection: 'row', alignItems: 'center' }} accessible accessibilityLabel={`Trace the word ${text}, part ${Math.min(cur + 1, parts.length)} of ${parts.length}`}>
        {letters.map((l, i) => {
          const traced = l.part < cur || doneLetters[i];
          return (
            <View key={i} onLayout={(e) => (boxes.current[i] = e.nativeEvent.layout)} style={{ marginLeft: l.spaceBefore ? fontSize * 0.4 : 0 }}>
              <Text style={{ fontFamily: font('b'), fontSize, lineHeight: fontSize * 1.3, letterSpacing: 1.5, color: traced ? c.ink : l.part === cur ? c.ink3 : c.line }}>{l.ch}</Text>
              <View style={{ height: 7, borderRadius: 4, marginHorizontal: 2, backgroundColor: traced ? syl(l.part) : l.part === cur ? c.line : 'transparent' }} />
            </View>
          );
        })}
      </View>
      <Ink paths={strokes.paths} live={strokes.live} color={syl(cur)} width={Math.max(9, fontSize * 0.2)} opacity={0.75} />
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          const p = pt(e);
          last.current = null;
          if (!tapMode) strokes.begin(p);
          handle(p, true);
        }}
        onResponderMove={(e) => {
          const p = pt(e);
          if (!tapMode) strokes.extend(p);
          handle(p, false);
        }}
        onResponderRelease={() => {
          if (finished.current) strokes.clear();
          else strokes.end();
          last.current = null;
          report('idle');
        }}
        onResponderTerminate={() => {
          if (finished.current) strokes.clear();
          else strokes.end();
          last.current = null;
          report('idle');
        }}
      />
    </View>
  );
}

// ── Free writing pad (write from memory with a finger) ────────────────────
export function DrawPad({ reveal, onInk, resetKey, height = 230 }: { reveal?: string; onInk?: (strokes: number) => void; resetKey?: number; height?: number }) {
  const { c, e1, font } = useTheme();
  const strokes = useStrokes();
  const { clear, paths } = strokes;
  useEffect(() => {
    clear();
  }, [resetKey, clear]);
  useEffect(() => {
    onInk?.(paths.length);
  }, [paths.length, onInk]);
  const size = reveal ? Math.max(28, Math.min(64, 300 / (reveal.length * 0.64))) : 0;
  return (
    <View style={[{ height, borderRadius: radius.xl, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, e1]}>
      {reveal ? <Text style={{ fontFamily: font('b'), fontSize: size, lineHeight: size * 1.3, letterSpacing: 1.5, color: c.orange, opacity: 0.6 }}>{reveal}</Text> : paths.length === 0 && !strokes.live && <Hand size={34} color={c.line} />}
      <Ink paths={paths} live={strokes.live} color={c.ink} width={6} />
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        accessible
        accessibilityLabel="Writing pad"
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => strokes.begin(pt(e))}
        onResponderMove={(e) => strokes.extend(pt(e))}
        onResponderRelease={strokes.end}
        onResponderTerminate={strokes.end}
      />
    </View>
  );
}

// ── Beat drum: tap once for every syllable ────────────────────────────────
// Finger-tapping syllables is a classic multisensory move: the beat goes in
// through the hand. Each tap lights the next tile, says that beat and hums it.
export function BeatDrum({ parts, says, onBeat, onDone }: { parts: string[]; says: string[]; onBeat?: (i: number) => void; onDone: () => void }) {
  const { c, syl, font, reduceMotion } = useTheme();
  const [n, setN] = useState(0);
  const scale = useSharedValue(1);
  const ripple = useSharedValue(0);
  const done = n >= parts.length;
  const drum = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const wave = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ripple.value * 0.5 }], opacity: 0.5 * (1 - ripple.value) }));

  const tap = () => {
    if (done) return;
    const i = n;
    hum(beatMs(says[i]));
    say(says[i]);
    onBeat?.(i);
    if (!reduceMotion) {
      scale.set(withSequence(withTiming(0.9, { duration: 70 }), withTiming(1, { duration: 160 })));
      ripple.set(0);
      ripple.set(withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }));
    }
    setN(i + 1);
    if (i + 1 >= parts.length) setTimeout(onDone, 650);
  };

  return (
    <View style={{ alignItems: 'center', gap: 26 }}>
      {/* Wraps, so a six-beat word (id-i-o-syn-cra-sy) stays on screen at phone width. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        {parts.map((p, i) => (
          <View key={i} style={{ minWidth: 58, height: 58, paddingHorizontal: 14, borderRadius: 29, backgroundColor: i < n ? syl(i) : 'transparent', borderWidth: i < n ? 0 : 2.5, borderColor: i === n ? c.ink : c.line, borderStyle: i < n ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: font('b'), fontSize: 19, color: ON_BLOCK.ink, opacity: i < n ? 1 : 0 }}>{p}</Text>
          </View>
        ))}
      </View>
      <View style={{ width: 230, height: 230, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: done ? c.mint : syl(n) }, wave]} />
        <Animated.View style={drum}>
          <Tap onPress={tap} haptic={false} scaleTo={1} disabled={done} accessibilityRole="button" accessibilityLabel={done ? 'All beats tapped' : `Tap beat ${n + 1} of ${parts.length}`} style={{ width: 190, height: 190, borderRadius: 95, backgroundColor: done ? c.mint : syl(n), alignItems: 'center', justifyContent: 'center', borderBottomWidth: 8, borderBottomColor: 'rgba(14,14,19,0.18)' }}>
            <Hand size={64} color={ON_BLOCK.ink} strokeWidth={2} />
          </Tap>
        </Animated.View>
      </View>
    </View>
  );
}

// ── Marble: tilt the phone to roll through the letters ────────────────────
// Lay the phone flat, then tip it. The marble rolls toward the low side and
// has to touch each letter's dot in reading order; the dots alternate high and
// low so the path weaves through the word. Each letter ticks, each finished
// beat is said and hummed. Without motion sensors, dragging on the board
// tilts it instead.
export function MarbleBoard({ text, parts, onPart, onDone, onInput, height = 300 }: { text: string; parts: string[]; onPart: (i: number) => void; onDone: () => void; onInput?: (kind: 'tilt' | 'touch') => void; height?: number }) {
  const { c, font, syl, reduceMotion } = useTheme();
  const letters = useMemo(() => lettersOf(text, parts), [text, parts]);
  const [size, setSize] = useState({ w: 0, h: height });
  const [next, setNext] = useState(0);
  const [useTouch, setUseTouch] = useState(true);
  const row = useRef<LayoutRectangle | null>(null);
  const boxes = useRef<(LayoutRectangle | null)[]>(letters.map(() => null));
  const tilt = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 40, y: 40, vx: 0, vy: 0 });
  const nextRef = useRef(0);
  const finished = useRef(false);
  const R = 15;
  const mx = useSharedValue(40);
  const my = useSharedValue(40);
  const pulse = useSharedValue(0);

  const spaces = letters.filter((l) => l.spaceBefore).length;
  const fontSize = size.w ? Math.max(28, Math.min(64, (size.w - 48) / (letters.length * 0.66 + spaces * 0.4))) : 40;

  useEffect(() => {
    if (!reduceMotion) pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  useEffect(() => {
    let stop = () => {};
    let alive = true;
    motionAvailable().then((ok) => {
      if (!alive) return;
      setUseTouch(!ok);
      onInput?.(ok ? 'tilt' : 'touch');
      if (ok) stop = watchTilt((x, y) => (tilt.current = { x, y }));
    });
    return () => {
      alive = false;
      stop();
    };
  }, [onInput]);

  // Where each letter's dot sits, measured after layout: high, low, high, low…
  const [targets, setTargets] = useState<Pt[]>([]);
  const targetsRef = useRef<Pt[]>([]);
  useEffect(() => {
    if (!size.w) return;
    const id = setTimeout(() => {
      const r = row.current;
      if (!r || boxes.current.some((b) => !b)) return;
      const ts = boxes.current.map((b, i) => ({ x: r.x + b!.x + b!.width / 2, y: r.y + b!.y + b!.height * (i % 2 === 0 ? 0.22 : 0.78) }));
      targetsRef.current = ts;
      setTargets(ts);
    }, 60);
    return () => clearTimeout(id);
  }, [size, fontSize]);

  useEffect(() => {
    if (!size.w) return;
    let raf = 0;
    let lastT = 0;
    const loop = (t: number) => {
      const dt = lastT ? Math.min(0.034, (t - lastT) / 1000) : 0.016;
      lastT = t;
      const p = pos.current;
      if (!finished.current) {
        p.vx += tilt.current.x * 1700 * dt;
        p.vy += tilt.current.y * 1700 * dt;
        const drag = Math.pow(0.12, dt);
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < R) { p.x = R; p.vx = Math.abs(p.vx) * 0.35; }
        if (p.x > size.w - R) { p.x = size.w - R; p.vx = -Math.abs(p.vx) * 0.35; }
        if (p.y < R) { p.y = R; p.vy = Math.abs(p.vy) * 0.35; }
        if (p.y > size.h - R) { p.y = size.h - R; p.vy = -Math.abs(p.vy) * 0.35; }
        const i = nextRef.current;
        const tg = targetsRef.current[i];
        if (tg && Math.hypot(tg.x - p.x, tg.y - p.y) < R + 12) {
          buzz.light();
          const part = letters[i].part;
          const lastOfPart = i + 1 >= letters.length || letters[i + 1].part !== part;
          nextRef.current = i + 1;
          setNext(i + 1);
          if (lastOfPart) {
            buzz.good();
            onPart(part);
          }
          if (i + 1 >= letters.length) {
            finished.current = true;
            setTimeout(onDone, 500);
          }
        }
      }
      mx.set(p.x);
      my.set(p.y);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, letters, onPart, onDone, mx, my]);

  const marble = useAnimatedStyle(() => ({ transform: [{ translateX: mx.value - R }, { translateY: my.value - R }] }));
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.35 }], opacity: 0.9 - pulse.value * 0.4 }));
  const tg = targets[next];

  const touchTilt = (e: GestureResponderEvent) => {
    const p = pt(e);
    const dx = p.x - pos.current.x, dy = p.y - pos.current.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const k = Math.min(1, d / 110) * 0.75;
    tilt.current = { x: (dx / d) * k, y: (dy / d) * k };
  };

  return (
    <View
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ height, borderRadius: radius.xl, backgroundColor: '#0E0E13', borderWidth: 1, borderColor: c.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel={`Roll the marble through the letters of ${text}. Letter ${Math.min(next + 1, letters.length)} of ${letters.length}.`}>
      <View onLayout={(e) => (row.current = e.nativeEvent.layout)} style={{ flexDirection: 'row', alignItems: 'center' }}>
        {letters.map((l, i) => (
          <View key={i} onLayout={(e) => (boxes.current[i] = e.nativeEvent.layout)} style={{ marginLeft: l.spaceBefore ? fontSize * 0.4 : 0 }}>
            <Text style={{ fontFamily: font('b'), fontSize, lineHeight: fontSize * 2.1, letterSpacing: 2, color: i < next ? syl(l.part) : 'rgba(255,255,255,0.22)' }}>{l.ch}</Text>
          </View>
        ))}
      </View>
      {tg && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: tg.x - 13, top: tg.y - 13, width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: syl(letters[Math.min(next, letters.length - 1)].part) }, ring]} />
      )}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: R * 2, height: R * 2, borderRadius: R, backgroundColor: c.orange, boxShadow: '0px 4px 10px rgba(0,0,0,0.5)' }, marble]}>
        <View style={{ position: 'absolute', left: 6, top: 5, width: 9, height: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.65)' }} />
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', right: 14, top: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        {useTouch ? <Hand size={18} color="#FFFFFF" /> : <Smartphone size={18} color="#FFFFFF" />}
      </View>
      {useTouch && (
        <View
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={touchTilt}
          onResponderMove={touchTilt}
          onResponderRelease={() => (tilt.current = { x: 0, y: 0 })}
          onResponderTerminate={() => (tilt.current = { x: 0, y: 0 })}
        />
      )}
    </View>
  );
}

// ── Sky writing: the phone is a wand ──────────────────────────────────────
// One letter at a time, drawn big. Hold a thumb on the screen and sweep the
// phone through the air: turning it left/right moves the spark sideways,
// tipping it up/down moves it up and down. Lift the thumb to stop drawing.
// A letter counts when the spark has travelled far enough through at least
// three quarters of its box; Root then names the letter. It is a big-movement
// memory aid and is checked loosely on purpose. Without a gyroscope the
// finger draws directly.
export function SkyPad({ text, onLetter, onDone, onInput, height = 340 }: { text: string; onLetter?: (i: number, ch: string) => void; onDone: () => void; onInput?: (kind: 'air' | 'finger') => void; height?: number }) {
  const { c, font, syl, reduceMotion } = useTheme();
  const chars = useMemo(() => text.replace(/\s+/g, '').split(''), [text]);
  const [idx, setIdx] = useState(0);
  const [size, setSize] = useState({ w: 0, h: height });
  const [air, setAir] = useState(false);
  const [trail, setTrail] = useState('');
  const [flash, setFlash] = useState(false);
  const cursor = useRef({ x: 0, y: 0 });
  const drawing = useRef(false);
  const trailRef = useRef('');
  const travelled = useRef(0);
  const quads = useRef(new Set<number>());
  const idxRef = useRef(0);
  const finished = useRef(false);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const twinkle = useSharedValue(0);

  const box = useMemo(() => {
    const bw = Math.min(size.w * 0.56, 220), bh = Math.min(size.h * 0.62, 230);
    return { x: (size.w - bw) / 2, y: (size.h - bh) / 2 + 10, w: bw, h: bh };
  }, [size]);

  useEffect(() => {
    if (!reduceMotion) twinkle.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(twinkle);
  }, [reduceMotion, twinkle]);

  const recenter = useCallback(() => {
    cursor.current = { x: size.w / 2, y: size.h / 2 };
    cx.set(cursor.current.x);
    cy.set(cursor.current.y);
  }, [size, cx, cy]);
  useEffect(recenter, [recenter]);

  const nextLetter = useCallback(() => {
    const i = idxRef.current;
    buzz.good();
    say(speakLetter(chars[i]));
    onLetter?.(i, chars[i]);
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      trailRef.current = '';
      setTrail('');
      travelled.current = 0;
      quads.current = new Set();
      const n = i + 1;
      idxRef.current = n;
      setIdx(n);
      if (n >= chars.length && !finished.current) {
        finished.current = true;
        onDone();
      }
    }, 420);
  }, [chars, onLetter, onDone]);

  const moveTo = useCallback(
    (x: number, y: number) => {
      const p = cursor.current;
      const nx = Math.max(8, Math.min(size.w - 8, x)), ny = Math.max(8, Math.min(size.h - 8, y));
      const d = Math.hypot(nx - p.x, ny - p.y);
      cursor.current = { x: nx, y: ny };
      cx.set(nx);
      cy.set(ny);
      if (!drawing.current || finished.current || d < 0.6) return;
      trailRef.current = trailRef.current ? `${trailRef.current} L${nx.toFixed(1)} ${ny.toFixed(1)}` : `M${nx.toFixed(1)} ${ny.toFixed(1)}`;
      setTrail(trailRef.current);
      const inside = nx >= box.x - 18 && nx <= box.x + box.w + 18 && ny >= box.y - 18 && ny <= box.y + box.h + 18;
      if (inside) {
        travelled.current += d;
        quads.current.add((nx > box.x + box.w / 2 ? 1 : 0) + (ny > box.y + box.h / 2 ? 2 : 0));
        if (travelled.current > 60 && Math.floor(travelled.current / 26) !== Math.floor((travelled.current - d) / 26)) buzz.light();
        // Thin letters (i, l, t…) only need a top-to-bottom sweep; wide ones need three quarters of the box.
        const q = quads.current;
        const narrow = /[iljtfr1]/i.test(chars[idxRef.current] ?? '');
        const covered = narrow ? (q.has(0) || q.has(1)) && (q.has(2) || q.has(3)) : q.size >= 3;
        if (travelled.current >= box.h * (narrow ? 0.8 : 1.5) && covered) {
          drawing.current = air ? drawing.current : false;
          nextLetter();
        }
      }
    },
    [size, box, air, nextLetter, cx, cy, chars],
  );

  useEffect(() => {
    let alive = true;
    motionAvailable().then((ok) => {
      if (!alive) return;
      setAir(ok);
      onInput?.(ok ? 'air' : 'finger');
    });
    return () => {
      alive = false;
    };
  }, [onInput]);

  useEffect(() => {
    if (!air) return;
    // About 20° of wrist turn sweeps the letter box.
    const GAIN = 560;
    return watchWand((dx, dy, dt) => moveTo(cursor.current.x + dx * GAIN * dt, cursor.current.y + dy * GAIN * dt));
  }, [air, moveTo]);

  const spark = useAnimatedStyle(() => ({ transform: [{ translateX: cx.value - 16 }, { translateY: cy.value - 16 }, { scale: 0.9 + twinkle.value * 0.25 }, { rotate: `${twinkle.value * 40}deg` }] }));
  const ch = chars[Math.min(idx, chars.length - 1)];
  const letterSize = Math.min(box.h * 0.95, box.w * 1.5);
  const stars = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: ((i * 73) % 97) / 97, y: ((i * 41) % 89) / 89, r: 1 + (i % 3) * 0.7 })), []);

  return (
    <View onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ height, borderRadius: radius.xl, backgroundColor: '#12122B', overflow: 'hidden' }} accessible accessibilityLabel={`Write the letter ${ch} in the air. Letter ${Math.min(idx + 1, chars.length)} of ${chars.length}.`}>
      <Svg style={{ position: 'absolute' }} width="100%" height="100%" pointerEvents="none">
        {stars.map((s, i) => (
          <Circle key={i} cx={`${s.x * 100}%`} cy={`${s.y * 100}%`} r={s.r} fill="#FFFFFF" opacity={0.35} />
        ))}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 14, flexDirection: 'row', justifyContent: 'center', gap: 5, paddingHorizontal: 60, flexWrap: 'wrap' }}>
        {chars.map((x, i) => (
          <Text key={i} style={{ fontFamily: font('b'), fontSize: 20, color: i < idx ? c.butter : i === idx ? '#FFFFFF' : 'rgba(255,255,255,0.28)' }}>
            {x}
          </Text>
        ))}
      </View>
      {size.w > 0 && idx < chars.length && (
        <View pointerEvents="none" style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font('b'), fontSize: letterSize, lineHeight: letterSize * 1.1, color: flash ? c.butter : 'rgba(255,255,255,0.16)' }}>{ch}</Text>
        </View>
      )}
      <Svg style={{ position: 'absolute' }} width="100%" height="100%" pointerEvents="none">
        {!!trail && <Path d={trail} stroke={c.butter} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.22} />}
        {!!trail && <Path d={trail} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.95} />}
      </Svg>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, spark]}>
        <Sparkles size={30} color={syl(1)} fill={c.butter} strokeWidth={1.5} />
      </Animated.View>
      <View
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          drawing.current = true;
          if (!air) {
            const p = pt(e);
            cursor.current = p;
            moveTo(p.x + 0.7, p.y);
          }
        }}
        onResponderMove={(e) => {
          if (!air) {
            const p = pt(e);
            moveTo(p.x, p.y);
          }
        }}
        onResponderRelease={() => (drawing.current = false)}
        onResponderTerminate={() => (drawing.current = false)}
      />
      <View style={{ position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View pointerEvents="none" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>{air ? <Smartphone size={18} color="#FFFFFF" /> : <Hand size={18} color="#FFFFFF" />}</View>
        {air && <IconBtn icon={Crosshair} label="Put the spark back in the middle" kind="glass" size={40} onPress={recenter} />}
      </View>
    </View>
  );
}
