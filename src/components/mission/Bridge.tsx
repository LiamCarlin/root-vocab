import { ArrowRight } from 'lucide-react-native';
import { View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { SylWord } from '@/components/learn';
import { Growth } from '@/components/Mascot';
import { Block, Btn, Screen, Tag, Txt } from '@/components/ui';
import { PATTERNS, type PatternId } from '@/data/words';
import type { Lexeme } from '@/lib/lexicon';
import { wordSize } from '@/theme';

/**
 * Between the words of a set: a breath. The word just taught is shown planted, the next one is
 * named, and if the two share a spelling pattern that is said here, once, so the second word is
 * met as "another one of those".
 */
export function Bridge({ done, next, at, of, pattern, top, onNext }: { done: Lexeme; next: Lexeme; /** How many words of the set are done, and how many there are. */ at: number; of: number; pattern?: PatternId; top: React.ReactNode; onNext: () => void }) {
  return (
    <Screen top={top} gap={16} footer={<Btn icon={ArrowRight} label="Next word" onPress={onNext} />}>
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Figure pose="thumbs" size={128} />
      </View>

      <Block pad={20} style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Growth stage={1} size={46} />
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Txt v="label" color="ink2">{`Word ${at} of ${of} planted`}</Txt>
            <SylWord text={done.text} parts={done.parts} size={wordSize(done.text, 30, 230)} />
          </View>
        </View>
      </Block>

      <Block tone="soft" pad={20} style={{ gap: 10, alignItems: 'flex-start' }}>
        <Txt v="label" color="ink2">
          Next
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
