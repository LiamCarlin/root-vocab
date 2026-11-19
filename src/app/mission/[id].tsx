import { router, useLocalSearchParams } from 'expo-router';
import { Home, LogOut, Play } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sidekick } from '@/components/Buddy';
import { Mascot } from '@/components/Mascot';
import { Beats } from '@/components/mission/Beats';
import { Build } from '@/components/mission/Build';
import { Done } from '@/components/mission/Done';
import { LessonBar, LessonLayout } from '@/components/mission/Frame';
import { Hear } from '@/components/mission/Hear';
import { Link } from '@/components/mission/Link';
import { Move } from '@/components/mission/Move';
import { Spell } from '@/components/mission/Spell';
import { stepsFor, type MissionStats, type StepId, type StepProps } from '@/components/mission/types';
import { Use } from '@/components/mission/Use';
import { Btn, Screen, Sheet, TopBar, Txt } from '@/components/ui';
import { buzz, stopListening, stopSpeaking } from '@/lib/audio';
import { buddy, useHoldUnlocks } from '@/lib/buddy';
import { lexemeFor } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { stopForWord, useStore, type StopOutcome } from '@/lib/store';
import { useTheme } from '@/theme';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

type Result = { stats: MissionStats; outcome: StopOutcome | null; first: boolean; steps: StepId[] };

/**
 * The lesson: how a new word is first taught. One route, seven steps, then a celebration:
 * hear → link → beats → build → move → spell → use → done.
 * Each step puts another sense behind the same word. Replay, slower and skip sit in the
 * same place on every step, and Root watches from the corner the whole way through.
 *
 * `/mission/[id]?stop=N` — `stop` is the journey stop this lesson belongs to.
 */
export default function Mission() {
  const params = useLocalSearchParams<{ id: string; stop?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const stopRaw = Array.isArray(params.stop) ? params.stop[0] : params.stop;
  const { reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();

  // Path words are not in `words` until they are learned; the bank resolves them by id.
  const own = useStore((s) => s.words[id]);
  const lex = useMemo(() => lexemeFor(id, own), [id, own]);
  const steps = useMemo(() => (lex ? stepsFor(lex) : []), [lex]);

  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [hook, setHook] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [footerH, setFooterH] = useState(150);
  const stats = useRef<MissionStats>({ hints: 0, retries: 0, skipped: [] });
  const recorded = useRef(false);
  const layout = useMemo(() => ({ setFooter: (h: number) => setFooterH((cur) => (Math.abs(cur - h) > 1 ? h : cur)) }), []);

  // No full-screen celebration may open over a step. They wait for the Done screen, and then a moment more so it gets its own beat first.
  // A lesson that finishes the chapter keeps them back until the story's ending has played.
  useHoldUnlocks(!result || !settled || !!result.outcome?.chapterDone);
  const finished = !!result;
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => setSettled(true), 2400);
    return () => clearTimeout(t);
  }, [finished]);

  useEffect(() => {
    const t = setTimeout(() => buddy.react('start'), 500);
    return () => {
      clearTimeout(t);
      stopSpeaking();
      stopListening();
    };
  }, []);

  // Android back: ask before dropping a lesson that is under way.
  const inProgress = !!lex && !result;
  useEffect(() => {
    if (!inProgress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaving(true);
      return true;
    });
    return () => sub.remove();
  }, [inProgress]);

  const advance = useCallback(
    (skipped: boolean) => {
      stopSpeaking();
      stopListening();
      const step = steps[idx];
      if (skipped && step && !stats.current.skipped.includes(step)) stats.current.skipped.push(step);
      if (idx < steps.length - 1) {
        if (!skipped) sfx.play('pop');
        setIdx(idx + 1);
        return;
      }
      // The one place a lesson is recorded. A double tap on the last button must not record it twice.
      if (recorded.current) return;
      recorded.current = true;
      const final: MissionStats = { ...stats.current, skipped: [...stats.current.skipped] };
      const store = useStore.getState();
      const before = store.words[id];
      const first = !before?.learnedOn;
      // Which journey stop this lesson finishes: the one in the link if it really is this word's, else whichever stop holds the word.
      const asked = stopRaw != null && stopRaw !== '' ? Number(stopRaw) : NaN;
      const named = Number.isInteger(asked) ? store.journey.stops[asked] : undefined;
      const stop = named && named.kind === 'learn' && !named.done && named.wordId === id ? asked : stopForWord(store, id);
      store.completeLesson(id, final);
      if (hook) store.setHook(id, hook);
      const outcome = stop >= 0 ? store.completeStop(stop) : null;
      buzz.good();
      buddy.react('finish');
      setResult({ stats: final, outcome, first, steps });
    },
    [idx, id, steps, stopRaw, hook],
  );

  if (!lex) {
    return (
      <Screen top={<TopBar back="close" onBack={leave} />} footer={<Btn icon={Home} a11y="Back to the journey" onPress={() => router.replace('/(tabs)')} />}>
        <View style={{ alignItems: 'center', gap: 18, marginTop: 60 }}>
          <Mascot pose="search" size={200} />
          <Txt v="title" center>
            Not found
          </Txt>
        </View>
      </Screen>
    );
  }

  if (result) return <Done lex={lex} steps={result.steps} stats={result.stats} outcome={result.outcome} hook={hook} first={result.first} />;

  const step = steps[idx];
  const props: StepProps = {
    lex,
    top: <TopBar back="close" onBack={() => setLeaving(true)} center={<LessonBar total={steps.length + 1} done={idx} />} right={<View style={{ width: 4 }} />} />,
    next: () => advance(false),
    skip: () => advance(true),
    addHint: () => {
      stats.current.hints += 1;
    },
    addRetry: () => {
      stats.current.retries += 1;
    },
    hook,
    pickHook: setHook,
  };

  return (
    <LessonLayout.Provider value={layout}>
      <View style={{ flex: 1 }}>
        <Animated.View key={step} entering={reduceMotion ? undefined : FadeIn.duration(220)} style={{ flex: 1 }}>
          {step === 'hear' && <Hear {...props} />}
          {step === 'link' && <Link {...props} />}
          {step === 'beats' && <Beats {...props} />}
          {step === 'build' && <Build {...props} />}
          {step === 'move' && <Move {...props} />}
          {step === 'spell' && <Spell {...props} />}
          {step === 'use' && <Use {...props} />}
        </Animated.View>

        {/* Root rests on top of the footer, in the corner, for the whole lesson. */}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: footerH + 20 + insets.bottom }}>
          <Sidekick size={104} />
        </View>
      </View>

      <Sheet visible={leaving} onClose={() => setLeaving(false)} title="Leave?">
        <View style={{ alignItems: 'center' }}>
          <Mascot pose="oops" size={130} />
        </View>
        <Btn icon={Play} label="Stay" onPress={() => setLeaving(false)} />
        <Btn
          kind="soft"
          icon={LogOut}
          label="Leave"
          onPress={() => {
            setLeaving(false);
            leave();
          }}
        />
      </Sheet>
    </LessonLayout.Provider>
  );
}
