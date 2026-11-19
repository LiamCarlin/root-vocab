import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buzz } from '@/lib/audio';
import { buddy, useBuddyEvent, type BuddyEvent } from '@/lib/buddy';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Pop } from './fx';
import { Mascot, poseWidth, type Motion, type Pose } from './Mascot';
import { CLIPS } from './mascotClips';

// Root as a companion. These are the ways Root lives inside the interface
// rather than being placed on it:
//
//   <Peek>      rises from behind an edge of a card and looks around
//   <Perch>     sits (or stands) on the top edge of a card
//   <Sidekick>  watches an exercise from the bottom corner and reacts to it
//   <Reaction>  the full Root for interstitials and celebrations
//   <BuddyHost> now and then, Root looks in from the edge of the screen
//
// All of them follow Settings › Feel: `off` draws no companion at all (Reaction
// falls back to a still picture so layouts keep their shape), `calm` keeps the
// companion but drops the fidgeting and the ambient visits, `lively` is the
// default. Reduce motion makes every one of them appear in place and hold still.

type Liveliness = 'lively' | 'calm' | 'off';
const useCompanion = (): Liveliness => useStore((s) => (s.display as { companion?: Liveliness } | undefined)?.companion ?? 'lively');
const bump = (key: string) => (useStore.getState() as { bump?: (counter: string, by?: number) => void }).bump?.(key);
const between = (a: number, b: number) => a + Math.random() * (b - a);

/** Where things are in a pose's layout box, as fractions of its height (see Mascot). */
const PEEK_LEDGE = 1; // the `peek` box ends exactly on the ledge its hands rest on
const SIT = CLIPS.sit;
const SEAT: Partial<Record<Pose, number>> = { sit: (SIT.seat! - SIT.top) / SIT.stand, sleep: 0.97, read: 0.97 };
const FEET = 0.985;

function poked(after?: () => void) {
  buzz.tap();
  sfx.play('pop');
  bump('pokes');
  after?.();
}

/** A slow look-around and the odd blink or duck, so a waiting Root is never a frozen picture. */
function useFidget(on: boolean, out: SharedValue<number>, opts: { duck?: boolean } = {}) {
  const tilt = useSharedValue(0.5);
  const blink = useSharedValue(1);
  const duck = opts.duck !== false;
  useEffect(() => {
    if (!on) {
      tilt.set(withTiming(0.5, { duration: 200 }));
      return;
    }
    tilt.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(
        () => {
          if (duck && Math.random() < 0.28) out.set(withSequence(withTiming(0.4, { duration: 170, easing: Easing.in(Easing.quad) }), withDelay(520, withSpring(1, { damping: 10, stiffness: 180 }))));
          else blink.set(withSequence(withTiming(0.93, { duration: 70 }), withTiming(1, { duration: 110 })));
          next();
        },
        between(3200, 6800),
      );
    };
    next();
    return () => {
      clearTimeout(timer);
      cancelAnimation(tilt);
    };
  }, [on, duck, tilt, blink, out]);
  return { tilt, blink };
}

// ── Peek ──────────────────────────────────────────────────────────────────
export type PeekProps = {
  /** The edge of the parent Root comes out from behind. */
  from?: 'top' | 'bottom' | 'left' | 'right';
  /** Defaults: `peek` from the top (hands on the edge), `hang` from the bottom (dangling), `wave` from the sides. */
  pose?: Pose;
  /** Root's full height in points. */
  size?: number;
  /** Where along the edge. */
  align?: 'start' | 'center' | 'end';
  /** Distance from the aligned corner. */
  inset?: number;
  /** Wait before appearing. */
  delay?: number;
  /** Leave again after this long. Left out, Root stays. */
  stay?: number;
  /** How much of Root shows, 0..1, for poses other than `peek` and `hang`. */
  show?: number;
  onPress?: () => void;
};

/**
 * Root rises from behind one edge of its parent. The parent must be `position: 'relative'`
 * with visible overflow, so wrap a `Block` (which clips) in a plain `View` and put the Peek
 * beside the Block, not inside it. Nothing is laid out: the Peek takes no space.
 */
export function Peek({ from = 'top', pose, size = 96, align = 'end', inset = 22, delay = 600, stay, show, onPress }: PeekProps) {
  const mode = useCompanion();
  const { reduceMotion } = useTheme();
  const p: Pose = pose ?? (from === 'top' ? 'peek' : from === 'bottom' ? 'hang' : 'wave');
  const w = poseWidth(p, size);
  const vertical = from === 'top' || from === 'bottom';
  const hanging = from === 'bottom' && p === 'hang';
  // Points of Root that end up in view, measured along the direction of travel.
  const vis = from === 'top' && p === 'peek' ? size * PEEK_LEDGE - 3 : hanging ? size * 0.97 : (vertical ? size : w) * (show ?? 0.62);
  const room = size * 0.14; // space for the overshoot when Root pops up
  const out = useSharedValue(reduceMotion ? 1 : 0);
  const { tilt } = useFidget(mode === 'lively' && !reduceMotion, out, { duck: !hanging });
  const calmTilt = useSharedValue(0.5);

  useEffect(() => {
    if (mode === 'off') return;
    if (reduceMotion) {
      out.set(1);
      return;
    }
    // Eyes first, a beat, then all the way up.
    out.set(withDelay(delay, withSequence(withTiming(0.45, { duration: 220, easing: Easing.out(Easing.quad) }), withDelay(300, withSpring(1, { damping: 11, stiffness: 170 })))));
    if (mode === 'calm') calmTilt.set(withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true));
    const leave = stay ? setTimeout(() => out.set(withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) })), delay + 700 + stay) : undefined;
    return () => {
      if (leave) clearTimeout(leave);
      cancelAnimation(calmTilt);
    };
  }, [mode, reduceMotion, delay, stay, out, calmTilt]);

  const swing = hanging ? 3 : vertical ? 3 : 4; // the clips sway on their own; this is only a slow drift
  const lean = from === 'left' ? -12 : from === 'right' ? 12 : 0;
  const flip = from === 'bottom' && !hanging;
  const lively = mode === 'lively';
  const anim = useAnimatedStyle(() => {
    const hidden = 1 - out.value;
    const t = lively ? tilt.value : calmTilt.value;
    const rot = lean + (t - 0.5) * (lively ? swing : swing * 0.5);
    const move = from === 'top' ? { translateY: hidden * vis } : from === 'bottom' ? { translateY: -hidden * vis } : from === 'left' ? { translateX: hidden * vis } : { translateX: -hidden * vis };
    return { transform: [move, { rotate: `${rot}deg` }] };
  });

  if (mode === 'off') return null;

  const press = () =>
    poked(() => {
      if (!reduceMotion) out.set(withSequence(withTiming(0.25, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 210 })));
      onPress?.();
    });

  const justify = align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';
  const outer: ViewStyle = vertical
    ? { position: 'absolute', left: 0, right: 0, height: vis + room, flexDirection: 'row', justifyContent: justify, paddingHorizontal: inset, ...(from === 'top' ? { bottom: '100%' } : { top: '100%' }) }
    : { position: 'absolute', top: 0, bottom: 0, width: vis + room, flexDirection: 'column', justifyContent: justify, paddingVertical: inset, ...(from === 'left' ? { right: '100%' } : { left: '100%' }) };
  const win: ViewStyle = vertical ? { width: w, height: vis + room, overflow: 'hidden' } : { width: vis + room, height: size, overflow: 'hidden' };
  // Where the full drawing sits inside the window, so the right part of it is what shows.
  const place: ViewStyle =
    from === 'top'
      ? { position: 'absolute', left: 0, top: room, transformOrigin: '50% 100%' }
      : from === 'bottom'
        ? { position: 'absolute', left: 0, top: hanging ? -size * 0.02 : -(size - vis), transformOrigin: hanging ? '50% 0%' : '50% 100%' }
        : from === 'left'
          ? { position: 'absolute', left: room, top: 0, transformOrigin: '100% 100%' }
          : { position: 'absolute', left: vis - w, top: 0, transformOrigin: '0% 100%' };

  return (
    <View pointerEvents="box-none" style={outer}>
      <View pointerEvents="box-none" style={win}>
        <Animated.View style={[place, { width: w, height: size }, anim]}>
          <Pressable onPress={press} accessibilityRole="button" accessibilityLabel="Root" accessibilityHint="Tap to say hello" style={flip ? { transform: [{ rotate: '180deg' }] } : undefined}>
            <Mascot pose={p} size={size} motion="none" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ── Perch ─────────────────────────────────────────────────────────────────
/**
 * Root sits on the top edge of its parent with its legs over the front (pose `sit`), or stands
 * on it (any standing pose). Same parent rule as Peek: relative, not clipped.
 */
export function Perch({ pose = 'sit', size = 84, side = 'right', inset = 18, delay = 300, seat, onPress }: { pose?: Pose; size?: number; side?: 'left' | 'right'; inset?: number; delay?: number; seat?: number; onPress?: () => void }) {
  const mode = useCompanion();
  const { reduceMotion } = useTheme();
  const w = poseWidth(pose, size);
  const seatAt = seat ?? SEAT[pose] ?? FEET;
  const drop = useSharedValue(reduceMotion ? 0 : -1);
  const sq = useSharedValue(1);
  const rock = useSharedValue(0.5);
  const hop = useSharedValue(0);

  useEffect(() => {
    if (mode === 'off') return;
    if (reduceMotion) {
      drop.set(0);
      return;
    }
    // Drops in from just above and lands with a squash.
    drop.set(withDelay(delay, withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })));
    sq.set(withDelay(delay + 240, withSequence(withTiming(0.86, { duration: 80 }), withSpring(1, { damping: 7, stiffness: 220 }))));
    return () => {
      cancelAnimation(rock);
    };
  }, [mode, reduceMotion, delay, drop, sq, rock]);

  const anim = useAnimatedStyle(() => ({
    opacity: drop.value <= -1 ? 0 : 1,
    transform: [{ translateY: drop.value * size * 0.5 + hop.value }, { rotate: `${(rock.value - 0.5) * 4}deg` }, { scaleX: 1 + (1 - sq.value) * 0.6 }, { scaleY: sq.value }],
  }));

  if (mode === 'off') return null;

  const press = () =>
    poked(() => {
      if (!reduceMotion) {
        hop.set(withSequence(withTiming(-size * 0.14, { duration: 140, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) })));
        sq.set(withSequence(withTiming(1.05, { duration: 140 }), withTiming(1, { duration: 150 }), withTiming(0.88, { duration: 70 }), withSpring(1, { damping: 7, stiffness: 220 })));
      }
      onPress?.();
    });

  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', top: -size * seatAt, width: w, height: size }, side === 'left' ? { left: inset } : { right: inset }]}>
      <Animated.View style={[{ width: w, height: size, transformOrigin: `50% ${Math.round(seatAt * 100)}%` }, anim]}>
        <Pressable onPress={press} accessibilityRole="button" accessibilityLabel="Root" accessibilityHint="Tap to say hello">
          <Mascot pose={pose} size={size} motion="none" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Sidekick ──────────────────────────────────────────────────────────────
type Beat = { pose: Pose; ms: number; motion?: Motion };
type Timers = { current: ReturnType<typeof setTimeout>[] };
const clear = (list: Timers) => {
  list.current.forEach(clearTimeout);
  list.current = [];
};

const CHEERS: Pose[] = ['thumbs', 'wink', 'proud', 'love', 'laugh'];
const GIGGLES: Pose[] = ['laugh', 'wink', 'gasp', 'love'];
let cheerTurn = 0;
let giggleTurn = 0;

function beatsFor(e: BuddyEvent): Beat[] {
  switch (e) {
    case 'correct':
      // The happy hop, then a second of being pleased about it.
      return [
        { pose: 'yes', ms: 820 },
        { pose: CHEERS[cheerTurn++ % CHEERS.length], ms: 900 },
      ];
    case 'wrong':
      // A gentle shake of the head that ends in a smile, then straight back to being on your side.
      return [
        { pose: 'no', ms: 1150 },
        { pose: 'thumbs', ms: 1100 },
      ];
    case 'combo':
      return [{ pose: 'dance', ms: 2000 }];
    case 'hint':
      return [{ pose: 'idea', ms: 1500 }];
    case 'start':
      return [{ pose: 'wave', ms: 1500 }];
    case 'finish':
      return [{ pose: 'trophy', ms: 2200 }];
    case 'unlock':
      return [
        { pose: 'gasp', ms: 900 },
        { pose: 'cheer', ms: 1400 },
      ];
    case 'poke':
      return [{ pose: GIGGLES[giggleTurn++ % GIGGLES.length], ms: 1200 }];
  }
}

/**
 * The exercise companion. Rests as a pair of eyes and two hands on the bottom edge of its parent,
 * in a corner, and pops up to react when the screen calls `buddy.react(...)`:
 * correct → a happy pose and a hop · wrong → `oops`, then a thumbs up · combo → a dance ·
 * hint → the lightbulb · start / finish · left alone for a while it thinks, then dozes off.
 * It never takes touches except on Root itself, and it draws entirely inside the parent.
 * Put it last inside a `position: 'relative'` play area.
 */
export function Sidekick({ size = 110, side = 'right', inset = 10, quiet }: { size?: number; side?: 'left' | 'right'; inset?: number; quiet?: boolean }) {
  const mode = useCompanion();
  const { reduceMotion } = useTheme();
  const [cur, setCur] = useState<Beat | null>(null); // null = resting on the edge
  const up = useSharedValue(reduceMotion ? 1 : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idle = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lively = mode === 'lively' && !reduceMotion;
  const { tilt } = useFidget(lively && cur === null, up);

  const restH = size * 0.56;
  const winW = size * 1.0;
  const winH = size * 1.32; // room for a hop, a raised arm, the lightbulb

  const swap = useCallback(
    (next: Beat | null) => {
      setCur(next);
      if (reduceMotion) return;
      up.set(withSpring(1, { damping: 10, stiffness: 190 }));
    },
    [reduceMotion, up],
  );

  const play = useCallback(
    (beats: Beat[], thenRest = true) => {
      clear(timers);
      const DUCK = 140;
      let at = 0;
      const duck = () => {
        if (!reduceMotion) up.set(withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }));
      };
      for (const beat of beats) {
        timers.current.push(setTimeout(duck, at));
        timers.current.push(setTimeout(() => swap(beat), at + DUCK));
        at += DUCK + beat.ms;
      }
      if (thenRest) {
        timers.current.push(setTimeout(duck, at));
        timers.current.push(setTimeout(() => swap(null), at + DUCK));
      }
    },
    [reduceMotion, swap, up],
  );

  const armIdle = useCallback(() => {
    clear(idle);
    if (quiet || mode !== 'lively') return;
    idle.current.push(setTimeout(() => play([{ pose: 'think', ms: 3800 }]), 24000));
    idle.current.push(setTimeout(() => play([{ pose: 'sleep', ms: 0 }], false), 62000));
  }, [mode, quiet, play]);

  useBuddyEvent((e) => {
    if (mode === 'off') return;
    play(beatsFor(e));
    armIdle();
  });

  useEffect(() => {
    if (mode === 'off') return;
    if (!reduceMotion) up.set(withDelay(500, withSpring(1, { damping: 11, stiffness: 170 })));
    armIdle();
    return () => {
      clear(timers);
      clear(idle);
    };
  }, [mode, reduceMotion, up, armIdle]);

  const resting = cur === null;
  const curH = resting ? restH - 3 : size * 0.88;
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - up.value) * curH }, { rotate: `${resting ? (tilt.value - 0.5) * 3 : 0}deg` }],
  }));

  if (mode === 'off') return null;

  const press = () =>
    poked(() => {
      play(beatsFor('poke'));
      armIdle();
    });

  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', bottom: 0, width: winW, height: winH, overflow: 'hidden', alignItems: 'center' }, side === 'left' ? { left: inset } : { right: inset }]}>
      <Animated.View style={[{ position: 'absolute', bottom: resting ? -3 : -size * 0.1, transformOrigin: '50% 100%' }, anim]}>
        <Pressable onPress={press} accessibilityRole="button" accessibilityLabel="Root" accessibilityHint="Tap to say hello">
          {resting ? <Mascot pose="peek" size={restH} still={mode === 'calm'} /> : <Mascot key={cur.pose} pose={cur.pose} size={size} still={mode === 'calm'} motion={cur.motion} />}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Reaction ──────────────────────────────────────────────────────────────
/**
 * The full Root, for interstitials and celebrations: pops in and plays the pose's clip
 * (`cheer` jumps, `dance` dances, `trophy` bounces with the cup, `think` taps its foot).
 * `motion` adds an accent on top for a standing pose. Tappable unless `pokable={false}`.
 */
export function Reaction({ pose, size = 160, delay = 0, motion, pokable = true, style }: { pose: Pose; size?: number; delay?: number; motion?: Motion; pokable?: boolean; style?: StyleProp<ViewStyle> }) {
  const mode = useCompanion();
  if (mode === 'off') return <Mascot pose={pose} size={size} still style={style} />;
  return (
    <Pop delay={delay} from={0.3} style={style}>
      <Mascot pose={pose} size={size} still={mode === 'calm'} motion={motion} poke={pokable} />
    </Pop>
  );
}

// ── BuddyHost ─────────────────────────────────────────────────────────────
const QUIET_ROUTES = ['/play', '/mission', '/onboarding/placement', '/story'];
const GREETINGS: Pose[] = ['wave', 'wink', 'thumbs', 'search', 'listen', 'proud'];
type Visit = { id: number; edge: 'left' | 'right' | 'top'; at: number; pose: Pose; path: string };

let hosts = 0;
const summons = new Set<() => void>();
/** True once a BuddyHost is mounted (the root layout has one). */
export const hasBuddyHost = () => hosts > 0;
/** Ask Root to look in from the edge of the screen right now. Does nothing when the companion is off, motion is reduced, or the screen is one Root stays out of. */
export function summonRoot() {
  summons.forEach((f) => f());
}

function makeVisit(path: string): Visit {
  const roll = Math.random();
  const edge: Visit['edge'] = roll < 0.42 ? 'right' : roll < 0.84 ? 'left' : 'top';
  return { id: Date.now(), edge, at: edge === 'top' ? between(0.14, 0.7) : between(0.26, 0.6), pose: edge === 'top' ? 'hang' : GREETINGS[Math.floor(Math.random() * GREETINGS.length)], path };
}

/**
 * Wraps the app in the root layout. In `lively` mode, on screens where nobody is mid-answer,
 * Root now and then runs in along the bottom of the screen, stops to wave (or wink, or look for
 * something), and runs off again; sometimes it dangles in from the top instead.
 * At most one visit every 40 to 90 seconds, never within 8 seconds of arriving on a screen,
 * never during an exercise, a lesson, the placement or the story. Tap it and it giggles.
 */
export function BuddyHost({ children }: { children: ReactNode }) {
  const mode = useCompanion();
  const { reduceMotion } = useTheme();
  const path = usePathname();
  const celebrating = useStore((s) => ((s as { unlocks?: unknown[] }).unlocks?.length ?? 0) > 0);
  const [visit, setVisit] = useState<Visit | null>(null);
  const active = mode === 'lively' && !reduceMotion && !celebrating && !QUIET_ROUTES.some((r) => path.startsWith(r));

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    // The effect restarts on every route change, so the first wait is also the "just arrived" gap.
    const plan = () => {
      timer = setTimeout(
        () => {
          setVisit(makeVisit(path));
          plan();
        },
        between(40000, 90000),
      );
    };
    plan();
    return () => clearTimeout(timer);
  }, [active, path]);

  // Summoned visits skip the timing rules but not the quiet ones.
  const allowed = mode !== 'off' && !reduceMotion && !celebrating && !QUIET_ROUTES.some((r) => path.startsWith(r));
  useEffect(() => {
    hosts += 1;
    return () => {
      hosts -= 1;
    };
  }, []);
  useEffect(() => {
    if (!allowed) return;
    const f = () => setVisit(makeVisit(path));
    summons.add(f);
    return () => {
      summons.delete(f);
    };
  }, [allowed, path]);

  const gone = useCallback(() => setVisit(null), []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
        {visit && allowed && visit.path === path && <Visitor key={visit.id} visit={visit} onGone={gone} />}
      </View>
    </View>
  );
}

/** How far a run cycle carries Root, as a fraction of its height: keeps the feet from sliding. */
const RUN_STRIDE = (2 * 0.78) / 2.92;
const RUN_MS = (CLIPS.run.frames / CLIPS.run.fps) * 1000;

function Visitor({ visit, onGone }: { visit: Visit; onGone: () => void }) {
  const insets = useSafeAreaInsets();
  if (visit.edge === 'top') return <Dangler visit={visit} top={Math.max(0, insets.top - 6)} onGone={onGone} />;
  return <Runner visit={visit} bottom={Math.max(insets.bottom, 6)} onGone={onGone} />;
}

/** Runs in from one side along the bottom edge, stops, greets, turns and runs off. */
function Runner({ visit, bottom, onGone }: { visit: Visit; bottom: number; onGone: () => void }) {
  const size = 116;
  const w = poseWidth('run', size);
  const fromLeft = visit.edge === 'left';
  const reach = w * 0.5 + 18 + visit.at * 40; // where Root's middle stops, measured in from the edge
  const travel = reach + w * 0.5; // from fully off screen
  const ms = (travel / (size * RUN_STRIDE)) * RUN_MS;
  const x = useSharedValue(0);
  const [phase, setPhase] = useState<'in' | 'greet' | 'out'>('in');
  const [pose, setPose] = useState<Pose>(visit.pose);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const leaveAfter = useCallback(
    (wait: number) => {
      timers.current.forEach(clearTimeout);
      timers.current = [
        setTimeout(() => {
          setPhase('out');
          x.set(withTiming(0, { duration: ms, easing: Easing.in(Easing.quad) }));
        }, wait),
        setTimeout(onGone, wait + ms + 60),
      ];
    },
    [ms, onGone, x],
  );

  useEffect(() => {
    x.set(withTiming(1, { duration: ms, easing: Easing.out(Easing.quad) }));
    const arrive = setTimeout(() => setPhase('greet'), ms);
    leaveAfter(ms + 2400);
    const pending = timers;
    return () => {
      clearTimeout(arrive);
      pending.current.forEach(clearTimeout);
    };
  }, [x, ms, leaveAfter]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: (fromLeft ? 1 : -1) * (x.value * travel - w) }] }));

  const press = () =>
    poked(() => {
      if (phase !== 'greet') return;
      setPose('laugh');
      leaveAfter(1300);
    });

  // The run clip faces right: flip it when Root is heading left.
  const headingLeft = phase === 'in' ? !fromLeft : fromLeft;
  return (
    <Animated.View style={[{ position: 'absolute', bottom, width: w, height: size }, fromLeft ? { left: 0 } : { right: 0 }, anim]}>
      <Pressable onPress={press} accessibilityRole="button" accessibilityLabel="Root" accessibilityHint="Tap to say hello">
        {phase === 'greet' ? <Mascot key="greet" pose={pose} size={size} /> : <Mascot key={phase} pose="run" size={size} flip={headingLeft} />}
      </Pressable>
    </Animated.View>
  );
}

/** Drops in from the top edge, dangles and sways for a moment, and pulls itself back up. */
function Dangler({ visit, top, onGone }: { visit: Visit; top: number; onGone: () => void }) {
  const size = 124;
  const w = poseWidth('hang', size);
  const out = useSharedValue(0);
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goAfter = useCallback(
    (ms: number) => {
      if (leave.current) clearTimeout(leave.current);
      if (done.current) clearTimeout(done.current);
      leave.current = setTimeout(() => out.set(withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })), ms);
      done.current = setTimeout(onGone, ms + 300);
    },
    [out, onGone],
  );

  useEffect(() => {
    out.set(withSequence(withTiming(0.5, { duration: 240, easing: Easing.out(Easing.quad) }), withDelay(360, withSpring(1, { damping: 11, stiffness: 160 }))));
    goAfter(3600);
    const l = leave;
    const d = done;
    return () => {
      if (l.current) clearTimeout(l.current);
      if (d.current) clearTimeout(d.current);
    };
  }, [out, goAfter]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: -(1 - out.value) * size }] }));

  const press = () =>
    poked(() => {
      out.set(withSequence(withTiming(0.8, { duration: 100 }), withSpring(1, { damping: 8, stiffness: 210 })));
      goAfter(1100);
    });

  return (
    <Animated.View style={[{ position: 'absolute', width: w, height: size, top, left: `${Math.round(visit.at * 100)}%` }, anim]}>
      <Pressable onPress={press} accessibilityRole="button" accessibilityLabel="Root" accessibilityHint="Tap to say hello">
        <Mascot pose="hang" size={size} />
      </Pressable>
    </Animated.View>
  );
}

export { buddy };
