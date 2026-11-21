import { router, useLocalSearchParams } from 'expo-router';
import { Home, LogOut, Play } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { StepBack } from '@/components/learn';
import { Mascot } from '@/components/Mascot';
import { Beats } from '@/components/mission/Beats';
import { Bridge } from '@/components/mission/Bridge';
import { Build } from '@/components/mission/Build';
import { Check } from '@/components/mission/Check';
import { Done, type Taught } from '@/components/mission/Done';
import { LessonBar } from '@/components/mission/Frame';
import { Hear } from '@/components/mission/Hear';
import { Link } from '@/components/mission/Link';
import { Move } from '@/components/mission/Move';
import { Spell } from '@/components/mission/Spell';
import { Together } from '@/components/mission/Together';
import { stepsFor, type MissionStats, type StepProps } from '@/components/mission/types';
import { Use } from '@/components/mission/Use';
import { Btn, Screen, Sheet, TopBar, Txt } from '@/components/ui';
import { trailLine, wordLine } from '@/data/story';
import { buzz, stopListening, stopSpeaking } from '@/lib/audio';
import { canPlay, shouldProbe } from '@/lib/engine';
import { sharedPattern, stopTodo, stopWords } from '@/lib/journey';
import { lexemeFor, type Lexeme } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { clock, note } from '@/lib/signals';
import { stopForWord, useStore, type StopOutcome } from '@/lib/store';
import { useHoldUnlocks } from '@/lib/unlocks';
import { useTheme } from '@/theme';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

type Phase = 'check' | 'word' | 'bridge' | 'together' | 'done';
/** Root offers the check itself at most this many times in one stop, so a stop never turns into a quiz. */
const CHECKS_PER_STOP = 2;
type Plan = { queue: string[]; stop: number; /** Words of the set taught before this visit, and the size of the set. */ before: number; of: number; trail: string; chapter: number };

/**
 * The lesson: how new words are first taught.
 *
 * One word is five steps, each putting another sense behind it:
 * hear → link → move → spell → use.
 *
 * A stop on the journey teaches a small set of words, so the route runs the seven steps for
 * the first word, a short bridge, the five steps for the next, and then one step that mixes
 * the set. A word is recorded as soon as its own steps are done, so leaving half-way loses
 * nothing: the stop picks up at the next word. Replay, slower and skip sit in the same place
 * on every step.
 *
 * `/mission/[id]?stop=N` — `stop` is the journey stop this lesson belongs to. Without one (a
 * word opened from its own page, or from the Finder) the lesson is that one word.
 *
 * Before a word's steps there may be a two-question check ("Know it?"): Root opens with it when
 * the model thinks the learner probably has the word already, and the learner can ask for it on
 * the first step of any new word. A word that passes is rooted and the stop gets a harder one.
 */
export default function MissionRoute() {
  const params = useLocalSearchParams<{ id: string; stop?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const stopRaw = Array.isArray(params.stop) ? params.stop[0] : params.stop;
  // A new word in the link is a new lesson, from the top.
  return <Mission key={id} id={id} stopRaw={stopRaw} />;
}

/** Should Root open this word with the check? Only on the journey, only for a word it thinks is known, and only so often. */
function opensWithCheck(id: string, stop: number): boolean {
  const st = useStore.getState();
  const s = st.journey.stops[stop];
  if (!s || s.kind !== 'learn' || s.checked?.includes(id) || (s.checked?.length ?? 0) >= CHECKS_PER_STOP) return false;
  return shouldProbe(st, id);
}

function Mission({ id, stopRaw }: { id: string; stopRaw?: string }) {
  const { reduceMotion } = useTheme();

  // What this visit will teach, fixed when the screen opens.
  const [plan] = useState<Plan>(() => {
    const st = useStore.getState();
    const asked = stopRaw != null && stopRaw !== '' ? Number(stopRaw) : NaN;
    const named = Number.isInteger(asked) ? st.journey.stops[asked] : undefined;
    // The stop in the link if this word really is waiting on it, else whichever stop holds the word.
    const stop = named && named.kind === 'learn' && !named.done && stopTodo(named).includes(id) ? asked : stopForWord(st, id);
    if (stop < 0) return { queue: [id], stop: -1, before: 0, of: 1, trail: '', chapter: st.journey.chapter };
    const s = st.journey.stops[stop];
    const todo = stopTodo(s);
    const of = stopWords(s).length;
    const nth = st.journey.stops.slice(0, stop).filter((x) => x.kind === 'learn').length;
    return { queue: [id, ...todo.filter((x) => x !== id)], stop, before: of - todo.length, of, trail: trailLine(st.journey.chapter, nth), chapter: st.journey.chapter };
  });

  const [wi, setWi] = useState(0);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(() => (opensWithCheck(id, plan.stop) ? 'check' : 'word'));
  // How long each step and each word takes: the model's read on where the effort goes. Never shown.
  const stepAt = useRef(0);
  const wordAt = useRef(0);
  useEffect(() => {
    stepAt.current = clock();
    wordAt.current = clock();
  }, []);
  const seen = useRef({ hints: 0, retries: 0 });
  const [taught, setTaught] = useState<Taught[]>([]);
  const [outcome, setOutcome] = useState<StopOutcome | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [hook, setHook] = useState<string | null>(null);
  const stats = useRef<MissionStats>({ hints: 0, retries: 0, skipped: [] });
  const recorded = useRef(new Set<string>());
  const closed = useRef(false);

  // Path words are not in `words` until they are learned; the bank resolves them by id.
  const wordId = plan.queue[Math.min(wi, plan.queue.length - 1)];
  const own = useStore((s) => s.words[wordId]);
  const lex = useMemo(() => lexemeFor(wordId, own), [wordId, own]);
  const steps = useMemo(() => (lex ? stepsFor(lex) : []), [lex]);
  // Every lexeme of the set, for the bar, the bridge and the last step.
  const set = useMemo(() => plan.queue.map((w) => lexemeFor(w, useStore.getState().words[w])).filter((l): l is Lexeme => !!l), [plan]);
  const pattern = useMemo(() => sharedPattern(set.map((l) => l.id)), [set]);
  const mixes = set.length > 1;

  // No full-screen celebration may open over a step, or over the Done screen while it is being read.
  // They wait until the learner leaves the lesson, and then play on the journey.
  const finished = phase === 'done';
  useHoldUnlocks(true);

  useEffect(
    () => () => {
      stopSpeaking();
      stopListening();
    },
    [],
  );

  // Android back: ask before dropping a lesson that is under way.
  const inProgress = !!lex && !finished;
  useEffect(() => {
    if (!inProgress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaving(true);
      return true;
    });
    return () => sub.remove();
  }, [inProgress]);

  /** The stop is cleared and the end screen shown. Once only. */
  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    stopSpeaking();
    stopListening();
    const store = useStore.getState();
    setOutcome(plan.stop >= 0 ? store.completeStop(plan.stop) : null);
    buzz.good();
    setPhase('done');
  }, [plan.stop]);

  const advance = useCallback(
    (skipped: boolean) => {
      stopSpeaking();
      stopListening();
      const step = steps[idx];
      if (skipped && step && !stats.current.skipped.includes(step)) stats.current.skipped.push(step);
      if (step) note({ k: 'step', step, ms: clock() - stepAt.current, hints: stats.current.hints - seen.current.hints, retries: stats.current.retries - seen.current.retries, skipped });
      stepAt.current = clock();
      seen.current = { hints: stats.current.hints, retries: stats.current.retries };
      if (idx < steps.length - 1) {
        if (!skipped) sfx.play('pop');
        setIdx(idx + 1);
        return;
      }
      // The one place a word is recorded. A double tap on the last button must not record it twice.
      if (!lex || recorded.current.has(wordId)) return;
      recorded.current.add(wordId);
      const final: MissionStats = { ...stats.current, skipped: [...stats.current.skipped], ms: clock() - wordAt.current };
      const store = useStore.getState();
      const first = !store.words[wordId]?.learnedOn;
      store.completeLesson(wordId, final);
      if (hook) store.setHook(wordId, hook);
      setTaught((t) => [...t, { lex, steps, stats: final, hook, first }]);
      stats.current = { hints: 0, retries: 0, skipped: [] };
      seen.current = { hints: 0, retries: 0 };
      if (wi < plan.queue.length - 1) {
        sfx.play('good');
        setPhase('bridge');
      } else if (mixes) {
        sfx.play('pop');
        setPhase('together');
      } else close();
    },
    [idx, steps, lex, wordId, hook, wi, plan.queue.length, mixes, close],
  );

  /** One step back within the word, to look again at something that went by too fast. Nothing is undone. */
  const back = useCallback(() => {
    if (idx <= 0) return;
    stopSpeaking();
    stopListening();
    stepAt.current = clock();
    setIdx(idx - 1);
  }, [idx]);

  /** The clocks start when a word's own steps do, not while the check is on screen. */
  const startWord = () => {
    stepAt.current = clock();
    wordAt.current = clock();
    setPhase('word');
  };

  const nextWord = () => {
    setHook(null);
    setIdx(0);
    setWi(wi + 1);
    const upcoming = plan.queue[wi + 1];
    if (upcoming && opensWithCheck(upcoming, plan.stop)) beginCheck(upcoming);
    else startWord();
  };

  const beginCheck = (word: string) => {
    if (plan.stop >= 0) useStore.getState().markChecked(plan.stop, word);
    setPhase('check');
  };
  // A check Root opened with is noted on the stop as soon as it is on screen.
  useEffect(() => {
    if (phase === 'check' && plan.stop >= 0) useStore.getState().markChecked(plan.stop, wordId);
  }, [phase, plan.stop, wordId]);

  /** The learner had the word already: it is rooted, and the lesson moves to whatever the stop now holds. */
  const passed = () => {
    const store = useStore.getState();
    store.testOut(wordId);
    if (plan.stop < 0) return leave();
    const stop = useStore.getState().journey.stops[plan.stop];
    const todo = stop && stop.kind === 'learn' && !stop.done ? stopTodo(stop) : [];
    if (todo.length) router.replace(`/mission/${todo[0]}?stop=${plan.stop}`);
    // Nothing harder left to give: close the stop if it taught anything, else just go back.
    else if (stop && stop.kind === 'learn' && !stop.done && stopWords(stop).length) close();
    else leave();
  };

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

  // The trail line, and then the learner's own words turning up in the place.
  if (phase === 'done') return <Done taught={taught} outcome={outcome} story={plan.trail ? [plan.trail, wordLine(plan.chapter, taught.map((t) => t.lex.text))].filter(Boolean).join(' ') : ''} />;

  // One bar for the whole stop: every step of every word, the mixing step, and the end.
  const perWord = set.map((l) => stepsFor(l).length);
  const total = perWord.reduce((a, b) => a + b, 0) + (mixes ? 1 : 0) + 1;
  const before = perWord.slice(0, wi).reduce((a, b) => a + b, 0);
  const doneSteps = phase === 'word' || phase === 'check' ? before + idx : phase === 'bridge' ? before + (perWord[wi] ?? 0) : total - 2;
  // On the first step of a word that is new to the learner: "I know this one", which opens the check.
  const canCheck = phase === 'word' && idx === 0 && !lex.custom && !own?.learnedOn && canPlay(lex, 'meaning') && canPlay(lex, 'dictate');
  const top = (
    <TopBar
      back="close"
      onBack={() => setLeaving(true)}
      center={<LessonBar total={total} done={doneSteps} />}
      right={canCheck ? <Btn kind="white" small label="I know it" a11y="I know this word already. Test me on it." onPress={() => beginCheck(wordId)} /> : <View style={{ width: 4 }} />}
    />
  );

  const step = steps[idx];
  const props: StepProps = {
    lex,
    top,
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
    <>
      <View style={{ flex: 1 }}>
        <StepBack.Provider value={phase === 'word' && idx > 0 ? back : null}>
        <Animated.View key={`${phase}-${wordId}-${step}`} entering={reduceMotion ? undefined : FadeIn.duration(220)} style={{ flex: 1 }}>
          {phase === 'bridge' && set[wi + 1] && <Bridge done={lex} next={set[wi + 1]} at={plan.before + wi + 1} of={plan.of} pattern={pattern} top={top} onNext={nextWord} />}
          {phase === 'together' && <Together words={set} pattern={pattern} top={top} next={close} skip={close} />}
          {phase === 'check' && <Check key={wordId} lex={lex} top={top} onPass={passed} onTeach={startWord} />}
          {phase === 'word' && (
            <>
              {step === 'hear' && <Hear {...props} />}
              {step === 'link' && <Link {...props} />}
              {step === 'beats' && <Beats {...props} />}
              {step === 'build' && <Build {...props} />}
              {step === 'move' && <Move {...props} />}
              {step === 'spell' && <Spell {...props} />}
              {step === 'use' && <Use {...props} />}
            </>
          )}
        </Animated.View>
        </StepBack.Provider>
      </View>

      <Sheet visible={leaving} onClose={() => setLeaving(false)} title="Stop for now?">
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Mascot pose="wave" size={120} />
          <Txt v="body" center>
            {taught.length ? 'The words you finished are saved. You can pick up the rest from the journey.' : 'Nothing is lost. This stop will be waiting on the journey.'}
          </Txt>
        </View>
        <Btn icon={Play} label="Keep going" onPress={() => setLeaving(false)} />
        <Btn
          kind="soft"
          icon={LogOut}
          label="Stop for now"
          onPress={() => {
            setLeaving(false);
            leave();
          }}
        />
      </Sheet>
    </>
  );
}
