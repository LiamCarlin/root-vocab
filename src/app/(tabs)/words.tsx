import { router } from 'expo-router';
import { LayoutGrid, Map, Search, Undo2, X, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { Growth, Mascot } from '@/components/Mascot';
import { Block, Btn, Field, IconBtn, Screen, Tap, Txt } from '@/components/ui';
import { STRAND_ORDER, STRANDS } from '@/data/profile';
import { growth, strength, today, useStore, type UserWord } from '@/lib/store';
import { GUTTER, ON_BLOCK, radius, useTheme } from '@/theme';
import { TAB_SPACE } from './_layout';

type Filter = 'all' | 'learning' | 'known' | 'queued' | 'removed';
const FILTERS: { id: Exclude<Filter, 'removed'>; name: string; stage?: 0 | 2 | 3; icon?: LucideIcon }[] = [
  { id: 'all', name: 'All', icon: LayoutGrid },
  { id: 'learning', name: 'Growing', stage: 2 },
  { id: 'known', name: 'Rooted', stage: 3 },
  { id: 'queued', name: 'Waiting', stage: 0 },
];
const ORDER: Record<UserWord['status'], number> = { learning: 0, queued: 1, known: 2, removed: 3 };

const isDue = (w: UserWord, t: string) => (w.status === 'learning' || w.status === 'known') && STRAND_ORDER.some((k) => !!w.mem[k]?.due && w.mem[k].due! <= t);
const firstDue = (w: UserWord) => STRAND_ORDER.map((k) => w.mem[k]?.due ?? '9').sort()[0];

/** The garden: every word is a seed, a sprout or a full root, with a bar for each of the three strands. */
export default function Garden() {
  const { c, e1 } = useTheme();
  const words = useStore((s) => s.words);
  const t = useStore((s) => today(s));
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const all = useMemo(() => Object.values(words), [words]);
  const count = (f: Filter) => all.filter((w) => (f === 'all' ? w.status !== 'removed' : w.status === f)).length;
  const live = count('all');
  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      all
        .filter((w) => (filter === 'all' ? w.status !== 'removed' : w.status === filter))
        .filter((w) => !needle || w.text.toLowerCase().includes(needle))
        .sort((a, b) => Number(isDue(b, t)) - Number(isDue(a, t)) || ORDER[a.status] - ORDER[b.status] || firstDue(a).localeCompare(firstDue(b)) || b.addedAt - a.addedAt),
    [all, filter, needle, t],
  );
  // The bed at the top: the newest words, each at its own stage.
  const bed = useMemo(
    () =>
      all
        .filter((w) => w.status !== 'removed')
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, 10),
    [all],
  );
  const overall = live ? all.filter((w) => w.status !== 'removed').reduce((sum, w) => sum + (w.status === 'known' ? 1 : strength(w)), 0) / live : 0;

  const header = (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      <Block tone="brand" pad={0} style={{ marginTop: 4, minHeight: 168 }}>
        <View style={{ position: 'absolute', right: -40, top: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.22)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ paddingLeft: 8, paddingTop: 14 }}>
            <Mascot pose="wave" size={144} />
          </View>
          <View style={{ flex: 1, padding: 18, paddingLeft: 6, gap: 12, alignSelf: 'center' }} accessible accessibilityLabel={`${count('known')} rooted, ${count('learning')} growing, ${count('queued')} waiting`}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 46, lineHeight: 50, color: ON_BLOCK.ink }}>{count('known')}</Text>
              <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 18, color: ON_BLOCK.ink2 }}>/ {live}</Text>
            </View>
            {/* How rooted the whole garden is. */}
            <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(14,14,19,0.14)', overflow: 'hidden' }}>
              <View style={{ height: 10, borderRadius: 5, width: `${Math.round(overall * 100)}%`, backgroundColor: ON_BLOCK.ink }} />
            </View>
            {bed.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {bed.map((w) => (
                  <Growth key={w.id} stage={growth(w)} size={26} />
                ))}
              </View>
            )}
          </View>
        </View>
      </Block>

      {/* Counts that are also the filters. */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {FILTERS.map((f) => {
          const on = filter === f.id;
          const Icon = f.icon;
          return (
            <Tap key={f.id} onPress={() => setFilter(f.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${f.name}: ${count(f.id)}`} style={[{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.md, backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.line }, on ? null : e1]}>
              {Icon ? (
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: on ? c.orange : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={on ? ON_BLOCK.ink : c.ink} strokeWidth={2.4} />
                </View>
              ) : (
                <Growth stage={f.stage ?? 0} size={34} />
              )}
              <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 20, color: on ? c.onInk : c.ink }}>{count(f.id)}</Text>
              <Txt v="caption" style={{ color: on ? c.onInk : c.ink2 }} numberOfLines={1}>
                {f.name}
              </Txt>
            </Tap>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Field
            value={q}
            onChangeText={setQ}
            placeholder="Search"
            accessibilityLabel="Search my words"
            left={
              <View style={{ paddingLeft: 8 }}>
                <Search size={20} color={c.ink3} />
              </View>
            }
            right={q ? <IconBtn icon={X} label="Clear" kind="plain" size={40} onPress={() => setQ('')} /> : undefined}
          />
        </View>
      </View>

      {filter === 'removed' && <Btn kind="soft" small icon={Undo2} label="Back to all" onPress={() => setFilter('all')} />}
    </View>
  );

  const empty = (
    <Block tone="butter" pad={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Mascot pose={needle ? 'think' : 'wave'} size={116} />
      <View style={{ flex: 1, gap: 12, alignItems: 'flex-start' }}>
        {needle ? (
          <>
            <Txt v="title" numberOfLines={2}>
              {q.trim()}
            </Txt>
            <Btn small icon={Search} label="Find it" a11y={`Look for ${q.trim()} with the Finder`} onPress={() => router.push({ pathname: '/finder', params: { q: q.trim(), mode: 'sounds' } })} />
          </>
        ) : (
          <>
            <Txt v="title">Nothing here yet</Txt>
            <Btn small icon={Map} label="Journey" a11y="Go to the journey" onPress={() => router.push('/(tabs)')} />
          </>
        )}
      </View>
    </Block>
  );

  const removed = count('removed');

  return (
    <Screen scroll={false} pad={false} gap={0}>
      <FlatList
        data={shown}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WordRow w={item} due={isDue(item, t)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={removed > 0 && filter !== 'removed' ? <Btn kind="ghost" small label={`Removed ${removed}`} a11y={`Show ${removed} removed words`} onPress={() => setFilter('removed')} style={{ marginTop: 6 }} /> : undefined}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 + TAB_SPACE }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={9}
      />
    </Screen>
  );
}

function Gap() {
  return <View style={{ height: 8 }} />;
}

/** One word: its stage, its picture hook, and how firmly Know, Find and Spell are held. */
function WordRow({ w, due }: { w: UserWord; due: boolean }) {
  const { c, e1 } = useTheme();
  const off = w.status === 'removed';
  const boxes = STRAND_ORDER.map((k) => (w.status === 'known' ? Math.max(3, w.mem[k]?.box ?? 0) : w.status === 'learning' ? (w.mem[k]?.box ?? 0) : 0));
  const a11y = `${w.text}. ${w.status === 'known' ? 'Rooted' : w.status === 'learning' ? 'Growing' : w.status === 'queued' ? 'Waiting' : 'Removed'}${due ? ', due today' : ''}. ${STRAND_ORDER.map((k, i) => `${STRANDS[k].label} ${boxes[i]} of 4`).join(', ')}`;
  return (
    <Tap onPress={() => router.push(`/word/${w.id}`)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={a11y} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingVertical: 12, paddingHorizontal: 14, minHeight: 74, opacity: off ? 0.6 : 1 }, e1]}>
      <Growth stage={growth(w)} size={46} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt v="heading" numberOfLines={1} style={{ flexShrink: 1 }}>
            {w.text}
          </Txt>
          {!!w.hook && <Text style={{ fontSize: 18 }}>{w.hook}</Text>}
        </View>
        {/* Know · Find · Spell, each in its own colour. */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STRAND_ORDER.map((k, i) => (
            <View key={k} style={{ flex: 1, maxWidth: 64, height: 7, borderRadius: 4, backgroundColor: c.surface2, overflow: 'hidden' }}>
              <View style={{ width: `${(Math.min(4, boxes[i]) / 4) * 100}%`, height: 7, borderRadius: 4, backgroundColor: c[STRANDS[k].tone] }} />
            </View>
          ))}
        </View>
      </View>
      {due && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.orange }} />}
    </Tap>
  );
}
