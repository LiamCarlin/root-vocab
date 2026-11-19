import { Flame } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Pop } from '@/components/fx';
import { ON_BLOCK, radius, useTheme } from '@/theme';

/** The run of right answers, in the top bar. Appears at two in a row and grows with the run. */
export function ComboFlame({ n }: { n: number }) {
  const { c, reduceMotion } = useTheme();
  const s = useSharedValue(1);
  useEffect(() => {
    if (n < 2 || reduceMotion) return;
    s.set(withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 240 })));
  }, [n, reduceMotion, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const size = 20 + Math.min(n, 6) * 2;
  return (
    <View style={{ width: 56, height: 48, alignItems: 'flex-end', justifyContent: 'center' }} accessible={n >= 2} accessibilityLabel={n >= 2 ? `${n} in a row` : undefined}>
      {n >= 2 && (
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 3 }, anim]}>
          <Flame size={size} color={c.orange} fill={c.orange} strokeWidth={2} />
          <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 17, color: c.ink }}>{n}</Text>
        </Animated.View>
      )}
    </View>
  );
}

/** A chip that pops in beside the game's name when a run hits a mark, then lets go. Re-key it to show it again. */
export function ComboPop({ n }: { n: number }) {
  const { c, e2 } = useTheme();
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <Animated.View pointerEvents="none" exiting={FadeOut.duration(220)} style={{ position: 'absolute', right: 0, top: -48, zIndex: 5 }}>
      <Pop from={0.3}>
        <View style={[{ height: 44, borderRadius: radius.pill, backgroundColor: c.orange, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 }, e2]} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${n} in a row`}>
          <Flame size={20} color={ON_BLOCK.ink} fill={ON_BLOCK.ink} />
          <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 16, color: ON_BLOCK.ink }}>{n} in a row</Text>
        </View>
      </Pop>
    </Animated.View>
  );
}
