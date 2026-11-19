import { ArrowRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Controls, PartTiles } from '@/components/learn';
import { Btn, Chip, ChipRow } from '@/components/ui';
import { buzz, say, sayBeat, sayByParts, sayHum, speakable } from '@/lib/audio';
import { buildPieces, shuffled, type Lexeme, type Piece } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { StepScreen, Why } from './Frame';
import type { StepProps } from './types';

// Letters that get mistaken for each other, by shape or by sound.
const MIXUP: Record<string, string> = { a: 'e', e: 'a', i: 'y', o: 'u', u: 'o', y: 'i', b: 'd', d: 'b', p: 'q', q: 'p', m: 'n', n: 'm', c: 'k', k: 'c', s: 'z', z: 's', f: 'v', v: 'f', t: 'd', g: 'j', j: 'g', w: 'v', h: 'n', r: 'n', l: 'i' };

/** A one-beat word is built from its letters instead: every letter, plus two that are easy to mistake for one of them. */
function letterPieces(letters: string[]): Piece[] {
  const real: Piece[] = letters.map((t, i) => ({ key: `p${i}`, text: t.toLowerCase(), slot: i }));
  const have = new Set(real.map((p) => p.text));
  const decoys: Piece[] = [];
  for (const p of real) {
    if (decoys.length >= 2) break;
    const d = MIXUP[p.text];
    if (!d || have.has(d)) continue;
    have.add(d);
    decoys.push({ key: `d${p.slot}`, text: d, slot: p.slot, why: `This word has “${p.text}” here, not “${d}”.` });
  }
  let mixed = shuffled([...real, ...decoys]);
  // Never hand the answer over in reading order.
  if (mixed.filter((p) => p.key.startsWith('p')).every((p, i, arr) => i === 0 || arr[i - 1].slot < p.slot) && mixed.length > 2) mixed = mixed.reverse();
  return mixed;
}

const lettersOf = (lex: Lexeme) => lex.text.replace(/[^a-zA-Z]/g, '').split('');

/**
 * Build: tap the pieces in order. Every tap is answered straight away: a
 * right piece drops in and is said; a look-alike is turned back with the one
 * reason it does not fit, and the beat being looked for is played again.
 * Words of one beat are built letter by letter.
 */
export function Build({ lex, top, next, skip, addHint }: StepProps) {
  const byLetter = lex.parts.length === 1;
  const [slots] = useState<string[]>(() => (byLetter ? lettersOf(lex) : lex.parts));
  const [pieces] = useState<Piece[]>(() => (byLetter ? letterPieces(lettersOf(lex)) : buildPieces(lex)));
  const n = slots.length;
  const [used, setUsed] = useState<string[]>([]);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [lit, setLit] = useState(-1);
  const cancel = useRef<(() => void) | null>(null);
  const stopHum = useRef<(() => void) | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = used.length >= n;

  useEffect(
    () => () => {
      cancel.current?.();
      stopHum.current?.();
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
    },
    [],
  );

  const quiet = () => {
    cancel.current?.();
    stopHum.current?.();
    setLit(-1);
  };

  /** Say the piece that belongs in slot `i`: a beat is hummed too, a letter is named. */
  const sound = (i: number) => {
    if (byLetter) {
      say(slots[i].toLowerCase());
      return;
    }
    stopHum.current = sayBeat(lex.parts, lex.says, i);
  };

  const whole = () => {
    stopHum.current = sayHum(lex.text, lex.says);
  };

  const flashWrong = (key: string) => {
    setWrongKey(key);
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => setWrongKey(null), 1400);
  };

  const tap = (p: Piece) => {
    if (done || used.includes(p.key)) return;
    quiet();
    const target = used.length;
    const real = !p.why;

    if (real && p.text.toLowerCase() === slots[target].toLowerCase()) {
      const now = [...used, p.key];
      setUsed(now);
      setWrongKey(null);
      setWhy(null);
      if (byLetter) setHint(false);
      buzz.good();
      if (now.length >= n) {
        setHint(false);
        sfx.play('good');
        whole();
      } else sound(target);
      return;
    }

    buzz.nudge();
    flashWrong(p.key);
    // Only a look-alike of this very slot has a reason worth reading.
    setWhy(!real && p.slot === target && p.why ? p.why : null);
    // Let them hear the piece they are looking for.
    sound(target);
  };

  const remove = (i: number) => {
    if (done || i >= used.length) return;
    quiet();
    setUsed(used.slice(0, i));
    setWhy(null);
  };

  const openHint = () => {
    addHint();
    quiet();
    setHint(true);
    setWhy(null);
    if (byLetter) say(speakable(lex.text));
    else cancel.current = sayByParts(lex.text, lex.says, setLit, { wholeFirst: false });
  };

  const replay = () => {
    quiet();
    whole();
  };

  return (
    <StepScreen
      top={top}
      pose="think"
      gap={20}
      footer={
        <>
          <Controls onReplay={replay} onHint={done ? undefined : openHint} onSkip={skip} />
          <Btn icon={ArrowRight} a11y="Next" onPress={next} disabled={!done} />
        </>
      }>
      <View style={{ marginTop: 10 }}>
        <PartTiles
          parts={slots}
          says={hint && !done && !byLetter ? lex.says : undefined}
          states={slots.map((_, i) => (i < used.length ? 'good' : 'empty'))}
          active={lit >= 0 ? lit : done ? -1 : used.length}
          onPress={done ? undefined : remove}
        />
      </View>

      {!done && (
        <ChipRow style={{ justifyContent: 'center' }}>
          {pieces.map((p) => (
            <Chip key={p.key} big label={p.text} state={wrongKey === p.key ? 'wrong' : 'default'} disabled={used.includes(p.key)} onPress={() => tap(p)} />
          ))}
        </ChipRow>
      )}

      {!done && why ? <Why text={why} /> : !done && hint ? <Why text={byLetter ? `${slots[used.length].toLowerCase()} comes next` : lex.says.join(' · ')} /> : null}
    </StepScreen>
  );
}
