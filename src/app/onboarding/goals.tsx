import { router } from 'expo-router';
import { ArrowRight, Check, Flame, Leaf, Zap, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Peek } from '@/components/Buddy';
import { Burst } from '@/components/fx';
import { Block, Btn, Rise, Screen, SectionLabel, Tap, TopBar, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER, type Strand } from '@/data/profile';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

const PACE: { goal: 1 | 2 | 3; label: string; icon: LucideIcon }[] = [
  { goal: 1, label: 'Easy', icon: Leaf },
  { goal: 2, label: 'Steady', icon: Flame },
  { goal: 3, label: 'Keen', icon: Zap },
];

/** Goals. Which of the three strands matter most, and how much to do in a day. */
export default function Goals() {
  const { c, font } = useTheme();
  const goals = useStore((s) => s.profile.goals);
  const goal = useStore((s) => s.goal);
  const setProfile = useStore((s) => s.setProfile);
  const patch = useStore((s) => s.patch);
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
    <Screen gap={14} top={<TopBar steps={{ total: 5, done: 1 }} />} footer={<Btn
          icon={ArrowRight}
          a11y="Next"
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
            <Block tone={on ? st.tone : 'surface'} pad={18} onPress={() => toggle(id)} a11y={`${st.goal}${on ? ', selected' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 96 }}>
              {on && fresh?.id === id && <Burst key={fresh.n} size={160} />}
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: on ? ON_BLOCK.ink : c[st.tone], alignItems: 'center', justifyContent: 'center' }}>
                <st.icon size={26} color={on ? '#FFFFFF' : ON_BLOCK.ink} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="heading">{st.goal}</Txt>
              </View>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: on ? ON_BLOCK.ink : 'transparent', borderWidth: on ? 0 : 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>{on && <Check size={18} color="#FFFFFF" strokeWidth={3.2} />}</View>
            </Block>
          </Rise>
        );
      })}

      {/* How much in a day. Root looks over the top of the card. */}
      <Rise i={4} style={{ marginTop: 58 }}>
        <View style={{ position: 'relative' }}>
          <Peek from="top" size={150} align="end" inset={26} />
          <Block pad={18} style={{ gap: 12 }}>
            <SectionLabel style={{ marginTop: 0 }}>Each day</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {PACE.map((p) => {
                const on = goal === p.goal;
                const fg = on ? ON_BLOCK.ink : c.ink;
                return (
                  <Tap
                    key={p.goal}
                    onPress={() => {
                      if (!on) sfx.play('tap');
                      patch({ goal: p.goal });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.label}: ${p.goal} ${p.goal === 1 ? 'stop' : 'stops'} a day`}
                    accessibilityState={{ selected: on }}
                    style={{ flex: 1, minHeight: 118, borderRadius: radius.lg, backgroundColor: on ? c.orange : c.surface2, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 }}>
                    <p.icon size={22} color={fg} strokeWidth={2.4} />
                    <Text style={{ fontFamily: font('b'), fontSize: 30, lineHeight: 36, color: fg }}>{p.goal}</Text>
                    <Txt v="bodyS" style={{ color: fg }}>
                      {p.label}
                    </Txt>
                  </Tap>
                );
              })}
            </View>
          </Block>
        </View>
      </Rise>
    </Screen>
  );
}
