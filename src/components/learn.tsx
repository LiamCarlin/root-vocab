import { Hand, Lightbulb, Mic, SkipForward, Snail, Square, Volume2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { Mark } from '@/lib/lexicon';
import { useStore } from '@/lib/store';
import { ON_BLOCK, SYLLABLE_TONES, radius, trackSteps, useTheme, type BlockTone } from '@/theme';
import { IconBtn, Tap, Txt } from './ui';

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
