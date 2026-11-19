import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Mascot, poseWidth, type Pose } from './Mascot';
import { STILLS } from './mascotStills';

// Root in the interface. Root is always a still picture; these are the three ways it is placed:
//
//   <Peek>    looking over an edge of a card
//   <Perch>   sitting (or standing) on the top edge of a card
//   <Figure>  the full Root, for openers, interstitials and end screens
//
// Nothing here moves. A picture fades in when its screen appears and that is all.
// Settings › Sound and feel › Show Root switches Peek and Perch off; a Figure stays, because
// the screens it is on are laid out around it.

/** True unless the learner has switched Root's appearances off. */
export const useShowRoot = () => useStore((s) => s.display.companion !== 'off');

/** Where things are in a pose's layout box, as fractions of its height (see Mascot). */
const SIT = STILLS.sit;
const SEAT: Partial<Record<Pose, number>> = { sit: (SIT.seat! - SIT.top) / SIT.stand, sleep: 0.97, read: 0.97 };
const FEET = 0.985;

function useEntering() {
  const { reduceMotion } = useTheme();
  return reduceMotion ? undefined : FadeIn.duration(260).delay(120);
}

// ── Peek ──────────────────────────────────────────────────────────────────
export type PeekProps = {
  /** The edge of the parent Root looks out from behind. */
  from?: 'top' | 'bottom' | 'left' | 'right';
  /** Defaults: `peek` from the top (hands on the edge), `hang` from the bottom (dangling), `wave` from the sides. */
  pose?: Pose;
  /** Root's full height in points. */
  size?: number;
  /** Where along the edge. */
  align?: 'start' | 'center' | 'end';
  /** Distance from the aligned corner. */
  inset?: number;
  /** How much of Root shows, 0..1, for poses other than `peek` and `hang`. */
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
export function Peek({ from = 'top', pose, size = 96, align = 'end', inset = 22, show, onPress, a11y }: PeekProps) {
  const on = useShowRoot();
  const entering = useEntering();
  if (!on && !onPress) return null;

  const p: Pose = pose ?? (from === 'top' ? 'peek' : from === 'bottom' ? 'hang' : 'wave');
  const w = poseWidth(p, size);
  const vertical = from === 'top' || from === 'bottom';
  const hanging = from === 'bottom' && p === 'hang';
  // Points of Root in view, measured away from the edge.
  const vis = from === 'top' && p === 'peek' ? size - 3 : hanging ? size * 0.97 : (vertical ? size : w) * (show ?? 0.62);

  const justify = align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';
  const outer: ViewStyle = vertical
    ? { position: 'absolute', left: 0, right: 0, height: vis, flexDirection: 'row', justifyContent: justify, paddingHorizontal: inset, ...(from === 'top' ? { bottom: '100%' } : { top: '100%' }) }
    : { position: 'absolute', top: 0, bottom: 0, width: vis, flexDirection: 'column', justifyContent: justify, paddingVertical: inset, ...(from === 'left' ? { right: '100%' } : { left: '100%' }) };
  const win: ViewStyle = vertical ? { width: w, height: vis, overflow: 'hidden' } : { width: vis, height: size, overflow: 'hidden' };
  // Where the full picture sits inside the window, so the right part of it is what shows.
  const place: ViewStyle =
    from === 'top'
      ? { position: 'absolute', left: 0, top: 0 }
      : from === 'bottom'
        ? { position: 'absolute', left: 0, top: hanging ? -size * 0.02 : -(size - vis), transform: hanging ? undefined : [{ rotate: '180deg' }] }
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
 * standing on it (any standing pose). Same parent rule as Peek: relative, not clipped.
 */
export function Perch({ pose = 'sit', size = 84, side = 'right', inset = 18, seat }: { pose?: Pose; size?: number; side?: 'left' | 'right'; inset?: number; seat?: number }) {
  const on = useShowRoot();
  const entering = useEntering();
  if (!on) return null;
  const w = poseWidth(pose, size);
  const seatAt = seat ?? SEAT[pose] ?? FEET;
  return (
    <Animated.View entering={entering} pointerEvents="none" style={[{ position: 'absolute', top: -size * seatAt, width: w, height: size }, side === 'left' ? { left: inset } : { right: inset }]}>
      <Mascot pose={pose} size={size} />
    </Animated.View>
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
