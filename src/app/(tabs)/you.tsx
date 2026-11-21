import { router, type Href } from 'expo-router';
import { Brain, ChevronRight, Eye, Flame, FlaskConical, Gem, Save, User, Volume2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Growth, MascotBadge } from '@/components/Mascot';
import { Badge } from '@/components/rewards';
import { Block, Group, Ring, Row, Screen, SectionLabel, Tap, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { levelProgress } from '@/lib/engine';
import { BADGES, badgeTier } from '@/lib/rewards';
import { levelOf, streak, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { TAB_SPACE } from './_layout';

export default function You() {
  const { c, e1, font } = useTheme();
  const s = useStore();

  const fire = streak(s);
  const rooted = Object.values(s.words).filter((w) => w.status === 'known').length;

  // The four badges to show off: the most recently earned first, topped up with the ones closest to hand.
  const earned = BADGES.filter((b) => (s.badges[b.id]?.tier ?? 0) > 0).sort((a, b) => (s.badges[a.id].on < s.badges[b.id].on ? 1 : s.badges[a.id].on > s.badges[b.id].on ? -1 : 0));
  const upcoming = BADGES.filter((b) => !b.hidden && !earned.includes(b));
  const strip = [...earned, ...upcoming].slice(0, 4);
  const tiersHeld = BADGES.reduce((sum, b) => sum + (s.badges[b.id]?.tier ?? 0), 0);

  // Each number says what it counts: an icon alone left the carrot and the gem to guesswork.
  const tile = (node: React.ReactNode, value: number | string, label: string) => (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)' }} accessible accessibilityLabel={`${value} ${label}`}>
      {node}
      <Text style={{ fontFamily: font('b'), fontSize: 24, color: ON_BLOCK.ink }}>{value}</Text>
      <Text style={{ fontFamily: font('m'), fontSize: 13, color: ON_BLOCK.ink2 }}>{label}</Text>
    </View>
  );

  return (
    <Screen bottomSpace={TAB_SPACE} gap={14}>
      {/* Who you are and where you stand. Root looks in over the top. */}
      <View style={{ marginTop: s.display.companion === 'off' ? 4 : 78 }}>
        <Block tone="brand" pad={18} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <MascotBadge size={72} tone="orange" />
            <Txt v="display" numberOfLines={1} style={{ flex: 1 }}>
              {s.profile.name || 'You'}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tile(<Flame size={26} color={c.orange} fill={c.orange} />, fire, 'day streak')}
            {tile(<Gem size={26} color={c.indigo} fill={c.indigo} />, s.gems, 'gems')}
            {tile(<Growth stage={3} size={28} />, rooted, 'words rooted')}
          </View>
        </Block>
      </View>

      {/* The three strands: level in the middle, the ring fills toward the next one. Read-only; "What Root knows" explains them. */}
      <SectionLabel>Levels</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {STRAND_ORDER.map((k) => {
          const st = STRANDS[k];
          const level = levelOf(s.skill[k]);
          const pct = Math.round(levelProgress(s.skill[k]) * 100);
          return (
            <Block key={k} tone={st.tone} pad={14} a11y={`${st.label}: level ${level}, ${pct} percent of the way to the next.`} style={{ flex: 1, alignItems: 'center', gap: 10 }}>
              <Ring value={levelProgress(s.skill[k])} size={76} stroke={7} color={c.indigo} track="rgba(76,92,235,0.16)">
                <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 28, lineHeight: 32, color: ON_BLOCK.ink }}>{level}</Text>
              </Ring>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <st.icon size={17} color={ON_BLOCK.ink} strokeWidth={2.5} />
                <Txt v="bodyS">{st.label}</Txt>
              </View>
            </Block>
          );
        })}
      </View>

      {/* Badges: the latest four. The whole strip opens the collection. */}
      <SectionLabel>Badges</SectionLabel>
      <Tap onPress={() => router.push('/badges' as Href)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Badges. ${tiersHeld} earned. Open the collection.`} style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingVertical: 16, paddingLeft: 14, paddingRight: 8, flexDirection: 'row', alignItems: 'center' }, e1]}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          {strip.map((b) => (
            <Badge key={b.id} id={b.id} tier={badgeTier(s, b.id).tier} size={60} />
          ))}
        </View>
        <ChevronRight size={22} color={c.ink3} />
      </Tap>

      <Group>
        <Row title="What Root knows" sub="Your levels and what to work on" icon={Brain} chevron onPress={() => router.push('/insights' as Href)} last />
      </Group>

      <Group>
        <Row title="Reading" icon={Eye} chevron onPress={() => router.push('/settings/reading')} />
        <Row title="Sound and feel" icon={Volume2} chevron onPress={() => router.push('/settings/feel' as Href)} />
        <Row title="About me" icon={User} chevron onPress={() => router.push('/settings/profile')} />
        <Row title="Backup" icon={Save} chevron onPress={() => router.push('/settings/backup')} />
        <Row title="Moderator" icon={FlaskConical} chevron onPress={() => router.push('/settings/moderator')} last />
      </Group>
    </Screen>
  );
}
