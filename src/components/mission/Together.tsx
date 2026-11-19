import { ArrowRight, Check } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Controls } from '@/components/learn';
import { Block, Btn, Tag, Tap, Txt } from '@/components/ui';
import { PATTERNS, type PatternId } from '@/data/words';
import { buzz, say, speakable } from '@/lib/audio';
import { shuffled, type Lexeme } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { StepScreen } from './Frame';

/**
 * Together: the last step of a set. Each word has just been taught on its own; now they are
 * mixed, and the learner pulls each one back out from its meaning. It is the first small act
 * of recall, done while the words are still warm, and it is what makes two lessons one set.
 * A wrong pick is not a miss: it says what that word really means and the card stays open.
 */
export function Together({ words, pattern, top, next, skip }: { words: Lexeme[]; /** The spelling pattern the words share, if they do. */ pattern?: PatternId; top: React.ReactNode; next: () => void; skip: () => void }) {
  const { c, font, text } = useTheme();
  // One card per word, in a mixed order. The choices are the set's own words and one look-alike, so there is always something to tell apart.
  const [cards] = useState(() =>
    shuffled(words).map((w) => {
      const others = words.filter((o) => o.id !== w.id).map((o) => o.text);
      const decoy = w.lookalikes.find((l) => !others.includes(l) && l !== w.text);
      return { word: w, options: shuffled([w.text, ...others, ...(decoy ? [decoy] : [])]) };
    }),
  );
  const [at, setAt] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [right, setRight] = useState(false);
  const card = cards[Math.min(at, cards.length - 1)];
  const allDone = at >= cards.length - 1 && right;

  const pick = (opt: string) => {
    if (right) return;
    if (opt === card.word.text) {
      setRight(true);
      setWrong(null);
      buzz.good();
      sfx.play('good');
      say(speakable(card.word.text));
      return;
    }
    buzz.nudge();
    setWrong(opt);
  };

  const onward = () => {
    if (allDone) return next();
    setAt(at + 1);
    setRight(false);
    setWrong(null);
  };

  const wrongWord = wrong ? words.find((w) => w.text === wrong) : undefined;

  return (
    <StepScreen
      top={top}
      pose="search"
      gap={16}
      footer={
        <>
          <Controls onReplay={() => say(card.word.meaning)} onSkip={skip} />
          <Btn icon={allDone ? Check : ArrowRight} a11y={allDone ? 'Finish' : 'Next'} onPress={onward} disabled={!right} />
        </>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Txt v="label" color="ink2" style={{ flex: 1 }}>
          {`Which word is it?  ${Math.min(at + 1, cards.length)} of ${cards.length}`}
        </Txt>
        {pattern && <Tag label={PATTERNS[pattern].label} tint="butter" />}
      </View>

      <Block pad={22} style={{ minHeight: 132, justifyContent: 'center' }}>
        <Text style={[text('title'), { color: c.ink }]}>{card.word.meaning}</Text>
      </Block>

      <View style={{ gap: 10 }}>
        {card.options.map((opt) => {
          const isRight = right && opt === card.word.text;
          const isWrong = wrong === opt;
          return (
            <Tap
              key={opt}
              onPress={() => pick(opt)}
              disabled={right}
              accessibilityRole="button"
              accessibilityLabel={opt}
              accessibilityState={{ selected: isRight }}
              style={{ minHeight: 64, borderRadius: radius.lg, paddingHorizontal: 22, justifyContent: 'center', backgroundColor: isRight ? c.mint : isWrong ? c.errorTint : c.surface, borderWidth: isRight ? 0 : 1.5, borderColor: isWrong ? c.orange : c.line, opacity: right && !isRight ? 0.45 : 1 }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: font('b'), fontSize: 22, letterSpacing: 0.4, color: isRight ? ON_BLOCK.ink : c.ink }}>
                {opt}
              </Text>
            </Tap>
          );
        })}
      </View>

      {!!wrong && !right && (
        <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.sun, borderRadius: radius.lg, padding: 16 }}>
          <Txt v="bodyS">{wrongWord ? `“${wrong}” is the other one: ${wrongWord.meaning}.` : `“${wrong}” looks close, but it is a different word.`}</Txt>
        </View>
      )}
    </StepScreen>
  );
}
