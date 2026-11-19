import { router } from 'expo-router';
import { ArrowRight, CalendarDays, Drum, Ear, Gem, Hand, Keyboard, MessageCircle, Network, Puzzle, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Reaction } from '@/components/Buddy';
import { Burst, Confetti, CountUp, Pop } from '@/components/fx';
import { SylWord } from '@/components/learn';
import { Growth } from '@/components/Mascot';
import { GoalRing, StreakFlame } from '@/components/rewards';
import { Block, Btn, Ring, Rise, Screen, Tag } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { buzz } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import type { Lexeme } from '@/lib/lexicon';
import { GEMS, goalProgress, useStore, type StopOutcome } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';
import type { MissionStats, StepId } from './types';

const STEPS: Record<StepId, { icon: LucideIcon; label: string }> = {
  hear: { icon: Ear, label: 'Heard it' },
  link: { icon: Network, label: 'Linked it' },
  beats: { icon: Drum, label: 'Drummed the beats' },
  build: { icon: Puzzle, label: 'Built it' },
  move: { icon: Hand, label: 'Moved through it' },
  spell: { icon: Keyboard, label: 'Spelled it' },
  use: { icon: MessageCircle, label: 'Used it' },
};

/** Done: Root celebrates, the gems count up, the seed sprouts, and each strand takes its first step. */
export function Done({ lex, steps, stats, outcome, hook, first }: { lex: Lexeme; steps: StepId[]; stats: MissionStats; outcome: StopOutcome | null; hook: string | null; /** False when the word had been learned before: no new gems for the lesson. */ first: boolean }) {
  const { c, text, reduceMotion } = useTheme();
  // Primitives only: a selector that builds an object would re-render forever.
  const goalDone = useStore((s) => goalProgress(s).done);
  const goalSize = useStore((s) => goalProgress(s).goal);
  const goal = { done: goalDone, goal: goalSize };
  const [grown, setGrown] = useState(false);
  const [filled, setFilled] = useState(false);
  const gems = (first ? GEMS.lesson : 0) + (outcome?.gems ?? 0);

  useEffect(() => {
    buzz.good();
    sfx.play('win');
    const a = setTimeout(() => setGrown(true), reduceMotion ? 0 : 900);
    const b = setTimeout(() => setFilled(true), reduceMotion ? 0 : 1400);
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

  return (
    <Screen tone="brand" gap={14} footer={<Btn icon={ArrowRight} a11y="Continue" onPress={leave} />}>
      <View style={{ alignItems: 'center', marginTop: 10, height: 208, justifyContent: 'flex-end' }}>
        <Reaction pose={outcome?.chapterDone ? 'trophy' : 'cheer'} size={200} />
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        {!!hook && (
          <Pop delay={250} from={0.2}>
            <Text style={{ fontSize: 40, lineHeight: 50 }} allowFontScaling={false} accessibilityLabel={`Your picture: ${hook}`}>
              {hook}
            </Text>
          </Pop>
        )}
        <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 44, 320)} color={ON_BLOCK.ink} on="brand" />
      </View>

      {/* What was earned. */}
      <Rise i={1} style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 104 }} a11y={`${gems} gems earned`}>
          <Gem size={28} color={c.indigo} fill={c.indigo} />
          <CountUp to={gems} prefix="+" delay={500} v="num" />
        </Block>
        <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 104 }} a11y={grown ? `${lex.text} has sprouted` : `${lex.text} is a seed`}>
          <Pop key={grown ? 'sprout' : 'seed'} from={0.3}>
            <Growth stage={grown ? 1 : 0} size={62} />
          </Pop>
          {grown && <Burst size={130} count={9} />}
        </Block>
        {showStreak ? (
          <Block pad={10} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 104 }}>
            <StreakFlame n={outcome!.streak} size={62} count />
          </Block>
        ) : showGoal ? (
          <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 104 }}>
            <GoalRing done={goal.done} goal={goal.goal} size={66} />
          </Block>
        ) : null}
      </Rise>

      {/* Know, Find, Spell: each strand's first box. */}
      <Rise i={2}>
        <Block pad={18} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {STRAND_ORDER.map((k) => {
              const st = STRANDS[k];
              return (
                <View key={k} style={{ alignItems: 'center', gap: 8 }} accessible accessibilityLabel={`${st.label}: step 1 of 4`}>
                  <Ring value={filled ? 0.25 : 0} size={68} stroke={8} color={c[st.tone]}>
                    <st.icon size={24} color={c.ink} strokeWidth={2.3} />
                  </Ring>
                  <Text style={[text('caption'), { color: c.ink2 }]}>{st.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ gap: 8, alignItems: 'flex-start' }}>
            <Tag icon={CalendarDays} label="Tomorrow" tint="butter" />
            {!!lex.meaning && <Text style={[text('heading'), { color: c.ink }]}>{lex.meaning}</Text>}
          </View>
        </Block>
      </Rise>

      {showStreak && showGoal && (
        <Rise i={3} style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: radius.pill, padding: 10 }}>
            <GoalRing done={goal.done} goal={goal.goal} size={56} />
          </View>
        </Rise>
      )}

      <Rise i={4} style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        {steps.map((id) => {
          const { icon: Icon, label } = STEPS[id];
          const skipped = stats.skipped.includes(id);
          return (
            <View key={id} accessible accessibilityLabel={`${label}${skipped ? ', skipped' : ''}`} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: skipped ? 'transparent' : ON_BLOCK.ink, borderWidth: skipped ? 2 : 0, borderColor: ON_BLOCK.ink3, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={skipped ? ON_BLOCK.ink3 : '#FFFFFF'} strokeWidth={2.3} />
            </View>
          );
        })}
      </Rise>

      <Confetti />
    </Screen>
  );
}
