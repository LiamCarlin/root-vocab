import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Pop, Wiggle } from '@/components/fx';
import { Controls } from '@/components/learn';
import { Tap } from '@/components/ui';
import { buzz, say, speakable } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { puzzleFor } from './missingPuzzle';
import { SpellNote, Why, useReport } from './spellkit';
import type { GameProps } from './types';

/**
 * Missing piece: the word with its tricky beat blanked. Three pieces to choose
 * from: the real one and the two that people most often write instead.
 */
export function Missing({ lex, onResult, done }: GameProps) {
  const { c, syl, font } = useTheme();
  const report = useReport(onResult);
  const [puzzle] = useState(() => puzzleFor(lex));
  const [tried, setTried] = useState<string[]>([]);
  const [filled, setFilled] = useState(false);
  const [shake, setShake] = useState<Record<string, number>>({});
  const [clean, setClean] = useState(false);

  useEffect(() => {
    say(speakable(lex.text));
  }, [lex.text]);

  const locked = done || filled;
  const shown = locked;

  const pick = (opt: string) => {
    if (locked || tried.includes(opt)) return;
    if (opt === puzzle.real) {
      sfx.play('pop');
      setFilled(true);
      setClean(tried.length === 0);
      report({ r: tried.length === 0 ? 1 : 0.5, cue: tried.length, note: tried.length === 0 ? undefined : <SpellNote lex={lex} /> });
      return;
    }
    buzz.nudge();
    setShake((m) => ({ ...m, [opt]: (m[opt] ?? 0) + 1 }));
    const next = [...tried, opt];
    setTried(next);
    if (next.length >= puzzle.options.length - 1) {
      // Both wrong pieces tried: show where the real one goes.
      setFilled(true);
      report({ r: 0, cue: next.length, note: <SpellNote lex={lex} /> });
    }
  };

  const size = lex.text.length > 11 ? 24 : lex.text.length > 8 ? 30 : 36;

  return (
    <View style={{ flex: 1, gap: 22 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18 }} accessible accessibilityLabel={shown ? lex.text : `${lex.text.length} letters, one piece missing`}>
        {puzzle.segs.map((seg, i) => {
          const isGap = i === puzzle.gap;
          const bg = puzzle.byBeat ? syl(i) : c.surface2;
          if (isGap && !shown)
            return (
              <View key={i} style={{ minWidth: Math.max(64, puzzle.real.length * size * 0.62), height: size * 1.9, borderRadius: radius.md, borderWidth: 3, borderStyle: 'dashed', borderColor: c.ink, backgroundColor: c.surface }} />
            );
          const tile = (
            <View style={{ height: size * 1.9, borderRadius: radius.md, backgroundColor: isGap ? c.mint : bg, borderWidth: isGap ? 3 : 0, borderColor: ON_BLOCK.ink, paddingHorizontal: size * 0.34, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font('b'), fontSize: size, letterSpacing: 0.6, color: puzzle.byBeat || isGap ? ON_BLOCK.ink : c.ink }}>{seg}</Text>
            </View>
          );
          return isGap ? <Pop key={i}>{tile}</Pop> : <View key={i}>{tile}</View>;
        })}
      </View>

      <Controls onReplay={() => say(speakable(lex.text))} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {puzzle.options.map((opt) => {
          const out = tried.includes(opt);
          const right = shown && opt === puzzle.real;
          return (
            <Wiggle key={opt} trigger={shake[opt] ?? 0} style={{ flex: 1 }}>
              <Tap
                onPress={() => pick(opt)}
                disabled={locked || out}
                accessibilityRole="button"
                accessibilityLabel={`Piece: ${opt.split('').join(' ')}`}
                accessibilityState={{ disabled: locked || out, selected: right }}
                style={{ height: 84, borderRadius: radius.lg, backgroundColor: right ? c.mint : c.surface, borderWidth: 2, borderColor: right ? ON_BLOCK.ink : c.line, borderBottomWidth: right || out ? 2 : 6, alignItems: 'center', justifyContent: 'center', opacity: out ? 0.35 : shown && !right ? 0.5 : 1 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font('b'), fontSize: 26, letterSpacing: 0.6, color: right ? ON_BLOCK.ink : c.ink, paddingHorizontal: 6 }}>
                  {opt}
                </Text>
              </Tap>
            </Wiggle>
          );
        })}
      </View>

      {shown && clean && (
        <Pop from={0.9} style={{ paddingHorizontal: 4 }}>
          <Why lex={lex} />
        </Pop>
      )}
    </View>
  );
}
