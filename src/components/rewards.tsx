import { usePathname } from 'expo-router';
import { ArrowRight, Award, Check, Lock } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Image, Modal, Pressable, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { useShallow } from 'zustand/react/shallow';

import { STRANDS } from '@/data/profile';
import { PROPS, SCENES, chapterOf, type SceneId } from '@/data/story';
import { buzz } from '@/lib/audio';
import { onHoldChange, unlocksHeld } from '@/lib/buddy';
import { BADGES, QUESTS, questState } from '@/lib/rewards';
import { sfx } from '@/lib/sfx';
import { useStore, type Unlock } from '@/lib/store';
import { ON_BLOCK, useTheme, type BlockTone } from '@/theme';
import { Reaction } from './Buddy';
import { Burst, Confetti, CountUp, Float, FogVeil, Pop, Rays, Shine } from './fx';
import type { Pose } from './Mascot';
import { Bar, Btn, Ring, Txt, useOnBlock } from './ui';

// What the learner earns, drawn: badges, the chest, gems, the streak flame, quests,
// the daily goal, the story islands, and the full-screen celebration that plays when
// something unlocks.

/** The darker edge that gives every colour block its chunky lip. */
export const LIP: Record<BlockTone, string> = { brand: '#7B97E8', orange: '#D6781F', pink: '#D488DC', mint: '#8FD3A2', butter: '#E6C766', lilac: '#B9A3EA' };

// ── Badge ─────────────────────────────────────────────────────────────────
/**
 * A medallion for one achievement: scalloped coin in the badge's colour with a darker lip,
 * its icon in the middle and one stud per tier along the bottom (filled = earned).
 * `tier` 0 or `locked` draws it flat and grey with a padlock.
 */
export function Badge({ id, tier, size = 72, locked }: { id: string; tier: number; size?: number; locked?: boolean }) {
  const { c } = useTheme();
  const def = BADGES.find((b) => b.id === id);
  const off = locked || tier <= 0;
  const face = off ? c.surface2 : c[def?.tone ?? 'brand'];
  const lip = off ? c.line : LIP[def?.tone ?? 'brand'];
  const Icon = off ? Lock : (def?.icon ?? Award);
  const tiers = def?.tiers.length ?? 1;
  const drop = size * 0.055;
  const scallops = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: 50 + Math.cos((i / 14) * Math.PI * 2) * 40, y: 50 + Math.sin((i / 14) * Math.PI * 2) * 40 })), []);
  const studs = useMemo(
    () =>
      Array.from({ length: tiers }, (_, i) => {
        const a = Math.PI / 2 + (i - (tiers - 1) / 2) * 0.34; // spread along the bottom of the coin
        return { x: 50 + Math.cos(a) * 34.5, y: 50 + Math.sin(a) * 34.5 };
      }),
    [tiers],
  );
  const coin = (fill: string) => (
    <>
      <Circle cx={50} cy={50} r={41} fill={fill} />
      {scallops.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={9.4} fill={fill} />
      ))}
    </>
  );
  return (
    <View style={{ width: size, height: size + drop }} accessible accessibilityRole="image" accessibilityLabel={off ? `${def?.name ?? 'Badge'}, not earned yet` : `${def?.name ?? 'Badge'}, level ${tier} of ${tiers}`}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', top: drop }}>
        {coin(lip)}
      </Svg>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {coin(face)}
        <Circle cx={50} cy={50} r={31} fill={off ? 'rgba(127,127,140,0.10)' : 'rgba(255,255,255,0.32)'} stroke={off ? 'rgba(127,127,140,0.18)' : 'rgba(14,14,19,0.12)'} strokeWidth={1.6} />
        {!off && <Path d="M24 36 C30 24 42 18 54 19" stroke="rgba(255,255,255,0.75)" strokeWidth={3.4} strokeLinecap="round" fill="none" />}
        {!off && studs.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3.7} fill={i < tier ? ON_BLOCK.ink : 'rgba(14,14,19,0.2)'} />)}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={size * 0.36} color={off ? c.ink3 : ON_BLOCK.ink} strokeWidth={2.4} />
      </View>
    </View>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────
/**
 * One of the six story islands. `fog` 1 = lost in the Hush, 0 = clear; change it and the fog
 * dissolves. On a colour block pass that block's colour as `fogColor`.
 */
export function Scene({ scene, size = 220, fog = 0, float = true, fogColor }: { scene: SceneId; size?: number; fog?: number; float?: boolean; fogColor?: string }) {
  const s = SCENES[scene];
  const w = (size * s.w) / s.h;
  return (
    <View style={{ width: w, height: size }} accessible accessibilityRole="image" accessibilityLabel={`${scene}${fog > 0.6 ? ', in fog' : ''}`}>
      <Float amp={float ? 5 : 0} period={3200}>
        <Image source={s.src} style={{ width: w, height: size }} resizeMode="contain" />
      </Float>
      <FogVeil amount={fog} color={fogColor} />
    </View>
  );
}

// ── Chest ─────────────────────────────────────────────────────────────────
const GEM_ARCS = [
  { dx: -62, up: 96, s: 0.9 },
  { dx: -30, up: 128, s: 1.1 },
  { dx: 4, up: 112, s: 0.8 },
  { dx: 36, up: 134, s: 1 },
  { dx: 66, up: 92, s: 0.85 },
  { dx: -8, up: 150, s: 0.7 },
];

/**
 * The treasure chest. Closed, it gives a little rattle every few seconds so it asks to be tapped.
 * When `open` turns true it pops open and gems fly out (with the chest sound and a haptic).
 * `onPress` makes the closed chest tappable; the screen flips `open` and awards the gems.
 */
export function Chest({ open, size = 140, onPress, a11y }: { open: boolean; size?: number; onPress?: () => void; a11y?: string }) {
  const { reduceMotion } = useTheme();
  const w = (size * PROPS.chest.w) / PROPS.chest.h;
  const openH = (w * PROPS.chestOpen.h) / PROPS.chestOpen.w;
  const boxH = Math.max(size, openH);
  const rattle = useSharedValue(0);
  const pop = useSharedValue(1);
  const fly = useSharedValue(0);
  const was = useRef(open);

  useEffect(() => {
    if (open || reduceMotion || !onPress) {
      cancelAnimation(rattle);
      rattle.set(0);
      return;
    }
    rattle.set(withRepeat(withSequence(withDelay(2300, withTiming(-5, { duration: 70 })), withTiming(5, { duration: 90 }), withTiming(-3, { duration: 80 }), withTiming(0, { duration: 70 })), -1, false));
    return () => cancelAnimation(rattle);
  }, [open, reduceMotion, onPress, rattle]);

  useEffect(() => {
    if (open && !was.current) {
      sfx.play('chest');
      buzz.good();
      if (!reduceMotion) {
        pop.set(withSequence(withTiming(0.84, { duration: 90 }), withSpring(1, { damping: 7, stiffness: 230 })));
        fly.set(0);
        fly.set(withDelay(80, withTiming(1, { duration: 950, easing: Easing.out(Easing.quad) })));
      }
    }
    was.current = open;
  }, [open, reduceMotion, pop, fly]);

  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${rattle.value}deg` }, { scaleX: 1 + (1 - pop.value) * 0.5 }, { scaleY: pop.value }] }));
  const art = (
    <Animated.View style={[{ width: w, height: boxH, justifyContent: 'flex-end', transformOrigin: '50% 100%' }, anim]}>
      <Image source={open ? PROPS.chestOpen.src : PROPS.chest.src} style={{ width: w, height: open ? openH : size }} resizeMode="contain" />
    </Animated.View>
  );
  return (
    <View style={{ width: w, height: boxH }}>
      {onPress && !open ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? 'Open the chest'}>
          {art}
        </Pressable>
      ) : (
        <View accessible accessibilityRole="image" accessibilityLabel={open ? 'Chest, open' : 'Chest'}>
          {art}
        </View>
      )}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: boxH * 0.42, alignItems: 'center' }}>
        {GEM_ARCS.map((g, i) => (
          <FlyingGem key={i} fly={fly} dx={g.dx * (size / 140)} up={g.up * (size / 140)} size={22 * g.s * (size / 140)} />
        ))}
      </View>
    </View>
  );
}

function FlyingGem({ fly, dx, up, size }: { fly: SharedValue<number>; dx: number; up: number; size: number }) {
  const st = useAnimatedStyle(() => {
    const p = fly.value;
    return {
      opacity: p <= 0 ? 0 : p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3,
      transform: [{ translateX: dx * p }, { translateY: -up * Math.sin(p * Math.PI * 0.62) }, { rotate: `${dx * p * 0.6}deg` }, { scale: 0.5 + Math.min(1, p * 2) * 0.5 }],
    };
  });
  return <Animated.Image source={PROPS.gem.src} style={[{ position: 'absolute', width: size, height: (size * PROPS.gem.h) / PROPS.gem.w }, st]} resizeMode="contain" />;
}

// ── GemPill ───────────────────────────────────────────────────────────────
/** The gem count, in a pill. When the value goes up it counts up and gives a small bounce. */
export function GemPill({ value, onPress }: { value: number; onPress?: () => void }) {
  const { c, e1, reduceMotion } = useTheme();
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  const s = useSharedValue(1);
  useEffect(() => {
    const from = cur.current;
    if (from === value) return;
    if (value > from && !reduceMotion) s.set(withSequence(withTiming(1.14, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 220 })));
    let raf = 0;
    let start = 0;
    let stopped = false;
    const step = (now: number) => {
      if (stopped) return;
      if (!start) start = now;
      const p = reduceMotion ? 1 : Math.min(1, (now - start) / 700);
      cur.current = Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      setShown(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [value, reduceMotion, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const body = (
    <Animated.View style={[{ height: 44, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 }, e1, anim]}>
      <Image source={PROPS.gem.src} style={{ width: 22, height: (22 * PROPS.gem.h) / PROPS.gem.w }} resizeMode="contain" />
      <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 17, color: c.ink, fontVariant: ['tabular-nums'] }}>{shown}</Text>
    </Animated.View>
  );
  if (onPress)
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${value} gems`}>
        {body}
      </Pressable>
    );
  return (
    <View accessible accessibilityLabel={`${value} gems`}>
      {body}
    </View>
  );
}

// ── StreakFlame ───────────────────────────────────────────────────────────
/** The streak: a flame with the day count inside. Lit, it flickers; unlit (no practice yet today) it is grey. */
export function StreakFlame({ n, lit = true, size = 64, count }: { n: number; lit?: boolean; size?: number; /** Count up to `n` on mount. */ count?: boolean }) {
  const { c, reduceMotion } = useTheme();
  const f = useSharedValue(0);
  const pop = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (!lit || reduceMotion) {
      f.set(0);
      return;
    }
    f.set(withRepeat(withTiming(1, { duration: 620, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(f);
  }, [lit, reduceMotion, f]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reduceMotion) pop.set(withSequence(withTiming(1.18, { duration: 130 }), withSpring(1, { damping: 7, stiffness: 220 })));
  }, [n, reduceMotion, pop]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${(f.value - 0.5) * 3}deg` }, { scaleX: pop.value * (1 - f.value * 0.02) }, { scaleY: pop.value * (1 + f.value * 0.045) }] }));
  const h = size * 1.12;
  return (
    <View style={{ width: size, height: h, alignItems: 'center' }} accessible accessibilityRole="image" accessibilityLabel={`${n} day streak${lit ? '' : ', not yet today'}`}>
      <Animated.View style={[{ width: size, height: h, transformOrigin: '50% 100%' }, anim]}>
        <Svg width={size} height={h} viewBox="0 0 64 72">
          <Path d="M33 2 C37 15 53 23 55 43 C57 59 46 70 32 70 C18 70 7 59 9 43 C10 33 16 28 19 20 C21 27 24 31 28 31 C31 21 29 11 33 2 Z" fill={lit ? '#D6781F' : c.line} transform="translate(0 2)" />
          <Path d="M33 2 C37 15 53 23 55 43 C57 59 46 70 32 70 C18 70 7 59 9 43 C10 33 16 28 19 20 C21 27 24 31 28 31 C31 21 29 11 33 2 Z" fill={lit ? '#F7953A' : c.surface2} transform="translate(0 -1)" />
          <Path d="M32 31 C36 39 45 44 45 53 C45 61 39 66 32 66 C25 66 19 61 19 53 C19 44 28 39 32 31 Z" fill={lit ? '#FFE7A0' : c.surface} />
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: h * 0.56, alignItems: 'center' }}>
        {count ? <CountUp to={n} duration={900} delay={350} style={{ fontFamily: 'Lexend_700Bold', fontSize: size * 0.28, lineHeight: size * 0.34, color: lit ? ON_BLOCK.ink : c.ink3 }} /> : <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: size * 0.28, lineHeight: size * 0.34, color: lit ? ON_BLOCK.ink : c.ink3 }}>{n}</Text>}
      </View>
    </View>
  );
}

// ── GoalRing ──────────────────────────────────────────────────────────────
/** Today's goal: stops done out of the goal. A tick pops in when it is met. */
export function GoalRing({ done, goal, size = 64 }: { done: number; goal: number; size?: number }) {
  const { c, font } = useTheme();
  // On a colour block (the chapter card) green on mint is too faint to read, so the met state is drawn in the block's black.
  const onBlock = useOnBlock();
  const good = onBlock ? ON_BLOCK.ink : c.success;
  const met = done >= goal;
  return (
    <View accessible accessibilityLabel={met ? 'Daily goal met' : `Daily goal: ${done} of ${goal}`}>
      <Ring value={goal ? Math.min(1, done / goal) : 0} size={size} stroke={Math.max(5, size * 0.1)} color={met ? good : undefined}>
        {met ? (
          <Pop key="met" from={0.2}>
            <Check size={size * 0.42} color={good} strokeWidth={3.4} />
          </Pop>
        ) : (
          <Txt style={{ fontFamily: font('b'), fontSize: size * 0.26, lineHeight: size * 0.32 }}>
            {done}/{goal}
          </Txt>
        )}
      </Ring>
    </View>
  );
}

// ── QuestRow ──────────────────────────────────────────────────────────────
/** One daily quest: icon, short label, progress, and a gem button to claim it when it is done. */
export function QuestRow({ id }: { id: string }) {
  const { c } = useTheme();
  const def = QUESTS.find((q) => q.id === id);
  const { have, target, done, claimed } = useStore(useShallow((s) => questState(s, id)));
  const claimQuest = useStore((s) => s.claimQuest);
  const [burst, setBurst] = useState(0);
  if (!def) return null;
  const Icon = def.icon;
  const claim = () => {
    claimQuest(id);
    sfx.play('gem');
    buzz.good();
    setBurst((b) => b + 1);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: claimed ? c.mint : done ? c.orange : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={claimed || done ? ON_BLOCK.ink : c.ink} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        <Txt v="bodyS" numberOfLines={1} color={claimed ? 'ink2' : 'ink'}>
          {def.label}
        </Txt>
        <Bar value={target ? Math.min(1, have / target) : 0} color={done ? 'success' : 'orange'} height={8} />
      </View>
      <View style={{ minWidth: 64, alignItems: 'flex-end', justifyContent: 'center' }}>
        {claimed ? (
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel="Claimed">
            <Check size={20} color={ON_BLOCK.ink} strokeWidth={3.2} />
            {burst > 0 && <Burst key={burst} size={110} count={9} />}
          </View>
        ) : done ? (
          <Pop key="claim" from={0.4}>
            <Pressable onPress={claim} accessibilityRole="button" accessibilityLabel={`Claim ${def.gems} gems`} style={{ height: 40, borderRadius: 20, backgroundColor: c.orange, borderBottomWidth: 3, borderBottomColor: LIP.orange, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12 }}>
              <Image source={PROPS.gem.src} style={{ width: 18, height: (18 * PROPS.gem.h) / PROPS.gem.w }} resizeMode="contain" />
              <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 15, color: ON_BLOCK.ink }}>+{def.gems}</Text>
            </Pressable>
          </Pop>
        ) : (
          <Txt v="caption" color="ink2" accessibilityLabel={`${have} of ${target}`}>
            {have}/{target}
          </Txt>
        )}
      </View>
    </View>
  );
}

// ── UnlockHost ────────────────────────────────────────────────────────────
const useHeld = () => useSyncExternalStore(onHoldChange, unlocksHeld, unlocksHeld);

/** Routes where a celebration would interrupt, even if the screen forgot to hold them. */
const NEVER = ['/onboarding/placement'];

/**
 * Lives in the root layout. Whenever the store has queued unlocks, it plays them one at a time
 * as a full-screen celebration, each kind with its own treatment, and waits while any screen is
 * holding them (`useHoldUnlocks` from lib/buddy), so nothing lands in the middle of an answer.
 */
let unlockHosts = 0;
/** True once an UnlockHost is mounted (the root layout has one). */
export const hasUnlockHost = () => unlockHosts > 0;

export function UnlockHost() {
  useEffect(() => {
    unlockHosts += 1;
    return () => {
      unlockHosts -= 1;
    };
  }, []);
  const next = useStore((s) => (s.unlocks ?? [])[0] ?? null);
  const left = useStore((s) => (s.unlocks ?? []).length);
  const shiftUnlock = useStore((s) => s.shiftUnlock);
  const held = useHeld();
  const path = usePathname();
  const show = !!next && !held && !NEVER.some((r) => path.startsWith(r));
  if (!show || !next) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={shiftUnlock}>
      <Celebration key={`${left}:${JSON.stringify(next)}`} unlock={next} onDone={shiftUnlock} />
    </Modal>
  );
}

/** "1 word tracked down", "10 words tracked down": the unit agrees with the number. */
export function unitFor(n: number | undefined, unit: string): string {
  if (n === undefined) return unit;
  return `${n} ${n === 1 ? unit.replace(/\b(words|rounds|places|patterns|runs|days|pokes)\b/, (m) => m.slice(0, -1)) : unit}`;
}

type Look = { tone: BlockTone; pose: Pose; title: string; sub: string; say: string };

function lookFor(u: Unlock): Look {
  switch (u.kind) {
    case 'badge': {
      const def = BADGES.find((b) => b.id === u.id);
      return { tone: def?.tone ?? 'brand', pose: 'trophy', title: def?.name ?? 'New badge', sub: def ? unitFor(def.tiers[Math.max(0, u.tier - 1)], def.unit) : '', say: `Badge earned: ${def?.name ?? 'new badge'}, level ${u.tier}` };
    }
    case 'chapter': {
      const ch = chapterOf(u.n);
      return { tone: ch.tone, pose: 'dance', title: ch.name, sub: 'Fog cleared', say: `${ch.name}: the fog has cleared` };
    }
    case 'streak':
      return { tone: 'orange', pose: 'flex', title: `${u.n} days`, sub: 'In a row', say: `${u.n} day streak` };
    case 'level': {
      const st = STRANDS[u.strand];
      return { tone: st.tone, pose: 'proud', title: `${st.label} level ${u.level}`, sub: 'Level up', say: `Level up: ${st.label} is now level ${u.level}` };
    }
  }
}

function Celebration({ unlock, onDone }: { unlock: Unlock; onDone: () => void }) {
  const { c } = useTheme();
  const look = lookFor(unlock);
  const [armed, setArmed] = useState(false);
  const [fog, setFog] = useState(1);

  useEffect(() => {
    sfx.play(unlock.kind === 'chapter' ? 'win' : 'unlock');
    buzz.good();
    AccessibilityInfo.announceForAccessibility(look.say);
    // A moment before a tap can dismiss it, so a stray tap from the last screen does not skip it.
    const arm = setTimeout(() => setArmed(true), 650);
    const clear = setTimeout(() => setFog(0), 700);
    return () => {
      clearTimeout(arm);
      clearTimeout(clear);
    };
  }, [unlock.kind, look.say]);

  const go = () => {
    if (armed) onDone();
  };
  const bg = c[look.tone];

  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center' }} accessibilityViewIsModal>
      {/* Tapping anywhere that is not a control continues. It sits behind the content, so no pressable is nested. */}
      <Pressable onPress={go} accessible={false} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <SafeAreaView pointerEvents="box-none" style={{ flex: 1, width: '100%', maxWidth: 480 }}>
        <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24 }}>
          <View style={{ width: 300, height: 260, alignItems: 'center', justifyContent: 'center' }}>
            <Rays size={380} />
            {unlock.kind === 'badge' && (
              <Pop delay={160} from={0.2}>
                <View style={{ borderRadius: 90, overflow: 'hidden' }}>
                  <Badge id={unlock.id} tier={unlock.tier} size={168} />
                  <Shine period={2600} delay={900} />
                </View>
              </Pop>
            )}
            {unlock.kind === 'chapter' && (
              <Pop delay={120} from={0.6}>
                <Scene scene={chapterOf(unlock.n).scene} size={230} fog={fog} fogColor={bg} />
              </Pop>
            )}
            {unlock.kind === 'streak' && (
              <Pop delay={160} from={0.2}>
                <StreakFlame n={unlock.n} size={170} count />
              </Pop>
            )}
            {unlock.kind === 'level' && <LevelDisc unlock={unlock} />}
            <Burst size={300} count={14} delay={260} colors={['#FFFFFF', ON_BLOCK.ink, c.butter, c.surface]} />
          </View>
          <Pop delay={380} from={0.8} style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 13, letterSpacing: 1.1, textTransform: 'uppercase', color: ON_BLOCK.ink2 }}>{look.sub}</Text>
            <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 32, lineHeight: 38, color: ON_BLOCK.ink, textAlign: 'center' }}>{look.title}</Text>
            {unlock.kind === 'badge' && <TierDots id={unlock.id} tier={unlock.tier} />}
          </Pop>
          <Reaction pose={look.pose} size={150} delay={520} pokable={false} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Btn icon={ArrowRight} label="Continue" onPress={go} />
        </View>
      </SafeAreaView>
      <Confetti count={32} height={520} />
    </View>
  );
}

function TierDots({ id, tier }: { id: string; tier: number }) {
  const n = BADGES.find((b) => b.id === id)?.tiers.length ?? 1;
  return (
    <View style={{ flexDirection: 'row', gap: 7, marginTop: 8 }} accessible accessibilityLabel={`Level ${tier} of ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ width: i < tier ? 22 : 10, height: 10, borderRadius: 5, backgroundColor: i < tier ? ON_BLOCK.ink : 'rgba(14,14,19,0.2)' }} />
      ))}
    </View>
  );
}

function LevelDisc({ unlock }: { unlock: Extract<Unlock, { kind: 'level' }> }) {
  const st = STRANDS[unlock.strand];
  const Icon = st.icon;
  return (
    <Pop delay={160} from={0.2}>
      <View style={{ width: 176, height: 184 }}>
        <View style={{ position: 'absolute', top: 8, width: 176, height: 176, borderRadius: 88, backgroundColor: ON_BLOCK.ink }} />
        <View style={{ width: 176, height: 176, borderRadius: 88, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Icon size={44} color={ON_BLOCK.ink} strokeWidth={2.4} />
          <CountUp from={Math.max(1, unlock.level - 1)} to={unlock.level} duration={500} delay={700} color={ON_BLOCK.ink} style={{ fontFamily: 'Lexend_700Bold', fontSize: 64, lineHeight: 70 }} />
        </View>
      </View>
    </Pop>
  );
}

/** A soft shadow to sit something on. Not used by Scene (islands float), offered for screens that ground Root or a chest. */
export function GroundShadow({ width = 120 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.22} viewBox="0 0 100 22">
      <Defs>
        <RadialGradient id="rootGroundShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#0E0E13" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#0E0E13" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={11} rx={50} ry={11} fill="url(#rootGroundShadow)" />
    </Svg>
  );
}
