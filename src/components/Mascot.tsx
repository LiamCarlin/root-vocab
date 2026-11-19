import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useTheme } from '@/theme';
import { STILLS, type Pose } from './mascotStills';

/**
 * Root, the mascot, as a still picture. The pictures are the original character illustrations,
 * cut out of their sheets by tools/mascot/cut.py. Root never moves on its own: what changes is
 * which picture is on screen.
 */
export type { Pose } from './mascotStills';

/** Every pose there is a picture for. */
export const POSE_LIST = Object.keys(STILLS) as Pose[];

/** Width of a pose's layout box at a given height. */
export const poseWidth = (pose: Pose, height: number) => height * STILLS[pose].aspect;

/**
 * `size` is the height of a standing Root in points, feet to leaf tips. The layout box is
 * `poseWidth(pose, size)` × `size`: leaf tips touch its top and a standing Root's feet sit on its
 * bottom edge. Root is the same size in every pose, so a pose that is off the ground (`cheer`)
 * simply ends a little above the bottom. `flip` faces Root the other way.
 */
export function Mascot({ pose = 'wave', size = 120, style, a11y = 'Root', flip }: { pose?: Pose; size?: number; style?: StyleProp<ViewStyle>; a11y?: string; flip?: boolean }) {
  const s = STILLS[pose];
  const width = size * s.aspect;
  const pt = size / (s.stand * s.h); // points per picture pixel: the same for every pose
  return (
    <View style={[{ width, height: size }, style]} accessible accessibilityRole="image" accessibilityLabel={a11y}>
      <Image source={s.src} fadeDuration={0} style={[{ position: 'absolute', left: (width - s.w * pt) / 2, top: -s.top * s.h * pt, width: s.w * pt, height: s.h * pt }, flip ? { transform: [{ scaleX: -1 }] } : null]} />
    </View>
  );
}

/** Root's face in a coloured circle: for avatars, notifications and small spots. */
export function MascotBadge({ size = 48, tone = 'brand', pose = 'wave' }: { size?: number; tone?: 'brand' | 'orange' | 'pink' | 'mint' | 'butter' | 'lilac'; pose?: Pose }) {
  const { c } = useTheme();
  const s = STILLS[pose];
  // The circle shows the face and the start of the leaves: Root drawn about twice as tall as the circle.
  const pt = (size * 2.05) / (s.stand * s.h);
  const imgW = s.w * pt;
  const imgH = s.h * pt;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c[tone], overflow: 'hidden' }} accessible accessibilityRole="image" accessibilityLabel="Root">
      <Image source={s.src} fadeDuration={0} style={{ position: 'absolute', width: imgW, height: imgH, left: size / 2 - s.cx * imgW, top: size * 0.56 - s.face * imgH }} />
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
