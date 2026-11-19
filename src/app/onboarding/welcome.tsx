import { router } from 'expo-router';
import { ArrowRight, RotateCcw } from 'lucide-react-native';
import { View, useWindowDimensions } from 'react-native';

import { Reaction } from '@/components/Buddy';
import { Float, Pop, Rays } from '@/components/fx';
import { Btn, Rise, Screen, Txt } from '@/components/ui';
import { sfx } from '@/lib/sfx';

/** Welcome. Root arrives, one line says what the app is for, one way in. */
export default function Welcome() {
  const { height } = useWindowDimensions();
  const size = Math.max(170, Math.min(250, height * 0.3));
  const disc = size * 1.16;

  return (
    <Screen
      tone="brand"
      scroll={false}
      footer={
        <>
          <Btn
            label="Start"
            iconRight={ArrowRight}
            a11y="Get started"
            onPress={() => {
              sfx.play('pop');
              router.push('/onboarding/about');
            }}
          />
          <Btn kind="white" small icon={RotateCcw} label="Restore" a11y="I have used Root before. Restore my words." onPress={() => router.push('/onboarding/restore')} />
        </>
      }>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <View style={{ width: disc, height: disc, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Rays size={disc * 1.5} />
          <Pop from={0.7} style={{ position: 'absolute', left: 0, top: 0 }}>
            <Float amp={4} period={3400}>
              <View style={{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: 'rgba(255,255,255,0.42)' }} />
            </Float>
          </Pop>
          <Reaction pose="wave" size={size} delay={220} />
        </View>
        <Rise i={2}>
          <Txt v="hero" center accessibilityRole="header">
            Find your words.
          </Txt>
        </Rise>
      </View>
    </Screen>
  );
}
