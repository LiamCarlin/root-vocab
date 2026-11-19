import { router, useLocalSearchParams } from 'expo-router';
import { Check, Drum, Ear, Globe, Lightbulb, Map, Mic, Play, RotateCcw, Search, Send, ShieldCheck, Smartphone, Square, Volume2, WifiOff, X, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';

import { Reaction } from '@/components/Buddy';
import { Burst } from '@/components/fx';
import { SylWord } from '@/components/learn';
import { Growth, Mascot } from '@/components/Mascot';
import { Block, Btn, Chip, ChipRow, Field, Group, IconBtn, Rise, Row, Screen, Sheet, Tag, Tap, TopBar, Txt, useToast } from '@/components/ui';
import { BANK_BY_ID } from '@/data/words';
import { buzz, listenOnce, micAvailable, say, speakable, stopListening, stopSpeaking } from '@/lib/audio';
import { findWord, type FindMode, type FindResult, type Found } from '@/lib/finder';
import { syllabify } from '@/lib/lexicon';
import { sfx } from '@/lib/sfx';
import { growth, useStore, type UserWord } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, wordSize } from '@/theme';

const MODES: Record<FindMode, { label: string; a11y: string; icon: LucideIcon; hint: string; tries: string[] }> = {
  describe: { label: 'Describe it', a11y: 'Describe the word: type what it means', icon: Lightbulb, hint: 'what it means', tries: ['put off doing something', 'bowl with holes for pasta'] },
  sounds: { label: 'Sounds like', a11y: 'Sounds like: type the word the way it sounds', icon: Ear, hint: 'how it sounds', tries: ['fizishun', 'nesesery'] },
};
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const STATUS: Record<UserWord['status'], string> = { queued: 'Waiting', learning: 'Growing', known: 'Rooted', removed: 'Removed' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Bank splits are hand-made. For other words the rough split is only shown when it agrees with the dictionary's beat count: no split is better than a wrong one. */
const partsOf = (f: Found) => {
  const bank = BANK_BY_ID[f.id]?.parts;
  if (bank) return bank;
  const guess = syllabify(f.text);
  return guess.length === f.beats ? guess : [f.text];
};

/**
 * The Finder. “I know the word, I just can't get it.”
 * Describe it, or type it the way it sounds, and Root goes looking.
 */
export default function Finder() {
  const params = useLocalSearchParams<{ q?: string; mode?: string }>();
  const { c, scale } = useTheme();
  // At the larger text sizes the two labels need the width more than Root does.
  const roomy = scale > 1.05;
  const toast = useToast();
  const online = useStore((s) => s.finderOnline);
  const words = useStore((s) => s.words);
  const patch = useStore((s) => s.patch);

  const [mode, setMode] = useState<FindMode>(params.mode === 'sounds' ? 'sounds' : 'describe');
  const [q, setQ] = useState(typeof params.q === 'string' ? params.q : '');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<FindResult | null>(null);
  const [asked, setAsked] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [beats, setBeats] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [won, setWon] = useState<{ f: Found; fresh: boolean } | null>(null);
  const [listening, setListening] = useState(false);

  const mic = useMemo(() => micAvailable(), []);
  const run = useRef(0);
  const pending = useRef<{ text: string; mode: FindMode; letter: string | null } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopSpeaking();
      stopListening();
    };
  }, []);

  /** `useOnline` is passed when the answer was only just given; otherwise the stored choice is used. */
  const search = async (text: string, m: FindMode, l: string | null, useOnline?: boolean) => {
    const t = text.trim();
    if (!t) return;
    const allowed = useOnline ?? online;
    if (allowed === null) {
      // Ask once, before anything leaves the phone.
      pending.current = { text: t, mode: m, letter: l };
      Keyboard.dismiss();
      setConsent(true);
      return;
    }
    Keyboard.dismiss();
    stopListening();
    const mine = ++run.current;
    setBusy(true);
    setWon(null);
    setOpen(null);
    setHidden([]);
    setBeats(null);
    const r = await findWord(m, t, { online: allowed, letter: l ?? undefined });
    if (!alive.current || mine !== run.current) return;
    setRes(r);
    setAsked(t);
    setBusy(false);
  };

  const answerConsent = (yes: boolean | null) => {
    setConsent(false);
    if (yes !== null) patch({ finderOnline: yes });
    const p = pending.current;
    pending.current = null;
    // Closing the sheet without choosing searches this device only, this once.
    if (p) void search(p.text, p.mode, p.letter, yes ?? false);
    else if (asked && yes !== null) void search(asked, mode, letter, yes);
  };

  const pickMode = (m: FindMode) => {
    if (m === mode) return;
    setMode(m);
    setLetter(null);
    if (q.trim()) void search(q, m, null);
    else {
      setRes(null);
      setAsked('');
    }
  };

  const pickLetter = (l: string) => {
    const next = letter === l ? null : l;
    setLetter(next);
    void search(asked || q, mode, next);
  };

  const onMic = async () => {
    if (listening) {
      stopListening();
      return;
    }
    Keyboard.dismiss();
    setListening(true);
    const r = await listenOnce({ onPartial: (t) => alive.current && setQ(t.toLowerCase()) });
    if (!alive.current) return;
    setListening(false);
    if (r.ok) {
      const t = r.transcript.trim().toLowerCase();
      setQ(t);
      void search(t, mode, null);
    }
  };

  const hear = (f: Found) => say(speakable(f.text));

  const thatsIt = (f: Found) => {
    const s = useStore.getState();
    const mine = s.words[f.id];
    const inList = !!mine && mine.status !== 'removed';
    if (!inList) s.addWord(f.text, f.inBank ? { origin: 'finder' } : { origin: 'finder', meaning: f.meaning || undefined, pos: f.pos });
    s.bump('finder');
    buzz.good();
    sfx.play('good');
    stopSpeaking();
    setWon({ f, fresh: !inList });
    if (!inList) toast({ text: 'Planted', tone: 'success' });
  };

  const reset = () => {
    run.current++;
    setWon(null);
    setRes(null);
    setAsked('');
    setQ('');
    setLetter(null);
    setBeats(null);
    setBusy(false);
  };

  const all = res?.results ?? [];
  const beatChoices = Array.from(new Set(all.map((f) => f.beats))).sort((a, b) => a - b);
  const shown = all.filter((f) => !hidden.includes(f.id)).filter((f) => beats === null || f.beats === beats);
  const recent = useMemo(
    () =>
      Object.values(words)
        .filter((w) => w.origin === 'finder' && w.status !== 'removed')
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, 6),
    [words],
  );
  const M = MODES[mode];
  const idle = !busy && !res && !won;

  return (
    <Screen
      keyboard
      gap={14}
      top={<TopBar back="close" right={<IconBtn icon={online ? Globe : Smartphone} label={online ? 'Searching online. Change' : online === false ? 'Searching this device only. Change' : 'Choose where to search'} size={48} onPress={() => setConsent(true)} />} />}>
      {/* Two ways in, and Root on the case. */}
      <Block tone="pink" pad={16} style={{ minHeight: 148 }}>
        <View style={{ flexDirection: 'row', gap: roomy ? 8 : 10, paddingRight: roomy ? 58 : 84 }}>
          {(Object.keys(MODES) as FindMode[]).map((m) => {
            const on = m === mode;
            const Icon = MODES[m].icon;
            return (
              <Tap key={m} onPress={() => pickMode(m)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={MODES[m].a11y} style={{ flex: 1, height: 116, borderRadius: radius.lg, backgroundColor: on ? ON_BLOCK.ink : 'rgba(255,255,255,0.5)', padding: roomy ? 10 : 12, justifyContent: 'space-between' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? c.orange : 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color={ON_BLOCK.ink} strokeWidth={2.4} />
                </View>
                <Txt v="bodyS" style={{ color: on ? '#FFFFFF' : ON_BLOCK.ink, letterSpacing: 0 }} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {MODES[m].label}
                </Txt>
              </Tap>
            );
          })}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', right: 2, bottom: -10 }}>
          <Mascot pose={mode === 'describe' ? 'search' : 'listen'} size={roomy ? 104 : 136} />
        </View>
      </Block>

      <Field
        value={q}
        onChangeText={setQ}
        placeholder={M.hint}
        returnKeyType="search"
        onSubmitEditing={() => void search(q, mode, null)}
        accessibilityLabel={M.a11y}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {mic && <IconBtn icon={listening ? Square : Mic} label={listening ? 'Stop listening' : 'Say it instead'} size={44} kind={listening ? 'orange' : 'soft'} onPress={onMic} />}
            <IconBtn icon={Search} label="Find" size={44} kind="ink" disabled={!q.trim()} onPress={() => void search(q, mode, null)} />
          </View>
        }
      />

      {/* Before a search: things to try, and what was found before. */}
      {idle && (
        <>
          {!q.trim() && (
            <ChipRow>
              {M.tries.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  icon={M.icon}
                  onPress={() => {
                    setQ(t);
                    void search(t, mode, null);
                  }}
                />
              ))}
            </ChipRow>
          )}
          {recent.length > 0 && (
            <Rise>
              <Group>
                {recent.map((w, i) => (
                  <Row key={w.id} title={w.text} left={<Growth stage={growth(w)} size={40} />} right={<Tag label={STATUS[w.status]} />} onPress={() => router.push(`/word/${w.id}`)} last={i === recent.length - 1} />
                ))}
              </Group>
            </Rise>
          )}
        </>
      )}

      {busy && (
        <View style={{ gap: 10 }} accessible accessibilityLabel="Looking" accessibilityLiveRegion="polite">
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ height: 78, borderRadius: radius.lg, backgroundColor: c.surface2, opacity: 0.9 - i * 0.25 }} />
          ))}
        </View>
      )}

      {/* Found it. */}
      {won && <Won found={won.f} fresh={won.fresh} status={words[won.f.id]?.status ?? 'queued'} stage={words[won.f.id] ? growth(words[won.f.id]) : 0} onAgain={reset} />}

      {!busy && res && !won && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Tag label={res.fellBack ? 'Offline' : res.source === 'online' ? 'Online' : 'This device'} icon={res.fellBack ? WifiOff : res.source === 'online' ? Globe : Smartphone} />
            {beatChoices.length > 1 &&
              beatChoices.map((b) => (
                <Tap key={b} onPress={() => setBeats(beats === b ? null : b)} accessibilityRole="button" accessibilityState={{ selected: beats === b }} accessibilityLabel={`${b} ${b === 1 ? 'beat' : 'beats'}`} style={{ height: 38, paddingHorizontal: 12, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: beats === b ? c.ink : c.surface, borderWidth: 1, borderColor: beats === b ? c.ink : c.line }}>
                  {Array.from({ length: Math.min(b, 6) }, (_, i) => (
                    <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: beats === b ? c.onInk : c.ink }} />
                  ))}
                </Tap>
              ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingVertical: 2 }} accessibilityLabel="First letter">
            {LETTERS.map((l) => {
              const on = letter === l;
              return (
                <Tap key={l} onPress={() => pickLetter(l)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Starts with ${l}`} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.line }}>
                  <Txt v="bodyS" style={{ color: on ? c.onInk : c.ink }}>
                    {l}
                  </Txt>
                </Tap>
              );
            })}
          </ScrollView>

          {shown.length > 0 ? (
            shown.map((f, i) => {
              const mine = words[f.id];
              const inList = !!mine && mine.status !== 'removed';
              return (
                <Rise key={f.id} i={i}>
                  <Card
                    f={f}
                    open={open === f.id}
                    status={inList ? mine.status : null}
                    stage={inList ? growth(mine) : 0}
                    onToggle={() => {
                      const next = open === f.id ? null : f.id;
                      setOpen(next);
                      if (next) hear(f);
                    }}
                    onHear={() => hear(f)}
                    onYes={() => thatsIt(f)}
                    onNo={() => {
                      setHidden((h) => [...h, f.id]);
                      setOpen(null);
                    }}
                  />
                </Rise>
              );
            })
          ) : (
            <Block tone="butter" pad={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Mascot pose="think" size={112} />
              <View style={{ flex: 1, gap: 12, alignItems: 'flex-start' }}>
                <Txt v="title">No match</Txt>
                {letter || beats !== null ? (
                  <Btn
                    small
                    kind="white"
                    icon={X}
                    label="Clear filters"
                    onPress={() => {
                      setBeats(null);
                      if (letter) pickLetter(letter);
                    }}
                  />
                ) : (
                  <Btn small kind="white" icon={MODES[mode === 'describe' ? 'sounds' : 'describe'].icon} label={MODES[mode === 'describe' ? 'sounds' : 'describe'].label} onPress={() => pickMode(mode === 'describe' ? 'sounds' : 'describe')} />
                )}
              </View>
            </Block>
          )}
        </>
      )}

      {/* Asked once, before the first search. Reachable again from the button in the top bar. */}
      <Sheet visible={consent} onClose={() => answerConsent(null)} title="Search online?">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mascot pose="search" size={108} />
          <View style={{ flex: 1, gap: 12 }}>
            <Line icon={Send} text="Sends your typing" a11y="Sent: only the words you type here, to api.datamuse.com." />
            <Line icon={ShieldCheck} text="Nothing else, ever" a11y="Never sent: your name, your word list or anything else. No account." />
          </View>
        </View>
        <Btn icon={Globe} label="Search online" onPress={() => answerConsent(true)} />
        <Btn kind="soft" icon={Smartphone} label="This device only" onPress={() => answerConsent(false)} />
      </Sheet>
    </Screen>
  );
}

function Line({ icon: Icon, text, a11y }: { icon: LucideIcon; text: string; a11y?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }} accessible accessibilityLabel={a11y ?? text}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={c.ink} strokeWidth={2.4} />
      </View>
      <Txt v="bodyS" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}

/** One candidate. Tap to open it; the hear button sits beside, never inside, the tap target. */
function Card({ f, open, status, stage, onToggle, onHear, onYes, onNo }: { f: Found; open: boolean; status: UserWord['status'] | null; stage: 0 | 1 | 2 | 3; onToggle: () => void; onHear: () => void; onYes: () => void; onNo: () => void }) {
  const { c, e1 } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: open ? 2 : 1, borderColor: open ? c.ink : c.line, overflow: 'hidden' }, e1]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: open ? 15 : 16 }}>
        <Tap onPress={onToggle} scaleTo={0.98} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${f.text}${f.meaning ? `. ${f.meaning}` : ''}`} style={{ flex: 1, gap: 6, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {status && <Growth stage={stage} size={30} />}
            <SylWord text={f.text} parts={partsOf(f)} size={wordSize(f.text, 28, 230)} />
          </View>
          {!open && !!f.meaning && (
            <Txt v="bodyS" color="ink2" numberOfLines={1}>
              {cap(f.meaning)}
            </Txt>
          )}
        </Tap>
        <IconBtn icon={Volume2} label={`Hear ${f.text}`} size={46} kind="soft" onPress={onHear} />
      </View>
      {open && (
        <View style={{ paddingHorizontal: 15, paddingBottom: 15, gap: 12 }}>
          {!!f.meaning && <Txt v="body">{cap(f.meaning)}</Txt>}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {!!f.pos && <Tag label={f.pos} />}
            <Tag label={`${f.beats} ${f.beats === 1 ? 'beat' : 'beats'}`} icon={Drum} />
            {status && <Tag label={STATUS[status]} tint={status === 'known' ? 'mint' : status === 'learning' ? 'brand' : 'butter'} />}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <IconBtn icon={X} label={`Not it: hide ${f.text}`} kind="soft" size={58} onPress={onNo} />
            <Btn icon={Check} label="That’s it" a11y={`That is the word: ${f.text}`} onPress={onYes} flex={1} />
          </View>
        </View>
      )}
    </View>
  );
}

/** The word is off the tip of the tongue. New words are planted; ones already growing go straight to practice. */
function Won({ found: f, fresh, status, stage, onAgain }: { found: Found; fresh: boolean; status: UserWord['status']; stage: 0 | 1 | 2 | 3; onAgain: () => void }) {
  const learned = status === 'learning' || status === 'known';
  const tone = fresh ? 'mint' : 'brand';
  return (
    <Rise>
      <Block tone={tone} pad={20} style={{ gap: 14, alignItems: 'center' }} a11y={`Found: ${f.text}`}>
        <View style={{ height: 172, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Burst size={220} count={14} />
          <Reaction pose={fresh ? 'trophy' : 'cheer'} size={164} />
        </View>
        <SylWord text={f.text} parts={partsOf(f)} size={wordSize(f.text, 38, 280)} color={ON_BLOCK.ink} on={tone} />
        {!!f.meaning && (
          <Txt v="body">
            {cap(f.meaning)}
          </Txt>
        )}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Growth stage={stage} size={30} />
          <Tag label={fresh ? 'On your path' : STATUS[status]} icon={fresh ? Map : undefined} tint="surface" color="ink" />
        </View>
      </Block>
      <View style={{ gap: 10, marginTop: 12 }}>
        {learned ? (
          <Btn icon={Play} label="Practice" a11y={`Practice ${f.text}`} onPress={() => router.replace(`/play/find?words=${f.id}`)} />
        ) : (
          <Btn icon={Play} label="Learn now" a11y={`Learn ${f.text} now`} onPress={() => router.replace(`/mission/${f.id}`)} />
        )}
        <Btn kind="soft" icon={RotateCcw} label="Find another" onPress={onAgain} />
      </View>
    </Rise>
  );
}
