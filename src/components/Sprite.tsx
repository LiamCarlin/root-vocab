import { useCallback, useEffect, useRef } from 'react';
import { Image, PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { Clip } from './mascotClips';

/**
 * Plays one animation clip from its sprite sheet.
 *
 * The sheet sits inside a window one frame big and is slid one frame at a time. The frame
 * number is a shared value driven by a linear timing on the UI thread, so there are no
 * JavaScript timers and nothing re-renders while it plays.
 *
 * `height` is the height of one whole frame in points (not of Root: frames have headroom).
 * Not playing = the clip's hold frame. A clip that does not loop calls `onEnd` once and
 * stays on its last frame.
 */
export function Sprite({ clip, height, playing = true, onEnd, onLoad, style }: { clip: Clip; height: number; playing?: boolean; onEnd?: () => void; onLoad?: () => void; style?: StyleProp<ViewStyle> }) {
  const { frames, cols, rows, fps, loop, hold } = clip;
  // Whole device pixels, so a neighbouring frame can never bleed in at the edge.
  const h = PixelRatio.roundToNearestPixel(height);
  const w = PixelRatio.roundToNearestPixel((height * clip.fw) / clip.fh);
  const t = useSharedValue(hold);

  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  }, [onEnd]);
  const finished = useCallback(() => end.current?.(), []);

  useEffect(() => {
    if (!playing) {
      cancelAnimation(t);
      t.set(hold);
      return;
    }
    const duration = (frames / fps) * 1000;
    t.set(0);
    if (loop) t.set(withRepeat(withTiming(frames, { duration, easing: Easing.linear }), -1, false));
    else
      t.set(
        withTiming(frames - 0.01, { duration, easing: Easing.linear }, (done) => {
          if (done) runOnJS(finished)();
        }),
      );
    return () => cancelAnimation(t);
  }, [playing, frames, fps, loop, hold, t, finished]);

  const slide = useAnimatedStyle(() => {
    const f = Math.min(frames - 1, Math.max(0, Math.floor(t.value)));
    return { transform: [{ translateX: -(f % cols) * w }, { translateY: -Math.floor(f / cols) * h }] };
  });

  return (
    <View pointerEvents="none" style={[{ width: w, height: h, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ width: w * cols, height: h * rows }, slide]}>
        <Image source={clip.src} onLoad={onLoad} fadeDuration={0} style={{ width: w * cols, height: h * rows }} />
      </Animated.View>
    </View>
  );
}
