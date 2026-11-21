import { router, useFocusEffect } from 'expo-router';
import { Flame, Play, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, type ScrollViewInstance } from 'react-native';

import { KIND_LABEL, Path, stopY, type StopFace } from '@/components/journey/Path';
import { StreakSheet } from '@/components/journey/Sheets';
import { GemPill, GoalRing, Scene } from '@/components/rewards';
import { Bar, Block, Btn, Rise, Screen, Stat, Txt } from '@/components/ui';
import { chapterOf } from '@/data/story';
import { stopTodo, stopWords } from '@/lib/journey';
import { sfx } from '@/lib/sfx';
import { currentStop, dueCount, goalProgress, lexOf, streak, today, useStore } from '@/lib/store';
import { GUTTER, ON_BLOCK, useTheme } from '@/theme';
import { TAB_SPACE } from './_layout';

/**
 * The journey: one place in the valley per chapter, a path of stops to clear its fog.
 * This is home, and it asks one thing: Start the next stop. Around it only what
 * explains where you stand: the place getting clearer, today's goal, the streak,
 * and the words due for review.
 */
export default function Journey() {
  const { c } = useTheme();
  const s = useStore();
  const scroll = useRef<ScrollViewInstance>(null);
  const [focused, setFocused] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
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
  // A learner who has not finished a lesson yet sees one thing to do: the place and its Start button.
  const firstTime = !Object.values(s.words).some((w) => w.learnedOn) && doneCount === 0;

  // Root only moves on while this screen is in view, so the walk to the next stop is something you see.
  const [shown, setShown] = useState(cur);
  if (focused && shown !== cur) setShown(cur);

  useFocusEffect(
    useCallback(() => {
      const st = useStore.getState();
      st.tick();
      st.splitPath();
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

  const faces: StopFace[] = stops.map((st) => {
    const ids = st.kind === 'learn' ? stopWords(st) : [];
    if (!ids.length) return {};
    const texts = ids.map((id) => lexOf(s, id)?.text ?? id);
    // Inside the node: the picture picked for the first word once there is one, until then the words' first letters.
    const hook = ids.map((id) => s.words[id]?.hook).find(Boolean);
    return { text: texts.join(' · '), lines: texts, mark: hook ?? texts.map((t) => t.charAt(0).toUpperCase()).join(''), got: ids.length - stopTodo(st).length, of: ids.length };
  });

  const next = cur >= 0 ? stops[cur] : undefined;
  const nextLabel = next ? (next.kind === 'learn' ? (faces[cur]?.text ?? KIND_LABEL.learn) : KIND_LABEL[next.kind]) : '';

  const open = (i: number) => {
    if (!stops[i]) return;
    if (stops[i].done) {
      const first = stops[i].kind === 'learn' ? stopWords(stops[i])[0] : undefined;
      if (first) router.push(`/word/${first}`);
      return;
    }
    sfx.play('pop');
    // A set of new words is chosen now, as the stop is opened: for the learner as they are today.
    const st = s.prepareStop(i) ?? stops[i];
    const ids = st.kind === 'learn' ? stopWords(st) : [];
    const todo = stopTodo(st);
    if (ids.length && todo.length) router.push(`/mission/${todo[0]}?stop=${i}`);
    // Every word of the set is learned but the stop was never closed (the app was shut on the last screen): close it now.
    else if (ids.length) s.completeStop(i);
    // Chests are gone from new chapters; one left on an older path just opens and moves on.
    else if (st.kind === 'chest') s.openChest(i);
    else if (st.kind === 'find' || st.kind === 'spell' || st.kind === 'hands' || st.kind === 'challenge') router.push(`/play/${st.kind}?stop=${i}`);
    // A learn stop with no word left to give (the whole bank is learned) becomes a mixed round.
    else router.push(`/play/mix?stop=${i}`);
  };

  return (
    <Screen scroll={false} pad={false} gap={0}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 24 + TAB_SPACE, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, minHeight: 48 }}>
          <Stat icon={Flame} value={fire} tint={lit ? 'orange' : 'ink3'} onPress={() => setStreakOpen(true)} a11y={`${fire} day streak${lit ? '' : ', not yet today'}. Open streak.`} />
          <GemPill value={s.gems} onPress={() => setStreakOpen(true)} />
        </View>

        {/* The place. The fog thins as the chapter's stops are cleared. */}
        <Rise style={{ marginTop: 8 }}>
          <Block tone={ch.tone} pad={0} style={{ minHeight: 268 }} a11y={`Chapter ${ch.n}, ${ch.name}. ${doneCount} of ${stops.length} stops cleared.`}>
            <View style={{ position: 'absolute', right: -14, top: 10 }}>
              <Scene scene={ch.scene} size={184} fog={stops.length ? (1 - doneCount / stops.length) * 0.82 : 0.82} fogColor={c[ch.tone]} />
            </View>
            <View style={{ padding: 22, gap: 6, flex: 1 }}>
              <Txt v="display" style={{ maxWidth: '54%' }} accessibilityRole="header">
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
                {next ? (
                  <Btn icon={Play} label={(faces[cur]?.got ?? 0) > 0 ? 'Carry on' : 'Start'} a11y={`Start the next stop: ${nextLabel}`} onPress={() => open(cur)} flex={1} />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {/* Today's goal: stops done of the stops picked in setup. Labelled, or "0/2" is a riddle. */}
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <GoalRing done={goal.done} goal={goal.goal} size={52} />
                  <Text style={{ fontFamily: 'Lexend_500Medium', fontSize: 12, color: ON_BLOCK.ink2 }}>today</Text>
                </View>
              </View>
            </View>
          </Block>
        </Rise>

        {/* Words that are due: a short mixed round to warm up. */}
        {due > 0 && !firstTime && (
          <Rise i={2}>
            <Block pad={18} onPress={() => router.push('/play/mix')} a11y={`Warm-up. ${due} ${due === 1 ? 'word is' : 'words are'} due.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Zap size={26} color={c.ink} strokeWidth={2.4} />
              <Txt v="heading" style={{ flex: 1 }}>
                Warm-up
              </Txt>
              <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 40, lineHeight: 46, color: c.ink }}>{due}</Text>
            </Block>
          </Rise>
        )}

        {/* The path. */}
        <View onLayout={(e) => {
            pathTop.current = e.nativeEvent.layout.y;
          }}>
          <Path key={journey.chapter} stops={stops} faces={faces} at={shown} tone={ch.tone} onOpen={open} />
        </View>

      </ScrollView>

      <StreakSheet visible={streakOpen} onClose={() => setStreakOpen(false)} />
    </Screen>
  );
}
