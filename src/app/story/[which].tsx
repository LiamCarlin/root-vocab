import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Gift, SkipForward } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';

import { Reaction } from '@/components/Buddy';
import { Burst, Pop, Pulse, Typer } from '@/components/fx';
import { Scene } from '@/components/rewards';
import { Block, IconBtn, Screen, TopBar, Txt } from '@/components/ui';
import { PROLOGUE, chapterOf } from '@/data/story';
import { buzz } from '@/lib/audio';
import { useHoldUnlocks } from '@/lib/buddy';
import { sfx } from '@/lib/sfx';
import { currentStop, useStore } from '@/lib/store';
import { ON_BLOCK, useTheme } from '@/theme';

type Which = 'prologue' | 'intro' | 'outro';
const isWhich = (w: string): w is Which => w === 'prologue' || w === 'intro' || w === 'outro';
const home = () => router.dismissTo('/(tabs)');

/**
 * The story, a few panels at a time: the prologue once, an opening for each place,
 * and an ending when its last stop is cleared. Tap anywhere to move on.
 */
export default function StoryRoute() {
  const params = useLocalSearchParams<{ which: string }>();
  const which = Array.isArray(params.which) ? params.which[0] : (params.which ?? '');
  // An ending only plays for a finished chapter.
  const [ok] = useState(() => isWhich(which) && (which !== 'outro' || (useStore.getState().journey.stops.length > 0 && currentStop(useStore.getState()) === -1)));
  useEffect(() => {
    if (!ok) home();
  }, [ok]);
  if (!ok || !isWhich(which)) return <View style={{ flex: 1 }} />;
  return <Story key={which} which={which} />;
}

function Story({ which }: { which: Which }) {
  const { c, reduceMotion } = useTheme();
  const { height } = useWindowDimensions();
  // The chapter this story belongs to, fixed when the screen opens (an ending moves the journey on underneath it).
  const [n] = useState(() => useStore.getState().journey.chapter);
  const ch = chapterOf(which === 'prologue' ? 1 : n);
  const beats = which === 'prologue' ? PROLOGUE : which === 'outro' ? ch.outro : ch.intro;
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(false);
  const [instant, setInstant] = useState(false);
  const [cleared, setCleared] = useState(false);
  const gone = useRef(false);
  const beat = beats[Math.min(i, beats.length - 1)];
  const last = i >= beats.length - 1;

  useHoldUnlocks(true);

  // An ending opens with the fog lifting off the place.
  useEffect(() => {
    if (which !== 'outro') return;
    const id = setTimeout(
      () => {
        setCleared(true);
        sfx.play('win');
        buzz.good();
      },
      reduceMotion ? 0 : 650,
    );
    return () => clearTimeout(id);
  }, [which, reduceMotion]);

  const finish = () => {
    if (gone.current) return;
    gone.current = true;
    const st = useStore.getState();
    if (which === 'prologue') {
      st.seeStory('prologue');
      router.replace('/story/intro');
    } else if (which === 'intro') {
      st.seeStory('intro');
      home();
    } else {
      // The place is clear: on to the next one, and its opening.
      st.nextChapter();
      router.replace('/story/intro');
    }
  };

  const advance = () => {
    if (!typed) {
      // First tap finishes the line; nobody should have to wait for it.
      setInstant(true);
      setTyped(true);
      return;
    }
    if (last) return finish();
    sfx.play('pop');
    buzz.tap();
    setI(i + 1);
    setTyped(false);
    setInstant(false);
  };

  const fog = which === 'prologue' ? [0.95, 0.95, 0.68][Math.min(i, 2)] : which === 'intro' ? 0.85 : cleared ? 0 : 0.6;
  const sceneSize = Math.max(170, Math.min(290, height * 0.33));
  const kicker = which === 'prologue' ? 'The valley' : `Chapter ${ch.n}`;
  const title = which === 'prologue' ? 'The Hush' : ch.name;

  return (
    <Screen
      tone={ch.tone}
      scroll={false}
      gap={0}
      top={
        <TopBar
          back={null}
          center={
            <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={`Part ${i + 1} of ${beats.length}`}>
              {beats.map((_, k) => (
                <View key={k} style={{ width: k === i ? 26 : 9, height: 9, borderRadius: 5, backgroundColor: k <= i ? ON_BLOCK.ink : 'rgba(14,14,19,0.2)' }} />
              ))}
            </View>
          }
          right={<IconBtn icon={SkipForward} label="Skip the story" kind="glass" size={48} onPress={finish} />}
        />
      }>
      <Pressable onPress={advance} accessibilityRole="button" accessibilityLabel={`${beat.line} ${last ? 'Continue' : 'Next'}`} style={{ flex: 1, paddingBottom: 22 }}>
        <View style={{ alignItems: 'center', gap: 2, paddingTop: 4 }}>
          <Txt v="label" color="ink2">
            {kicker}
          </Txt>
          <Txt v="display" center>
            {title}
          </Txt>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View>
            <Scene scene={ch.scene} size={sceneSize} fog={fog} fogColor={c[ch.tone]} />
            {which === 'outro' && cleared && <Burst key="lift" size={sceneSize * 1.25} count={14} />}
          </View>
        </View>

        {/* Root says the line: the speech card sits above it, with a tail pointing down at the speaker. */}
        <View>
          <Block pad={20} style={{ minHeight: 116, justifyContent: 'center' }}>
            {instant ? (
              <Txt v="heading">{beat.line}</Txt>
            ) : (
              <Typer key={`${which}-${i}`} text={beat.line} v="heading" delay={which === 'outro' && i === 0 ? 700 : 250} onDone={() => setTyped(true)} />
            )}
          </Block>
          <View style={{ position: 'absolute', left: 64, bottom: -9, width: 20, height: 20, borderRadius: 4, backgroundColor: c.surface, transform: [{ rotate: '45deg' }] }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, minHeight: 150 }}>
          <Reaction key={i} pose={beat.pose} size={148} pokable={false} />
          <View style={{ alignItems: 'flex-end', gap: 12, flex: 1 }}>
            {which === 'outro' && last && (
              <Pop delay={350}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 999, paddingVertical: 8, paddingLeft: 8, paddingRight: 16 }} accessible accessibilityLabel={`Keepsake: ${ch.keepsake}`}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Gift size={20} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                  <Txt v="bodyS">{ch.keepsake}</Txt>
                </View>
              </Pop>
            )}
            <Pulse on={typed}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center', opacity: typed ? 1 : 0.28 }} importantForAccessibility="no">
                <ArrowRight size={26} color="#FFFFFF" strokeWidth={2.8} />
              </View>
            </Pulse>
          </View>
        </View>
      </Pressable>
    </Screen>
  );
}
