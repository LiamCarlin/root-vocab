import { router } from 'expo-router';
import { ArrowRight, CalendarDays, Footprints, Gem } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { CountUp, Pop } from '@/components/fx';
import { SylWord } from '@/components/learn';
import { Growth } from '@/components/Mascot';
import { GoalRing, StreakFlame } from '@/components/rewards';
import { Block, Btn, Ring, Rise, Screen, Tag, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { buzz } from '@/lib/audio';
import type { Lexeme } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { GEMS, goalProgress, useStore, type StopOutcome } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';
import type { MissionStats, StepId } from './types';

/** One word a lesson has just taught. */
export type Taught = { lex: Lexeme; steps: StepId[]; stats: MissionStats; hook: string | null; /** False when the word had been learned before: no new gems for it. */ first: boolean };

/**
 * Done: the words that were just taught, what was earned, where each strand now stands, and the
 * next line of the story. A stop on the journey teaches a set of words, so there may be two here.
 */
export function Done({ taught, outcome, story }: { taught: Taught[]; outcome: StopOutcome | null; /** What Root says on the trail now that this stop is cleared. */ story?: string }) {
  const { c, text, reduceMotion } = useTheme();
  // Primitives only: a selector that builds an object would re-render forever.
  const goalDone = useStore((s) => goalProgress(s).done);
  const goalSize = useStore((s) => goalProgress(s).goal);
  const goal = { done: goalDone, goal: goalSize };
  const [grown, setGrown] = useState(false);
  const [filled, setFilled] = useState(false);
  const gems = taught.filter((t) => t.first).length * GEMS.lesson + (outcome?.gems ?? 0);

  useEffect(() => {
    buzz.good();
    sfx.play('win');
    const a = setTimeout(() => setGrown(true), reduceMotion ? 0 : 700);
    const b = setTimeout(() => setFilled(true), reduceMotion ? 0 : 1100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reduceMotion]);

  const leave = () => {
    if (outcome?.chapterDone) router.replace('/story/outro');
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const showStreak = !!outcome?.streakExtended && outcome.streak > 0;
  const showGoal = !!outcome && (outcome.goalJustMet || goal.done > 0);
  const many = taught.length > 1;
  const names = taught.map((t) => t.lex.text).join(' and ');

  return (
    <Screen tone="brand" gap={14} footer={<Btn icon={ArrowRight} a11y="Continue" onPress={leave} />}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8, minHeight: 150 }}>
        <Figure pose={outcome?.chapterDone ? 'trophy' : many ? 'proud' : 'thumbs'} size={132} />
        <View style={{ flex: 1, gap: 10, paddingBottom: 8, alignItems: 'flex-start' }}>
          {taught.map((t) => (
            <View key={t.lex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!!t.hook && (
                <Text style={{ fontSize: 26, lineHeight: 34 }} allowFontScaling={false} accessibilityLabel={`Your picture: ${t.hook}`}>
                  {t.hook}
                </Text>
              )}
              <SylWord text={t.lex.text} parts={t.lex.parts} size={wordSize(t.lex.text, many ? 30 : 38, 190)} color={ON_BLOCK.ink} on="brand" />
            </View>
          ))}
        </View>
      </View>

      {/* What was earned. */}
      <Rise i={1} style={{ flexDirection: 'row', gap: 10 }}>
        <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 100 }} a11y={`${gems} gems earned`}>
          <Gem size={26} color={c.indigo} fill={c.indigo} />
          <CountUp to={gems} prefix="+" delay={400} v="num" />
        </Block>
        <Block pad={14} round={radius.lg} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 100 }} a11y={grown ? `${names} ${many ? 'have' : 'has'} sprouted` : 'Seeds'}>
          {taught.map((t) => (
            <Pop key={`${t.lex.id}${grown ? 'sprout' : 'seed'}`} from={0.6}>
              <Growth stage={grown ? 1 : 0} size={many ? 48 : 60} />
            </Pop>
          ))}
        </Block>
        {showStreak ? (
          <Block pad={10} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
            <StreakFlame n={outcome!.streak} size={60} count />
          </Block>
        ) : showGoal ? (
          <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
            <GoalRing done={goal.done} goal={goal.goal} size={64} />
          </Block>
        ) : null}
      </Rise>

      {/* The story moves on a line with every stop. */}
      {!!story && (
        <Rise i={2}>
          <Block pad={18} style={{ gap: 8, alignItems: 'flex-start' }}>
            <Tag icon={Footprints} label="On the trail" tint="surface2" />
            <Txt v="heading" style={{ lineHeight: 28 }}>
              {story}
            </Txt>
          </Block>
        </Rise>
      )}

      {/* Know, Find, Spell: each strand's first box, and what each word means. */}
      <Rise i={3}>
        <Block pad={18} style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {STRAND_ORDER.map((k) => {
              const st = STRANDS[k];
              return (
                <View key={k} style={{ alignItems: 'center', gap: 8 }} accessible accessibilityLabel={`${st.label}: step 1 of 4`}>
                  <Ring value={filled ? 0.25 : 0} size={64} stroke={7} color={c[st.tone]}>
                    <st.icon size={22} color={c.ink} strokeWidth={2.3} />
                  </Ring>
                  <Text style={[text('caption'), { color: c.ink2 }]}>{st.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ gap: 10, alignItems: 'flex-start' }}>
            <Tag icon={CalendarDays} label="Back tomorrow" tint="butter" />
            {taught.map((t) =>
              t.lex.meaning ? (
                <Text key={t.lex.id} style={[text('body'), { color: c.ink }]}>
                  <Text style={{ fontFamily: text('heading').fontFamily }}>{t.lex.text}</Text>
                  {'  '}
                  {t.lex.meaning}
                </Text>
              ) : null,
            )}
          </View>
        </Block>
      </Rise>

      {showStreak && showGoal && (
        <Rise i={4} style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: radius.pill, padding: 10 }}>
            <GoalRing done={goal.done} goal={goal.goal} size={56} />
          </View>
        </Rise>
      )}
    </Screen>
  );
}
