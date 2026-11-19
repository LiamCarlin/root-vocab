import { Lightbulb, type LucideIcon } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Screen, Txt } from '@/components/ui';
import { ON_BLOCK, radius, useTheme } from '@/theme';

/** A lesson step's screen: the kit's Screen with the step's controls in the footer. */
export function StepScreen({ top, footer, children, scroll = true, gap = 16, keyboard }: { top: ReactNode; footer: ReactNode; children: ReactNode; scroll?: boolean; gap?: number; keyboard?: boolean }) {
  return (
    <Screen top={top} scroll={scroll} gap={gap} keyboard={keyboard} footer={<View style={{ gap: 10 }}>{footer}</View>}>
      {children}
    </Screen>
  );
}

/** The lesson's progress: one bar that moves forward a notch each step. */
export function LessonBar({ total, done }: { total: number; done: number }) {
  const { c, reduceMotion } = useTheme();
  const target = Math.max(0.04, Math.min(1, done / total));
  const p = useSharedValue(target);
  useEffect(() => {
    p.set(reduceMotion ? target : withSpring(target, { damping: 15, stiffness: 150, mass: 0.8 }));
  }, [p, target, reduceMotion]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 28, justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityLabel={`Step ${Math.min(done + 1, total)} of ${total}`} accessibilityValue={{ min: 0, max: total, now: done }}>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: c.surface2, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 14, borderRadius: 7, backgroundColor: c.orange }, fill]}>
          <View style={{ position: 'absolute', left: 7, right: 7, top: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' }} />
        </Animated.View>
      </View>
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
