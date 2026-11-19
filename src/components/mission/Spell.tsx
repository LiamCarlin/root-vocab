import { ArrowRight, Check, Eye, Keyboard, PenLine, Pencil, RotateCcw, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Controls, DrawPad, PartTiles, SpellingMarks } from '@/components/learn';
import { Block, Btn, Field, IconBtn, Tag, Txt } from '@/components/ui';
import { PATTERNS } from '@/data/words';
import { buzz, sayBeat, sayHum } from '@/lib/audio';
import { alignSpelling, partOfLetter, type Lexeme, type Mark } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, useTheme } from '@/theme';
import { StepScreen, Why } from './Frame';
import type { StepProps } from './types';

/** Which beat the first off letter is in, and how that beat sounds: for when the slip is somewhere other than the tricky beat. */
function whereOff(lex: Lexeme, yours: Mark[], theirs: Mark[]): { part: number; text: string } {
  const p = partOfLetter(lex, theirs);
  if (p < 0) return { part: -1, text: yours.some((m) => m.kind === 'extra') ? 'One letter too many.' : '' };
  const part = lex.parts[p];
  const says = lex.says[p];
  return { part: p, text: says && says !== part ? `Look at “${part}”: it sounds like “${says}”.` : lex.parts.length > 1 ? `Look at “${part}”.` : '' };
}

/** The word's tricky beat: which spelling pattern it is and the reason or trick that makes it stick. */
function Tricky({ lex }: { lex: Lexeme }) {
  const { c, syl, font, scale } = useTheme();
  const t = lex.tricky;
  if (!t) return null;
  const part = lex.parts[t.part] ?? '';
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.sun, borderRadius: 28, padding: 18, gap: 12, alignItems: 'flex-start' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ paddingHorizontal: 14, minHeight: 44, borderRadius: 16, backgroundColor: syl(t.part), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font('b'), fontSize: 22 * scale, color: ON_BLOCK.ink }}>{part}</Text>
        </View>
        <Tag label={PATTERNS[t.pattern].label} tint="butter" />
      </View>
      <Txt v="body">{t.why}</Txt>
    </View>
  );
}

type Stage = 'input' | 'right' | 'almost' | 'compare' | 'notQuite';

/**
 * Spell: the word from memory. Typed spelling is checked letter by letter and
 * the letter that is off is the one that lights up. Finger writing is checked
 * by eye against the word. Either way it never blocks: there is always a way on.
 */
export function Spell({ lex, top, next, skip, addRetry }: StepProps) {
  const [mode, setMode] = useState<'type' | 'finger'>('type');
  const [stage, setStage] = useState<Stage>('input');
  const [attempt, setAttempt] = useState('');
  const [ink, setInk] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const target = lex.text.toLowerCase();
  const diff = stage === 'almost' ? alignSpelling(attempt, lex.text) : null;
  const off = diff ? whereOff(lex, diff.yours, diff.theirs) : null;
  // Say where the slip is only when it is somewhere other than the tricky beat, which gets its own card.
  const elsewhere = off && off.text && (!lex.tricky || off.part !== lex.tricky.part) ? off.text : '';
  const onPad = mode === 'finger' && (stage === 'input' || stage === 'compare');

  const check = () => {
    if (attempt.trim().toLowerCase().replace(/\s+/g, ' ') === target) {
      buzz.good();
      sfx.play('good');
      setStage('right');
      sayHum(lex.text, lex.says);
    } else {
      buzz.nudge();
      setStage('almost');
    }
  };

  const switchMode = (m: 'type' | 'finger') => {
    setMode(m);
    setStage('input');
  };

  const pair = (a: ReactNode, b: ReactNode) => (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {a}
      {b}
    </View>
  );

  let buttons: ReactNode;
  if (stage === 'right') buttons = <Btn icon={ArrowRight} a11y="Next" onPress={next} />;
  else if (stage === 'almost')
    buttons = pair(
      <Btn
        flex={1}
        icon={Pencil}
        a11y="Fix it"
        onPress={() => {
          addRetry();
          setStage('input');
        }}
      />,
      <Btn flex={1} kind="soft" icon={ArrowRight} a11y="Keep going" onPress={next} />,
    );
  else if (stage === 'compare')
    buttons = pair(
      <Btn
        flex={1}
        kind="soft"
        icon={X}
        a11y="Mine is not quite right"
        onPress={() => {
          buzz.nudge();
          setStage('notQuite');
        }}
      />,
      <Btn
        flex={1}
        kind="mint"
        icon={Check}
        a11y="Mine matches"
        onPress={() => {
          buzz.good();
          sfx.play('good');
          next();
        }}
      />,
    );
  else if (stage === 'notQuite')
    buttons = pair(
      <Btn
        flex={1}
        icon={RotateCcw}
        a11y="Write it again"
        onPress={() => {
          addRetry();
          setResetKey((k) => k + 1);
          setInk(0);
          setStage('input');
        }}
      />,
      <Btn flex={1} kind="soft" icon={ArrowRight} a11y="Keep going" onPress={next} />,
    );
  else if (mode === 'type') buttons = <Btn icon={Check} a11y="Check my spelling" onPress={check} disabled={!attempt.trim()} />;
  else buttons = <Btn icon={Eye} a11y="Show the word behind my writing" onPress={() => setStage('compare')} disabled={ink === 0} />;

  return (
    <StepScreen
      top={top}
      scroll={!onPad}
      keyboard
      gap={16}
      footer={
        <>
          <Controls onReplay={() => sayHum(lex.text, lex.says)} onSkip={skip} />
          {buttons}
        </>
      }>
      {stage === 'input' && (
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
          <IconBtn icon={Keyboard} label="Type it" active={mode === 'type'} onPress={() => switchMode('type')} />
          <IconBtn icon={PenLine} label="Write it with a finger" active={mode === 'finger'} onPress={() => switchMode('finger')} />
        </View>
      )}

      {mode === 'type' && stage === 'input' && (
        <>
          <Field big value={attempt} onChangeText={setAttempt} placeholder="…" autoComplete="off" autoCorrect={false} autoCapitalize="none" spellCheck={false} returnKeyType="done" onSubmitEditing={() => attempt.trim() && check()} accessibilityLabel="Type the word from memory" style={{ textAlign: 'center' }} />
        </>
      )}

      {stage === 'right' && (
        <>
          <View>
            <Block tone="success" style={{ alignItems: 'center' }}>
              <SpellingMarks marks={lex.text.toLowerCase().split('').map((ch) => ({ ch, ok: true }))} label="You wrote" />
            </Block>
          </View>
        </>
      )}

      {diff && (
        <>
          <Block pad={18} style={{ gap: 14 }}>
            <SpellingMarks marks={diff.yours} label="You wrote" />
            <SpellingMarks marks={diff.theirs} label="The word" />
          </Block>
          {!!elsewhere && <Why text={elsewhere} />}
          <Tricky lex={lex} />
        </>
      )}

      {onPad && <DrawPad resetKey={resetKey} onInk={setInk} reveal={stage === 'compare' ? lex.text : undefined} height={250} />}

      {stage === 'notQuite' && (
        <>
          <PartTiles
            parts={lex.parts}
            says={lex.custom ? undefined : lex.says}
            onPress={(i) => {
              sayBeat(lex.parts, lex.says, i);
            }}
          />
          <Tricky lex={lex} />
        </>
      )}
    </StepScreen>
  );
}
