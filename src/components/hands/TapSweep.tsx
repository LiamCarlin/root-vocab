import { ChevronsRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Tap } from '@/components/ui';
import { beatMs, buzz, hum, say } from '@/lib/audio';
import { ON_BLOCK, radius, useTheme } from '@/theme';

// ── Tap and sweep ─────────────────────────────────────────────────────────
// Finger tapping: one finger comes down for every beat of the word, left to right, and then the
// hand sweeps across them all to say the word in one go. Segment, then blend. It is what a
// tutor has a learner do on the table top; here the table has keys.
//
//   tap   each key in order: it takes its colour, says its beat and hums for as long as the beat lasts
//   sweep the keys dim; slide the handle under them from one end to the other and they light in turn,
//         and at the end the whole word is said
//
// Letting go of the handle part-way sends it back; a tap on the wrong key just nudges.

const KNOB = 58;

export function TapSweep({ parts, says, onBeat, onDone }: { parts: string[]; says: string[]; onBeat?: (i: number) => void; /** Called when the sweep reaches the end. The caller says the whole word. */ onDone: () => void }) {
  const { c, syl, font, reduceMotion, scale } = useTheme();
  const n = parts.length;
  const [tapped, setTapped] = useState(0);
  const [lit, setLit] = useState(0);
  const [done, setDone] = useState(false);
  const [railW, setRailW] = useState(0);
  const [nudge, setNudge] = useState(0);
  const x = useSharedValue(0);
  const litRef = useRef(0);
  const grab = useRef(0);
  const doneRef = useRef(false);
  const stopHum = useRef<(() => void) | null>(null);
  useEffect(() => () => stopHum.current?.(), []);

  const sweeping = tapped >= n;
  const travel = Math.max(1, railW - KNOB - 8);

  const tap = (i: number) => {
    if (sweeping) return;
    if (i !== tapped) {
      buzz.nudge();
      setNudge((v) => v + 1);
      return;
    }
    stopHum.current?.();
    stopHum.current = hum(beatMs(says[i] ?? parts[i]));
    say(says[i] ?? parts[i]);
    onBeat?.(i);
    setTapped(i + 1);
  };

  const setLitTo = (count: number) => {
    if (count === litRef.current) return;
    if (count > litRef.current) buzz.light();
    litRef.current = count;
    setLit(count);
  };

  const slide = (e: GestureResponderEvent, start: boolean) => {
    if (!sweeping || doneRef.current) return;
    if (start) grab.current = e.nativeEvent.pageX - x.value;
    const to = Math.max(0, Math.min(travel, e.nativeEvent.pageX - grab.current));
    x.set(to);
    const p = to / travel;
    // A key lights as the handle passes under its middle.
    setLitTo(Math.min(n, Math.floor(p * n + 0.5)));
    if (p >= 0.985) {
      doneRef.current = true;
      setDone(true);
      setLitTo(n);
      x.set(travel);
      buzz.good();
      onDone();
    }
  };
  const letGo = () => {
    if (doneRef.current) return;
    x.set(reduceMotion ? 0 : withSpring(0, { damping: 18, stiffness: 180 }));
    setLitTo(0);
  };

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + KNOB + 4 }));
  const hint = useSharedValue(0);
  useEffect(() => {
    if (!nudge || reduceMotion) return;
    hint.set(1);
    hint.set(withTiming(0, { duration: 420 }));
  }, [nudge, hint, reduceMotion]);
  const next = useAnimatedStyle(() => ({ transform: [{ scale: 1 + hint.value * 0.05 }] }));

  const fontSize = (n > 4 ? 18 : 23) * Math.min(scale, 1.1);
  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="toolbar" accessibilityLabel={sweeping ? 'All beats tapped' : `Tap beat ${tapped + 1} of ${n}`}>
        {parts.map((p, i) => {
          const down = i < tapped;
          const now = i === tapped;
          const on = sweeping ? i < lit || done : down;
          return (
            <Animated.View key={i} style={[{ flexGrow: Math.max(p.length, 2), flexBasis: n > 4 ? '28%' : 0, minWidth: 64 }, now ? next : null]}>
              <Tap
                onPress={() => tap(i)}
                haptic={false}
                scaleTo={0.97}
                disabled={sweeping}
                accessibilityRole="button"
                accessibilityLabel={down ? `Beat ${i + 1}: ${p}` : `Beat ${i + 1}`}
                accessibilityState={{ selected: down }}
                style={{ height: 124, borderRadius: radius.lg, backgroundColor: down ? syl(i) : c.surface, borderWidth: down ? 0 : now ? 2.5 : 1.5, borderColor: now ? c.ink : c.line, alignItems: 'center', justifyContent: 'center', borderBottomWidth: down ? 6 : now ? 2.5 : 1.5, borderBottomColor: down ? 'rgba(14,14,19,0.16)' : now ? c.ink : c.line, opacity: sweeping && !on ? 0.4 : 1 }}>
                {down ? (
                  <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={{ fontFamily: font('b'), fontSize, color: ON_BLOCK.ink, paddingHorizontal: 4 }}>
                    {p}
                  </Text>
                ) : (
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: now ? c.ink : c.line }} />
                )}
              </Tap>
            </Animated.View>
          );
        })}
      </View>

      {/* The sweep: a handle that slides under every key. It wakes up once the last beat is tapped. */}
      <View
        onLayout={(e) => setRailW(e.nativeEvent.layout.width)}
        style={{ height: KNOB + 8, borderRadius: (KNOB + 8) / 2, backgroundColor: c.surface2, justifyContent: 'center', opacity: sweeping ? 1 : 0.45 }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={done ? 'Blended' : 'Sweep across to blend the beats into the word'}
        accessibilityActions={[{ name: 'increment' }, { name: 'activate' }]}
        onAccessibilityAction={() => {
          if (!sweeping || doneRef.current) return;
          doneRef.current = true;
          setDone(true);
          setLitTo(n);
          x.set(travel);
          onDone();
        }}
        onStartShouldSetResponder={() => sweeping && !done}
        onMoveShouldSetResponder={() => sweeping && !done}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => slide(e, true)}
        onResponderMove={(e) => slide(e, false)}
        onResponderRelease={letGo}
        onResponderTerminate={letGo}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: (KNOB + 8) / 2, backgroundColor: done ? c.mint : c.line }, fill]} />
        {!done && (
          <View pointerEvents="none" style={{ position: 'absolute', right: 20 }}>
            <ChevronsRight size={24} color={c.ink3} strokeWidth={2.4} />
          </View>
        )}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 4, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: sweeping ? c.ink : c.ink3, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 2px 6px rgba(0,0,0,0.22)' }, knob]}>
          <ChevronsRight size={26} color={c.onInk} strokeWidth={2.6} />
        </Animated.View>
      </View>
    </View>
  );
}
