import { router } from 'expo-router';
import { ArrowRight, Gem } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { CountUp } from '@/components/fx';
import { SylWord } from '@/components/learn';
import { GoalRing, StreakFlame } from '@/components/rewards';
import { Block, Btn, Rise, Screen, Txt } from '@/components/ui';
import { buzz } from '@/lib/audio';
import type { Lexeme } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { GEMS, goalProgress, useStore, type StopOutcome } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';
import type { MissionStats, StepId } from './types';

/** One word a lesson has just taught. */
export type Taught = { lex: Lexeme; steps: StepId[]; stats: MissionStats; hook: string | null; /** False when the word had been learned before: no new gems for it. */ first: boolean };

/**
 * Done: the words that were just taught and what they mean, what was earned, and the next line
 * of the story. A stop on the journey teaches a set of words, so there may be two here.
 */
export function Done({ taught, outcome, story }: { taught: Taught[]; outcome: StopOutcome | null; /** What Root says on the trail now that this stop is cleared. */ story?: string }) {
  const { c, text } = useTheme();
  // Primitives only: a selector that builds an object would re-render forever.
  const goalDone = useStore((s) => goalProgress(s).done);
  const goalSize = useStore((s) => goalProgress(s).goal);
  const goal = { done: goalDone, goal: goalSize };
  const gems = taught.filter((t) => t.first).length * GEMS.lesson + (outcome?.gems ?? 0);

  useEffect(() => {
    buzz.good();
    sfx.play('win');
  }, []);

  const leave = () => {
    if (outcome?.chapterDone) router.replace('/story/outro');
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const showStreak = !!outcome?.streakExtended && outcome.streak > 0;
  const showGoal = !!outcome && (outcome.goalJustMet || goal.done > 0);
  const many = taught.length > 1;

  return (
    <Screen tone="brand" gap={14} footer={<Btn icon={ArrowRight} a11y="Continue" onPress={leave} />}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8, minHeight: 150 }}>
        <Figure pose={outcome?.chapterDone ? 'trophy' : many ? 'proud' : 'thumbs'} size={132} />
        <View style={{ flex: 1, gap: 10, paddingBottom: 8, alignItems: 'flex-start' }}>
          {/* Says what just happened before showing what was earned. */}
          <Txt v="display" accessibilityRole="header">
            {outcome?.chapterDone ? 'Place cleared' : many ? `${taught.length} words learned` : 'Word learned'}
          </Txt>
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

      {/* What was earned, each figure with its name: "1/2" alone read as "one of two right". */}
      <Rise i={1} style={{ flexDirection: 'row', gap: 10 }}>
        <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 100 }} a11y={`${gems} gems earned`}>
          <Gem size={24} color={c.indigo} fill={c.indigo} />
          <CountUp to={gems} prefix="+" delay={400} v="num" />
          <Txt v="caption" color="ink2">
            gems
          </Txt>
        </Block>
        {showStreak && (
          <Block pad={10} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 100 }} a11y={`${outcome!.streak} day streak`}>
            <StreakFlame n={outcome!.streak} size={56} count />
            <Txt v="caption" color="ink2">
              day streak
            </Txt>
          </Block>
        )}
        {showGoal && (
          <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 100 }}>
            <GoalRing done={goal.done} goal={goal.goal} size={56} />
            <Txt v="caption" color="ink2">
              {"today's goal"}
            </Txt>
          </Block>
        )}
      </Rise>

      {/* What each word means: the thing worth reading on the way out. */}
      <Rise i={2}>
        <Block pad={18} style={{ gap: 12 }}>
          {taught.map((t) =>
            t.lex.meaning ? (
              <Text key={t.lex.id} style={[text('body'), { color: c.ink }]}>
                <Text style={{ fontFamily: text('heading').fontFamily }}>{t.lex.text}</Text>
                {'  '}
                {t.lex.meaning}
              </Text>
            ) : null,
          )}
        </Block>
      </Rise>

      {/* The story moves on a line with every stop. */}
      {!!story && (
        <Rise i={3}>
          <Block pad={18}>
            <Txt v="heading" style={{ lineHeight: 28 }}>
              {story}
            </Txt>
          </Block>
        </Rise>
      )}

    </Screen>
  );
}
