import { Check, Volume2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { Float, Pop, Wiggle } from '@/components/fx';
import { useElapsed, useOnce } from '@/components/play/hooks';
import { Tap } from '@/components/ui';
import { buzz, say, speakable } from '@/lib/audio';
import { shuffled } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import type { GameProps } from './types';

const ALine = Animated.createAnimatedComponent(Line);

/** A line that draws itself from the centre out to a bubble. */
function Thread({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const { reduceMotion } = useTheme();
  const len = Math.hypot(x2 - x1, y2 - y1);
  const p = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(1, { duration: reduceMotion ? 0 : 280, easing: Easing.out(Easing.quad) }));
  }, [p, reduceMotion]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  return <ALine x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={props} />;
}

type Bubble = { label: string; belongs: boolean };
const BW = 122;
const BH = 56;
const SLOTS: [number, number][] = [[0, -1], [-1, -0.55], [1, -0.55], [-1, 0.5], [1, 0.5], [-0.65, 1], [0.65, 1]];

/**
 * Word web: the word in the middle, and around it things that belong with it and things that
 * do not. Tapping what belongs draws a thread to it. Building these links is what gives a word
 * more ways to be found when it is needed.
 */
export function Web({ lex, onResult, done }: GameProps) {
  const { c, e1, e2, syl, font, scale } = useTheme();
  const elapsed = useElapsed();
  const bubbles = useOnce<Bubble[]>(() => shuffled([...lex.links.slice(0, 4).map((label) => ({ label, belongs: true })), ...lex.not.slice(0, 3).map((label) => ({ label, belongs: false }))]));
  const need = bubbles.filter((b) => b.belongs).length;
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const sent = useRef(false);
  const open = done || found.length >= need;

  const tap = (b: Bubble) => {
    if (sent.current || found.includes(b.label) || missed.includes(b.label)) return;
    if (!b.belongs) {
      buzz.nudge();
      setMissed((m) => [...m, b.label]);
      return;
    }
    sfx.play('pop');
    const next = [...found, b.label];
    setFound(next);
    if (next.length >= need) {
      sent.current = true;
      const wrong = missed.length;
      onResult({ r: wrong === 0 ? 1 : wrong <= 2 ? 0.5 : 0, ms: elapsed() });
    }
  };

  const cx = box ? box.w / 2 : 0;
  const cy = box ? box.h / 2 : 0;
  const disc = box ? Math.max(118, Math.min(150, Math.min(box.w, box.h) * 0.36)) : 124;
  const wordPx = Math.max(12, Math.min(22, (disc - 22) / (Math.max(4, lex.text.length) * 0.6)));
  const rx = box ? Math.max(40, box.w / 2 - BW / 2 - 2) : 0;
  const ry = box ? Math.max(60, Math.min(box.h / 2 - BH / 2 - 10, 250)) : 0;
  // Seven fixed places around the word, laid out for a narrow screen so no two bubbles touch.
  const at = (i: number) => {
    const [sx, sy] = SLOTS[i % SLOTS.length];
    return { x: cx + sx * rx, y: cy + sy * ry };
  };

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box && (
        <>
          <Svg width={box.w} height={box.h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            {bubbles.map((b, i) => {
              if (!found.includes(b.label)) return null;
              const p = at(i);
              return <Thread key={b.label} x1={cx} y1={cy} x2={p.x} y2={p.y} color={c.ink} />;
            })}
          </Svg>

          {bubbles.map((b, i) => {
            const p = at(i);
            const got = found.includes(b.label);
            const off = missed.includes(b.label) || (open && !b.belongs);
            return (
              <Float key={b.label} amp={got ? 0 : 4 + (i % 3)} period={2400 + i * 310} style={{ position: 'absolute', left: p.x - BW / 2, top: p.y - BH / 2, width: BW, height: BH }}>
                <Wiggle trigger={missed.includes(b.label) ? 1 : 0}>
                  <Tap
                    onPress={() => tap(b)}
                    disabled={open || got || off}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.label}${got ? ', belongs' : off ? ', does not belong' : ''}`}
                    accessibilityState={{ disabled: open || got || off, selected: got }}
                    style={[{ width: BW, height: BH, borderRadius: radius.pill, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, backgroundColor: got ? syl(found.indexOf(b.label)) : c.surface, borderWidth: got ? 0 : 1.5, borderColor: c.line, opacity: off ? 0.32 : 1 }, got || off ? null : e1]}>
                    {got && <Check size={15} color={ON_BLOCK.ink} strokeWidth={3.4} />}
                    <Text numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={{ flexShrink: 1, fontFamily: font('s'), fontSize: (b.label.length > 12 ? 13 : 15) * Math.min(scale, 1.1), lineHeight: (b.label.length > 12 ? 16 : 19) * Math.min(scale, 1.1), textAlign: 'center', color: got ? ON_BLOCK.ink : c.ink }}>
                      {b.label}
                    </Text>
                  </Tap>
                </Wiggle>
              </Float>
            );
          })}

          <View style={{ position: 'absolute', left: cx - disc / 2, top: cy - disc / 2 }}>
            <Pop from={0.6}>
              <Tap onPress={() => say(speakable(lex.text))} accessibilityRole="button" accessibilityLabel={`${lex.text}. ${found.length} of ${need} found. Tap to hear it.`} style={[{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 5, borderBottomColor: '#7B97E8' }, e2]}>
                <Volume2 size={15} color={ON_BLOCK.ink2} strokeWidth={2.6} style={{ marginBottom: 2 }} />
                <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={{ fontFamily: font('b'), fontSize: wordPx, color: ON_BLOCK.ink, textAlign: 'center' }}>
                  {lex.text}
                </Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                  {Array.from({ length: need }, (_, i) => (
                    <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < found.length ? ON_BLOCK.ink : 'rgba(14,14,19,0.2)' }} />
                  ))}
                </View>
              </Tap>
            </Pop>
          </View>
        </>
      )}
    </View>
  );
}
