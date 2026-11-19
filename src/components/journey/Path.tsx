import { Check, Flag, Lock, PenLine, Play, Search, Zap } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path as Line } from 'react-native-svg';

import { Mascot, poseWidth } from '@/components/Mascot';
import { Pulse, Wiggle } from '@/components/fx';
import { LIP } from '@/components/rewards';
import { Rise, Tap, Txt } from '@/components/ui';
import { PROPS } from '@/data/story';
import { buzz } from '@/lib/audio';
import type { Stop, StopKind } from '@/lib/store';
import { ON_BLOCK, useTheme, type BlockTone } from '@/theme';

// The trail: one chunky node per stop, winding down the screen, with Root standing on the
// stop that is next. Spacing is the same for every node, so nothing shifts when Root moves on.
const STEP = 128;
const TOP = 104;
const NODE = 70;
const NOW = 88;
const ROOT = 74;
const FEET = 0.965;

export const KIND_LABEL: Record<StopKind, string> = { learn: 'New word', find: 'Find', spell: 'Spell', chest: 'Chest', challenge: 'Challenge' };

/** Where the middle of stop `i` sits, measured from the top of the path. */
export const stopY = (i: number) => TOP + i * STEP;
export const pathHeight = (count: number) => TOP + Math.max(0, count - 1) * STEP + NOW / 2 + 66;
const stopX = (i: number, width: number) => width / 2 + Math.min(width * 0.26, 92) * Math.sin(i * 1.05);

export type StopFace = { text?: string; hook?: string };

export function Path({ stops, faces, at, tone, held, onOpen }: { stops: Stop[]; faces: StopFace[]; /** The stop Root is standing on: the next one to do, or -1 when the chapter is finished. */ at: number; tone: BlockTone; /** The next stop is a new word that is waiting for a warm-up. */ held?: boolean; onOpen: (i: number) => void }) {
  const { c, reduceMotion } = useTheme();
  const [width, setWidth] = useState(340);
  const [nudged, setNudged] = useState<Record<number, number>>({});
  const [moving, setMoving] = useState<'left' | 'right' | null>(null);

  const stand = at < 0 ? stops.length - 1 : at;
  const nowTone: BlockTone = tone === 'orange' ? 'brand' : 'orange';
  const labelRight = (i: number) => stopX(i, width) <= width / 2 + 1;

  // Root stands on the shoulder of its node, on the side away from the label.
  const rootW = poseWidth('wave', ROOT);
  const rootAt = (i: number) => {
    const r = (i === at ? NOW : NODE) / 2;
    return { x: stopX(i, width) + (labelRight(i) ? -r * 0.5 : r * 0.5) - rootW / 2, y: stopY(i) - r * 0.6 - ROOT * FEET };
  };
  const home = rootAt(Math.max(0, stand));
  const px = useSharedValue(home.x);
  const py = useSharedValue(home.y);
  const hop = useSharedValue(0);
  const prev = useRef({ stand, width });

  useEffect(() => {
    const was = prev.current;
    prev.current = { stand, width };
    const to = { x: home.x, y: home.y };
    if (was.stand === stand || was.width !== width || reduceMotion) {
      px.set(to.x);
      py.set(to.y);
      return;
    }
    // A stop was finished: Root walks on to the next one.
    const dir = to.x < px.value ? 'left' : 'right';
    const wait = 420;
    const ms = 900;
    const start = setTimeout(() => setMoving(dir), wait);
    const stop = setTimeout(() => setMoving(null), wait + ms + 60);
    px.set(withDelay(wait, withTiming(to.x, { duration: ms, easing: Easing.inOut(Easing.quad) })));
    py.set(withDelay(wait, withTiming(to.y, { duration: ms, easing: Easing.inOut(Easing.quad) })));
    hop.set(withDelay(wait, withRepeat(withSequence(withTiming(-9, { duration: ms / 8, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: ms / 8, easing: Easing.in(Easing.quad) })), 4, false)));
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [stand, width, home.x, home.y, reduceMotion, px, py, hop]);

  const rootStyle = useAnimatedStyle(() => ({ transform: [{ translateX: px.value }, { translateY: py.value + hop.value }] }));

  // The dotted trail through every node, and the walked part of it in the chapter's colour.
  const trail = (upTo: number) => {
    let d = '';
    for (let i = 0; i <= upTo && i < stops.length; i++) {
      const x = stopX(i, width);
      const y = stopY(i);
      if (i === 0) d += `M ${x} ${y}`;
      else {
        const x0 = stopX(i - 1, width);
        const y0 = stopY(i - 1);
        d += ` C ${x0} ${y0 + STEP * 0.5}, ${x} ${y - STEP * 0.5}, ${x} ${y}`;
      }
    }
    return d;
  };
  const height = pathHeight(stops.length);

  const press = (i: number) => {
    if (stops[i].done || i === at) return onOpen(i);
    buzz.nudge();
    setNudged((n) => ({ ...n, [i]: (n[i] ?? 0) + 1 }));
  };

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Line d={trail(stops.length - 1)} stroke={c.line} strokeWidth={7} strokeLinecap="round" strokeDasharray="1 17" fill="none" />
        {stand > 0 && <Line d={trail(stand)} stroke={LIP[tone]} strokeWidth={7} strokeLinecap="round" strokeDasharray="1 17" fill="none" />}
      </Svg>

      {stops.map((st, i) => {
        const done = !!st.done;
        const now = i === at;
        const size = now ? NOW : NODE;
        const x = stopX(i, width);
        const y = stopY(i);
        const face = faces[i] ?? {};
        const right = labelRight(i);
        const label = st.kind === 'learn' ? (face.text ?? KIND_LABEL.learn) : KIND_LABEL[st.kind];
        const ink = done || now ? ON_BLOCK.ink : c.ink3;
        const bg = done ? c[tone] : now ? c[nowTone] : c.surface;
        const lip = done ? LIP[tone] : now ? LIP[nowTone] : c.line;
        const a11y = `${st.kind === 'learn' ? `New word: ${label}` : label}${done ? ', done' : now ? (held ? ', waiting for a warm-up' : ', next') : ', locked'}`;
        const room = right ? width - (x + size / 2 + 12) : x - size / 2 - 12;

        return (
          <Rise key={i} i={i} style={{ position: 'absolute', left: 0, right: 0, top: y - size / 2, height: size + 54 }}>
            <Wiggle trigger={nudged[i] ?? 0} style={{ position: 'absolute', left: x - size / 2, top: 0, width: size, alignItems: 'center' }}>
              <Tap onPress={() => press(i)} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: !done && !now }} style={{ width: size, alignItems: 'center' }}>
                <Pulse on={now}>
                  <View style={{ width: size, height: size + 6 }}>
                    <View style={{ position: 'absolute', top: 6, width: size, height: size, borderRadius: size / 2, backgroundColor: lip }} />
                    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: done || now ? 0 : 1, borderColor: c.line }}>
                      {done && st.kind !== 'chest' ? (
                        <Check size={size * 0.42} color={ON_BLOCK.ink} strokeWidth={3.4} />
                      ) : st.kind === 'chest' ? (
                        <Image source={done ? PROPS.chestOpen.src : PROPS.chest.src} style={{ width: size * 0.62, height: size * 0.62, opacity: done || now ? 1 : 0.55 }} resizeMode="contain" />
                      ) : st.kind === 'learn' ? (
                        <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: face.hook ? size * 0.4 : size * 0.38, color: ink }}>{face.hook ?? (face.text ?? '?').charAt(0).toUpperCase()}</Text>
                      ) : st.kind === 'find' ? (
                        <Search size={size * 0.38} color={ink} strokeWidth={2.6} />
                      ) : st.kind === 'spell' ? (
                        <PenLine size={size * 0.38} color={ink} strokeWidth={2.6} />
                      ) : (
                        <Flag size={size * 0.38} color={ink} strokeWidth={2.6} fill={now ? ink : 'none'} />
                      )}
                    </View>
                    {!done && !now && (
                      <View style={{ position: 'absolute', right: -2, bottom: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface2, borderWidth: 2, borderColor: c.canvas, alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={12} color={c.ink3} strokeWidth={2.8} />
                      </View>
                    )}
                  </View>
                </Pulse>
                {now && (
                  <View style={{ marginTop: 8, height: 34, borderRadius: 17, paddingHorizontal: 13, marginHorizontal: -24, backgroundColor: c.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {held ? <Zap size={13} color={c.onInk} fill={c.onInk} /> : <Play size={13} color={c.onInk} fill={c.onInk} />}
                    <Text numberOfLines={1} style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 14, color: c.onInk }}>{held ? 'Warm up' : 'Start'}</Text>
                  </View>
                )}
              </Tap>
            </Wiggle>
            <View pointerEvents="none" style={[{ position: 'absolute', top: 0, height: size, justifyContent: 'center', width: Math.max(60, room) }, right ? { left: x + size / 2 + 12 } : { left: x - size / 2 - 12 - Math.max(60, room), alignItems: 'flex-end' }]}>
              <Txt v={now ? 'heading' : 'bodyS'} color={done || now ? 'ink' : 'ink3'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ textAlign: right ? 'left' : 'right' }}>
                {label}
              </Txt>
            </View>
          </Rise>
        );
      })}

      {/* Root, standing on the next stop. It walks there when a stop is finished. */}
      {stops.length > 0 && (
        <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, top: 0, width: rootW, height: ROOT }, rootStyle]}>
          <View pointerEvents="box-none" style={{ transform: [{ scaleX: moving === 'left' ? -1 : 1 }] }}>
            <Mascot pose={moving ? 'walk' : at < 0 ? 'cheer' : 'wave'} size={ROOT} poke={!moving} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}
