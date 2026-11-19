import { ArrowRight, RotateCcw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { Burst, Pop } from '@/components/fx';
import { Controls, SylWord } from '@/components/learn';
import { Btn, IconBtn, Tap, Txt } from '@/components/ui';
import { buzz, say, speakable, stopSpeaking } from '@/lib/audio';
import { buddy } from '@/lib/buddy';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, useTheme, wordSize, type BlockTone } from '@/theme';
import { StepScreen } from './Frame';
import type { StepProps } from './types';

const WEB_H = 310;
const BUBBLE_W = 150;
const BUBBLE_H = 54;
const TONES: BlockTone[] = ['pink', 'mint', 'butter', 'lilac'];
// Where each linked idea sits around the word, as a fraction of the web's half-width and half-height.
const SPOTS = [
  { x: -1, y: -0.78 },
  { x: 1, y: -0.78 },
  { x: -1, y: 0.78 },
  { x: 1, y: 0.78 },
];
const ARRIVE_MS = 1050;

/**
 * Link: make the meaning stick. First the word's web: four things that belong with it arrive one
 * by one, each joined to the word and spoken. Then the learner picks one of three pictures as
 * their own hook for the word; it comes back later as the first cue when they have to find it.
 */
export function Link({ lex, top, next, skip, hook, pickHook }: StepProps) {
  const { c, text, font, scale } = useTheme();
  const links = lex.links.slice(0, 4);
  const hasWeb = links.length > 0;
  const hasPics = lex.pics.length > 0;
  const [phase, setPhase] = useState<'web' | 'pic'>(hasWeb ? 'web' : 'pic');
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);
  const [lit, setLit] = useState(-1);
  const [w, setW] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const linksRef = useRef(links);
  const wordRef = useRef(lex.text);
  useEffect(() => {
    linksRef.current = links;
    wordRef.current = lex.text;
  });

  // The web builds itself: the word first, then one idea a second, each said aloud.
  useEffect(() => {
    if (phase !== 'web') return;
    const list = linksRef.current;
    const mine: ReturnType<typeof setTimeout>[] = [];
    mine.push(setTimeout(() => say(speakable(wordRef.current)), 300));
    list.forEach((l, i) => {
      mine.push(
        setTimeout(
          () => {
            setShown(i + 1);
            setLit(i);
            buzz.light();
            say(l);
          },
          1250 + i * ARRIVE_MS,
        ),
      );
    });
    mine.push(setTimeout(() => setLit(-1), 1250 + list.length * ARRIVE_MS));
    timers.current = mine;
    return () => {
      mine.forEach(clearTimeout);
      stopSpeaking();
    };
  }, [phase, run]);

  const webDone = shown >= links.length;

  const replay = () => {
    if (phase === 'web') {
      timers.current.forEach(clearTimeout);
      stopSpeaking();
      setShown(0);
      setLit(-1);
      setRun((r) => r + 1);
    } else say(speakable(lex.text));
  };

  const hearLink = (i: number) => {
    setLit(i);
    say(links[i], { onDone: () => setLit((l) => (l === i ? -1 : l)) });
  };

  const forward = () => {
    if (phase === 'web' && hasPics) {
      timers.current.forEach(clearTimeout);
      stopSpeaking();
      buddy.react('correct');
      setPhase('pic');
      return;
    }
    next();
  };

  const pick = (emoji: string) => {
    if (hook) return;
    pickHook(emoji);
    buzz.good();
    sfx.play('good');
    buddy.react('unlock');
  };

  const cx = w / 2;
  const cy = WEB_H / 2;
  const spot = (i: number) => ({ x: cx + SPOTS[i].x * Math.max(0, cx - BUBBLE_W / 2), y: cy + SPOTS[i].y * (cy - BUBBLE_H / 2) });
  const canGo = phase === 'web' ? webDone : !!hook || !hasPics;

  return (
    <StepScreen
      top={top}
      gap={18}
      footer={
        <>
          <Controls onReplay={replay} onSkip={skip} />
          <Btn icon={ArrowRight} a11y="Next" onPress={forward} disabled={!canGo} />
        </>
      }>
      {phase === 'web' ? (
        <>
          <View style={{ height: WEB_H, marginTop: 4 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            {w > 0 && (
              <>
                <Svg width={w} height={WEB_H} style={{ position: 'absolute', left: 0, top: 0 }}>
                  {links.map((_, i) => {
                    if (i >= shown) return null;
                    const p = spot(i);
                    return <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={lit === i ? c.ink : c[TONES[i]]} strokeWidth={lit === i ? 5 : 4} strokeLinecap="round" />;
                  })}
                </Svg>

                {links.map((l, i) => {
                  if (i >= shown) return null;
                  const p = spot(i);
                  return (
                    <View key={`${run}-${i}`} style={{ position: 'absolute', left: p.x - BUBBLE_W / 2, top: p.y - BUBBLE_H / 2, width: BUBBLE_W, height: BUBBLE_H, alignItems: 'center', justifyContent: 'center' }}>
                      <Pop from={0.2}>
                        <Tap onPress={() => hearLink(i)} accessibilityRole="button" accessibilityLabel={`Goes with ${lex.text}: ${l}`} style={{ minHeight: BUBBLE_H - 6, maxWidth: BUBBLE_W, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 26, backgroundColor: c[TONES[i]], borderWidth: lit === i ? 3 : 0, borderColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center', borderBottomWidth: lit === i ? 3 : 4, borderBottomColor: lit === i ? ON_BLOCK.ink : 'rgba(14,14,19,0.16)' }}>
                          <Text numberOfLines={2} style={[text('bodyS'), { color: ON_BLOCK.ink, textAlign: 'center', fontFamily: font('s') }]}>
                            {l}
                          </Text>
                        </Tap>
                      </Pop>
                    </View>
                  );
                })}

                <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: cy - 42, height: 84, alignItems: 'center', justifyContent: 'center' }}>
                  <Tap onPress={() => say(speakable(lex.text))} accessibilityRole="button" accessibilityLabel={`${lex.text}. Hear it.`} style={{ height: 84, minWidth: 130, maxWidth: w - 36, paddingHorizontal: 22, borderRadius: 42, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: 'rgba(14,14,19,0.18)' }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font('b'), fontSize: wordSize(lex.text, 28, Math.max(120, w - 90)) * Math.min(scale, 1.1), color: ON_BLOCK.ink }}>
                      {lex.text}
                    </Text>
                  </Tap>
                </View>
              </>
            )}
          </View>

          {!!lex.meaning && <Text style={[text('title'), { color: c.ink }]}>{lex.meaning}</Text>}
        </>
      ) : (
        <>
          <View style={{ marginTop: 6, gap: 14 }}>
            <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 38, 320)} />
            <Txt v="heading" color="ink2">
              Pick your picture
            </Txt>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, height: 170, alignItems: 'center' }}>
            {lex.pics.slice(0, 3).map((e, i) => (
              <PicTile key={e + i} emoji={e} tone={TONES[i]} state={!hook ? 'idle' : hook === e ? 'picked' : 'gone'} onPress={() => pick(e)} word={lex.text} />
            ))}
          </View>

          {!!hook && (
            <View style={{ alignItems: 'center' }}>
              <IconBtn icon={RotateCcw} label="Pick a different picture" size={48} onPress={() => pickHook(null)} />
            </View>
          )}
        </>
      )}
    </StepScreen>
  );
}

/** One picture. Picked, it grows and sparks; passed over, it drops away. */
function PicTile({ emoji, tone, state, onPress, word }: { emoji: string; tone: BlockTone; state: 'idle' | 'picked' | 'gone'; onPress: () => void; word: string }) {
  const { c, reduceMotion } = useTheme();
  const s = useSharedValue(1);
  const y = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    if (state === 'picked') {
      s.set(reduceMotion ? 1.18 : withSpring(1.28, { damping: 8, stiffness: 190 }));
      y.set(0);
      o.set(1);
    } else if (state === 'gone') {
      s.set(reduceMotion ? 0.8 : withTiming(0.7, { duration: 320 }));
      y.set(reduceMotion ? 0 : withTiming(70, { duration: 360, easing: Easing.in(Easing.quad) }));
      o.set(withTiming(reduceMotion ? 0.25 : 0, { duration: reduceMotion ? 0 : 320 }));
    } else {
      s.set(reduceMotion ? 1 : withSpring(1, { damping: 12, stiffness: 180 }));
      y.set(reduceMotion ? 0 : withSpring(0, { damping: 13, stiffness: 170 }));
      o.set(withTiming(1, { duration: reduceMotion ? 0 : 180 }));
    }
  }, [state, reduceMotion, s, y, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Animated.View style={anim} pointerEvents={state === 'gone' ? 'none' : 'auto'}>
      <Tap onPress={onPress} disabled={state !== 'idle'} accessibilityRole="button" accessibilityState={{ selected: state === 'picked' }} accessibilityLabel={`${emoji} as your picture for ${word}`} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c[tone], alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6, borderBottomColor: 'rgba(14,14,19,0.16)' }}>
        <Text style={{ fontSize: 48, lineHeight: 60 }} allowFontScaling={false}>
          {emoji}
        </Text>
      </Tap>
      {state === 'picked' && <Burst size={200} count={12} />}
    </Animated.View>
  );
}
