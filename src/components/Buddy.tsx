import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useBuddyEvent } from '@/lib/buddy';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Mascot, poseWidth, type Pose } from './Mascot';
import { STILLS } from './mascotStills';

// Root in the interface. Root is always a still picture; these are the ways it is placed:
//
//   <Peek>       looking over an edge of a card, hands on the edge
//   <Perch>      sitting (or standing) on the top edge of a card
//   <Figure>     the full Root, for openers, interstitials and end screens
//   <Companion>  standing in the corner of a lesson step or an exercise: it shows what Root is doing
//                alongside the learner (listening, tapping, writing), and its picture changes
//                for a moment when an answer lands: pleased when it is right, a wince and
//                then straight back when it is not
//
// Nothing here moves. A picture fades in, or is swapped for another, and that is all.
// Settings › Sound and feel › Show Root switches Peek, Perch and Companion off; a Figure
// stays, because the screens it is on are laid out around it.

/** True unless the learner has switched Root's appearances off. */
export const useShowRoot = () => useStore((s) => s.display.companion !== 'off');

/** Where a standing Root's soles are in its layout box, as a fraction of its height. */
const FEET = 0.985;
/** How far down a `peek` Root's hands reach, as a fraction of its height: that much shows above an edge. */
const PEEK_SHOWS = 0.56;

function useEntering() {
  const { reduceMotion } = useTheme();
  return reduceMotion ? undefined : FadeIn.duration(260).delay(120);
}

// ── Peek ──────────────────────────────────────────────────────────────────
export type PeekProps = {
  /** The edge of the parent Root looks out from behind. */
  from?: 'top' | 'left' | 'right';
  /** From the top the default is `peek`: both hands up, as if resting on the edge. */
  pose?: Pose;
  /** Root's full height in points. Only part of it shows. */
  size?: number;
  /** Where along the edge. */
  align?: 'start' | 'center' | 'end';
  /** Distance from the aligned corner. */
  inset?: number;
  /** How much of Root shows, 0..1: from the leaf tips down (from the top), or from one side in. */
  show?: number;
  /** Makes the picture a button (used where Root is covering something and a tap uncovers it). */
  onPress?: () => void;
  a11y?: string;
};

/**
 * Root looking out from behind one edge of its parent. The parent must be `position: 'relative'`
 * with visible overflow, so wrap a `Block` (which clips) in a plain `View` and put the Peek
 * beside the Block, not inside it. Nothing is laid out: the Peek takes no space.
 */
export function Peek({ from = 'top', pose, size = 170, align = 'end', inset = 22, show, onPress, a11y }: PeekProps) {
  const on = useShowRoot();
  const entering = useEntering();
  if (!on && !onPress) return null;

  const p: Pose = pose ?? (from === 'top' ? 'peek' : 'wave');
  const w = poseWidth(p, size);
  const vertical = from === 'top';
  // Points of Root in view, measured away from the edge.
  const vis = (vertical ? size : w) * (show ?? (vertical ? PEEK_SHOWS : 0.62));

  const justify = align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';
  const outer: ViewStyle = vertical
    ? { position: 'absolute', left: 0, right: 0, height: vis, flexDirection: 'row', justifyContent: justify, paddingHorizontal: inset, bottom: '100%' }
    : { position: 'absolute', top: 0, bottom: 0, width: vis, flexDirection: 'column', justifyContent: justify, paddingVertical: inset, ...(from === 'left' ? { right: '100%' } : { left: '100%' }) };
  // The window clips at the parent's edge only: a raised hand may reach past the layout box sideways.
  const win: ViewStyle = vertical ? { width: w * 1.5, marginHorizontal: -w * 0.25, height: vis, overflow: 'hidden', alignItems: 'center' } : { width: vis, height: size, overflow: 'hidden' };
  // Where the full picture sits inside the window, so the right part of it is what shows.
  const place: ViewStyle =
    from === 'top'
      ? { position: 'absolute', top: 0 }
      : from === 'left'
        ? { position: 'absolute', left: 0, top: 0, transformOrigin: '100% 100%', transform: [{ rotate: '-10deg' }] }
        : { position: 'absolute', left: vis - w, top: 0, transformOrigin: '0% 100%', transform: [{ rotate: '10deg' }] };

  const picture = <Mascot pose={p} size={size} a11y={a11y} />;
  return (
    <View pointerEvents="box-none" style={outer}>
      <Animated.View entering={entering} pointerEvents="box-none" style={win}>
        <View style={[place, { width: w, height: size }]}>
          {onPress ? (
            <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? 'Root'}>
              {picture}
            </Pressable>
          ) : (
            picture
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ── Perch ─────────────────────────────────────────────────────────────────
/**
 * Root sitting on the top edge of its parent with its legs over the front (pose `sit`), or
 * standing on it (any other pose). Same parent rule as Peek: relative, not clipped.
 */
export function Perch({ pose = 'sit', size = 84, side = 'right', inset = 18 }: { pose?: Pose; size?: number; side?: 'left' | 'right'; inset?: number }) {
  const on = useShowRoot();
  const entering = useEntering();
  if (!on) return null;
  const s = STILLS[pose];
  const w = poseWidth(pose, size);
  // How far down the layout box the edge of the card is: the seat for a sitting Root, the soles for a standing one.
  const rests = s.seat !== undefined ? (s.seat - (s.base - s.stand)) / s.stand : FEET;
  return (
    <Animated.View entering={entering} pointerEvents="none" style={[{ position: 'absolute', top: -size * rests, width: w, height: size }, side === 'left' ? { left: inset } : { right: inset }]}>
      <Mascot pose={pose} size={size} />
    </Animated.View>
  );
}

// ── Companion ─────────────────────────────────────────────────────────────
const PLEASED: Pose[] = ['thumbs', 'cheer', 'laugh', 'proud', 'love'];
let turn = 0;

/**
 * Root alongside the learner in a lesson step or an exercise: a small whole figure standing in
 * the corner. `pose` is what Root is doing right now (listening, tapping, writing). When an
 * answer lands the picture changes for a moment (pleased, or a wince) and then goes back.
 * It takes no touches. The caller places it; its bottom edge is the ground Root stands on.
 */
export function Companion({ pose, size = 84, style }: { pose: Pose; size?: number; style?: StyleProp<ViewStyle> }) {
  const on = useShowRoot();
  const { reduceMotion } = useTheme();
  const [mood, setMood] = useState<Pose | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useBuddyEvent((e) => {
    if (timer.current) clearTimeout(timer.current);
    setMood(e === 'wrong' ? 'oops' : e === 'win' ? 'cheer' : PLEASED[turn++ % PLEASED.length]);
    timer.current = setTimeout(() => setMood(null), e === 'wrong' ? 1300 : 1700);
  });
  if (!on) return null;
  const p = mood ?? pose;
  // The box keeps one width whatever the pose, so nothing beside Root shifts when the picture changes.
  return (
    <View pointerEvents="none" style={[{ width: size * 0.74, height: size, alignItems: 'center' }, style]}>
      <Animated.View key={p} entering={reduceMotion ? undefined : FadeIn.duration(140)}>
        <Mascot pose={p} size={size} />
      </Animated.View>
    </View>
  );
}

// ── Figure ────────────────────────────────────────────────────────────────
/** The full Root for openers, interstitials and end screens. It fades in with its screen. */
export function Figure({ pose, size = 160, delay = 0, style, flip }: { pose: Pose; size?: number; delay?: number; style?: StyleProp<ViewStyle>; flip?: boolean }) {
  const { reduceMotion } = useTheme();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(320).delay(delay)} style={style}>
      <Mascot pose={pose} size={size} flip={flip} />
    </Animated.View>
  );
}
