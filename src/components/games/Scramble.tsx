import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Pop, Wiggle } from '@/components/fx';
import { Controls } from '@/components/learn';
import { Tap } from '@/components/ui';
import { buzz, say, sayBeat, sayHum, speakable } from '@/lib/audio';
import { shuffled } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { SpellNote, useReport } from './spellkit';
import type { GameProps } from './types';

type Unit = { key: string; text: string; says?: string; /** Which beat it belongs to, for its colour. */ beat?: number };

/** The beats of the word, or its letters when it only has one beat, in a shuffled order that is never the answer. */
function deal(parts: string[], says: string[], text: string): { byBeat: boolean; units: Unit[]; pool: Unit[] } {
  // Two beats would be a coin toss, so each longer beat is cut in half: "Wed nes da y" has something to work out.
  const cut = (p: string) => (p.length >= 4 ? [p.slice(0, Math.ceil(p.length / 2)), p.slice(Math.ceil(p.length / 2))] : [p]);
  const chunks = parts.length === 2 ? parts.flatMap((p, beat) => cut(p).map((text) => ({ text, beat }))) : parts.map((text, beat) => ({ text, beat }));
  const byBeat = chunks.length > 2;
  const units: Unit[] = byBeat
    ? chunks.map((ch, i) => ({ key: `u${i}`, text: ch.text, beat: ch.beat, says: chunks.length === parts.length ? says[i] : undefined }))
    : text.replace(/\s+/g, '').split('').map((ch, i) => ({ key: `u${i}`, text: ch }));
  let pool = shuffled(units);
  const inOrder = (list: Unit[]) => list.every((u, i) => u.text.toLowerCase() === units[i].text.toLowerCase());
  for (let n = 0; n < 6 && inOrder(pool); n++) pool = shuffled(units);
  if (inOrder(pool) && pool.length > 1) pool = [...pool.slice(1), pool[0]];
  return { byBeat, units, pool };
}

/**
 * Unscramble: tap the beats into order. Each one is said as it lands and takes
 * its syllable colour. A wrong pick only wobbles; nothing is taken away.
 */
export function Scramble({ lex, onResult, done }: GameProps) {
  const { c, syl, font } = useTheme();
  const report = useReport(onResult);
  const [{ byBeat, units, pool }] = useState(() => deal(lex.parts, lex.says, lex.text));
  const [used, setUsed] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [shake, setShake] = useState<Record<string, number>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopHum = useRef<(() => void) | null>(null);

  useEffect(() => {
    say(speakable(lex.text));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      stopHum.current?.();
    };
  }, [lex.text]);

  const placed = done ? units.length : used.length;
  const locked = done || used.length >= units.length;

  const pick = (u: Unit) => {
    if (locked || used.includes(u.key)) return;
    const want = units[used.length];
    if (u.text.toLowerCase() !== want.text.toLowerCase()) {
      buzz.nudge();
      setWrong((n) => n + 1);
      setShake((m) => ({ ...m, [u.key]: (m[u.key] ?? 0) + 1 }));
      return;
    }
    sfx.play('pop');
    buzz.tap();
    const next = [...used, u.key];
    setUsed(next);
    if (next.length < units.length) {
      if (want.says && want.beat !== undefined) sayBeat(lex.parts, lex.says, want.beat, { hum: false });
      return;
    }
    // Last piece: let it land, then the whole word.
    timer.current = setTimeout(() => {
      stopHum.current = sayHum(lex.text, lex.says);
    }, 260);
    report({ r: wrong === 0 ? 1 : wrong <= 2 ? 0.5 : 0, cue: wrong, note: wrong > 2 ? <SpellNote lex={lex} /> : undefined });
  };

  const many = units.length > 5;
  const slotH = byBeat ? 68 : 58;
  const fs = byBeat ? (units.length > 5 ? 15 : units.length > 4 ? 18 : 23) : 26;
  const cell = (i: number) => (byBeat ? { flexGrow: Math.max(units[i].text.length, 2.4), flexBasis: 0, minWidth: units.length > 5 ? 36 : 54 } : { width: many ? 40 : 48 });

  return (
    <View style={{ flex: 1, gap: 22 }}>
      {/* Where the word is built, left to right. */}
      <View style={{ flexDirection: 'row', flexWrap: byBeat ? 'nowrap' : 'wrap', justifyContent: 'center', gap: byBeat ? (units.length > 5 ? 5 : 8) : 6, marginTop: 18 }} accessible accessibilityLabel={placed >= units.length ? lex.text : `${placed} of ${units.length} placed`}>
        {units.map((u, i) => {
          const filled = i < placed;
          const next = i === placed && !locked;
          return (
            <View key={u.key} style={[cell(i), { height: slotH }]}>
              {filled ? (
                <Pop from={0.7} style={{ flex: 1 }}>
                  <View style={{ flex: 1, borderRadius: radius.md, backgroundColor: byBeat ? syl(units[i].beat ?? i) : c.mint, alignItems: 'center', justifyContent: 'center' }}>
                    <Text numberOfLines={1} style={{ fontFamily: font('b'), fontSize: fs, color: ON_BLOCK.ink }}>
                      {u.text}
                    </Text>
                  </View>
                </Pop>
              ) : (
                <View style={{ flex: 1, borderRadius: radius.md, borderWidth: 2.5, borderStyle: 'dashed', borderColor: next ? c.ink : c.line }} />
              )}
            </View>
          );
        })}
      </View>

      <Controls onReplay={() => say(speakable(lex.text))} />

      {/* The shuffled pieces. A used piece leaves its place empty so nothing jumps around. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        {pool.map((u) => {
          const gone = done || used.includes(u.key);
          return (
            <Wiggle key={u.key} trigger={shake[u.key] ?? 0}>
              <Tap
                onPress={() => pick(u)}
                disabled={locked || gone}
                accessibilityRole="button"
                accessibilityLabel={byBeat ? `Piece: ${u.text}` : `Letter ${u.text}`}
                accessibilityState={{ disabled: locked || gone }}
                style={{ minWidth: byBeat ? 84 : 56, height: byBeat ? 72 : 62, paddingHorizontal: byBeat ? 18 : 0, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 2, borderColor: c.line, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center', opacity: gone ? 0.12 : 1 }}>
                <Text style={{ fontFamily: font('b'), fontSize: byBeat ? 23 : 26, color: c.ink }}>{gone ? '' : u.text}</Text>
              </Tap>
            </Wiggle>
          );
        })}
      </View>
    </View>
  );
}
