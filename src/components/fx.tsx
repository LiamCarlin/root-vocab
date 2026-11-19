import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme, type Colors, type Variant } from '@/theme';

// The effects kit: small, short pieces of motion that screens compose.
// Rules every piece follows:
//   · durations of 120–450 ms for anything that answers a touch, springs to settle
//   · nothing here loops loudly; the loops that exist (Float, Rays, FogVeil) are slow
//   · under reduce motion every piece shows its end state at once
// This file must not import ui.tsx or Mascot.tsx (they import from here).

type ColorKey = keyof Colors;
/** A theme colour key, or any CSS colour string (use `ON_BLOCK.ink` on colour blocks). */
export type FxColor = ColorKey | (string & {});
const resolve = (c: Colors, color: FxColor) => (c as unknown as Record<string, string>)[color] ?? color;

const FILL: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 };

// ── Confetti ──────────────────────────────────────────────────────────────
/** A short burst of paper bits from the upper middle of its parent. Plays once on mount; renders nothing under reduced motion. */
export function Confetti({ count = 26, height = 420 }: { count?: number; height?: number }) {
  const { c, reduceMotion } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(120, withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) })));
  }, [t]);
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
        return { dx: Math.cos(a) * (70 + ((i * 37) % 110)), up: 90 + ((i * 53) % 150), spin: (i % 2 ? 1 : -1) * (220 + ((i * 29) % 300)), w: 7 + (i % 4) * 2, color: [c.brand, c.orange, c.pink, c.mint, c.butter, c.lilac][i % 6], round: i % 3 === 0 };
      }),
    [count, c],
  );
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height, alignItems: 'center' }}>
      {bits.map((b, i) => (
        <Bit key={i} t={t} {...b} height={height} />
      ))}
    </View>
  );
}

function Bit({ t, dx, up, spin, w, color, round, height }: { t: SharedValue<number>; dx: number; up: number; spin: number; w: number; color: string; round: boolean; height: number }) {
  const st = useAnimatedStyle(() => {
    const p = t.value;
    const y = -up * Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5) + p * p * height * 0.85;
    return { opacity: p <= 0 ? 0 : p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25, transform: [{ translateX: dx * p }, { translateY: y }, { rotate: `${spin * p}deg` }] };
  });
  return <Animated.View style={[{ position: 'absolute', top: height * 0.32, width: w, height: round ? w : w * 1.7, borderRadius: round ? w / 2 : 2, backgroundColor: color }, st]} />;
}

// ── Burst ─────────────────────────────────────────────────────────────────
/**
 * A radial pop of sparks from the centre of its parent, once on mount.
 * Put it inside the thing that was just earned or tapped; `size` is how wide the sparks fly.
 * To fire it again, change its `key`.
 */
export function Burst({ size = 140, count = 10, delay = 0, colors }: { size?: number; count?: number; delay?: number; colors?: string[] }) {
  const { c, reduceMotion } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })));
  }, [t, delay]);
  const palette = colors ?? [c.orange, c.pink, c.brand, c.mint, c.butter];
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={[FILL, { alignItems: 'center', justifyContent: 'center' }]}>
      {Array.from({ length: count }, (_, i) => (
        <Spark key={i} t={t} angle={(i / count) * Math.PI * 2 + (i % 2) * 0.25} dist={(size / 2) * (0.68 + (i % 3) * 0.16)} w={6 + (i % 3) * 3} color={palette[i % palette.length]} round={i % 2 === 0} />
      ))}
    </View>
  );
}

function Spark({ t, angle, dist, w, color, round }: { t: SharedValue<number>; angle: number; dist: number; w: number; color: string; round: boolean }) {
  const st = useAnimatedStyle(() => {
    const p = t.value;
    return {
      opacity: p <= 0 ? 0 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45,
      transform: [{ translateX: Math.cos(angle) * dist * p }, { translateY: Math.sin(angle) * dist * p }, { rotate: `${p * 140}deg` }, { scale: 0.5 + Math.sin(p * Math.PI) * 0.9 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', width: w, height: w, borderRadius: round ? w / 2 : 2, backgroundColor: color }, st]} />;
}

// ── CountUp ───────────────────────────────────────────────────────────────
/** A number that counts from `from` to `to`. For gems, streaks, scores. */
export function CountUp({ to, from = 0, duration = 900, delay = 0, v = 'num', color = 'ink', prefix = '', suffix = '', style }: { to: number; from?: number; duration?: number; delay?: number; v?: Variant; color?: FxColor; prefix?: string; suffix?: string; style?: StyleProp<TextStyle> }) {
  const { c, text, reduceMotion } = useTheme();
  const [n, setN] = useState(from);
  const instant = reduceMotion || duration <= 0 || from === to;
  useEffect(() => {
    if (instant) return;
    let raf = 0;
    let start = 0;
    let stopped = false;
    const step = (now: number) => {
      if (stopped) return;
      if (!start) start = now;
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      stopped = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, from, duration, delay, instant]);
  return (
    <Text accessibilityLabel={`${prefix}${to}${suffix}`} style={[text(v), { color: resolve(c, color), fontVariant: ['tabular-nums'] }, style]}>
      {prefix}
      {instant ? to : n}
      {suffix}
    </Text>
  );
}

// ── Pop ───────────────────────────────────────────────────────────────────
/** Children scale in with a little overshoot. The standard entrance for anything earned. */
export function Pop({ children, delay = 0, from = 0.5, style }: { children: ReactNode; delay?: number; from?: number; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useTheme();
  const s = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      s.set(1);
      return;
    }
    s.set(withDelay(delay, withSpring(1, { damping: 9, stiffness: 170, mass: 0.7 })));
  }, [s, delay, reduceMotion]);
  const st = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, s.value * 2.4)), transform: [{ scale: from + (1 - from) * s.value }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// ── Float ─────────────────────────────────────────────────────────────────
/** A slow up-and-down drift, for islands, chests, anything that should feel weightless. */
export function Float({ children, amp = 6, period = 2600, style }: { children: ReactNode; amp?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useTheme();
  const t = useSharedValue(0.5);
  useEffect(() => {
    if (reduceMotion || amp === 0) {
      t.set(0.5);
      return;
    }
    t.set(0);
    t.set(withRepeat(withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [t, amp, period, reduceMotion]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: (t.value - 0.5) * 2 * amp }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// ── Wiggle ────────────────────────────────────────────────────────────────
/** Shakes its children once each time `trigger` changes to a new non-zero number. For "not quite" and "tap me". */
export function Wiggle({ children, trigger, style }: { children: ReactNode; trigger: number; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    if (!trigger || reduceMotion) return;
    r.set(withSequence(withTiming(-7, { duration: 60 }), withTiming(7, { duration: 90 }), withTiming(-5, { duration: 80 }), withTiming(4, { duration: 70 }), withTiming(0, { duration: 60 })));
  }, [trigger, reduceMotion, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// ── Pulse ─────────────────────────────────────────────────────────────────
/** A gentle breathing scale while `on`. For the one thing on screen that is waiting to be tapped. */
export function Pulse({ children, on, style }: { children: ReactNode; on: boolean; style?: StyleProp<ViewStyle> }) {
  const { reduceMotion } = useTheme();
  const s = useSharedValue(0);
  useEffect(() => {
    if (!on || reduceMotion) {
      s.set(withTiming(0, { duration: 160 }));
      return;
    }
    s.set(withRepeat(withTiming(1, { duration: 760, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(s);
  }, [on, reduceMotion, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + s.value * 0.055 }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// ── Shine ─────────────────────────────────────────────────────────────────
/** A highlight that sweeps across its parent every `period` ms. Absolute fill: the parent decides the shape (give it `overflow: 'hidden'`). */
export function Shine({ period = 3200, delay = 500, color = 'rgba(255,255,255,0.4)', round = 0 }: { period?: number; delay?: number; color?: string; round?: number }) {
  const { reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || !w) return;
    t.set(0);
    t.set(withDelay(delay, withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), withDelay(Math.max(0, period - 850), withTiming(1, { duration: 0 }))), -1, false)));
    return () => cancelAnimation(t);
  }, [reduceMotion, w, period, delay, t]);
  const band = Math.max(36, w * 0.22);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -band * 2 + t.value * (w + band * 4) }, { rotate: '18deg' }] }));
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[FILL, { overflow: 'hidden', borderRadius: round }]}>
      {w > 0 && <Animated.View style={[{ position: 'absolute', top: '-50%', left: 0, width: band, height: '200%', backgroundColor: color }, st]} />}
    </View>
  );
}

// ── Rays ──────────────────────────────────────────────────────────────────
/** A slow-turning sunburst, centred in its parent. Put it first inside the box that holds a reward. */
export function Rays({ size = 320, color = 'rgba(255,255,255,0.34)', count = 12, period = 18000 }: { size?: number; color?: string; count?: number; period?: number }) {
  const { reduceMotion } = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    r.set(0);
    r.set(withRepeat(withTiming(360, { duration: period, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(r);
  }, [reduceMotion, period, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const d = useMemo(() => {
    const step = (Math.PI * 2) / count;
    let out = '';
    for (let i = 0; i < count; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.5;
      out += `M0 0 L${(Math.cos(a0) * 50).toFixed(2)} ${(Math.sin(a0) * 50).toFixed(2)} A50 50 0 0 1 ${(Math.cos(a1) * 50).toFixed(2)} ${(Math.sin(a1) * 50).toFixed(2)} Z `;
    }
    return out;
  }, [count]);
  return (
    <View pointerEvents="none" style={[FILL, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[{ width: size, height: size }, st]}>
        <Svg width={size} height={size} viewBox="-50 -50 100 100">
          <Path d={d} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── FogVeil ───────────────────────────────────────────────────────────────
const BLOBS = [
  { x: -8, y: 6, w: 78, drift: 22, o: 0.95 },
  { x: 30, y: -6, w: 84, drift: -18, o: 0.9 },
  { x: 8, y: 34, w: 96, drift: 14, o: 1 },
  { x: -14, y: 58, w: 80, drift: -24, o: 0.9 },
  { x: 36, y: 62, w: 76, drift: 20, o: 0.95 },
  { x: 10, y: 14, w: 88, drift: -10, o: 0.85 },
];

/**
 * The Hush: soft fog drifting over whatever is behind it. `amount` 1 hides it, 0 is clear;
 * changing `amount` dissolves the fog over about a second. Absolute fill of its parent, and it
 * spills a little past the edges on purpose. `color` should be the colour of the surface behind
 * (the canvas by default; pass the block colour when it sits on a colour block).
 */
export function FogVeil({ amount, color, duration = 1400 }: { amount: number; color?: string; duration?: number }) {
  const { c, reduceMotion } = useTheme();
  const a = useSharedValue(Math.max(0, Math.min(1, amount)));
  const drift = useSharedValue(0.5);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  useEffect(() => {
    a.set(withTiming(Math.max(0, Math.min(1, amount)), { duration: reduceMotion ? 0 : duration, easing: Easing.inOut(Easing.quad) }));
  }, [amount, duration, reduceMotion, a]);
  useEffect(() => {
    if (reduceMotion) return;
    drift.set(0);
    drift.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(drift);
  }, [reduceMotion, drift]);
  const st = useAnimatedStyle(() => ({ opacity: a.value }));
  const fog = color ?? c.canvas;
  return (
    <Animated.View pointerEvents="none" style={[FILL, st]}>
      {BLOBS.map((b, i) => (
        <FogBlob key={i} drift={drift} range={b.drift} x={b.x} y={b.y} w={b.w} o={b.o} color={fog} gid={`fog${id}${i}`} />
      ))}
    </Animated.View>
  );
}

function FogBlob({ drift, range, x, y, w, o, color, gid }: { drift: SharedValue<number>; range: number; x: number; y: number; w: number; o: number; color: string; gid: string }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: (drift.value - 0.5) * range }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${w}%`, aspectRatio: 1.5 }, st]}>
      <Svg width="100%" height="100%" viewBox="0 0 150 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={o} />
            <Stop offset="0.55" stopColor={color} stopOpacity={o * 0.82} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={75} cy={50} rx={75} ry={50} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

// ── Typer ─────────────────────────────────────────────────────────────────
/**
 * Reveals a line word by word, the way Root says it. The full line always holds its space, so
 * nothing below it moves. Under reduce motion the whole line is there at once.
 * `onDone` fires when the last word is in. Change `text` (or the `key`) to start again.
 */
export function Typer({ text, v = 'body', color = 'ink', speed = 85, delay = 0, onDone, center, style }: { text: string; v?: Variant; color?: FxColor; speed?: number; delay?: number; onDone?: () => void; center?: boolean; style?: StyleProp<TextStyle> }) {
  const { c, text: textStyle, reduceMotion } = useTheme();
  const words = useMemo(() => text.split(' '), [text]);
  const [st, setSt] = useState({ of: text, n: 0 });
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (reduceMotion) {
      done.current?.();
      return;
    }
    let i = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      id = setInterval(() => {
        i += 1;
        setSt({ of: text, n: i });
        if (i >= words.length) {
          clearInterval(id);
          done.current?.();
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      if (id) clearInterval(id);
    };
  }, [text, words, speed, delay, reduceMotion]);
  const n = reduceMotion ? words.length : st.of === text ? st.n : 0;
  const col = resolve(c, color);
  return (
    <Text accessibilityLabel={text} style={[textStyle(v), { color: col }, center && { textAlign: 'center' }, style]}>
      {words.slice(0, n).join(' ')}
      {n < words.length && <Text style={{ color: 'transparent' }}>{(n > 0 ? ' ' : '') + words.slice(n).join(' ')}</Text>}
    </Text>
  );
}
