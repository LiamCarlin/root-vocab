import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { buzz } from '@/lib/audio';
import { buddy } from '@/lib/buddy';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { CLIPS, UNIT, type ClipId } from './mascotClips';
import { Sprite } from './Sprite';

/**
 * Root, the mascot: a rigged 3D character animated in Blender (tools/mascot) and played here
 * as frame-by-frame clips. Every pose is a living loop: Root breathes, blinks, shifts its
 * weight, swings its arms, walks with real steps. Feedback in the app is carried by what
 * Root does first, words second.
 *
 * Loops:  idle wave cheer think listen thumbs sleep point read write peek sit hang gasp oops
 *         laugh love proud wink dance flex cover search idea trophy walk run water lantern
 * Once:   jump · yes (a happy hop for a right answer) · no (a gentle head shake that ends in
 *         a smile) · hello (runs in, skids, waves). A once clip plays through, calls `onEnd`,
 *         then carries on as `then` (default `idle`).
 */
export type Pose = ClipId;

/** Kept for layout maths: `src` is the pose's still picture, `w` / `h` its layout box. Prefer `poseWidth`. */
export const POSES = Object.fromEntries((Object.keys(CLIPS) as Pose[]).map((p) => [p, { src: CLIPS[p].still, w: Math.round(CLIPS[p].aspect * 1000), h: 1000 }])) as Record<Pose, { src: number; w: number; h: number }>;

/** Width of a pose's layout box at a given height. */
export const poseWidth = (pose: Pose, height: number) => height * CLIPS[pose].aspect;

/**
 * Extra movement on top of the clip. The clips already move, so the default is none:
 * `hop`, `jump` and `shake` are accents for a still-standing pose. `bob` and `sway` are
 * accepted for older call sites and do nothing.
 */
export type Motion = 'bob' | 'hop' | 'jump' | 'sway' | 'shake' | 'none';

/** Clips that leave the ground or travel by themselves: an extra hop on top would fight them. */
const AIRBORNE: Partial<Record<Pose, true>> = { cheer: true, jump: true, yes: true, trophy: true, idea: true, dance: true, hello: true, run: true, walk: true, write: true, hang: true };
const POKE_POSES: Pose[] = ['laugh', 'wink', 'love', 'gasp'];
let pokes = 0;

/**
 * `size` is the height of a standing Root in points, feet to leaf tips. The layout box is
 * `poseWidth(pose, size)` × `size` and never changes with the frame: feet sit on its bottom
 * edge, leaf tips touch its top, and anything bigger (a jump, a raised arm, a trophy) draws
 * outside it without moving the layout. Three poses anchor differently: `peek` (box bottom =
 * the ledge its hands rest on, so put that on the edge of a card), `sit` (box bottom = the
 * soles of its dangling feet; the seat line is `CLIPS.sit.seat`) and `hang` (box top = its fists).
 *
 * `still` (and reduce motion) shows one held frame. `flip` faces Root left. Give it `onPress`
 * or `poke` and it can be tapped: it laughs, winks or gasps for a moment, ticks the haptics and
 * counts the poke. Do not put a tappable Root inside another pressable.
 */
export function Mascot({ pose = 'wave', size = 120, still, style, motion, onPress, poke, a11y = 'Root', flip, then = 'idle', onEnd }: { pose?: Pose; size?: number; still?: boolean; style?: StyleProp<ViewStyle>; motion?: Motion; onPress?: () => void; poke?: boolean; a11y?: string; flip?: boolean; then?: Pose; onEnd?: () => void }) {
  const { reduceMotion } = useTheme();
  const [flash, setFlash] = useState<Pose | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A once clip that has played through hands over to `then`. A new `pose` starts afresh.
  const [ended, setEnded] = useState<Pose | null>(null);
  const [seen, setSeen] = useState(pose);
  if (seen !== pose) {
    setSeen(pose);
    setEnded(null);
  }
  const want: Pose = flash ?? (ended === pose ? then : pose);
  // The clip on screen stays until the next one's sheet has loaded, so a swap never flashes empty.
  const [shown, setShown] = useState<Pose>(want);
  const pending = want !== shown ? want : null;
  useEffect(() => {
    if (!pending) return;
    const late = setTimeout(() => setShown(pending), 450);
    return () => clearTimeout(late);
  }, [pending]);

  const frozen = reduceMotion || !!still;
  const base = CLIPS[pose];
  const width = size * base.aspect;
  const pt = size / (base.stand * base.fh); // points per sheet pixel: the same for every clip, so Root never changes size

  const hop = useSharedValue(0);
  const sq = useSharedValue(1);
  const sx = useSharedValue(0);
  const accent = frozen || AIRBORNE[shown] ? 'none' : (motion ?? 'none');

  useEffect(() => {
    if (frozen) {
      for (const v of [hop, sx]) {
        cancelAnimation(v);
        v.set(0);
      }
      cancelAnimation(sq);
      sq.set(1);
      return;
    }
    if (accent === 'jump') {
      hop.set(withRepeat(withSequence(withTiming(0, { duration: 120 }), withTiming(-size * 0.2, { duration: 220, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: 460 })), 3, false));
      sq.set(withRepeat(withSequence(withTiming(0.9, { duration: 120 }), withTiming(1.07, { duration: 220 }), withTiming(1.02, { duration: 200 }), withTiming(0.9, { duration: 80 }), withTiming(1, { duration: 380, easing: Easing.out(Easing.back(2.2)) })), 3, false));
    } else if (accent === 'shake') {
      sx.set(withSequence(withTiming(-size * 0.05, { duration: 55 }), withTiming(size * 0.05, { duration: 80 }), withTiming(-size * 0.035, { duration: 70 }), withTiming(size * 0.02, { duration: 60 }), withTiming(0, { duration: 60 })));
    } else {
      if (accent === 'hop') hop.set(withSequence(withTiming(-size * 0.1, { duration: 150, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 11, stiffness: 190 })));
      // a quick squash covers the cut from one clip to the next
      sq.set(withSequence(withTiming(0.95, { duration: 60 }), withSpring(1, { damping: 9, stiffness: 240 })));
    }
    return () => {
      cancelAnimation(hop);
      cancelAnimation(sq);
      cancelAnimation(sx);
    };
  }, [frozen, shown, accent, size, hop, sq, sx]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: sx.value }, { translateY: hop.value }, { scaleX: 1 + (1 - sq.value) * 0.6 }, { scaleY: sq.value }],
  }));

  const finished = useCallback(() => {
    setEnded(pose);
    onEnd?.();
  }, [pose, onEnd]);

  /** Where a clip's frame goes so that its baseline is the box bottom and it is centred. */
  const place = (p: Pose) => {
    const c = CLIPS[p];
    // `hang` is pinned by its fists (the top); everything else by its feet, seat or ledge (the bottom).
    const top = p === 'hang' ? -c.top * c.fh * pt : size - c.base * c.fh * pt;
    return { position: 'absolute' as const, left: (width - c.fw * pt) / 2, top };
  };

  const cur = CLIPS[shown];
  const body = (
    <Animated.View style={[{ width, height: size, transformOrigin: '50% 100%' }, anim]}>
      <View style={[{ width, height: size }, flip ? { transform: [{ scaleX: -1 }] } : null]}>
        {frozen ? (
          <Image source={cur.still} fadeDuration={0} style={[place(shown), { width: cur.fw * pt, height: cur.fh * pt }]} />
        ) : (
          <>
            <Sprite key={shown} clip={cur} height={cur.fh * pt} onEnd={shown === pose && !cur.loop ? finished : undefined} style={place(shown)} />
            {pending && <Sprite key={`next-${pending}`} clip={CLIPS[pending]} height={CLIPS[pending].fh * pt} playing={false} onLoad={() => setShown(pending)} style={[place(pending), { opacity: 0 }]} />}
          </>
        )}
      </View>
    </Animated.View>
  );

  if (!onPress && !poke) {
    return (
      <View style={[{ width, height: size }, style]} accessible accessibilityRole="image" accessibilityLabel={a11y}>
        {body}
      </View>
    );
  }

  const onPoke = () => {
    buzz.tap();
    sfx.play('pop');
    (useStore.getState() as { bump?: (counter: string, by?: number) => void }).bump?.('pokes');
    buddy.react('poke');
    pokes += 1;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(POKE_POSES[pokes % POKE_POSES.length]);
    flashTimer.current = setTimeout(() => setFlash(null), 1300);
    onPress?.();
  };
  return (
    <Pressable onPress={onPoke} hitSlop={6} style={[{ width, height: size }, style]} accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint="Tap to say hello">
      {body}
    </Pressable>
  );
}

/** Root's face in a coloured circle: for avatars, notifications and small spots. */
export function MascotBadge({ size = 48, tone = 'brand', pose = 'wave' }: { size?: number; tone?: 'brand' | 'orange' | 'pink' | 'mint' | 'butter' | 'lilac'; pose?: Pose }) {
  const { c } = useTheme();
  const clip = CLIPS[pose];
  const perUnit = size / 2.0; // the circle shows about two units of Root: the face and the start of the leaves
  const imgW = (clip.fw / UNIT) * perUnit;
  const imgH = (clip.fh / UNIT) * perUnit;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c[tone], overflow: 'hidden' }} accessible accessibilityRole="image" accessibilityLabel="Root">
      <Image source={clip.still} fadeDuration={0} style={{ position: 'absolute', width: imgW, height: imgH, left: (size - imgW) / 2, top: size * 0.56 - clip.face * imgH }} />
    </View>
  );
}

/** A word's growth: seed → sprout → leafy → a full root. */
export function Growth({ stage, size = 38 }: { stage: 0 | 1 | 2 | 3; size?: number }) {
  const { c } = useTheme();
  const g = '#45B649';
  const bg = stage === 0 ? c.surface2 : stage === 3 ? c.peach : c.mintTint;
  const label = ['Waiting', 'Sprouting', 'Growing', 'Rooted'][stage];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
        {stage === 0 && <Ellipse cx={12} cy={14} rx={5} ry={3.6} fill={c.ink3} transform="rotate(-18 12 14)" />}
        {stage === 1 && (
          <>
            <Path d="M12 22 V12" stroke={g} strokeWidth={2.6} strokeLinecap="round" />
            <Path d="M12 13 C6.5 13 3.5 10 3.5 5.5 C9 5.5 12 8.5 12 13 Z" fill={g} />
          </>
        )}
        {stage === 2 && (
          <>
            <Path d="M12 22 V9" stroke={g} strokeWidth={2.6} strokeLinecap="round" />
            <Path d="M12 15 C6.5 15 3 12 3 7.5 C8.5 7.5 12 10.5 12 15 Z" fill={g} />
            <Path d="M12 11 C17.5 11 21 8 21 3.5 C15.5 3.5 12 6.5 12 11 Z" fill={g} opacity={0.85} />
          </>
        )}
        {stage === 3 && (
          <>
            <Path d="M12 9 C9 5 6 4.5 4.5 2.5 C8 1.5 11 3.5 12 8 Z" fill={g} />
            <Path d="M12 9 C12 4.5 13 2.5 12 0.8 C14.5 2 14.5 6 12 9 Z" fill={g} opacity={0.9} />
            <Path d="M12 9 C15 5 18 4.5 19.5 2.5 C16 1.5 13 3.5 12 8 Z" fill={g} opacity={0.82} />
            <Path d="M12 23 C8 20 5.5 16 5.5 12.5 C5.5 9.5 8.3 8 12 8 C15.7 8 18.5 9.5 18.5 12.5 C18.5 16 16 20 12 23 Z" fill="#F7953A" />
            <Circle cx={9.6} cy={13} r={1.1} fill="#0E0E13" />
            <Circle cx={14.4} cy={13} r={1.1} fill="#0E0E13" />
          </>
        )}
      </Svg>
    </View>
  );
}

// Confetti lives with the other effects now; re-exported so older imports keep working.
export { Confetti } from './fx';
