import { useMemo } from 'react';
import { type TextStyle, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useStore } from '@/lib/store';
import { fonts, palettes, sylFill, textScales, trackSteps, type, type Colors, type ThemeName, type Variant, type Weight } from './tokens';

export * from './tokens';

export type Theme = {
  name: ThemeName;
  dark: boolean;
  c: Colors;
  font: (w: Weight) => string;
  /** Text style for a type variant, with the learner's size and spacing applied. */
  text: (v: Variant) => TextStyle;
  scale: number;
  reduceMotion: boolean;
  e1: ViewStyle;
  e2: ViewStyle;
  /** Fill for the nth syllable of a word: two shades that alternate. */
  syl: (i: number) => string;
};

export function useTheme(): Theme {
  const display = useStore((s) => s.display);
  const systemReduce = useReducedMotion();

  return useMemo(() => {
    // Light only for now: the dark palette has not been checked against the colour rules in tokens.ts.
    // The cream Paper background stays, as a reading aid.
    const name: ThemeName = display.theme === 'paper' ? 'paper' : 'light';
    const c = palettes[name];
    const dark = false; // light only for now
    const scale = textScales[display.size];
    const extraTrack = trackSteps[display.spacing];
    const font = (w: Weight) => fonts[display.font][w];
    const text = (v: Variant): TextStyle => {
      const t = type[v];
      return {
        fontFamily: font(t.w),
        fontSize: Math.round(t.size * scale * 10) / 10,
        lineHeight: Math.round(t.lh * scale + (extraTrack ? 2 : 0)),
        letterSpacing: t.track + extraTrack,
        ...(t.caps ? { textTransform: 'uppercase' } : null),
      };
    };
    return {
      name,
      dark,
      c,
      font,
      text,
      scale,
      reduceMotion: display.reduceMotion || systemReduce,
      // Flat: no drop shadows anywhere. Cards are told apart by their border and fill.
      e1: {},
      e2: {},
      syl: sylFill,
    };
  }, [display, systemReduce]);
}

/** Shrinks the big "Word" type so long terms still fit on one line. */
export function wordSize(text: string, max = 44, width = 320): number {
  const perChar = 0.66;
  return Math.max(24, Math.min(max, Math.floor(width / (Math.max(text.length, 4) * perChar))));
}
