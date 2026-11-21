import { ArrowRight, Check, Lightbulb, Sprout, Volume2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameResult } from '@/components/games/types';
import { SylWord } from '@/components/learn';
import { Block, Btn, IconBtn, Txt } from '@/components/ui';
import { say, speakable } from '@/lib/audio';
import type { Lexeme } from '@/lib/lexicon';
import { GUTTER, ON_BLOCK, useTheme, wordSize } from '@/theme';

/**
 * What happens after an answer. It slides up from the bottom edge: mint when it was right,
 * butter when a cue helped or the word slipped (never red). A miss shows the word itself, split
 * into its beats, says it, and adds whatever the game wants to point at. One button moves on.
 */
export function FeedbackBar({ res, lex, line, last, onContinue, onHeight, positive }: { res: GameResult; lex: Lexeme; line: string; last: boolean; onContinue: () => void; onHeight?: (h: number) => void; /** Show the plain "done" bar whatever the score: for practice that cannot be got wrong. */ positive?: boolean }) {
  const { reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const right = res.r === 1 || !!positive;
  const miss = res.r === 0 && !positive;
  const Icon = right ? Check : miss ? Sprout : Lightbulb;

  // A missed word is heard straight away: the ear gets it as well as the eye.
  useEffect(() => {
    if (!miss) return;
    const t = setTimeout(() => say(speakable(lex.text)), 500);
    return () => clearTimeout(t);
  }, [miss, lex.text]);

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(240).springify().damping(18)}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Block tone={right ? 'mint' : 'butter'} pad={0} round={34} style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingHorizontal: GUTTER, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 12) + 10, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLiveRegion="polite" accessibilityLabel={miss ? `${line}. The word is ${lex.text}.` : line}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={22} color="#FFFFFF" strokeWidth={right ? 3.2 : 2.4} />
          </View>
          <Txt v="title" style={{ flex: 1 }}>
            {line}
          </Txt>
        </View>

        {miss && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 34, 250)} color={ON_BLOCK.ink} on="butter" />
            </View>
            <IconBtn icon={Volume2} label={`Hear ${lex.text}`} kind="ink" size={50} onPress={() => say(speakable(lex.text))} />
          </View>
        )}

        {res.note != null && <View>{res.note}</View>}

        <Btn label={last ? 'Finish' : 'Continue'} iconRight={ArrowRight} onPress={onContinue} />
      </Block>
    </Animated.View>
  );
}
