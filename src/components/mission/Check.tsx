import { ArrowRight, BookOpen, Sparkles } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { Pop } from '@/components/fx';
import { Dictate } from '@/components/games/Dictate';
import { Meaning } from '@/components/games/Meaning';
import type { GameResult } from '@/components/games/types';
import { SylWord } from '@/components/learn';
import { Growth } from '@/components/Mascot';
import { Btn, Screen, Txt } from '@/components/ui';
import { buzz } from '@/lib/audio';
import type { Lexeme } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';

/**
 * "Do you have this one already?" Two questions before a lesson: what the word means, then how it is
 * spelled from hearing it. Both right first time and the word is rooted on the spot, and the stop gets
 * a harder one in its place. Anything less and the lesson simply begins: nothing is lost by trying.
 *
 * Root opens with this when the model thinks the learner probably has the word; the learner can ask for
 * it on any new word. Either way the two answers are evidence, and the model learns from them.
 */
export function Check({ lex, top, onPass, onTeach }: { lex: Lexeme; top: ReactNode; /** Both answers were right. */ onPass: () => void; /** Teach it after all. */ onTeach: () => void }) {
  const { c } = useTheme();
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [res, setRes] = useState<GameResult | null>(null);

  const answer = (strand: 'know' | 'spell', game: 'meaning' | 'dictate') => (r: GameResult) => {
    if (res) return;
    useStore.getState().recordAttempt({ id: lex.id, strand, r: r.r, game, ms: r.ms, attempt: r.attempt, probe: true });
    setRes(r);
    if (r.r === 1) {
      sfx.play('good');
      buzz.good();
    } else buzz.light();
  };

  const next = () => {
    if (!res) return;
    if (res.r < 1) return onTeach();
    setRes(null);
    if (stage === 0) setStage(1);
    else {
      sfx.play('unlock');
      setStage(2);
    }
  };

  if (stage === 2) {
    return (
      <Screen top={top} scroll={false} footer={<Btn icon={ArrowRight} label="Next word" a11y="Rooted. On to a harder word." onPress={onPass} />}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <Pop>
            <Growth stage={3} size={96} />
          </Pop>
          <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 44, 300)} />
          <Txt v="title" center>
            Already yours
          </Txt>
          <Figure pose="proud" size={150} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      top={top}
      scroll={false}
      keyboard
      gap={12}
      footer={res ? <Btn icon={res.r === 1 ? ArrowRight : BookOpen} label={res.r === 1 ? undefined : 'Learn it'} a11y={res.r === 1 ? 'Continue' : 'Learn this word'} kind={res.r === 1 ? 'mint' : 'ink'} onPress={next} /> : <Btn kind="ghost" icon={BookOpen} label="Teach me" a11y="Skip the check and learn this word" onPress={onTeach} />}>
      <View style={{ height: 36, alignSelf: 'flex-start', borderRadius: radius.pill, backgroundColor: c.butter, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14 }} accessible accessibilityRole="header" accessibilityLabel="A quick check: do you know this word already?">
        <Sparkles size={17} color={ON_BLOCK.ink} strokeWidth={2.6} />
        <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 14, color: ON_BLOCK.ink }}>Know it?</Text>
      </View>
      <View style={{ flex: 1 }}>{stage === 0 ? <Meaning key="m" lex={lex} onResult={answer('know', 'meaning')} done={!!res} /> : <Dictate key="d" lex={lex} onResult={answer('spell', 'dictate')} done={!!res} />}</View>
    </Screen>
  );
}
