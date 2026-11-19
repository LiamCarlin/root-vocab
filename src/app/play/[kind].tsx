import { router, useLocalSearchParams } from 'expo-router';
import { House, LogOut, Play as PlayIcon, RotateCcw, SkipForward } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Keyboard, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAMES, type GameResult } from '@/components/games';
import { Mascot } from '@/components/Mascot';
import { ComboFlame, ComboPop } from '@/components/play/Combo';
import { FeedbackBar } from '@/components/play/FeedbackBar';
import { HalfwayCard, StartCard } from '@/components/play/Interlude';
import { praise, sessionMeta, type Played } from '@/components/play/meta';
import { SessionDone } from '@/components/play/SessionDone';
import { Bar, Btn, IconBtn, Screen, Sheet, TopBar, Txt } from '@/components/ui';
import { buzz, stopListening, stopSpeaking } from '@/lib/audio';
import { useHoldUnlocks } from '@/lib/unlocks';
import { HANDS, buildSession, type Exercise, type GameId, type SessionKind } from '@/lib/engine';
import { chapterWords, stopWords } from '@/lib/journey';
import { questState, questsToday } from '@/lib/rewards';
import { sfx } from '@/lib/sfx';
import { lexOf, useStore, type SessionSummary, type StopOutcome } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';

const KINDS: SessionKind[] = ['find', 'spell', 'mix', 'challenge', 'game', 'hands'];
const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? '';
const leave = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

type Item = Exercise & { retry?: boolean };
type Phase = 'start' | 'play' | 'half' | 'done';
const LEDGE = 58;
/** The hands-on games are supported practice, not recall: finishing one is simply done. */
const SENSORY: GameId[] = HANDS;

/**
 * The session runner: /play/find, /play/spell, /play/mix, /play/hands, /play/challenge, /play/game?game=clue.
 *
 * It owns everything around an exercise so that every game feels like part of one thing:
 * the arrival card, the progress bar and the run of right answers, the feedback that slides
 * up after each answer, a breath halfway, a second go at
 * anything missed, and the summary. A game only draws its own play area and reports once.
 */
export default function Play() {
  const params = useLocalSearchParams<{ kind: string; stop?: string; game?: string; words?: string }>();
  const kindParam = one(params.kind) as SessionKind;
  const kind: SessionKind = KINDS.includes(kindParam) ? kindParam : 'mix';
  const gameParam = one(params.game);
  const game: GameId | undefined = gameParam in GAMES ? (gameParam as GameId) : undefined;
  const stopParam = one(params.stop);
  const stopIdx = stopParam !== '' && Number.isInteger(Number(stopParam)) ? Number(stopParam) : null;
  const wordsParam = one(params.words);
  const meta = sessionMeta(kind, game);

  const { c, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();

  // The list is built once. Missed words are added to the end as the round goes.
  const [queue, setQueue] = useState<Item[]>(() => {
    const s = useStore.getState();
    const words = wordsParam.split(',').map((w) => w.trim()).filter(Boolean);
    return buildSession(s, kind, { game, words: words.length ? words : kind === 'challenge' || kind === 'hands' ? chapterWords(s) : undefined });
  });
  const [base] = useState(queue.length);
  const [questsBefore] = useState<Record<string, number>>(() => {
    const s = useStore.getState();
    return Object.fromEntries(questsToday(s).map((id) => [id, questState(s, id).have]));
  });
  const [startedAt] = useState(() => Date.now());

  const [phase, setPhase] = useState<Phase>('start');
  const [idx, setIdx] = useState(0);
  const [res, setRes] = useState<GameResult | null>(null);
  const [line, setLine] = useState('');
  const [played, setPlayed] = useState<Played[]>([]);
  const [combo, setCombo] = useState(0);
  const [pop, setPop] = useState<{ n: number; id: number } | null>(null);
  const [halfShown, setHalfShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [end, setEnd] = useState<{ summary: SessionSummary; outcome: StopOutcome | null } | null>(null);
  const [barH, setBarH] = useState(0);

  const ex: Item | undefined = queue[idx];
  const lex = useMemo(() => (ex ? lexOf(useStore.getState(), ex.wordId) : null), [ex]);

  // Badge and level celebrations wait until the summary is on screen. When this round finished the chapter they
  // wait longer still, until the story's ending has played, so the fog lifts once and in the right order.
  useHoldUnlocks(phase !== 'done' || !!end?.outcome?.chapterDone);

  useEffect(
    () => () => {
      stopSpeaking();
      stopListening();
    },
    [],
  );

  // Android back: ask before dropping a round that is under way.
  const inProgress = phase !== 'done' && queue.length > 0;
  useEffect(() => {
    if (!inProgress) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaving(true);
      return true;
    });
    return () => sub.remove();
  }, [inProgress]);

  const finish = (all: Played[]) => {
    const st = useStore.getState();
    const first = all.filter((p) => !p.retry);
    // The stop first, so the summary sees the daily goal as met. Skipping never blocks the path:
    // a round where everything was skipped still clears its stop.
    let outcome: StopOutcome | null = null;
    if (stopIdx !== null && kind !== 'game') {
      const stop = st.journey.stops[stopIdx];
      if (stop && !stop.done && (stop.kind === kind || (stop.kind === 'learn' && !stopWords(stop).length))) outcome = st.completeStop(stopIdx);
    }
    if (!first.length) {
      if (outcome?.chapterDone) router.replace('/story/outro');
      else leave();
      return;
    }
    // `right` counts answers that got there, with or without a cue; `clean` only those right first time, for a perfect round.
    const tally = { kind, total: first.length, right: first.filter((p) => p.r > 0).length, clean: first.filter((p) => p.r === 1).length, ms: Date.now() - startedAt };
    const summary = st.finishSession(tally);
    setEnd({ summary, outcome });
    setPhase('done');
  };

  const advance = (skipped: boolean) => {
    stopSpeaking();
    stopListening();
    setRes(null);
    setBarH(0);
    if (idx + 1 >= queue.length) {
      finish(played);
      return;
    }
    const firstDone = played.filter((p) => !p.retry).length;
    if (!skipped && !halfShown && base >= 6 && idx + 1 < base && firstDone === Math.ceil(base / 2)) {
      setHalfShown(true);
      setPhase('half');
    }
    setIdx(idx + 1);
  };

  const onResult = (r: GameResult) => {
    if (res || !ex || !lex) return;
    Keyboard.dismiss();
    // A game's own skip is the same as the runner's: nothing recorded, no miss, no second go.
    if (r.skipped) {
      advance(true);
      return;
    }
    const st = useStore.getState();
    const retry = !!ex.retry;
    // A second go is practice: it can earn "right with help" at best, and a second miss is not counted twice.
    const scored: 0 | 0.5 | 1 = retry ? (r.r > 0 ? 0.5 : 0) : r.r;
    if (!retry || scored > 0) st.recordAttempt({ id: ex.wordId, strand: ex.strand, r: scored, game: ex.game, ms: r.ms, cue: r.cue });

    const sensory = SENSORY.includes(ex.game) && r.r > 0;
    const run = r.r > 0 ? combo + 1 : 0;
    setCombo(run);
    if (r.r > 0) {
      sfx.play('good');
      if (r.r === 1 || sensory) buzz.good();
      else buzz.light();
    } else {
      sfx.play('miss');
      buzz.nudge();
    }
    if (r.r > 0 && (run === 3 || (run >= 5 && run % 5 === 0))) {
      setPop({ n: run, id: Date.now() });
      setTimeout(() => sfx.play('combo'), 380);
      if (run === 5) st.bump('combo5');
    }

    setLine(sensory ? 'Done' : praise(r.r, ex.strand, retry, played.length));
    // In the round's own tally a finished sensory run is a clean one, so it never spoils a perfect round.
    setPlayed((p) => [...p, { ex, text: lex.text, r: sensory && !retry ? 1 : scored, retry }]);
    if (r.r === 0 && !retry) setQueue((q) => [...q, { ...ex, key: `${ex.key}-again`, retry: true }]);
    setRes(r);
  };

  const leaveSheet = (
    <Sheet visible={leaving} onClose={() => setLeaving(false)} title="Leave?">
      <View style={{ alignItems: 'center' }}>
        <Mascot pose="think" size={130} />
      </View>
      <Btn icon={PlayIcon} label="Stay" onPress={() => setLeaving(false)} />
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
  );

  if (!queue.length) {
    return (
      <Screen top={<TopBar back="close" onBack={leave} />} footer={<Btn icon={House} a11y="Back" onPress={leave} />}>
        <View style={{ alignItems: 'center', gap: 18, marginTop: 60 }}>
          <Mascot pose="think" size={190} />
          <Txt v="title" center>
            Nothing here yet
          </Txt>
        </View>
      </Screen>
    );
  }

  if (phase === 'done' && end) {
    return <SessionDone kind={kind} meta={meta} played={played} summary={end.summary} outcome={end.outcome} questsBefore={questsBefore} onContinue={() => (end.outcome?.chapterDone ? router.replace('/story/outro') : leave())} />;
  }

  if (phase === 'start') return <StartCard meta={meta} total={base} onDone={() => setPhase('play')} />;
  if (phase === 'half') return <HalfwayCard done={played.filter((p) => !p.retry).length} total={base} onDone={() => setPhase('play')} />;

  const def = ex ? GAMES[ex.game] : null;
  const Comp = def?.Comp;
  const GameIcon = def?.icon;
  const progress = (idx + (res ? 1 : 0)) / queue.length;
  // The finished word web stays in view: its play area shrinks to sit above the feedback bar.
  const webLift = res && ex?.game === 'web' ? Math.max(0, barH - LEDGE - Math.max(insets.bottom, 8) - 8) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <Screen
        scroll={false}
        keyboard
        gap={10}
        top={
          <TopBar
            back="close"
            onBack={() => setLeaving(true)}
            center={
              <View style={{ flex: 1 }} accessible accessibilityRole="progressbar" accessibilityLabel={`${Math.min(idx + 1, queue.length)} of ${queue.length}`}>
                <Bar value={progress} height={12} />
              </View>
            }
            right={<ComboFlame n={combo} />}
          />
        }>
        {/* Which game this is: its icon, its colour, its name. */}
        {def && GameIcon && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ height: 36, borderRadius: radius.pill, backgroundColor: c[def.tone], flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14 }} accessible accessibilityRole="header" accessibilityLabel={def.a11y}>
              <GameIcon size={17} color={ON_BLOCK.ink} strokeWidth={2.6} />
              <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 14, color: ON_BLOCK.ink }}>{def.name}</Text>
            </View>
            {ex?.retry && (
              <View style={{ height: 36, borderRadius: radius.pill, backgroundColor: c.butter, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 }} accessible accessibilityLabel="One more go at this word">
                <RotateCcw size={16} color={ON_BLOCK.ink} strokeWidth={2.6} />
                <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 14, color: ON_BLOCK.ink }}>Once more</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ flex: 1 }}>
          {ex && lex && Comp && (
            <Animated.View key={ex.key} entering={reduceMotion ? FadeIn.duration(120) : FadeInRight.duration(260)} style={{ flex: 1, marginBottom: webLift }}>
              <Comp lex={lex} onResult={onResult} done={!!res} />
            </Animated.View>
          )}
          {pop && <ComboPop key={pop.id} n={pop.n} />}
        </View>

        {/* The ledge: skip sits here, under the play area. */}
        <View style={{ height: LEDGE + Math.max(insets.bottom, 8), flexDirection: 'row', alignItems: 'flex-start' }}>
          <IconBtn icon={SkipForward} label="Skip this one" size={46} disabled={!!res} onPress={() => advance(true)} />
        </View>
      </Screen>

      {res && lex && <FeedbackBar res={res} lex={lex} line={line} positive={!!ex && SENSORY.includes(ex.game) && res.r > 0} last={idx + 1 >= queue.length} onContinue={() => advance(false)} onHeight={setBarH} />}
      {leaveSheet}
    </View>
  );
}
