import { ArrowRight, Volume2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { Echo } from '@/components/hands/Echo';
import { Controls, PartTiles, SylWord } from '@/components/learn';
import { Block, Btn, Field, IconBtn, Tag, Tap } from '@/components/ui';
import { say, sayBeat, sayByParts } from '@/lib/audio';
import { exampleFor, plain, splitAround } from '@/lib/lexicon';
import { useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';
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
  // The step is done when the learner has said the word back (or the phone could not listen and they held the button).
  const [said, setSaid] = useState(false);
  const [meaning, setMeaning] = useState(lex.meaning);
  const cancel = useRef<(() => void) | null>(null);
  const stopHum = useRef<(() => void) | null>(null);
  const lexRef = useRef(lex);
  useEffect(() => {
    lexRef.current = lex;
  }, [lex]);

  const example = useMemo(() => exampleFor(lex, interests), [lex, interests]);
  const [before, word, after] = splitAround(example?.text ?? '');

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
    stopHum.current = sayBeat(lex.parts, lex.says, i, { onDone: () => setActive((a) => (a === i ? -1 : a)) });
  };

  const hearExample = () => {
    if (!example) return;
    quiet();
    setActive(-1);
    say(plain(example.text));
  };

  // The word shares its row with the 64px speaker button (plus a 12px gap), so it sizes to what is left and stays on one line.
  // The dots between beats take room too, so each counts as a letter.
  const size = wordSize(lex.text.padEnd(lex.text.length + lex.parts.length - 1, ' '), 46, Math.min(width, 480) - 56 - 76);
  const sentence = [text('body'), { color: c.ink }];

  return (
    <StepScreen
      top={top}
      pose="listen"
      keyboard={lex.custom}
      gap={18}
      footer={
        <>
          {/* The big speaker beside the word replays it, so the row has no second one. */}
          <Controls onSkip={skip} />
          <Btn icon={said ? ArrowRight : undefined} label={said ? undefined : 'Say the word first'} a11y={said ? 'Next' : undefined} onPress={next} disabled={!said} />
        </>
      }>
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <SylWord text={lex.text} parts={lex.parts} size={size} active={active} />
        </View>
        <IconBtn icon={Volume2} label={`Hear ${lex.text}, then each beat`} kind="ink" size={64} onPress={play} />
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
        <Tap onPress={hearExample} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Hear it in a sentence: ${plain(example.text)}`} style={{ backgroundColor: c.surface, borderRadius: radius.xl, padding: 18, gap: 10, alignItems: 'flex-start', borderWidth: 1.5, borderColor: '#CFD1DA' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.press, alignItems: 'center', justifyContent: 'center' }}>
              <Volume2 size={16} color={c.onInk} strokeWidth={2.6} />
            </View>
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
        <Echo key={lex.id} text={lex.text} parts={lex.parts} says={lex.says} whole quiet onDone={() => {
            bump('echo');
            setSaid(true);
          }} />
      </Block>
    </StepScreen>
  );
}
