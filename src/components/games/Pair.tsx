import { ArrowLeftRight, Equal, Volume2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { SylWord } from '@/components/learn';
import { useElapsed, useOnce } from '@/components/play/hooks';
import { Block, IconBtn, Tap, Txt } from '@/components/ui';
import { buzz, say, speakable } from '@/lib/audio';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';
import { Bold } from './spellkit';
import { Meaning } from './Meaning';
import type { GameProps } from './types';

type Kind = 'same' | 'opposite';
const COMMIT = 80;

/**
 * Same or opposite: the word next to one of its neighbours. Deciding how two words relate
 * tightens the links between them, which is what makes a word easier to find later.
 * Swipe the lower card right for "same", left for "opposite", or use the two buttons.
 */
export function Pair(props: GameProps) {
  // A word with no neighbour on file is asked by meaning instead.
  if (!props.lex.same && !props.lex.opposite) return <Meaning {...props} />;
  return <PairGame {...props} />;
}

function PairGame({ lex, onResult, done }: GameProps) {
  const { c, e2, font, reduceMotion } = useTheme();
  const elapsed = useElapsed();
  const kind = useOnce<Kind>(() => (lex.same && lex.opposite ? (Math.random() < 0.5 ? 'same' : 'opposite') : lex.same ? 'same' : 'opposite'));
  const other = kind === 'same' ? lex.same! : lex.opposite!;
  const [picked, setPicked] = useState<Kind | null>(null);
  const sent = useRef(false);
  const start = useRef(0);
  const tx = useSharedValue(0);
  const open = picked !== null || done;

  const answer = (k: Kind) => {
    if (sent.current) return;
    sent.current = true;
    setPicked(k);
    tx.set(withSpring(0, { damping: 16, stiffness: 180 }));
    if (k !== kind) buzz.nudge();
    onResult({
      r: k === kind ? 1 : 0,
      ms: elapsed(),
      note: (
        <Txt v="bodyS">
          <Bold>{lex.text}</Bold>: {lex.meaning}
        </Txt>
      ),
    });
  };

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { rotate: `${tx.value / 22}deg` }] }));
  const sameGlow = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, tx.value / 100)) }));
  const oppGlow = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, -tx.value / 100)) }));

  const Link = kind === 'same' ? Equal : ArrowLeftRight;
  const overlay = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' } as const;

  const button = (k: Kind) => {
    const Icon = k === 'same' ? Equal : ArrowLeftRight;
    const label = k === 'same' ? 'Same' : 'Opposite';
    const isAnswer = open && k === kind;
    const faded = open && k !== kind;
    return (
      <Tap
        onPress={() => answer(k)}
        disabled={open}
        accessibilityRole="button"
        accessibilityLabel={k === 'same' ? 'They mean the same' : 'They are opposites'}
        accessibilityState={{ disabled: open, selected: isAnswer }}
        style={{ flex: 1, alignItems: 'center', gap: 8, opacity: faded ? 0.35 : 1 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: isAnswer ? c.mint : k === 'same' ? c.brand : c.orange, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: isAnswer ? '#8FD3A2' : k === 'same' ? '#7B97E8' : '#D6781F' }}>
          <Icon size={36} color={ON_BLOCK.ink} strokeWidth={2.8} />
        </View>
        <Txt v="heading">{label}</Txt>
      </Tap>
    );
  };

  return (
    <View style={{ flex: 1, gap: 12 }}>
      <Block tone="brand" pad={20} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 112 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 38, 230)} color={ON_BLOCK.ink} on="brand" />
        </View>
        <IconBtn icon={Volume2} label={`Hear ${lex.text}`} kind="ink" size={54} onPress={() => say(speakable(lex.text))} />
      </Block>

      {/* What joins them: a question until answered, then the sign. */}
      <View style={{ alignItems: 'center', marginVertical: -22, zIndex: 2 }}>
        <View style={[{ width: 52, height: 52, borderRadius: 26, backgroundColor: open ? c.mint : c.surface, borderWidth: open ? 0 : 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }, e2]} accessible accessibilityLabel={open ? (kind === 'same' ? 'Same' : 'Opposite') : 'Same or opposite?'}>
          {open ? <Link size={24} color={ON_BLOCK.ink} strokeWidth={2.8} /> : <Text style={{ fontFamily: font('b'), fontSize: 22, color: c.ink }}>?</Text>}
        </View>
      </View>

      <Animated.View
        accessibilityHint="Swipe right for same, left for opposite"
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={() => !open}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          start.current = e.nativeEvent.pageX;
        }}
        onResponderMove={(e) => {
          if (!sent.current) tx.set(e.nativeEvent.pageX - start.current);
        }}
        onResponderRelease={(e) => {
          const dx = e.nativeEvent.pageX - start.current;
          if (dx > COMMIT) answer('same');
          else if (dx < -COMMIT) answer('opposite');
          else tx.set(reduceMotion ? withTiming(0, { duration: 80 }) : withSpring(0, { damping: 16, stiffness: 180 }));
        }}
        onResponderTerminate={() => tx.set(withTiming(0, { duration: 120 }))}
        style={[{ minHeight: 112, borderRadius: radius.xl, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }, e2, cardStyle]}>
        <Txt v="display" style={{ flex: 1, fontSize: wordSize(other, 34, 230) }}>
          {other}
        </Txt>
        <IconBtn icon={Volume2} label={`Hear ${other}`} size={54} onPress={() => say(other)} />
        <Animated.View pointerEvents="none" style={[overlay, { backgroundColor: c.brand }, sameGlow]}>
          <Equal size={64} color={ON_BLOCK.ink} strokeWidth={2.8} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[overlay, { backgroundColor: c.orange }, oppGlow]}>
          <ArrowLeftRight size={64} color={ON_BLOCK.ink} strokeWidth={2.6} />
        </Animated.View>
      </Animated.View>

      <View style={{ flex: 1, minHeight: 8 }} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 4 }}>
        {button('opposite')}
        {button('same')}
      </View>
    </View>
  );
}
