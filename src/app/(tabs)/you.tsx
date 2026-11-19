import { router, type Href } from 'expo-router';
import { Bell, ChevronRight, Eye, Flame, FlaskConical, Gem, Save, Snowflake, User, Volume2 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Peek } from '@/components/Buddy';
import { Growth, MascotBadge } from '@/components/Mascot';
import { Badge } from '@/components/rewards';
import { Block, Btn, Group, Ring, Row, Screen, SectionLabel, Tap, Txt, useToast } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { buzz } from '@/lib/audio';
import { levelProgress } from '@/lib/engine';
import { BADGES, badgeTier } from '@/lib/rewards';
import { sfx } from '@/lib/sfx';
import { GEMS, MAX_FREEZES, levelOf, streak, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { TAB_SPACE } from './_layout';

export default function You() {
  const { c, e1, font } = useTheme();
  const s = useStore();
  const toast = useToast();

  const fire = streak(s);
  const rooted = Object.values(s.words).filter((w) => w.status === 'known').length;

  // The four badges to show off: the most recently earned first, topped up with the ones closest to hand.
  const earned = BADGES.filter((b) => (s.badges[b.id]?.tier ?? 0) > 0).sort((a, b) => (s.badges[a.id].on < s.badges[b.id].on ? 1 : s.badges[a.id].on > s.badges[b.id].on ? -1 : 0));
  const upcoming = BADGES.filter((b) => !b.hidden && !earned.includes(b));
  const strip = [...earned, ...upcoming].slice(0, 4);
  const tiersHeld = BADGES.reduce((sum, b) => sum + (s.badges[b.id]?.tier ?? 0), 0);

  const canBuy = s.freezes < MAX_FREEZES && s.gems >= GEMS.freeze;
  const buy = () => {
    if (s.buyFreeze()) {
      buzz.good();
      sfx.play('gem');
      toast({ text: 'Freeze ready', icon: Snowflake, tone: 'success' });
    }
  };

  const tile = (node: React.ReactNode, value: number | string, a11y: string) => (
    <View style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.55)' }} accessible accessibilityLabel={a11y}>
      {node}
      <Text style={{ fontFamily: font('b'), fontSize: 24, color: ON_BLOCK.ink }}>{value}</Text>
    </View>
  );

  return (
    <Screen bottomSpace={TAB_SPACE} gap={14}>
      {/* Who you are and where you stand. Root looks in over the top. */}
      <View style={{ marginTop: s.display.companion === 'off' ? 4 : 78 }}>
        <Block tone="brand" pad={18} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <MascotBadge size={72} tone="butter" />
            <Txt v="display" numberOfLines={1} style={{ flex: 1 }}>
              {s.profile.name || 'You'}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {tile(<Flame size={30} color={c.orange} fill={c.orange} />, fire, `${fire} day streak`)}
            {tile(<Gem size={30} color="#4C5CEB" fill="#4C5CEB" />, s.gems, `${s.gems} gems`)}
            {tile(<Growth stage={3} size={32} />, rooted, `${rooted} word${rooted === 1 ? '' : 's'} rooted`)}
          </View>
        </Block>
        <Peek from="top" size={130} align="end" inset={26} />
      </View>

      {/* The three strands: level in the middle, the ring fills toward the next one. */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {STRAND_ORDER.map((k) => {
          const st = STRANDS[k];
          const level = levelOf(s.skill[k]);
          const pct = Math.round(levelProgress(s.skill[k]) * 100);
          return (
            <Block key={k} tone={st.tone} pad={14} onPress={() => router.push('/insights' as Href)} a11y={`${st.label}: level ${level}, ${pct} percent of the way to the next. Open your map.`} style={{ flex: 1, alignItems: 'center', gap: 10 }}>
              <Ring value={levelProgress(s.skill[k])} size={76} stroke={7}>
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

      {/* Streak freezes: one covers a missed day. */}
      <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, e1]}>
        <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`${s.freezes} of ${MAX_FREEZES} streak freezes held`}>
          {Array.from({ length: MAX_FREEZES }, (_, i) => (
            <View key={i} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: i < s.freezes ? c.brand : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Snowflake size={21} color={i < s.freezes ? ON_BLOCK.ink : c.ink3} strokeWidth={2.4} />
            </View>
          ))}
        </View>
        <Txt v="body" style={{ flex: 1 }} numberOfLines={1}>
          Freeze
        </Txt>
        <Btn icon={Gem} label={`${GEMS.freeze}`} small kind="brand" disabled={!canBuy} onPress={buy} a11y={s.freezes >= MAX_FREEZES ? 'You hold the most freezes you can' : s.gems < GEMS.freeze ? `A streak freeze costs ${GEMS.freeze} gems. You have ${s.gems}.` : `Buy a streak freeze for ${GEMS.freeze} gems. It covers one missed day.`} />
      </View>

      <Group>
        <Row title="Reminders" icon={Bell} iconTone="orange" chevron onPress={() => router.push('/settings/check-ins')} />
        <Row title="Reading" icon={Eye} iconTone="pink" chevron onPress={() => router.push('/settings/reading')} />
        <Row title="Sound and feel" icon={Volume2} iconTone="mint" chevron onPress={() => router.push('/settings/feel' as Href)} />
        <Row title="About me" icon={User} iconTone="brand" chevron onPress={() => router.push('/settings/profile')} />
        <Row title="Backup" icon={Save} iconTone="butter" chevron onPress={() => router.push('/settings/backup')} />
        <Row title="Moderator" icon={FlaskConical} iconTone="lilac" chevron onPress={() => router.push('/settings/moderator')} last />
      </Group>
    </Screen>
  );
}
