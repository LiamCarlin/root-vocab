import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { CountUp, Pop } from '@/components/fx';
import { Block, Btn, Chip, ChipRow, Ring, Rise, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { buzz } from '@/lib/audio';
import { pickNewWords } from '@/lib/engine';
import { sfx } from '@/lib/sfx';
import { levelOf, lexOf, useStore } from '@/lib/store';
import { ON_BLOCK, useTheme } from '@/theme';

/** The starting map: a level for each strand, and the first words on the path. */
export default function PlacementResult() {
  const { c } = useTheme();
  const skill = useStore((s) => s.skill);
  const onboarded = useStore((s) => s.onboarded);
  // The words the model would pick today. They are chosen for real as each stop is opened, so these may change as it learns more.
  const [first] = useState(() => {
    const st = useStore.getState();
    return pickNewWords(st, 4)
      .map((id) => lexOf(st, id))
      .filter((l) => !!l);
  });

  useEffect(() => {
    sfx.play('win');
    buzz.good();
  }, []);

  // A retake from settings goes straight back to the journey.
  const finishOnboarding = useStore((s) => s.finishOnboarding);
  const next = () => {
    if (onboarded) return router.replace('/(tabs)');
    finishOnboarding();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/story/prologue');
  };

  return (
    <Screen top={<TopBar back={null} steps={{ total: 4, done: 3 }} />} footer={<Btn iconRight={ArrowRight} label={onboarded ? 'Back to the journey' : 'Start learning'} onPress={next} />}>
      <Rise style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Txt v="display" accessibilityRole="header" style={{ flex: 1, paddingBottom: 12 }}>
          Your starting levels
        </Txt>
        <Figure pose="proud" size={132} delay={200} />
      </Rise>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {STRAND_ORDER.map((id, i) => {
          const st = STRANDS[id];
          const level = levelOf(skill[id]);
          return (
            <Pop key={id} delay={300 + i * 160} style={{ flex: 1 }}>
              <Block tone={st.tone} pad={14} a11y={`${st.label}: level ${level} of 6`} style={{ alignItems: 'center', gap: 10 }}>
                <Ring value={level / 6} size={84} stroke={8} color={c.indigo} track="rgba(76,92,235,0.16)">
                  <CountUp to={level} delay={500 + i * 160} duration={700} color={ON_BLOCK.ink} />
                </Ring>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <st.icon size={16} color={ON_BLOCK.ink} strokeWidth={2.6} />
                  <Txt v="bodyS">{st.label}</Txt>
                </View>
                <Txt v="caption" color="ink2">
                  of 6
                </Txt>
              </Block>
            </Pop>
          );
        })}
      </View>

      {first.length > 0 && (
        <Rise i={3} style={{ gap: 12 }}>
          <SectionLabel>Words to start with</SectionLabel>
          <ChipRow>
            {first.map((lex) => (
              <Chip key={lex.id} label={lex.text} big />
            ))}
          </ChipRow>
        </Rise>
      )}
    </Screen>
  );
}
