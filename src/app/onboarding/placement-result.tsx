import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Reaction } from '@/components/Buddy';
import { Confetti, CountUp, Pop } from '@/components/fx';
import { Block, Btn, Chip, ChipRow, Ring, Rise, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { STRANDS, STRAND_ORDER } from '@/data/profile';
import { buzz } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { levelOf, lexOf, useStore } from '@/lib/store';
import { ON_BLOCK, SYLLABLE_TONES, useTheme } from '@/theme';

/** The starting map: a level for each strand, and the first words on the path. */
export default function PlacementResult() {
  const { c } = useTheme();
  const skill = useStore((s) => s.skill);
  const onboarded = useStore((s) => s.onboarded);
  const stops = useStore((s) => s.journey.stops);
  const words = useStore((s) => s.words);

  const first = stops
    .filter((st) => st.kind === 'learn' && st.wordId)
    .slice(0, 3)
    .map((st) => lexOf({ words }, st.wordId!))
    .filter((l) => !!l);

  useEffect(() => {
    sfx.play('win');
    buzz.good();
  }, []);

  // A retake from settings goes straight back to the journey.
  const next = () => (onboarded ? router.replace('/(tabs)') : router.push('/onboarding/check-ins'));

  return (
    <Screen top={<TopBar back={null} steps={{ total: 5, done: 3 }} />} footer={<Btn icon={ArrowRight} a11y="Next" onPress={next} />}>
      <Confetti />
      <Rise style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Txt v="display" accessibilityRole="header" style={{ flex: 1, paddingBottom: 12 }}>
          Your starting map
        </Txt>
        <Reaction pose="proud" size={132} delay={200} />
      </Rise>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {STRAND_ORDER.map((id, i) => {
          const st = STRANDS[id];
          const level = levelOf(skill[id]);
          return (
            <Pop key={id} delay={300 + i * 160} style={{ flex: 1 }}>
              <Block tone={st.tone} pad={14} a11y={`${st.label}: level ${level} of 6`} style={{ alignItems: 'center', gap: 10 }}>
                <Ring value={level / 6} size={84} stroke={8} color={ON_BLOCK.ink} track="rgba(14,14,19,0.14)">
                  <CountUp to={level} delay={500 + i * 160} duration={700} color={ON_BLOCK.ink} />
                </Ring>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <st.icon size={16} color={ON_BLOCK.ink} strokeWidth={2.6} />
                  <Txt v="bodyS">{st.label}</Txt>
                </View>
              </Block>
            </Pop>
          );
        })}
      </View>

      {first.length > 0 && (
        <Rise i={3} style={{ gap: 12 }}>
          <SectionLabel>First words</SectionLabel>
          <ChipRow>
            {first.map((lex, i) => (
              <Chip key={lex.id} label={lex.text} big tone={SYLLABLE_TONES[i % SYLLABLE_TONES.length]} style={{ borderColor: c.line }} />
            ))}
          </ChipRow>
        </Rise>
      )}
    </Screen>
  );
}
