import { ArrowRight, Check, Pencil } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Controls, SpellingMarks } from '@/components/learn';
import { Block, Btn, Field, Tag, Txt } from '@/components/ui';
import { PATTERNS } from '@/data/words';
import { buzz, sayHum } from '@/lib/audio';
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

type Stage = 'input' | 'right' | 'almost';

/**
 * Spell: the word from memory, typed on the phone's own keyboard with autocorrect, capitals and
 * suggestions off. It is checked letter by letter and the letter that is off is the one
 * that lights up. It never blocks: there is always a way on.
 */
export function Spell({ lex, top, next, skip, addRetry }: StepProps) {
  const [stage, setStage] = useState<Stage>('input');
  const [attempt, setAttempt] = useState('');

  const target = lex.text.toLowerCase();
  const diff = stage === 'almost' ? alignSpelling(attempt, lex.text) : null;
  const off = diff ? whereOff(lex, diff.yours, diff.theirs) : null;
  // Say where the slip is only when it is somewhere other than the tricky beat, which gets its own card.
  const elsewhere = off && off.text && (!lex.tricky || off.part !== lex.tricky.part) ? off.text : '';

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

  let buttons: ReactNode;
  if (stage === 'right') buttons = <Btn icon={ArrowRight} a11y="Next" onPress={next} />;
  else if (stage === 'almost')
    buttons = (
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Btn
          flex={1}
          icon={Pencil}
          label="Fix it"
          onPress={() => {
            addRetry();
            setStage('input');
          }}
        />
        <Btn flex={1} kind="soft" iconRight={ArrowRight} label="Move on" onPress={next} />
      </View>
    );
  else buttons = <Btn icon={Check} label="Check" a11y="Check my spelling" onPress={check} disabled={!attempt.trim()} />;

  return (
    <StepScreen
      top={top}
      pose="write"
      keyboard
      gap={16}
      footer={
        <>
          <Controls onReplay={() => sayHum(lex.text, lex.says)} onSkip={skip} />
          {buttons}
        </>
      }>
      {/* What to do, and which word: Replay says it again; the meaning is the clue. */}
      <View style={{ gap: 4 }}>
        <Txt v="title" accessibilityRole="header">
          {stage === 'right' ? 'Right' : stage === 'almost' ? 'Not quite. Compare the two' : 'Spell the word you hear'}
        </Txt>
        {stage === 'input' && !!lex.meaning && (
          <Txt v="bodyS" color="ink2">
            It means: {lex.meaning}
          </Txt>
        )}
      </View>

      {stage === 'input' && (
        <>
          {/* The phone's own keyboard, with autocorrect, capitals and suggestions off so the spelling is the learner's. */}
          <Field big value={attempt} onChangeText={setAttempt} autoFocus autoComplete="off" returnKeyType="done" onSubmitEditing={() => attempt.trim() && check()} placeholder="Type the word" accessibilityLabel={`Spell the word you hear`} style={{ minWidth: 0 }} />
        </>
      )}

      {stage === 'right' && (
        <Block tone="success" style={{ alignItems: 'center' }}>
          <SpellingMarks marks={lex.text.toLowerCase().split('').map((ch) => ({ ch, ok: true }))} label="You wrote" />
        </Block>
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
    </StepScreen>
  );
}
