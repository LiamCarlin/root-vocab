import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Tap, Txt } from '@/components/ui';
import { radius, sylFill, useTheme } from '@/theme';

// Shared by the hands-on pads (trace, marble run, sand tray, tap and sweep, echo).
//
// Every pad is the same object: one rounded surface that takes the touch, the word across its
// top with a colour under each beat, and one short line beneath that says what to do right now.
// Nothing on a pad moves unless the learner moves it.

export const PAD_RADIUS = radius.xl;
/** The dark board the marble rolls on. The same in every theme, like the colour blocks. */
export const BOARD = { bg: '#14141B', groove: '#262631', rim: '#363644', lit: '#5C5C70', ink: '#FFFFFF', dim: 'rgba(255,255,255,0.42)' } as const;
/** The sand tray: warm, matt, the same in every theme. */
export const SAND = { bg: '#E8D5AE', deep: '#C6A873', light: '#F6EAD0', rim: '#B8996A', grain: '#B59A6A', ink: '#4A3B22' } as const;

/**
 * The whole word, small, across the top of a pad. A beat takes its colour once it is finished;
 * the one being worked on is underlined in ink; the rest wait in grey.
 */
export function WordStrip({ parts, text, cur, done, dark }: { parts: string[]; text: string; /** The beat being worked on. */ cur: number; /** Beats before this index are finished. */ done: number; dark?: boolean }) {
  const { c, font } = useTheme();
  // Where a space falls between beats ("ice cream"), so the strip reads like the word.
  const gaps: boolean[] = [];
  let pos = 0;
  parts.forEach((p) => {
    let space = false;
    while (text[pos] === ' ') {
      pos++;
      space = true;
    }
    gaps.push(space);
    pos += p.length;
  });
  const size = parts.join('').length > 11 ? 17 : 21;
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }} accessible accessibilityLabel={`${text}. Beat ${Math.min(cur + 1, parts.length)} of ${parts.length}.`}>
      {parts.map((p, i) => {
        const finished = i < done;
        const now = i === cur && !finished;
        const ink = dark ? BOARD.ink : c.ink;
        const wait = dark ? BOARD.dim : c.ink3;
        return (
          <View key={i} style={{ marginLeft: gaps[i] ? 8 : 0 }}>
            <Text style={{ fontFamily: font(finished || now ? 'b' : 's'), fontSize: size, lineHeight: size * 1.3, letterSpacing: 0.6, color: finished || now ? ink : wait }}>{p}</Text>
            <View style={{ height: 4, borderRadius: 2, marginHorizontal: 1, backgroundColor: finished ? sylFill(i) : now ? ink : 'transparent' }} />
          </View>
        );
      })}
    </View>
  );
}

/** One line under a pad: what to do right now. An icon and a handful of words. */
export function Coach({ icon: Icon, text, tone = 'plain' }: { icon: LucideIcon; text: string; tone?: 'plain' | 'good' | 'warn' }) {
  const { c } = useTheme();
  // A line to read, so its icon sits bare: a filled circle would make it look like a button.
  // Green only when the move is done; yellow ("look here") when the finger has left the letter.
  const ink = tone === 'good' ? c.success : tone === 'warn' ? c.warn : c.ink2;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 }} accessibilityLiveRegion="polite">
      <Icon size={20} color={ink} strokeWidth={2.4} />
      <Txt v="bodyS" color="ink2" style={{ flex: 1 }} numberOfLines={2}>
        {text}
      </Txt>
    </View>
  );
}

/** A segmented control: one row, a few choices, each an icon with a word under it. The chosen one is filled in ink. */
export function Segmented<T extends string>({ options, value, onChange, a11y }: { options: { id: T; icon: LucideIcon; label: string; a11y: string }[]; value: T; onChange: (id: T) => void; a11y: string }) {
  const { c, font } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 22, padding: 4, gap: 4 }} accessibilityRole="radiogroup" accessibilityLabel={a11y}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Tap key={o.id} onPress={() => onChange(o.id)} scaleTo={0.97} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.a11y} style={{ flex: 1, height: 52, borderRadius: 18, backgroundColor: on ? c.ink : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <o.icon size={18} color={on ? c.onInk : c.ink2} strokeWidth={2.4} />
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: font('s'), fontSize: 15, color: on ? c.onInk : c.ink2 }}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}
