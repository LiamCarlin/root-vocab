import { useMemo } from 'react';
import { useColorScheme, type TextStyle, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useStore } from '@/lib/store';
import { SYLLABLE_TONES, fonts, palettes, textScales, trackSteps, type, type BlockTone, type Colors, type ThemeName, type Variant, type Weight } from './tokens';

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
  /** Block colour for the nth syllable of a word. */
  syl: (i: number) => string;
};

export function useTheme(): Theme {
  const display = useStore((s) => s.display);
  const system = useColorScheme();
  const systemReduce = useReducedMotion();

  return useMemo(() => {
    const name: ThemeName = display.theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : display.theme;
    const c = palettes[name];
    const dark = name === 'dark';
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
      e1: { boxShadow: dark ? '0px 2px 10px rgba(0,0,0,0.35)' : '0px 4px 14px rgba(20,23,40,0.05)' },
      e2: { boxShadow: dark ? '0px 14px 34px rgba(0,0,0,0.6)' : '0px 14px 34px rgba(20,23,40,0.14)' },
      syl: (i: number) => c[SYLLABLE_TONES[i % SYLLABLE_TONES.length] as BlockTone],
    };
  }, [display, system, systemReduce]);
}

/** Shrinks the big "Word" type so long terms still fit on one line. */
export function wordSize(text: string, max = 44, width = 320): number {
  const perChar = 0.66;
  return Math.max(24, Math.min(max, Math.floor(width / (Math.max(text.length, 4) * perChar))));
}
