import { router } from 'expo-router';
import { ArrowRight, Check, User } from 'lucide-react-native';
import { useState } from 'react';
import { Keyboard, View } from 'react-native';


import { Block, Btn, Chip, ChipRow, Field, Rise, Screen, SectionLabel, Tap, TopBar, Txt } from '@/components/ui';
import { DAYS, TOPICS, TOPIC_ORDER, type DayId } from '@/data/profile';
import type { Topic } from '@/data/schema';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { radius, useTheme } from '@/theme';

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


  const toggleDay = (id: DayId) => {
    // Picking anything puts the keyboard away, so it never sits over the Next button.
    Keyboard.dismiss();
    const on = profile.days.includes(id);
    if (!on) sfx.play('tap');
    setProfile({ days: on ? profile.days.filter((d) => d !== id) : [...profile.days, id] });
  };
  const toggleTopic = (id: Topic) => {
    Keyboard.dismiss();
    const on = profile.interests.includes(id);
    if (!on) {
      sfx.play('pop');
      setFresh({ id, n: (fresh?.n ?? 0) + 1 });
    }
    setProfile({ interests: on ? profile.interests.filter((t) => t !== id) : [...profile.interests, id] });
  };

  return (
    <Screen keyboard gap={18} top={<TopBar steps={{ total: 4, done: 0 }} />} footer={<Btn icon={ArrowRight} label="Next" onPress={next} />}>
      <Rise>
        <Txt v="display" accessibilityRole="header">
          About you
        </Txt>
        {/* Why it is asked: otherwise "My days" reads like a schedule to fill in. */}
        <Txt v="body" color="ink2" style={{ marginTop: 6 }}>
          Root uses these to pick example sentences that sound like your life. All optional.
        </Txt>
      </Rise>

      {/* Root sits on the first card and reacts as things are picked. */}
      <Rise i={1}>
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
                <View style={{ paddingLeft: 8 }}>
                  <User size={20} color={c.ink2} strokeWidth={2.2} />
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
        </View>
      </Rise>

      <Rise i={2} style={{ gap: 12 }}>
        <SectionLabel>I like</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
          {TOPIC_ORDER.map((id) => {
            const t = TOPICS[id];
            const on = profile.interests.includes(id);
            const fg = on ? c.onInk : c.ink;
            return (
              <Tap
                key={id}
                onPress={() => toggleTopic(id)}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: on }}
                style={{ width: '31%', minHeight: 108, borderRadius: radius.lg, backgroundColor: on ? c.ink : c.surface, borderWidth: 1.5, borderColor: on ? c.ink : c.line, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6 }}>
                {on ? <Check size={24} color={c.onInk} strokeWidth={3} /> : <t.icon size={24} color={c.ink} strokeWidth={2.2} />}
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
