import { useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Peek, Reaction } from '@/components/Buddy';
import { Pop } from '@/components/fx';
import { buzz } from '@/lib/audio';
import { buddy } from '@/lib/buddy';
import { sfx } from '@/lib/sfx';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import type { SessionMeta } from './meta';

/** Calls `onDone` once, after `ms`, unless it is called sooner by a tap. */
function useAutoAdvance(ms: number, onDone: () => void): () => void {
  const fired = useRef(false);
  const latest = useRef(onDone);
  useEffect(() => {
    latest.current = onDone;
  });
  const go = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    latest.current();
  }, []);
  useEffect(() => {
    const t = setTimeout(go, ms);
    return () => clearTimeout(t);
  }, [ms, go]);
  return go;
}

function Dots({ total, done, onBlock }: { total: number; done: number; onBlock?: boolean }) {
  const { c } = useTheme();
  const n = Math.min(total, 12);
  const filled = Math.round((done / Math.max(1, total)) * n);
  return (
    <View style={{ flexDirection: 'row', gap: 7 }} accessible accessibilityLabel={`${done} of ${total}`}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i < filled ? ON_BLOCK.ink : onBlock ? 'rgba(14,14,19,0.18)' : c.surface2 }} />
      ))}
    </View>
  );
}

/**
 * The moment before a round: the round's colour fills the screen, its icon drops in, Root arrives.
 * About a second and a half, or a tap.
 */
export function StartCard({ meta, total, onDone }: { meta: SessionMeta; total: number; onDone: () => void }) {
  const { c, reduceMotion } = useTheme();
  const go = useAutoAdvance(reduceMotion ? 1000 : 1500, onDone);
  useEffect(() => {
    sfx.play('whoosh');
    buddy.react('start');
  }, []);
  const Icon = meta.icon;
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={{ flex: 1, backgroundColor: c[meta.tone] }}>
      <Pressable
        onPress={() => {
          buzz.tap();
          go();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${meta.a11y}. ${total} to do. Tap to start.`}
        style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 28 }}>
          <Pop from={0.2}>
            <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={48} color="#FFFFFF" strokeWidth={2.4} />
            </View>
          </Pop>
          <Pop delay={90} from={0.7}>
            <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 34, lineHeight: 40, color: ON_BLOCK.ink, textAlign: 'center' }}>{meta.name}</Text>
          </Pop>
          <Pop delay={160} from={0.7}>
            <Dots total={total} done={0} onBlock />
          </Pop>
          <View style={{ height: 210, justifyContent: 'flex-end' }}>
            <Reaction pose={meta.pose} size={200} delay={220} pokable={false} />
          </View>
        </SafeAreaView>
      </Pressable>
    </Animated.View>
  );
}

/** Halfway through a longer round: one beat to breathe. Root looks over the card, the dots show how far. */
export function HalfwayCard({ done, total, onDone }: { done: number; total: number; onDone: () => void }) {
  const { c, e2, reduceMotion } = useTheme();
  const go = useAutoAdvance(reduceMotion ? 900 : 1300, onDone);
  useEffect(() => {
    sfx.play('pop');
  }, []);
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={{ flex: 1, backgroundColor: c.canvas }}>
      {/* A tap anywhere moves on; Root on the card can still be poked. */}
      <Pressable onPress={go} accessibilityRole="button" accessibilityLabel={`Halfway. ${done} of ${total} done. Tap to keep going.`} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <View pointerEvents="box-none" style={{ width: '100%', maxWidth: 320, marginTop: 90 }}>
          <Pop from={0.6}>
            <View style={[{ backgroundColor: c.butter, borderRadius: radius.xl, paddingVertical: 34, paddingHorizontal: 24, alignItems: 'center', gap: 18 }, e2]}>
              <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 30, lineHeight: 36, color: ON_BLOCK.ink }}>Halfway</Text>
              <Dots total={total} done={done} onBlock />
            </View>
          </Pop>
          <Peek from="top" size={128} align="center" delay={180} />
        </View>
      </View>
    </Animated.View>
  );
}
