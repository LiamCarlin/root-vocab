import { ArrowRight, Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { SylWord } from '@/components/learn';
import { Block, Btn, Screen, Tag, Txt } from '@/components/ui';
import { PATTERNS, type PatternId } from '@/data/words';
import type { Lexeme } from '@/lib/lexicon';
import { ON_BLOCK, useTheme, wordSize } from '@/theme';

/**
 * Between the words of a set: a clear change of word. The word just finished is ticked off, and the
 * next one is named in big type, so it never looks as if something went wrong and the learner should
 * leave. If the two share a spelling pattern that is said here, once.
 */
export function Bridge({ done, next, at, of, pattern, top, onNext }: { done: Lexeme; next: Lexeme; /** How many words of the set are done, and how many there are. */ at: number; of: number; pattern?: PatternId; top: React.ReactNode; onNext: () => void }) {
  const { c } = useTheme();
  return (
    <Screen top={top} gap={16} footer={<Btn iconRight={ArrowRight} label={`Start word ${at + 1}`} onPress={onNext} />}>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Figure pose="thumbs" size={128} />
      </View>

      <Txt v="title" center accessibilityRole="header">
        {`Word ${at} of ${of} done`}
      </Txt>

      <Block pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={20} color={ON_BLOCK.ink} strokeWidth={3} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <SylWord text={done.text} parts={done.parts} size={wordSize(done.text, 28, 230)} />
        </View>
      </Block>

      <Block tone="soft" pad={20} style={{ gap: 10, alignItems: 'flex-start' }}>
        <Txt v="heading" color="ink2">
          Up next
        </Txt>
        <Txt v="display">{next.text}</Txt>
        {pattern && (
          <>
            <Tag label={PATTERNS[pattern].label} tint="butter" />
            <Txt v="bodyS" color="ink2">
              The same kind of tricky spot as the word you just did. Watch for it.
            </Txt>
          </>
        )}
      </Block>
    </Screen>
  );
}
