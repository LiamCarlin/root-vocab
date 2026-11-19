import { router } from 'expo-router';
import { ArrowRight, Check, CircleQuestionMark, Lightbulb, LogOut, Mic, Play, SkipForward, Volume2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';

import { Figure } from '@/components/Buddy';
import type { Pose } from '@/components/Mascot';
import { Pop, Wiggle } from '@/components/fx';
import { Controls, SylWord } from '@/components/learn';
import { Block, Btn, Field, IconBtn, Rise, Screen, Sheet, Tag, TopBar, Txt } from '@/components/ui';
import { STRANDS, TOPICS, type Strand } from '@/data/profile';
import { BANK, type BankWord } from '@/data/words';
import { buzz, listenOnce, micAvailable, say, speakable, stopListening, stopSpeaking } from '@/lib/audio';
import { useHoldUnlocks } from '@/lib/unlocks';
import { assessNext, bumpSkill, difficulty } from '@/lib/engine';
import { closeEnough, gapped, judgeSpoken, levenshtein, plain } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';

const ORDER: Strand[] = ['know', 'find', 'spell'];
/** Items per strand. Enough for the level to settle, short enough to finish in about three minutes. */
const PER = 6;
const START = 2.5;
/** Placement moves the level faster than everyday practice does. */
const K = 0.6;
/** The first few items of each part move it faster still, so a strong learner can place high and a new one low. */
const K_EARLY = 1.0;
const EARLY = 3;
const POSE: Record<Strand, Pose> = { know: 'read', find: 'search', spell: 'write' };

type Item = { word: BankWord; /** Know only: three meanings, one of them right. */ options: string[] };
type Result = { r: 0 | 0.5 | 1; skipped?: boolean };
type St = { si: number; n: number; inter: boolean; theta: Record<Strand, number>; used: string[]; missed: string[]; item: Item | null; res: Result | null };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** The next item for a strand. For Know it also picks two other meanings from words about as common. */
function makeItem(strand: Strand, theta: number, used: string[]): Item | null {
  const word = assessNext(strand, theta, used);
  if (!word) return null;
  if (strand !== 'know') return { word, options: [] };
  const near = BANK.filter((b) => b.id !== word.id && Math.abs(b.level - word.level) <= 1 && b.meaning !== word.meaning);
  const samePos = near.filter((b) => b.pos === word.pos);
  const pool = samePos.length >= 2 ? samePos : near.length >= 2 ? near : BANK.filter((b) => b.id !== word.id);
  if (pool.length < 2) return { word, options: [word.meaning] };
  const h = hash(word.id);
  const a = pool[h % pool.length];
  const rest = pool.filter((b) => b.id !== a.id && b.meaning !== a.meaning);
  const b = rest[(h >>> 5) % rest.length] ?? a;
  const opts = [word.meaning, a.meaning, b.meaning];
  const k = h % 3; // where the right one lands
  return { word, options: [...opts.slice(k), ...opts.slice(0, k)] };
}

/**
 * The placement. Three short parts (know, find, spell), each adapting to the answers:
 * a right answer brings a harder word, a miss an easier one. It measures; it does not
 * mark. No timer, no score, no red. Every item can be skipped.
 */
export default function Placement() {
  const place = useStore((s) => s.place);
  useHoldUnlocks(true);

  const [st, setSt] = useState<St>(() => ({ si: 0, n: 0, inter: true, theta: { know: START, find: START, spell: START }, used: [], missed: [], item: makeItem('know', START, []), res: null }));
  const [leaving, setLeaving] = useState(false);
  const strand = ORDER[Math.min(st.si, ORDER.length - 1)];
  const meta = STRANDS[strand];

  useEffect(
    () => () => {
      stopSpeaking();
      stopListening();
    },
    [],
  );

  // Android back: ask before dropping a placement that is under way.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaving(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  const finish = (theta: Record<Strand, number>, missed: string[]) => {
    stopSpeaking();
    stopListening();
    place({ skill: theta, missed });
    router.replace('/onboarding/placement-result');
  };

  /** Books the answer, moves the level, and brings up the next item (or the next part, or the end). */
  const advance = (given?: Result) => {
    const res = given ?? st.res;
    const item = st.item;
    if (!item || !res) return;
    stopSpeaking();
    stopListening();
    const theta = { ...st.theta, [strand]: bumpSkill(st.theta[strand], difficulty(item.word, strand), res.r, st.n < EARLY ? K_EARLY : K) };
    const used = [...st.used, item.word.id];
    // A word missed in Know or Find goes to the front of the learning queue. A skip says nothing either way.
    const missed = res.r === 0 && !res.skipped && strand !== 'spell' ? [...st.missed, item.word.id] : st.missed;
    let si = st.si;
    let n = st.n + 1;
    let inter = false;
    if (n >= PER) {
      si += 1;
      n = 0;
      inter = true;
    }
    if (si >= ORDER.length) return finish(theta, missed);
    const next = makeItem(ORDER[si], theta[ORDER[si]], used);
    if (!next) return finish(theta, missed);
    if (inter) sfx.play('whoosh');
    else {
      // A small beat between items. Root looks up for each new one; it never judges an answer here.
      sfx.play('pop');
    }
    setSt({ si, n, inter, theta, used, missed, item: next, res: null });
  };

  const answer = (res: Result) => {
    if (st.res) return;
    buzz.tap();
    sfx.play('tap');
    setSt({ ...st, res });
  };

  // A right answer moves on by itself after a beat. Anything else waits for Next, so the right answer can be read.
  const latest = useRef(advance);
  useEffect(() => {
    latest.current = advance;
  });
  const right = st.res?.r === 1;
  useEffect(() => {
    if (!right) return;
    const t = setTimeout(() => latest.current(), 1100);
    return () => clearTimeout(t);
  }, [right, st.item]);

  const bars = (
    <View style={{ flex: 1, flexDirection: 'row', gap: 6 }} accessibilityRole="progressbar" accessibilityLabel={`Part ${st.si + 1} of 3, ${meta.label}. Word ${Math.min(st.n + 1, PER)} of ${PER}.`}>
      {ORDER.map((id, i) => {
        const fill = i < st.si ? 1 : i > st.si || st.inter ? 0 : (st.n + (st.res ? 1 : 0)) / PER;
        return <ProgressBar key={id} strand={id} fill={fill} onTone={st.inter} />;
      })}
    </View>
  );

  const leave = (
    <Sheet visible={leaving} onClose={() => setLeaving(false)} title="Leave?">
      <Btn icon={Play} label="Stay" onPress={() => setLeaving(false)} />
      <Btn
        kind="soft"
        icon={LogOut}
        label="Leave"
        onPress={() => {
          setLeaving(false);
          if (router.canGoBack()) router.back();
          else router.replace('/onboarding/placement-intro');
        }}
      />
    </Sheet>
  );

  // Between parts: Root says which strand is next, in that strand's colour.
  if (st.inter || !st.item) {
    return (
      <>
        <Screen tone={meta.tone} scroll={false} top={<TopBar back="close" onBack={() => setLeaving(true)} center={bars} />} footer={<Btn icon={Play} a11y={`Start the ${meta.label} part`} onPress={() => setSt({ ...st, inter: false })} />}>
          <View key={strand} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            <Figure pose={POSE[strand]} size={180} />
            <Pop delay={160}>
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
                <meta.icon size={34} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </Pop>
            <Rise i={2}>
              <Txt v="hero" center accessibilityRole="header">
                {meta.label}
              </Txt>
            </Rise>
            <Txt v="label" color="ink2">
              {st.si + 1} / {ORDER.length}
            </Txt>
          </View>
        </Screen>
        {leave}
      </>
    );
  }

  const item = st.item;
  return (
    <>
      <Screen
        keyboard
        gap={14}
        top={<TopBar back="close" onBack={() => setLeaving(true)} center={bars} right={<IconBtn icon={SkipForward} label="Skip this word" size={48} disabled={!!st.res} onPress={() => advance({ r: 0, skipped: true })} />} />}
        footer={st.res ? <Btn icon={ArrowRight} a11y="Next" onPress={() => advance()} /> : undefined}>
        {strand === 'know' && <KnowItem key={item.word.id} item={item} res={st.res} onAnswer={answer} />}
        {strand === 'find' && <FindItem key={item.word.id} item={item} res={st.res} onAnswer={answer} />}
        {strand === 'spell' && <SpellItem key={item.word.id} item={item} res={st.res} onAnswer={answer} />}
      </Screen>
      {leave}
    </>
  );
}

function ProgressBar({ strand, fill, onTone }: { strand: Strand; fill: number; onTone: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: onTone ? 'rgba(14,14,19,0.16)' : c.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%`, height: 10, borderRadius: 5, backgroundColor: onTone ? ON_BLOCK.ink : c[STRANDS[strand].tone] }} />
    </View>
  );
}

type ItemProps = { item: Item; res: Result | null; onAnswer: (r: Result) => void };

/** The word shown plainly once an item is answered: a tick when it was right, a quiet dot when it was not. */
function Reveal({ word, ok }: { word: BankWord; ok: boolean }) {
  const { c } = useTheme();
  return (
    <Rise>
      <Block pad={22} style={{ alignItems: 'center', gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ok ? c.mint : c.surface2, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={ok ? 'Got it' : 'Noted'}>
            {ok ? <Check size={18} color={ON_BLOCK.ink} strokeWidth={3.2} /> : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.ink3 }} />}
          </View>
          <IconBtn icon={Volume2} label={`Hear ${word.text}`} kind="soft" size={46} onPress={() => say(speakable(word.text))} />
        </View>
        <SylWord text={word.text} parts={word.parts} size={wordSize(word.text, 40, 280)} />
        <Txt v="bodyS" color="ink2" style={{ alignSelf: 'stretch' }}>
          {cap(word.meaning)}
        </Txt>
      </Block>
    </Rise>
  );
}

// ── Know: what does it mean? ──────────────────────────────────────────────
function KnowItem({ item, res, onAnswer }: ItemProps) {
  const { c } = useTheme();
  const w = item.word;
  const [picked, setPicked] = useState(-1);

  // Reading the word should not get in the way of knowing it, so it is said out loud.
  useEffect(() => {
    const t = setTimeout(() => say(speakable(w.text)), 350);
    return () => clearTimeout(t);
  }, [w.text]);

  return (
    <>
      <Rise>
        <Block pad={22} style={{ alignItems: 'center', gap: 16 }}>
          <SylWord text={w.text} parts={w.parts} size={wordSize(w.text, 42, 290)} />
          <IconBtn icon={Volume2} label={`Hear ${w.text}`} kind="ink" size={56} onPress={() => say(speakable(w.text))} />
        </Block>
      </Rise>
      {item.options.map((m, i) => {
        const isRight = m === w.meaning;
        const shown = !!res;
        const mine = picked === i;
        return (
          <Rise key={m} i={i + 1}>
            <Block
              tone={shown && isRight ? 'mint' : shown && mine ? 'soft' : 'surface'}
              pad={18}
              onPress={
                shown
                  ? undefined
                  : () => {
                      setPicked(i);
                      onAnswer({ r: isRight ? 1 : 0 });
                    }
              }
              a11y={`${cap(m)}${shown && isRight ? '. This is the meaning.' : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 }}>
              <Txt v="body" style={{ flex: 1 }}>
                {cap(m)}
              </Txt>
              {shown && isRight && (
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={16} color="#FFFFFF" strokeWidth={3.2} />
                </View>
              )}
              {shown && mine && !isRight && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.ink3, marginRight: 10 }} />}
            </Block>
          </Rise>
        );
      })}
      {!res && <Btn kind="ghost" small icon={CircleQuestionMark} label="Not sure" a11y="I am not sure what it means" onPress={() => onAnswer({ r: 0 })} />}
    </>
  );
}

// ── Find: the clue is there; can the word come out? ───────────────────────
function FindItem({ item, res, onAnswer }: ItemProps) {
  const { c, syl, font } = useTheme();
  const w = item.word;
  const topic = TOPICS[w.topics[0]];
  const [text, setText] = useState('');
  const [cue, setCue] = useState(false);
  const [tries, setTries] = useState(0);
  const [listening, setListening] = useState(false);
  const canSpeak = micAvailable();

  /** Spelling never fails a recall: anything that sounds like the word counts. */
  const judge = (attempt: string, spoken = false) => {
    if (res || !attempt.trim()) return;
    const hit = closeEnough(attempt, w.text, w.lookalikes) || (spoken && judgeSpoken(attempt, w.text) !== 'miss');
    if (hit) return onAnswer({ r: cue || tries > 0 ? 0.5 : 1 });
    // One more go before it counts as not found.
    if (tries >= 1) return onAnswer({ r: 0 });
    buzz.light();
    setTries(tries + 1);
  };

  const listen = async () => {
    if (listening) {
      stopListening();
      return;
    }
    setListening(true);
    const heard = await listenOnce({ hints: [w.text], maxMs: 7000 });
    setListening(false);
    if (heard.ok) {
      setText(heard.transcript);
      judge(heard.transcript, true);
    }
  };

  const giveCue = () => {
    setCue(true);
    sfx.play('pop');
    say(w.says[0]);
  };

  return (
    <>
      <Rise>
        <Block tone="pink" pad={22} style={{ gap: 14, alignItems: 'flex-start' }}>
          {topic && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(14,14,19,0.1)', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 }}>
              <topic.icon size={14} color={ON_BLOCK.ink} strokeWidth={2.5} />
              <Txt v="caption">{topic.label}</Txt>
            </View>
          )}
          <Txt v="title">{w.clue}</Txt>
        </Block>
      </Rise>

      {res ? (
        <Reveal word={w} ok={res.r > 0} />
      ) : (
        <>
          {cue && (
            <Rise>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }} accessible accessibilityLabel={`${w.parts.length} ${w.parts.length === 1 ? 'beat' : 'beats'}. It starts with ${w.says[0]}.`}>
                {w.parts.map((p, i) => (
                  <View key={i} style={{ minWidth: 58, height: 58, borderRadius: radius.md, paddingHorizontal: 14, backgroundColor: i === 0 ? syl(0) : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    {i === 0 ? <Txt style={{ fontFamily: font('b'), fontSize: 22, color: ON_BLOCK.ink }}>{p}</Txt> : <View style={{ width: 22, height: 5, borderRadius: 3, backgroundColor: c.ink3 }} />}
                  </View>
                ))}
              </View>
            </Rise>
          )}
          <Rise i={1}>
            <Wiggle trigger={tries}>
              <Field
                big
                value={text}
                onChangeText={setText}
                placeholder="Type the word"
                accessibilityLabel="Type the word the clue points to. Spelling does not matter here."
                returnKeyType="done"
                style={{ minWidth: 0 }}
                onSubmitEditing={() => judge(text)}
                right={<IconBtn icon={Check} label="Check" kind="ink" size={50} disabled={!text.trim()} onPress={() => judge(text)} />}
              />
            </Wiggle>
          </Rise>
          {tries > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <Tag label="One more try" />
            </View>
          )}
          <Rise i={2} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {canSpeak && <IconBtn icon={Mic} label={listening ? 'Stop listening' : 'Say the word'} kind="orange" active={listening} onPress={listen} />}
            <IconBtn icon={Lightbulb} label="Give me a cue: the number of beats and the first sound" kind="butter" disabled={cue} onPress={giveCue} />
            <Btn kind="ghost" small label="It won’t come" a11y="The word will not come. Show it." flex={1} onPress={() => onAnswer({ r: 0 })} />
          </Rise>
        </>
      )}
    </>
  );
}

// ── Spell: hear it, write it ──────────────────────────────────────────────
function SpellItem({ item, res, onAnswer }: ItemProps) {
  const w = item.word;
  const [text, setText] = useState('');

  useEffect(() => {
    const t = setTimeout(() => say(speakable(w.text)), 350);
    return () => clearTimeout(t);
  }, [w.text]);

  const judge = () => {
    if (res || !text.trim()) return;
    const a = text.trim().toLowerCase();
    const b = w.text.toLowerCase();
    onAnswer({ r: a === b ? 1 : levenshtein(a, b) <= 1 ? 0.5 : 0 });
  };

  return (
    <>
      <Rise>
        <Block pad={20} style={{ gap: 16 }}>
          <Controls onReplay={() => say(speakable(w.text))} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Txt v="body" style={{ flex: 1 }}>
              {res ? plain(w.life) : gapped(w.life)}
            </Txt>
            <IconBtn icon={Volume2} label="Hear the sentence" kind="soft" size={46} onPress={() => say(plain(w.life))} />
          </View>
        </Block>
      </Rise>
      {res ? (
        <Reveal word={w} ok={res.r === 1} />
      ) : (
        <Rise i={1}>
          <Field
            big
            value={text}
            onChangeText={setText}
            placeholder="Write the word"
            accessibilityLabel="Write the word you heard"
            returnKeyType="done"
            style={{ minWidth: 0 }}
            onSubmitEditing={judge}
            right={<IconBtn icon={Check} label="Check" kind="ink" size={50} disabled={!text.trim()} onPress={judge} />}
          />
        </Rise>
      )}
    </>
  );
}
