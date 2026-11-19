import { ArrowRight, Volume2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { Echo } from '@/components/hands/Echo';
import { Controls, PartTiles, SylWord } from '@/components/learn';
import { Block, Btn, Field, IconBtn, Tag, Tap } from '@/components/ui';
import { TOPICS } from '@/data/profile';
import { beatMs, hum, say, sayByParts } from '@/lib/audio';
import { exampleFor, plain, splitAround } from '@/lib/lexicon';
import { useStore } from '@/lib/store';
import { ON_BLOCK, useTheme, wordSize } from '@/theme';
import { StepScreen } from './Frame';
import type { StepProps } from './types';

/**
 * Hear: the word, its beats in colour, how each sounds, what it means, and one sentence it lives in.
 * The phone hums each beat as it is said. Then it is the learner's turn: hold the button and say it back.
 */
export function Hear({ lex, top, next, skip }: StepProps) {
  const { c, text } = useTheme();
  const updateWord = useStore((s) => s.updateWord);
  const bump = useStore((s) => s.bump);
  const interests = useStore((s) => s.profile.interests);
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(-1);
  const [meaning, setMeaning] = useState(lex.meaning);
  const cancel = useRef<(() => void) | null>(null);
  const stopHum = useRef<(() => void) | null>(null);
  const lexRef = useRef(lex);
  useEffect(() => {
    lexRef.current = lex;
  }, [lex]);

  const example = useMemo(() => exampleFor(lex, interests), [lex, interests]);
  const [before, word, after] = splitAround(example?.text ?? '');
  const topic = example?.topic ? TOPICS[example.topic] : null;

  const quiet = () => {
    cancel.current?.();
    stopHum.current?.();
  };

  const play = useCallback(() => {
    cancel.current?.();
    stopHum.current?.();
    setActive(-1);
    const l = lexRef.current;
    cancel.current = sayByParts(l.text, l.says, setActive);
  }, []);

  useEffect(() => {
    const t = setTimeout(play, 350);
    return () => {
      clearTimeout(t);
      cancel.current?.();
      stopHum.current?.();
    };
  }, [play]);

  const hearPart = (i: number) => {
    quiet();
    setActive(i);
    stopHum.current = hum(beatMs(lex.says[i]));
    say(lex.says[i], { onDone: () => setActive((a) => (a === i ? -1 : a)) });
  };

  const hearExample = () => {
    if (!example) return;
    quiet();
    setActive(-1);
    say(plain(example.text));
  };

  const size = wordSize(lex.text, 46, Math.min(width, 480) - 56);
  const sentence = [text('body'), { color: c.ink }];

  return (
    <StepScreen
      top={top}
      keyboard={lex.custom}
      gap={18}
      footer={
        <>
          <Controls onReplay={play} onSkip={skip} />
          <Btn
            icon={ArrowRight}
            a11y="Next"
            onPress={() => {
              next();
            }}
          />
        </>
      }>
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <SylWord text={lex.text} parts={lex.parts} size={size} active={active} />
        </View>
        <IconBtn icon={Volume2} label={`Hear ${lex.text}, then each beat`} kind="orange" size={64} onPress={play} />
      </View>

      <PartTiles parts={lex.parts} says={lex.custom ? undefined : lex.says} active={active} onPress={hearPart} />

      <Block pad={20} style={{ gap: 10, alignItems: 'flex-start' }}>
        {!!lex.pos && <Tag label={lex.pos} />}
        {lex.custom ? (
          <View style={{ alignSelf: 'stretch' }}>
            <Field
              value={meaning}
              onChangeText={(t) => {
                setMeaning(t);
                updateWord(lex.id, { meaning: t });
              }}
              placeholder="Meaning"
              autoCapitalize="sentences"
              autoCorrect
              accessibilityLabel={`What ${lex.text} means, in your words`}
            />
          </View>
        ) : (
          <Text style={[text('title'), { color: c.ink }]}>{lex.meaning}</Text>
        )}
      </Block>

      {!!example && (
        <Tap onPress={hearExample} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Hear it in a sentence: ${plain(example.text)}`} style={{ backgroundColor: c.surface2, borderRadius: 28, padding: 18, gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Volume2 size={16} color={c.onInk} strokeWidth={2.6} />
            </View>
            {topic && <Tag icon={topic.icon} label={topic.label} tint={topic.tone} />}
          </View>
          <Text style={sentence}>
            {before}
            <Text style={{ backgroundColor: c.orange, color: ON_BLOCK.ink }}> {word} </Text>
            {after}
          </Text>
        </Tap>
      )}

      {/* Your turn: the word is not learned until the mouth has made it. Root has said it; now the learner says it back. */}
      <Block pad={16} style={{ alignItems: 'center', gap: 2 }}>
        <Echo key={lex.id} text={lex.text} parts={lex.parts} says={lex.says} whole quiet onDone={() => bump('echo')} />
      </Block>
    </StepScreen>
  );
}
