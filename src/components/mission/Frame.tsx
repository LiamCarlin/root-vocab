import { Lightbulb, type LucideIcon } from 'lucide-react-native';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Burst } from '@/components/fx';
import { Screen, Txt } from '@/components/ui';
import { ON_BLOCK, radius, useTheme } from '@/theme';

/** Lets the lesson route know how tall the current step's footer is, so Root can rest on top of it. */
export const LessonLayout = createContext<{ setFooter: (h: number) => void } | null>(null);

/** Room left at the bottom of a scrolling step so nothing ends up behind Root's corner. */
const CORNER = 68;

/** A lesson step's screen: the kit's Screen, plus a measured footer. */
export function StepScreen({ top, footer, children, scroll = true, gap = 16, keyboard }: { top: ReactNode; footer: ReactNode; children: ReactNode; scroll?: boolean; gap?: number; keyboard?: boolean }) {
  const layout = useContext(LessonLayout);
  return (
    <Screen
      top={top}
      scroll={scroll}
      gap={gap}
      keyboard={keyboard}
      bottomSpace={scroll ? CORNER : 0}
      footer={
        <View style={{ gap: 10 }} onLayout={(e) => layout?.setFooter(e.nativeEvent.layout.height)}>
          {footer}
        </View>
      }>
      {children}
    </Screen>
  );
}

/** The lesson's progress: one bar that springs forward a notch each step, with a spark at its tip. */
export function LessonBar({ total, done }: { total: number; done: number }) {
  const { c, reduceMotion } = useTheme();
  const target = Math.max(0.04, Math.min(1, done / total));
  const p = useSharedValue(target);
  useEffect(() => {
    p.set(reduceMotion ? target : withSpring(target, { damping: 15, stiffness: 150, mass: 0.8 }));
  }, [p, target, reduceMotion]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const tip = useAnimatedStyle(() => ({ left: `${p.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 28, justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityLabel={`Step ${Math.min(done + 1, total)} of ${total}`} accessibilityValue={{ min: 0, max: total, now: done }}>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: c.surface2, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 14, borderRadius: 7, backgroundColor: c.orange }, fill]}>
          <View style={{ position: 'absolute', left: 7, right: 7, top: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' }} />
        </Animated.View>
      </View>
      {done > 0 && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, width: 28, height: 28, marginLeft: -20 }, tip]}>
          <Burst key={done} size={54} count={7} />
        </Animated.View>
      )}
    </View>
  );
}

/** The one reason worth reading: why a piece or a letter is what it is. Learning content, so it gets words. */
export function Why({ text, label, icon: Icon = Lightbulb, tone = 'butter' }: { text: string; label?: string; icon?: LucideIcon; tone?: 'butter' | 'error' }) {
  const { c } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: tone === 'butter' ? c.sun : c.errorTint, borderRadius: radius.lg, padding: 16 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tone === 'butter' ? c.butter : c.orange, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={ON_BLOCK.ink} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        {!!label && (
          <Txt v="caption" color="ink2">
            {label}
          </Txt>
        )}
        <Txt v="bodyS">{text}</Txt>
      </View>
    </View>
  );
}

/** A burst of sparks over whatever was just finished. Wrap the finished thing in a plain View and put this last inside it. */
export function Sparks({ on, size = 220 }: { on: boolean; size?: number }) {
  return on ? <Burst size={size} count={12} /> : null;
}
