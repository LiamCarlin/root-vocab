import { User } from 'lucide-react-native';
import { View } from 'react-native';

import { Chip, ChipRow, Field, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { DAYS, STRANDS, STRAND_ORDER, TOPICS, TOPIC_ORDER, type DayId, type Strand } from '@/data/profile';
import type { Topic } from '@/data/words';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';

const flip = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/** Who the learner is. It flavours examples and the order words arrive in; it never limits them. */
export default function AboutMe() {
  const { c } = useTheme();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);

  return (
    <Screen top={<TopBar center={<Txt v="heading">About me</Txt>} />} keyboard>
      <Field value={profile.name} onChangeText={(name) => setProfile({ name, guest: profile.guest && !name.trim() })} placeholder="Name" autoCapitalize="words" accessibilityLabel="First name, optional" left={<View style={{ paddingLeft: 8 }}><User size={20} color={c.ink3} /></View>} />

      <SectionLabel>My goals</SectionLabel>
      <ChipRow>
        {STRAND_ORDER.map((id: Strand) => (
          <Chip key={id} label={STRANDS[id].goal} icon={STRANDS[id].icon} tone={STRANDS[id].tone} selected={profile.goals.includes(id)} onPress={() => setProfile({ goals: flip(profile.goals, id) })} />
        ))}
      </ChipRow>

      <SectionLabel>My days</SectionLabel>
      <ChipRow>
        {DAYS.map((d) => (
          <Chip key={d.id} label={d.label} icon={d.icon} selected={profile.days.includes(d.id)} onPress={() => setProfile({ days: flip<DayId>(profile.days, d.id) })} />
        ))}
      </ChipRow>

      <SectionLabel>I like</SectionLabel>
      <ChipRow>
        {TOPIC_ORDER.map((t: Topic) => (
          <Chip key={t} label={TOPICS[t].label} icon={TOPICS[t].icon} tone={TOPICS[t].tone} selected={profile.interests.includes(t)} onPress={() => setProfile({ interests: flip(profile.interests, t) })} />
        ))}
      </ChipRow>
    </Screen>
  );
}
