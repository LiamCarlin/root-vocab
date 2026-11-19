import { ArrowRight, Check, Minus, Volume2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Figure } from '@/components/Buddy';
import { CountUp, Pop } from '@/components/fx';
import { Growth, type Pose } from '@/components/Mascot';
import { GoalRing, QuestRow, StreakFlame } from '@/components/rewards';
import { Block, Btn, Ring, Rise, Screen, Tap, Txt } from '@/components/ui';
import { PROPS } from '@/data/story';
import { buzz, say, speakable } from '@/lib/audio';
import type { SessionKind } from '@/lib/engine';
import { questState, questsToday } from '@/lib/rewards';
import { sfx } from '@/lib/sfx';
import { goalProgress, growth, useStore, type SessionSummary, type StopOutcome } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import type { Played, SessionMeta } from './meta';

type WordRow = { id: string; text: string; r: 0 | 0.5 | 1 };

/**
 * The end of a round. Root celebrates, the gems count up, and the learner sees what they did:
 * how many landed, each word (tap to hear it), and anything that moved today: the streak, the
 * daily goal, a quest. Badge and level celebrations play over this screen.
 */
export function SessionDone({ kind, meta, played, summary, outcome, questsBefore, onContinue }: { kind: SessionKind; meta: SessionMeta; played: Played[]; summary: SessionSummary; outcome: StopOutcome | null; questsBefore: Record<string, number>; onContinue: () => void }) {
  const { c } = useTheme();
  const first = played.filter((p) => !p.retry);
  const total = first.length;
  const landed = first.filter((p) => p.r > 0).length;
  const perfect = total > 0 && first.every((p) => p.r === 1);
  const score = total ? first.reduce((sum, p) => sum + p.r, 0) / total : 0;
  const gems = summary.gems + (outcome?.gems ?? 0);
  const streakUp = summary.streakExtended || !!outcome?.streakExtended;
  const goalUp = summary.goalJustMet || !!outcome?.goalJustMet;
  const goal = useStore(useShallow((s) => goalProgress(s)));
  const moved = useStore(useShallow((s) => questsToday(s).filter((id) => questState(s, id).have > (questsBefore[id] ?? 0))));

  // One row per word: its weakest answer this round.
  const rows: WordRow[] = [];
  for (const p of first) {
    const hit = rows.find((w) => w.id === p.ex.wordId);
    if (hit) hit.r = Math.min(hit.r, p.r) as WordRow['r'];
    else rows.push({ id: p.ex.wordId, text: p.text, r: p.r });
  }

  // Where each word stands now: seed, sprout, leafy or rooted. A word that has just rooted is the round's real prize.
  const stages = useStore(useShallow((st) => rows.map((w) => (st.words[w.id] ? growth(st.words[w.id]) : -1))));

  useEffect(() => {
    sfx.play('win');
    buzz.good();
    const t = setTimeout(() => sfx.play('gem'), 900);
    return () => clearTimeout(t);
  }, []);

  const pose: Pose = perfect ? 'cheer' : score >= 0.6 ? 'cheer' : 'cheer';
  const headline = kind === 'challenge' ? 'Fog cleared' : perfect ? 'Perfect round' : 'Round done';
  const number = { fontFamily: 'Lexend_700Bold', fontSize: 26, lineHeight: 32, color: c.ink } as const;

  return (
    <Screen gap={14} footer={<Btn label="Continue" iconRight={ArrowRight} onPress={onContinue} />}>
      <View style={{ alignItems: 'center', height: 236, justifyContent: 'flex-end', marginTop: 28 }}>
        <Figure pose={pose} size={196} />
      </View>
      <Txt v="display" center accessibilityRole="header">
        {headline}
      </Txt>

      <Rise i={1} style={{ flexDirection: 'row', gap: 10 }}>
        <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 112 }} a11y={`${gems} gems earned`}>
          <Image source={PROPS.gem.src} style={{ width: 34, height: (34 * PROPS.gem.h) / PROPS.gem.w }} resizeMode="contain" />
          <CountUp to={gems} prefix="+" delay={700} duration={800} style={number} />
        </Block>
        <Block pad={14} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 112 }} a11y={`${landed} of ${total} landed`}>
          <Ring value={score} size={76} stroke={8} color={c[meta.tone]}>
            <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 19, color: c.ink }}>
              {landed}/{total}
            </Text>
          </Ring>
        </Block>
        {streakUp && (
          <Block pad={10} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 112 }}>
            <Pop delay={500} from={0.3}>
              <StreakFlame n={Math.max(summary.streak, outcome?.streak ?? 0)} size={62} count />
            </Pop>
          </Block>
        )}
        {goalUp && !streakUp && (
          <Block pad={10} round={radius.lg} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 112 }}>
            <Pop delay={500} from={0.3}>
              <GoalRing done={goal.done} goal={goal.goal} size={72} />
            </Pop>
          </Block>
        )}
      </Rise>

      {goalUp && streakUp && (
        <Rise i={2}>
          <Block tone="mint" pad={16} round={radius.lg} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} a11y="Daily goal met">
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Check size={22} color="#FFFFFF" strokeWidth={3.2} />
            </View>
            <Txt v="heading">Goal met</Txt>
          </Block>
        </Rise>
      )}

      {rows.length > 0 && (
        <Rise i={3}>
          <Block pad={6} round={radius.lg}>
            {rows.map((w, i) => (
              <Tap
                key={w.id}
                onPress={() => say(speakable(w.text))}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel={`${w.text}. ${w.r === 1 ? 'Right first time' : w.r === 0.5 ? 'Right with help' : 'Coming back soon'}.${stages[i] === 3 ? ' Rooted.' : ''} Tap to hear it.`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: w.r === 1 ? c.mint : w.r === 0.5 ? c.butter : 'transparent', borderWidth: w.r === 0 ? 2 : 0, borderColor: c.line }}>
                  {w.r === 1 ? <Check size={17} color={ON_BLOCK.ink} strokeWidth={3.2} /> : w.r === 0.5 ? <Minus size={17} color={ON_BLOCK.ink} strokeWidth={3.2} /> : null}
                </View>
                <Txt v="heading" style={{ flex: 1 }} numberOfLines={1}>
                  {w.text}
                </Txt>
                {stages[i] === 3 ? (
                  <Pop delay={500 + i * 120}>
                    <Growth stage={3} size={34} />
                  </Pop>
                ) : stages[i] > 0 ? (
                  <Growth stage={stages[i] as 1 | 2} size={30} />
                ) : null}
                <Volume2 size={21} color={c.ink2} strokeWidth={2.2} />
              </Tap>
            ))}
          </Block>
        </Rise>
      )}

      {moved.length > 0 && (
        <Rise i={4}>
          <Block pad={16} round={radius.lg} style={{ gap: 10 }}>
            {moved.map((id) => (
              <QuestRow key={id} id={id} />
            ))}
          </Block>
        </Rise>
      )}
    </Screen>
  );
}
