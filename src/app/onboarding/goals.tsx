import { router } from 'expo-router';
import { ArrowRight, Check } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PacePicker } from '@/components/PacePicker';
import { Block, Btn, Rise, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER, type Strand } from '@/data/profile';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';

/** Goals. Which of the three strands matter most, and how much to do in a day. */
export default function Goals() {
  const { c } = useTheme();
  const goals = useStore((s) => s.profile.goals);
  const setProfile = useStore((s) => s.setProfile);
  const [fresh, setFresh] = useState<{ id: Strand; n: number } | null>(null);

  const toggle = (id: Strand) => {
    const on = goals.includes(id);
    if (!on) {
      sfx.play('pop');
      setFresh({ id, n: (fresh?.n ?? 0) + 1 });
    }
    setProfile({ goals: on ? goals.filter((g) => g !== id) : [...goals, id] });
  };

  return (
    <Screen gap={14} top={<TopBar steps={{ total: 4, done: 1 }} />} footer={<Btn
          icon={ArrowRight}
          label="Next"
          onPress={() => {
            // Nothing picked means all three matter.
            if (!goals.length) setProfile({ goals: [...STRAND_ORDER] });
            router.push('/onboarding/placement-intro');
          }}
        />}>
      <Rise>
        <Txt v="display" accessibilityRole="header">
          My goals
        </Txt>
      </Rise>

      {STRAND_ORDER.map((id, i) => {
        const st = STRANDS[id];
        const on = goals.includes(id);
        return (
          <Rise key={id} i={i + 1}>
            <Block outline={on ? 'ink' : undefined} pad={18} onPress={() => toggle(id)} a11y={`${st.goal}${on ? ', selected' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 96 }}>
              <st.icon size={28} color={c.ink} strokeWidth={2.3} />
              <View style={{ flex: 1 }}>
                <Txt v="heading">{st.goal}</Txt>
              </View>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: on ? c.ink : 'transparent', borderWidth: on ? 0 : 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>{on && <Check size={18} color={c.onInk} strokeWidth={3.2} />}</View>
            </Block>
          </Rise>
        );
      })}

      {/* How much in a day. Root looks over the top of the card. */}
      <Rise i={4} style={{ marginTop: 10 }}>
        <View style={{ position: 'relative' }}>
          <Block pad={18} style={{ gap: 12 }}>
            <SectionLabel style={{ marginTop: 0 }}>Stops on the journey each day</SectionLabel>
            <PacePicker />
          </Block>
        </View>
      </Rise>
    </Screen>
  );
}
