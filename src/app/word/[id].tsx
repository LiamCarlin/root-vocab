import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight, Check, Equal, Home, PenLine, Play, RotateCcw, Search, Trash2, Undo2, Volume2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { PartTiles, SylWord } from '@/components/learn';
import { Growth, Mascot } from '@/components/Mascot';
import { Block, Btn, Chip, ChipRow, Field, Group, IconBtn, Ring, Rise, Row, Screen, SectionLabel, Tag, TopBar, Txt, useToast, type Tone } from '@/components/ui';
import { STRAND_ORDER, STRANDS, TOPICS } from '@/data/profile';
import { PATTERNS } from '@/data/words';
import { buzz, sayBeat, sayByParts, stopSpeaking } from '@/lib/audio';
import { sfx } from '@/lib/sfx';
import { noteUi } from '@/lib/signals';
import { relDay } from '@/lib/dates';
import { canPlay } from '@/lib/engine';
import { exampleFor, lexemeFor, meaningOf, plain } from '@/lib/lexicon';
import { growth, stopForWord, today, useStore, type UserWord } from '@/lib/store';
import { ON_BLOCK, useTheme, wordSize, type BlockTone } from '@/theme';

type Stage = UserWord['status'] | 'new';
// Only a rooted word is green (done). Every other state is a plain card; the label says which.
const HERO: Record<Stage, Tone> = { new: 'surface', queued: 'surface', learning: 'surface', known: 'mint', removed: 'soft' };
const STATE: Record<Stage, string> = { new: 'Not started', queued: 'To learn', learning: 'Growing', known: 'Rooted', removed: 'Removed' };
/** Root keeps the word company: how it sits says how the word is doing. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Everything Root knows about one word. Works for a bank word that has not been started yet, too. */
export default function WordPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  const { c } = useTheme();
  const toast = useToast();
  const w = useStore((s) => (id ? s.words[id] : undefined));
  const t = useStore((s) => today(s));
  const interests = useStore((s) => s.profile.interests);
  const companion = useStore((s) => s.display.companion);
  const onPath = useStore((s) => stopForWord(s, id));
  const updateWord = useStore((s) => s.updateWord);

  const lex = useMemo(() => (id ? lexemeFor(id, w) : null), [id, w]);
  // Choosing to look a word up says something about what the learner cares for.
  const lexId = lex?.id;
  useEffect(() => {
    if (lexId) noteUi('wordpage', { topics: lexemeFor(lexId, useStore.getState().words[lexId])?.topics });
  }, [lexId]);
  const [playing, setPlaying] = useState(-1);
  const cancel = useRef<(() => void) | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancel.current?.();
      stopSpeaking();
    };
  }, []);

  const hear = useCallback(() => {
    if (!lex) return;
    cancel.current?.();
    cancel.current = sayByParts(lex.text, lex.says, (i) => alive.current && setPlaying(i));
  }, [lex]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/words'));

  if (!lex) {
    return (
      <Screen top={<TopBar />} scroll={false} footer={<Btn icon={Home} label="My words" a11y="Back to my words" onPress={() => router.replace('/(tabs)/words')} />}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Mascot pose="think" size={200} />
          <Txt v="title" center>
            Not found
          </Txt>
        </View>
      </Screen>
    );
  }

  const stage: Stage = w ? w.status : 'new';
  const tone = HERO[stage];
  const coloured = tone !== 'soft';
  const inList = !!w && w.status !== 'removed';
  const learned = stage === 'learning' || stage === 'known';
  const hook = w?.hook ?? (learned ? lex.pics[0] : undefined);
  const example = exampleFor(lex, interests);
  const canFind = !!lex.clue && canPlay(lex, 'clue');
  const canSpell = canPlay(lex, 'cover');

  const knowIt = () => {
    useStore.getState().markKnown(lex.id);
    buzz.good();
    sfx.play('good');
    toast({ text: `${lex.text}: rooted`, tone: 'success', action: { label: 'Undo', icon: Undo2, onPress: () => useStore.getState().undoKnown(lex.id) } });
  };
  const remove = () => {
    useStore.getState().removeWord(lex.id);
    toast({ text: `${lex.text}: removed`, icon: Trash2, action: { label: 'Undo', icon: Undo2, onPress: () => useStore.getState().restoreWord(lex.id) } });
    back();
  };

  const footer =
    stage === 'removed' ? (
      <Btn icon={Undo2} label="Restore" a11y="Put it back in my words" onPress={() => useStore.getState().restoreWord(lex.id)} />
    ) : learned ? (
      // "Find" alone read like the search button: the row says these are practice rounds for this word.
      <View style={{ gap: 8 }}>
        <Txt v="bodyS" color="ink2" center>
          Practice this word
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Btn icon={Search} label="Find it" a11y={`Practice finding ${lex.text} from its meaning`} disabled={!canFind} onPress={() => router.push(`/play/find?words=${lex.id}`)} flex={1} />
          <Btn icon={PenLine} label="Spell it" kind="soft" a11y={`Practice spelling ${lex.text}`} disabled={!canSpell} onPress={() => router.push(`/play/spell?words=${lex.id}`)} flex={1} />
        </View>
      </View>
    ) : (
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Btn icon={Play} label="Learn" a11y={`Learn ${lex.text} now`} onPress={() => router.push(onPath >= 0 ? `/mission/${lex.id}?stop=${onPath}` : `/mission/${lex.id}`)} flex={1} />
      </View>
    );

  return (
    <Screen
      top={<TopBar />}
      footer={footer}
      keyboard={lex.custom}>
      {/* The word, with Root perched on its card. */}
      <View style={{ position: 'relative', marginTop: companion === 'off' ? 0 : 72 }}>
      <Block tone={tone} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Growth stage={w ? growth(w) : 0} size={56} />
          {hook ? (
            <View accessible accessibilityLabel={`Your picture for this word: ${hook}`} style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 40 }}>{hook}</Text>
            </View>
          ) : (
            <Tag label={STATE[stage]} tint="surface" color="ink" />
          )}
        </View>
        <View style={{ alignItems: 'flex-start' }}>
          <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 42, 290)} active={playing} color={coloured ? ON_BLOCK.ink : undefined} on={coloured ? (tone as BlockTone) : undefined} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <IconBtn icon={Volume2} label="Hear it" kind={coloured ? 'ink' : 'ghost'} onPress={hear} />
        </View>
      </Block>
      </View>

      <Rise i={1}>
      <PartTiles
        parts={lex.parts}
        says={lex.custom ? undefined : lex.says}
        active={playing}
        onPress={(i) => {
          cancel.current?.();
          // Stopping the beat before this one runs its onDone, so the new tile is lit after.
          sayBeat(lex.parts, lex.says, i, { onDone: () => alive.current && setPlaying(-1) });
          setPlaying(i);
        }}
      />
      </Rise>

      {/* Know: what it means, where it lives. */}
      {lex.custom && w ? (
        <Field big value={w.meaning ?? ''} onChangeText={(v) => updateWord(w.id, { meaning: v })} placeholder="Meaning" multiline autoCapitalize="sentences" accessibilityLabel="Your meaning for this word. Saved as you type." />
      ) : (
        !!lex.meaning && (
          <Block style={{ gap: 12 }}>
            <Txt v="title">{cap(lex.meaning)}</Txt>
            {!!lex.pos && (
              <View style={{ flexDirection: 'row' }}>
                <Tag label={lex.pos} />
              </View>
            )}
          </Block>
        )
      )}

      {example && (
        <Rise i={3}>
        <Block style={{ gap: 12 }}>
          <Txt v="body">“{plain(example.text)}”</Txt>
          {example.topic && (
            <View style={{ flexDirection: 'row' }}>
              <Tag label={TOPICS[example.topic].label} icon={TOPICS[example.topic].icon} />
            </View>
          )}
        </Block>
        </Rise>
      )}

      {(lex.links.length > 0 || lex.same || lex.opposite) && (
        <Rise i={4} style={{ gap: 16 }}>
          <SectionLabel>Goes with</SectionLabel>
          {lex.links.length > 0 && (
            <ChipRow>
              {lex.links.map((l, i) => (
                <Chip key={l} label={l} />
              ))}
            </ChipRow>
          )}
          {(lex.same || lex.opposite) && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {lex.same && (
                <Block tone="mint" pad={16} style={{ flex: 1, gap: 8 }} a11y={`Means the same: ${lex.same}`}>
                  <Equal size={22} color={ON_BLOCK.ink} strokeWidth={2.6} />
                  <Txt v="heading">{lex.same}</Txt>
                </Block>
              )}
              {lex.opposite && (
                <Block tone="pink" pad={16} style={{ flex: 1, gap: 8 }} a11y={`The opposite: ${lex.opposite}`}>
                  <ArrowLeftRight size={22} color={ON_BLOCK.ink} strokeWidth={2.6} />
                  <Txt v="heading">{lex.opposite}</Txt>
                </Block>
              )}
            </View>
          )}
        </Rise>
      )}

      {/* Spell: the one beat that trips people up, and why. */}
      {lex.tricky && (
        <Rise i={5} style={{ gap: 16 }}>
          <SectionLabel>Tricky bit</SectionLabel>
          <Block tone="butter" style={{ gap: 14 }}>
            <View style={{ alignItems: 'flex-start' }}>
              <SylWord text={lex.text} parts={lex.parts} size={wordSize(lex.text, 32, 280)} active={lex.tricky.part} color={ON_BLOCK.ink} on="butter" />
            </View>
            <Txt v="body">{lex.tricky.why}</Txt>
            <View style={{ flexDirection: 'row' }}>
              <Tag label={PATTERNS[lex.tricky.pattern].label} tint="surface" color="ink" icon={PenLine} />
            </View>
          </Block>
        </Rise>
      )}

      {lex.lookalikes.length > 0 && (
        <Rise i={6} style={{ gap: 16 }}>
          <SectionLabel>Easy to mix up with</SectionLabel>
          <Group>
            {lex.lookalikes.map((l, i) => {
              const m = meaningOf(l);
              return <Row key={l} title={l} sub={m ? cap(m) : undefined} last={i === lex.lookalikes.length - 1} />;
            })}
          </Group>
        </Rise>
      )}

      {/* How firmly each strand holds, and when it comes back. */}
      {learned && w && (
        <Rise i={7} style={{ gap: 16 }}>
          <SectionLabel>Growth</SectionLabel>
          <Block pad={16} style={{ gap: 12 }}>
            {STRAND_ORDER.map((k) => {
              const m = w.mem[k];
              const box = stage === 'known' ? Math.max(3, m?.box ?? 0) : (m?.box ?? 0);
              const Icon = STRANDS[k].icon;
              const due = m?.due ? (m.due <= t ? 'Review today' : `Review ${relDay(m.due, t)}`) : box >= 4 ? 'Done' : 'Review soon';
              // One strand per row: ring, name, when it comes back. Rows hold up at the largest text size; three columns did not.
              return (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} accessible accessibilityLabel={`${STRANDS[k].label}: ${box} of 4. Next: ${due}`}>
                  <Ring value={Math.min(4, box) / 4} size={56} stroke={6} color={c.ink}>
                    <Icon size={21} color={c.ink} strokeWidth={2.3} />
                  </Ring>
                  <Txt v="heading" style={{ flex: 1 }} numberOfLines={1}>
                    {STRANDS[k].label}
                  </Txt>
                  <Tag label={due} tint={m?.due && m.due <= t ? 'orange' : 'surface2'} color="ink" />
                </View>
              );
            })}
          </Block>
        </Rise>
      )}

      {/* The two things to do to the word itself, said in words at the end of the page. */}
      {stage !== 'removed' && (
        <Group>
          {stage === 'known' ? (
            <Row title="Teach me this word again" icon={RotateCcw} onPress={() => useStore.getState().undoKnown(lex.id)} last={!inList} />
          ) : (
            <Row title="I already know this word" icon={Check} onPress={knowIt} last={!inList} />
          )}
          {inList && <Row title="Remove from my words" icon={Trash2} onPress={remove} last />}
        </Group>
      )}
    </Screen>
  );
}
