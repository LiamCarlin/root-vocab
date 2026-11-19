import { router } from 'expo-router';
import { ArrowRight, Check, SkipForward, User } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Perch } from '@/components/Buddy';
import type { Pose } from '@/components/Mascot';
import { Burst } from '@/components/fx';
import { Block, Btn, Chip, ChipRow, Field, IconBtn, Rise, Screen, SectionLabel, Tap, TopBar, Txt } from '@/components/ui';
import { DAYS, TOPICS, TOPIC_ORDER, type DayId } from '@/data/profile';
import type { Topic } from '@/data/schema';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

/**
 * About you. Nothing here is required. What a learner's days look like and what they like
 * flavours the examples and nudges which words come first; it never limits the words.
 */
export default function About() {
  const { c } = useTheme();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  // The tile that was just picked, so only that one sparkles.
  const [fresh, setFresh] = useState<{ id: Topic; n: number } | null>(null);
  const next = () => router.push('/onboarding/goals');

  const picks = profile.days.length + profile.interests.length;
  // Root warms up as it gets to know you.
  const pose: Pose = picks === 0 ? 'think' : picks < 3 ? 'wave' : 'cheer';

  const toggleDay = (id: DayId) => {
    const on = profile.days.includes(id);
    if (!on) sfx.play('tap');
    setProfile({ days: on ? profile.days.filter((d) => d !== id) : [...profile.days, id] });
  };
  const toggleTopic = (id: Topic) => {
    const on = profile.interests.includes(id);
    if (!on) {
      sfx.play('pop');
      setFresh({ id, n: (fresh?.n ?? 0) + 1 });
    }
    setProfile({ interests: on ? profile.interests.filter((t) => t !== id) : [...profile.interests, id] });
  };

  return (
    <Screen keyboard gap={18} top={<TopBar steps={{ total: 5, done: 0 }} right={<IconBtn icon={SkipForward} label="Skip this step" size={48} onPress={next} />} />} footer={<Btn icon={ArrowRight} a11y="Next" onPress={next} />}>
      <Rise>
        <Txt v="display" accessibilityRole="header">
          About you
        </Txt>
      </Rise>

      {/* Root sits on the first card and reacts as things are picked. */}
      <Rise i={1} style={{ marginTop: 78 }}>
        <View style={{ position: 'relative' }}>
          <Block pad={18} style={{ gap: 14 }}>
            <Field
              value={profile.name}
              onChangeText={(t) => setProfile({ name: t })}
              placeholder="Name"
              autoCapitalize="words"
              accessibilityLabel="Your first name, optional"
              returnKeyType="done"
              maxLength={24}
              left={
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color={c.ink} strokeWidth={2.3} />
                </View>
              }
            />
            <SectionLabel style={{ marginTop: 2 }}>My days</SectionLabel>
            <ChipRow>
              {DAYS.map((d) => (
                <Chip key={d.id} label={d.label} icon={d.icon} selected={profile.days.includes(d.id)} onPress={() => toggleDay(d.id)} />
              ))}
            </ChipRow>
          </Block>
          <Perch pose={pose} size={80} side="right" inset={20} />
        </View>
      </Rise>

      <Rise i={2} style={{ gap: 12 }}>
        <SectionLabel>I like</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
          {TOPIC_ORDER.map((id) => {
            const t = TOPICS[id];
            const on = profile.interests.includes(id);
            const fg = on ? ON_BLOCK.ink : c.ink;
            return (
              <Tap
                key={id}
                onPress={() => toggleTopic(id)}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: on }}
                style={{ width: '31%', minHeight: 108, borderRadius: radius.lg, backgroundColor: on ? c[t.tone] : c.surface, borderWidth: on ? 0 : 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6 }}>
                {on && fresh?.id === id && <Burst key={fresh.n} size={110} />}
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: on ? ON_BLOCK.ink : c.surface2, alignItems: 'center', justifyContent: 'center' }}>{on ? <Check size={22} color="#FFFFFF" strokeWidth={3} /> : <t.icon size={22} color={c.ink} strokeWidth={2.2} />}</View>
                <Txt v="caption" center numberOfLines={2} style={{ color: fg }}>
                  {t.label}
                </Txt>
              </Tap>
            );
          })}
          {/* Keeps a short last row left-aligned. */}
          {TOPIC_ORDER.length % 3 === 2 && <View style={{ width: '31%' }} />}
        </View>
      </Rise>
    </Screen>
  );
}
