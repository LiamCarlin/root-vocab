import { ArrowLeft, Hand, Lightbulb, Mic, SkipForward, Square, Volume2 } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { Mark } from '@/lib/lexicon';
import { useStore } from '@/lib/store';
import { ON_BLOCK, radius, trackSteps, useTheme, type BlockTone } from '@/theme';
import { Btn, Tap, Txt } from './ui';

// The pieces every lesson step and game shares: the word in its syllable colours, the beat
// tiles, the audio controls, the mic, the letter-by-letter spelling marks and a plain writing
// pad. The hands-on pads (trace, marble run, sand tray, tap and sweep, echo) are in ./hands.

// ── Part tiles: one coloured tile per beat ────────────────────────────────
export function PartTiles({ parts, says, active = -1, onPress, states }: { parts: string[]; says?: string[]; active?: number; onPress?: (i: number) => void; states?: ('idle' | 'good' | 'off' | 'empty')[] }) {
  const { c, syl, font, scale } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {parts.map((p, i) => {
        const st = states?.[i] ?? 'idle';
        const on = i === active;
        const empty = st === 'empty';
        const bg = empty ? 'transparent' : st === 'off' ? c.sun : syl(i);
        return (
          <View key={i} style={{ flex: Math.max(p.length, 2.4), gap: 6 }}>
            <Tap
              onPress={onPress ? () => onPress(i) : undefined}
              disabled={!onPress}
              accessibilityRole="button"
              accessibilityLabel={empty ? `Empty slot ${i + 1}` : `Part ${i + 1}: ${p}`}
              style={{ height: 68, borderRadius: radius.md, backgroundColor: bg, borderWidth: empty ? 2.5 : on ? 3 : onPress ? 1.5 : 0, borderColor: empty ? (on ? c.ink : c.line) : on ? c.ink : 'rgba(14,14,19,0.28)', borderStyle: empty ? 'dashed' : 'solid', alignItems: 'center', justifyContent: 'center', transform: [{ translateY: on && !empty ? -4 : 0 }] }}>
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

/**
 * The whole word in big type. Syllables are split by a small dot ("anx·ious"), the way a
 * dictionary does it: no colour, so nothing reads as a meaning it does not have.
 */
export function SylWord({ text, parts, size = 44, active = -1, color }: { text: string; parts: string[]; size?: number; active?: number; color?: string; /** Kept for callers; the word no longer takes colour from the block under it. */ on?: BlockTone }) {
  const { c, font } = useTheme();
  // The learner's letter-spacing setting reaches the big word too.
  const extra = trackSteps[useStore((s) => s.display.spacing)];
  const track = 0.6 + extra;
  // Wider spacing makes the word longer; a slightly smaller size keeps a word that fitted on one line on one line.
  const fs = extra ? Math.floor(size * 0.955) : size;
  const ink = color ?? c.ink;
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
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }} accessible accessibilityRole="header" accessibilityLabel={text}>
      {chunks.map((ch, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: ch.space ? size * 0.3 : 0 }}>
          {i > 0 && !ch.space && <View style={{ width: Math.max(4, size * 0.11), height: Math.max(4, size * 0.11), borderRadius: size, backgroundColor: ink, opacity: 0.35, marginHorizontal: Math.max(2, size * 0.06) }} />}
          <Text style={{ fontFamily: font('b'), fontSize: fs, lineHeight: size * 1.18, letterSpacing: track, color: ink, opacity: active >= 0 && active !== i ? 0.35 : 1 }}>{ch.p}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Controls: icons only, same place on every step ────────────────────────
/**
 * The lesson hands its "previous step" down to every step's controls, so going back sits in the
 * same place on every screen. Outside a lesson there is none and the button is not shown.
 */
export const StepBack = createContext<(() => void) | null>(null);

/** Back, replay, hint and skip, each with its word. Slower speech is a setting (Settings › Sound and feel), not a button here. */
export function Controls({ onReplay, onSkip, onHint }: { onReplay?: () => void; onSkip?: () => void; onHint?: () => void }) {
  const back = useContext(StepBack);
  return (
    // Words on every control: a lone ⏭ was read as "next", not "skip this step".
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {back && <Btn kind="soft" small icon={ArrowLeft} label="Back" a11y="Previous step" onPress={back} />}
      {onReplay && <Btn kind="soft" small icon={Volume2} label="Replay" a11y="Hear it again" onPress={onReplay} />}
      {onHint && <Btn kind="soft" small icon={Lightbulb} label="Hint" onPress={onHint} />}
      {onSkip && <Btn kind="soft" small icon={SkipForward} label="Skip" a11y="Skip this step" onPress={onSkip} />}
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
      <Tap onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Say it'} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: listening ? c.orange : c.press, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
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
        <View key={i} style={{ width: m.ch === ' ' ? tile * 0.4 : tile, height: Math.max(34, 48 * scale * k), borderRadius: 12 * Math.max(0.6, k), alignItems: 'center', justifyContent: 'center', backgroundColor: m.ok ? c.surface2 : c.butter, borderWidth: m.ok ? 0 : 2, borderColor: ON_BLOCK.ink, borderStyle: m.kind === 'missing' ? 'dashed' : 'solid' }}>
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
