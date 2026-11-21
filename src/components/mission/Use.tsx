import { ArrowRight, Check, RotateCcw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Controls, MicButton } from '@/components/learn';
import { Block, Btn, Chip, ChipRow, Field, Txt } from '@/components/ui';
import { buzz, listenOnce, micAvailable, say, speakable, stopListening } from '@/lib/audio';
import { gapped, judgeSpoken, meaningOf, plain, shuffled, splitAround } from '@/lib/lexicon';
import { note, noteUi } from '@/lib/signals';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, useTheme } from '@/theme';
import { StepScreen, Why } from './Frame';
import type { StepProps } from './types';

/**
 * Use: the word dropped into an everyday sentence. Picking it fills the gap, and the green sentence
 * is the whole confirmation. Only a word with no such sentence (a learner's own word) asks for a
 * sentence of the learner's own instead, and says plainly that is what it wants.
 */
export function Use({ lex, top, next, skip }: StepProps) {
  const { c, text } = useTheme();

  const hasGap = lex.life.includes('{');
  const [options] = useState(() => shuffled([lex.text, ...lex.lookalikes.slice(0, 2)]));
  const [gapDone, setGapDone] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);

  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [spoken, setSpoken] = useState<'none' | 'ok' | 'miss'>('none');
  const [mic] = useState(() => micAvailable());
  const praised = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopListening();
    };
  }, []);

  const [before, word, after] = splitAround(lex.life);

  const pick = (opt: string) => {
    if (gapDone) return;
    if (opt === lex.text) {
      setGapDone(true);
      setWrong(null);
      buzz.good();
      say(plain(lex.life));
      return;
    }
    buzz.nudge();
    setWrong(opt);
  };

  // What the wrong pick really means, so the miss teaches something.
  const wrongMeaning = wrong ? meaningOf(wrong) : undefined;

  const target = lex.text.toLowerCase();
  const stem = target.length > 4 ? target.replace(/(e|y)$/, '') : target;
  const has = (s: string) => s.toLowerCase().includes(target) || s.toLowerCase().includes(stem);
  const typedOk = typed.trim().length > stem.length + 2 && has(typed);
  const ownDone = typedOk || spoken === 'ok';

  // One small cheer the first time their own sentence has the word in it.
  useEffect(() => {
    if (!ownDone || praised.current) return;
    praised.current = true;
    buzz.good();
    sfx.play('good');
  }, [ownDone]);

  const onMic = async () => {
    if (listening) {
      stopListening();
      return;
    }
    setListening(true);
    setHeard(null);
    setSpoken('none');
    const r = await listenOnce({ hints: [lex.text], maxMs: 10000 });
    if (!alive.current) return;
    setListening(false);
    if (r.ok) {
      setHeard(r.transcript);
      const ok = has(r.transcript) || judgeSpoken(r.transcript, lex.text) !== 'miss';
      note({ k: 'say', id: lex.id, res: has(r.transcript) ? 'exact' : judgeSpoken(r.transcript, lex.text) });
      // A sentence of their own with the word in it: this is a word they want to use.
      if (ok) noteUi('own', { topics: lex.topics });
      setSpoken(ok ? 'ok' : 'miss');
      if (!ok) buzz.nudge();
    } else buzz.nudge();
  };

  const sentence = [text('title'), { color: c.ink }];

  return (
    <StepScreen
      top={top}
      pose="speak"
      keyboard
      gap={16}
      footer={
        <>
          <Controls onReplay={() => say(gapDone && hasGap ? plain(lex.life) : speakable(lex.text))} onSkip={skip} />
          <Btn icon={hasGap && !gapDone ? undefined : ArrowRight} label={hasGap && !gapDone ? 'Pick the word that fits first' : undefined} a11y={hasGap && !gapDone ? undefined : 'Finish'} onPress={next} disabled={hasGap && !gapDone} />
        </>
      }>
      {hasGap && (
        <>
          <View>
            <Block tone={gapDone ? 'success' : 'surface'} pad={22} style={{ gap: 12, alignItems: 'flex-start' }}>
              {gapDone ? (
                <Text style={sentence} accessibilityLabel={plain(lex.life)}>
                  {before}
                  <Text style={{ backgroundColor: c.orange, color: ON_BLOCK.ink }}> {word} </Text>
                  {after}
                </Text>
              ) : (
                <Text style={sentence} accessibilityLabel={gapped(lex.life).replace('______', 'blank')}>
                  {gapped(lex.life)}
                </Text>
              )}
            </Block>
          </View>

          <ChipRow style={{ justifyContent: 'center' }}>
            {options.map((opt) => (
              <Chip key={opt} big label={opt} state={gapDone && opt === lex.text ? 'correct' : wrong === opt ? 'wrong' : 'default'} disabled={gapDone && opt !== lex.text} onPress={() => pick(opt)} />
            ))}
          </ChipRow>

          {/* A wrong pick always says so; when the word is in the bank, it also says what it really means. */}
          {!gapDone && !!wrong && <Why label={wrong} text={wrongMeaning ? `${wrongMeaning}. It does not fit here; try another.` : 'It does not fit here; try another.'} />}
        </>
      )}

      {!hasGap && (
        <Block pad={20} style={{ gap: 14 }}>
          <Txt v="heading">{`Make up a sentence with “${lex.text}”`}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {mic && <MicButton listening={listening} onPress={onMic} size={56} />}
            <View style={{ flex: 1 }}>
              <Field
                value={typed}
                onChangeText={setTyped}
                placeholder="Say it or type it"
                autoCapitalize="sentences"
                autoCorrect
                returnKeyType="done"
                accessibilityLabel={`Say or type your own sentence with ${lex.text}. Optional, nothing is saved.`}
                right={
                  ownDone ? (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={20} color={ON_BLOCK.ink} strokeWidth={3} />
                    </View>
                  ) : undefined
                }
              />
            </View>
          </View>

          {!!heard && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt v="bodyS" color="ink2" style={{ flex: 1 }}>
                “{heard}”
              </Txt>
              {spoken === 'miss' && (
                <>
                  <Btn kind="soft" small icon={RotateCcw} label="Again" a11y="Say it again" onPress={onMic} />
                  <Btn kind="soft" small icon={Check} label="It counts" a11y="That is what I said. It counts." onPress={() => setSpoken('ok')} />
                </>
              )}
            </View>
          )}
        </Block>
      )}
    </StepScreen>
  );
}
