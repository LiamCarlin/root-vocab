import { router } from 'expo-router';
import { List, Play, SkipForward, TimerOff } from 'lucide-react-native';
import { View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { Pop } from '@/components/fx';
import { Btn, Rise, Screen, Tag, TopBar, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { ON_BLOCK, useTheme } from '@/theme';

/** Before the placement: what it covers, how long, and that nothing is timed. */
export default function PlacementIntro() {
  const { c } = useTheme();
  const place = useStore((s) => s.place);

  const skip = () => {
    place({ skill: { know: 2, find: 2, spell: 2 }, missed: [] });
    router.replace('/onboarding/placement-result');
  };

  return (
    <Screen
      scroll={false}
      top={<TopBar steps={{ total: 5, done: 2 }} />}
      footer={
        <>
          <Btn
            icon={Play}
            label="Start"
            a11y="Start the placement"
            onPress={() => {
              sfx.play('whoosh');
              router.push('/onboarding/placement');
            }}
          />
          <Btn kind="ghost" small label="Skip" iconRight={SkipForward} a11y="Skip the placement and start at level 2" onPress={skip} />
        </>
      }>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Figure pose="think" size={190} />
        <Rise i={1}>
          <Txt v="display" center accessibilityRole="header">
            Quick check
          </Txt>
        </Rise>
        <View style={{ flexDirection: 'row', gap: 22 }}>
          {STRAND_ORDER.map((id, i) => {
            const st = STRANDS[id];
            return (
              <Pop key={id} delay={320 + i * 110}>
                <View style={{ alignItems: 'center', gap: 8 }} accessible accessibilityLabel={st.label}>
                  <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: c[st.tone], alignItems: 'center', justifyContent: 'center' }}>
                    <st.icon size={30} color={ON_BLOCK.ink} strokeWidth={2.3} />
                  </View>
                  <Txt v="bodyS">{st.label}</Txt>
                </View>
              </Pop>
            );
          })}
        </View>
        <Rise i={3} style={{ flexDirection: 'row', gap: 8 }}>
          <Tag icon={List} label="18 words" />
          <Tag icon={TimerOff} label="No timer" />
        </Rise>
      </View>
    </Screen>
  );
}
