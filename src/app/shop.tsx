import { router, type Href } from 'expo-router';
import { BookOpen, Check, Gem, Handshake, HeartHandshake, Lock, Snowflake, Wrench } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Pop } from '@/components/fx';
import { GemPill, Scene } from '@/components/rewards';
import { Block, Btn, Group, Row, Screen, SectionLabel, TopBar, Txt, useToast } from '@/components/ui';
import { STORY_LENGTH, chapterOf } from '@/data/story';
import { JOURNAL, RESTORE, restoreFor, type Restore } from '@/data/valley';
import { buzz } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { GEMS, MAX_FREEZES, PLEDGE_DAYS, journalPages, pledgeProgress, repairable, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

/**
 * What gems are for.
 *
 * Two things. Keeping the streak safe: a freeze to cover a missed day, mending a streak that has just
 * broken, and a seven-day pledge that pays back double. And rebuilding the valley: every place that has
 * been cleared has three things the fog years wore out, and gems put them back, for good.
 */
export default function Shop() {
  const { c } = useTheme();
  const s = useStore();
  const toast = useToast();

  const paid = () => {
    sfx.play('gem');
    buzz.good();
  };
  const short = () => buzz.nudge();

  const fix = repairable(s);
  const pledge = s.pledge;
  const kept = pledgeProgress(s);
  const pages = journalPages(s);

  const buyFreeze = () => (s.buyFreeze() ? paid() : short());
  const mend = () => (s.repairStreak() ? (paid(), toast({ text: 'Streak mended', tone: 'success' })) : short());
  const pledgeTap = () => {
    if (!pledge) return s.startPledge() ? paid() : short();
    if (pledge.state === 'on') return;
    const won = s.settlePledge();
    if (won) {
      paid();
      toast({ text: `+${won}`, icon: Gem, tone: 'success' });
    }
  };
  const build = (r: Restore) => {
    if (!s.build(r.id)) return short();
    sfx.play('unlock');
    buzz.good();
  };

  const dots = (n: number, of: number) => (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: i < n ? ON_BLOCK.ink : 'rgba(14,14,19,0.14)' }} />
      ))}
    </View>
  );

  return (
    <Screen top={<TopBar center={<Txt v="heading">Shop</Txt>} right={<GemPill value={s.gems} />} />} gap={14}>
      {/* The streak. */}
      <Block tone="brand" pad={18} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Txt v="heading">Streak freeze</Txt>
            <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`${s.freezes} of ${MAX_FREEZES} held. A freeze covers one missed day.`}>
              {Array.from({ length: MAX_FREEZES }, (_, i) => (
                <View key={i} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: i < s.freezes ? ON_BLOCK.ink : 'rgba(14,14,19,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Snowflake size={18} color={i < s.freezes ? '#FFFFFF' : ON_BLOCK.ink3} strokeWidth={2.5} />
                </View>
              ))}
            </View>
          </View>
          <Btn kind="white" small icon={Gem} label={String(GEMS.freeze)} disabled={s.freezes >= MAX_FREEZES || s.gems < GEMS.freeze} onPress={buyFreeze} a11y={s.freezes >= MAX_FREEZES ? 'You hold the most freezes you can' : `Buy a streak freeze for ${GEMS.freeze} gems`} style={{ minWidth: 112 }} />
        </View>

        {fix && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="heading">Mend streak</Txt>
              <Txt v="bodyS" color="ink2">
                {fix.lost} days, saved
              </Txt>
            </View>
            <Btn kind="white" small icon={Wrench} label={String(fix.cost)} disabled={s.gems < fix.cost} onPress={mend} a11y={`Mend your ${fix.lost} day streak for ${fix.cost} gems. It covers the ${fix.days.length === 1 ? 'day' : 'days'} you missed.`} style={{ minWidth: 112 }} />
          </View>
        )}

        {/* The pledge: gems staked on seven days running, paid back double. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Txt v="heading">{pledge?.state === 'won' ? 'Pledge kept' : pledge?.state === 'lost' ? 'Pledge missed' : '7-day pledge'}</Txt>
            {pledge && kept ? (
              <View accessible accessibilityLabel={`${kept.kept} of ${PLEDGE_DAYS} days kept`}>{dots(kept.kept, PLEDGE_DAYS)}</View>
            ) : (
              <Txt v="bodyS" color="ink2">
                {GEMS.pledge} in, {GEMS.pledge * 2} back
              </Txt>
            )}
          </View>
          {!pledge && <Btn kind="white" small icon={Handshake} label={String(GEMS.pledge)} disabled={s.gems < GEMS.pledge} onPress={pledgeTap} a11y={`Pledge to practice ${PLEDGE_DAYS} days in a row. Costs ${GEMS.pledge} gems, pays back ${GEMS.pledge * 2}.`} style={{ minWidth: 112 }} />}
          {pledge?.state === 'won' && <Btn kind="white" small icon={Gem} label={`+${pledge.stake * 2}`} onPress={pledgeTap} a11y={`Collect ${pledge.stake * 2} gems`} style={{ minWidth: 112 }} />}
          {pledge?.state === 'lost' && <Btn kind="white" small icon={Check} label="OK" onPress={pledgeTap} a11y="Clear the pledge. You can make another." style={{ minWidth: 112 }} />}
        </View>
      </Block>

      {/* The journal: pages found in chests. */}
      <Group>
        <Row title="Journal" sub={`${pages} of ${JOURNAL.length} pages`} icon={BookOpen} iconTone="butter" chevron onPress={() => router.push('/journal' as Href)} right={pages > s.journalSeen ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.orange }} /> : undefined} />
        <Row title="Friends" sub={s.friends.length ? `${s.friends.length} added` : undefined} icon={HeartHandshake} iconTone="pink" chevron onPress={() => router.push('/friends' as Href)} last />
      </Group>

      {/* The valley, rebuilt one thing at a time. */}
      <SectionLabel>{`Rebuild the valley · ${s.built.length} of ${RESTORE.length}`}</SectionLabel>
      {Array.from({ length: STORY_LENGTH }, (_, i) => i + 1).map((n) => {
        const ch = chapterOf(n);
        const open = s.journey.cleared.includes(n);
        const items = restoreFor(n);
        const done = items.filter((r) => s.built.includes(r.id)).length;
        return (
          <Block key={n} tone={open ? ch.tone : 'soft'} pad={16} style={{ gap: 12 }} a11y={`${ch.name}. ${open ? `${done} of ${items.length} rebuilt.` : 'Clear its fog on the journey first.'}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Scene scene={ch.scene} size={64} fog={open ? 0 : 0.8} fogColor={c.surface2} float={false} />
              <Txt v="title" style={{ flex: 1 }} color={open ? 'ink' : 'ink3'} numberOfLines={1}>
                {ch.name}
              </Txt>
              {open ? (
                <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 17, color: ON_BLOCK.ink }}>
                  {done}/{items.length}
                </Text>
              ) : (
                <Lock size={20} color={c.ink3} strokeWidth={2.6} />
              )}
            </View>
            {open &&
              items.map((r) => {
                const built = s.built.includes(r.id);
                return (
                  <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: radius.md, padding: 12 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: built ? ON_BLOCK.ink : 'rgba(14,14,19,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                      <r.icon size={22} color={built ? '#FFFFFF' : ON_BLOCK.ink2} strokeWidth={2.3} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt v="body" numberOfLines={1}>
                        {r.name}
                      </Txt>
                      {built && (
                        <Txt v="caption" color="ink2">
                          {r.line}
                        </Txt>
                      )}
                    </View>
                    {built ? (
                      <Pop from={0.4}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel="Built">
                          <Check size={18} color="#FFFFFF" strokeWidth={3.2} />
                        </View>
                      </Pop>
                    ) : (
                      <Btn kind="white" small icon={Gem} label={String(r.cost)} disabled={s.gems < r.cost} onPress={() => build(r)} a11y={s.gems < r.cost ? `${r.name} costs ${r.cost} gems. You have ${s.gems}.` : `Build ${r.name} for ${r.cost} gems`} style={{ minWidth: 104 }} />
                    )}
                  </View>
                );
              })}
          </Block>
        );
      })}
    </Screen>
  );
}
