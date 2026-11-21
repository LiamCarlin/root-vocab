import { router } from 'expo-router';
import { ArrowRight, RotateCcw } from 'lucide-react-native';
import { View, useWindowDimensions } from 'react-native';

import { Figure } from '@/components/Buddy';
import { Btn, Rise, Screen, Txt } from '@/components/ui';
import { sfx } from '@/lib/sfx';

/** Welcome. Root arrives, one line says what the app is for, one way in. */
export default function Welcome() {
  const { height } = useWindowDimensions();
  const size = Math.max(170, Math.min(250, height * 0.3));
  const disc = size * 1.16;

  return (
    <Screen
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
          <Btn kind="soft" small icon={RotateCcw} label="I have used Root before" a11y="I have used Root before. Bring back my words." onPress={() => router.push('/onboarding/restore')} />
        </>
      }>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <View style={{ width: disc, height: disc, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Figure pose="wave" size={size} delay={220} />
        </View>
        <Rise i={2}>
          {/* Root says who it is here, so the name is known before the app starts using it. */}
          <Txt v="hero" center accessibilityRole="header">
            Hi, I’m Root.
          </Txt>
          <Txt v="title" color="ink2" center style={{ marginTop: 6 }}>
            Let’s find your words.
          </Txt>
        </Rise>
      </View>
    </Screen>
  );
}
