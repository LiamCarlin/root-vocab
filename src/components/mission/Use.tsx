import { ArrowRight, Check, RotateCcw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Controls, MicButton } from '@/components/learn';
import { Block, Btn, Chip, ChipRow, Field, IconBtn, Txt } from '@/components/ui';
import { buzz, listenOnce, micAvailable, say, speakable, stopListening } from '@/lib/audio';
import { gapped, judgeSpoken, meaningOf, plain, shuffled, splitAround } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, useTheme } from '@/theme';
import { StepScreen, Why } from './Frame';
import type { StepProps } from './types';

/** Use: the word dropped into an everyday sentence first, then a sentence of the learner's own, said or typed. */
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
      setSpoken(ok ? 'ok' : 'miss');
      if (!ok) buzz.nudge();
    } else buzz.nudge();
  };

  const sentence = [text('title'), { color: c.ink }];

  return (
    <StepScreen
      top={top}
      keyboard
      gap={16}
      footer={
        <>
          <Controls onReplay={() => say(gapDone && hasGap ? plain(lex.life) : speakable(lex.text))} onSkip={skip} />
          <Btn icon={ArrowRight} a11y="Finish" onPress={next} disabled={hasGap && !gapDone} />
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

          {!gapDone && !!wrong && <Why label={wrong} text={wrongMeaning ?? 'A different word.'} />}
        </>
      )}

      {(gapDone || !hasGap) && (
        <Block pad={20} style={{ gap: 14 }}>
          <Txt v="heading" color="ink2">
            Your sentence
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {mic && <MicButton listening={listening} onPress={onMic} size={56} />}
            <View style={{ flex: 1 }}>
              <Field
                value={typed}
                onChangeText={setTyped}
                placeholder={lex.text}
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
                  <IconBtn icon={RotateCcw} label="Say it again" size={44} onPress={onMic} />
                  <IconBtn icon={Check} label="That counts" kind="mint" size={44} onPress={() => setSpoken('ok')} />
                </>
              )}
            </View>
          )}
        </Block>
      )}
    </StepScreen>
  );
}
