import { router, useFocusEffect } from 'expo-router';
import { Flame, Play, Target, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';

import { Peek } from '@/components/Buddy';
import { MascotBadge } from '@/components/Mascot';
import { KIND_LABEL, Path, stopY, type StopFace } from '@/components/journey/Path';
import { ChestSheet, HoldSheet, StreakSheet } from '@/components/journey/Sheets';
import { GemPill, GoalRing, QuestRow, Scene } from '@/components/rewards';
import { Bar, Block, Btn, Rise, Screen, Stat, Tap, Txt } from '@/components/ui';
import { SCENES, chapterOf } from '@/data/story';
import { refreshCheckIns } from '@/lib/checkins';
import { holdNew } from '@/lib/engine';
import { questsToday } from '@/lib/rewards';
import { sfx } from '@/lib/sfx';
import { currentStop, dueCount, goalProgress, lexOf, streak, today, useStore } from '@/lib/store';
import { GUTTER, ON_BLOCK, useTheme } from '@/theme';
import { TAB_SPACE } from './_layout';

/**
 * The journey: one place in the valley per chapter, nine stops to clear its fog.
 * This is home. Everything that gives a reason to come back is on it: the place
 * getting clearer, today's goal, the streak, the quests, and the next stop with
 * Root already standing on it.
 */
export default function Journey() {
  const { c } = useTheme();
  const s = useStore();
  const scroll = useRef<ScrollViewInstance>(null);
  const [focused, setFocused] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [chest, setChest] = useState<number | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const pathTop = useRef(0);

  const { journey } = s;
  const ch = chapterOf(journey.chapter);
  const stops = journey.stops;
  const cur = currentStop(s);
  const doneCount = stops.filter((st) => st.done).length;
  const goal = goalProgress(s);
  const fire = streak(s);
  const lit = s.practiceDays.includes(today(s));
  const due = dueCount(s);
  // When a lot is due, a new word waits until the old ones are watered: one warm-up round lets it through.
  // The main button becomes the warm-up, and the stop on the path says the same.
  const held = holdNew(s) && stops[cur]?.kind === 'learn' && !!stops[cur]?.wordId;
  const quests = questsToday(s);

  // Root only moves on while this screen is in view and no chest is being opened,
  // so the walk to the next stop is something you see.
  const [shown, setShown] = useState(cur);
  if (focused && chest === null && shown !== cur) setShown(cur);

  useFocusEffect(
    useCallback(() => {
      const st = useStore.getState();
      st.tick();
      refreshCheckIns().catch(() => {}); // keep reminder text true to today's streak and place
      if (!st.journey.stops.length) st.finishOnboarding(); // builds the first chapter if it is somehow missing
      const j = useStore.getState().journey;
      // The story comes first: the prologue once, each place's opening, and its ending when every stop is done.
      const to = !j.prologueSeen ? '/story/prologue' : !j.introSeen ? '/story/intro' : j.stops.length > 0 && currentStop({ journey: j }) === -1 ? '/story/outro' : null;
      const go = to ? setTimeout(() => router.push(to), 60) : undefined;
      setFocused(true);
      return () => {
        if (go) clearTimeout(go);
        setFocused(false);
      };
    }, []),
  );

  // When Root moves on, bring the stop it is walking to into view. On first open the screen stays at the top, where the place and Start are.
  const settled = useRef(shown);
  useEffect(() => {
    if (settled.current === shown) return;
    settled.current = shown;
    if (shown < 0) return;
    const id = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, pathTop.current + stopY(shown) - 320), animated: true }), 200);
    return () => clearTimeout(id);
  }, [shown]);

  const faces: StopFace[] = stops.map((st) => (st.wordId ? { text: lexOf(s, st.wordId)?.text, hook: s.words[st.wordId]?.hook } : {}));

  const next = cur >= 0 ? stops[cur] : undefined;
  const nextLabel = next ? (next.kind === 'learn' ? (faces[cur]?.text ?? KIND_LABEL.learn) : KIND_LABEL[next.kind]) : '';

  const open = (i: number) => {
    const st = stops[i];
    if (!st) return;
    if (st.done) {
      if (st.kind === 'learn' && st.wordId) router.push(`/word/${st.wordId}`);
      return;
    }
    sfx.play('pop');
    if (held && i === cur) setHoldOpen(true);
    else if (st.kind === 'learn' && st.wordId) router.push(`/mission/${st.wordId}?stop=${i}`);
    else if (st.kind === 'chest') setChest(i);
    else if (st.kind === 'find' || st.kind === 'spell' || st.kind === 'challenge') router.push(`/play/${st.kind}?stop=${i}`);
    // A learn stop with no word left to give (the whole bank is learned) becomes a mixed round.
    else router.push(`/play/mix?stop=${i}`);
  };

  return (
    <Screen scroll={false} pad={false} gap={0}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 24 + TAB_SPACE, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Tap onPress={() => router.push('/(tabs)/you')} accessibilityRole="button" accessibilityLabel="You">
            <MascotBadge size={48} tone="brand" />
          </Tap>
          <View style={{ flex: 1 }} />
          <Stat icon={Flame} value={fire} tint={lit ? 'orange' : 'ink3'} onPress={() => setStreakOpen(true)} a11y={`${fire} day streak${lit ? '' : ', not yet today'}. Open streak.`} />
          <GemPill value={s.gems} />
        </View>

        {/* The place. The fog thins as the chapter's stops are cleared. */}
        <Rise style={{ marginTop: 44 }}>
          <Block tone={ch.tone} pad={0} style={{ minHeight: 268 }} a11y={`Chapter ${ch.n}, ${ch.name}. ${doneCount} of ${stops.length} stops cleared.`}>
            <View style={{ position: 'absolute', right: -14, top: 10 }}>
              <Scene scene={ch.scene} size={184} fog={stops.length ? (1 - doneCount / stops.length) * 0.82 : 0.82} fogColor={c[ch.tone]} />
            </View>
            <View style={{ padding: 22, gap: 6, flex: 1 }}>
              <Txt v="label" color="ink2">
                Chapter {ch.n}
              </Txt>
              <Txt v="display" style={{ maxWidth: '54%' }}>
                {ch.name}
              </Txt>
              <View style={{ flex: 1, minHeight: 34 }} />
              <View style={{ width: '44%', gap: 6 }}>
                <Bar value={stops.length ? doneCount / stops.length : 0} height={9} />
                <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 13, color: ON_BLOCK.ink2 }}>
                  {doneCount} / {stops.length}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
                {next && held ? (
                  <Btn icon={Zap} label="Warm up" a11y={`Warm up first, then ${nextLabel}. ${due} ${due === 1 ? 'word is' : 'words are'} due.`} onPress={() => router.push('/play/mix')} flex={1} />
                ) : next ? (
                  <Btn icon={Play} label="Start" a11y={`Start the next stop: ${nextLabel}`} onPress={() => open(cur)} flex={1} />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                <GoalRing done={goal.done} goal={goal.goal} size={58} />
              </View>
            </View>
          </Block>
          <Peek from="top" align="start" inset={76} size={96} delay={700} />
        </Rise>

        {/* Today's three quests. */}
        <Rise i={1}>
          <Block pad={18} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={18} color={c.ink2} strokeWidth={2.4} />
              <Txt v="label" color="ink2">
                Today
              </Txt>
            </View>
            {quests.map((id) => (
              <QuestRow key={id} id={id} />
            ))}
          </Block>
        </Rise>

        {/* Words that are due: a short mixed round to warm up. */}
        {due > 0 && (
          <Rise i={2}>
            <Block tone="pink" pad={18} onPress={() => router.push('/play/mix')} a11y={`Warm-up. ${due} ${due === 1 ? 'word is' : 'words are'} due.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Txt v="heading" style={{ flex: 1 }}>
                Warm-up
              </Txt>
              <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 40, lineHeight: 46, color: ON_BLOCK.ink }}>{due}</Text>
            </Block>
          </Rise>
        )}

        {/* The path. */}
        <View onLayout={(e) => {
            pathTop.current = e.nativeEvent.layout.y;
          }}>
          <Path key={journey.chapter} stops={stops} faces={faces} at={shown} tone={ch.tone} held={held} onOpen={open} />
        </View>

        {/* What each cleared place gave back. */}
        {journey.cleared.length > 0 && (
          <Block pad={16} style={{ gap: 12 }}>
            <Txt v="label" color="ink2">
              Keepsakes
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {journey.cleared.map((n) => {
                const done = chapterOf(n);
                const img = SCENES[done.scene];
                return (
                  <View key={n} style={{ alignItems: 'center', gap: 6, width: 84 }} accessible accessibilityLabel={`${done.keepsake}, from ${done.name}`}>
                    <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: c[done.tone], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <Image source={img.src} style={{ width: 56, height: (56 * img.h) / img.w }} resizeMode="contain" />
                    </View>
                    <Txt v="caption" color="ink2" center numberOfLines={2}>
                      {done.keepsake}
                    </Txt>
                  </View>
                );
              })}
            </ScrollView>
          </Block>
        )}
      </ScrollView>

      <StreakSheet visible={streakOpen} onClose={() => setStreakOpen(false)} />
      <ChestSheet index={chest} onClose={() => setChest(null)} />
      <HoldSheet visible={holdOpen} onClose={() => setHoldOpen(false)} word={held ? nextLabel : undefined} />
    </Screen>
  );
}
