import { router } from 'expo-router';
import { Hand, Play, Shuffle, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Perch } from '@/components/Buddy';
import { Shine } from '@/components/fx';
import { GAMES } from '@/components/games';
import { LIP } from '@/components/rewards';
import { Block, Ring, Rise, Screen, Txt } from '@/components/ui';
import { STRANDS, type Strand } from '@/data/profile';
import { BANK } from '@/data/words';
import { GAME_STRAND, HANDS, canPlay, levelProgress, type GameId } from '@/lib/engine';
import { lexemeFor } from '@/lib/lexicon';
import { dueCount, learnedWords, levelOf, lexOf, today, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { TAB_SPACE } from './_layout';

type Group = { id: string; label: string; strand?: Strand; icon: LucideIcon; games: GameId[] };

/** Every game, grouped by what it trains. "Hands-on" is the word through the hand, the arm and the voice. */
const GROUPS: Group[] = [
  { id: 'find', label: STRANDS.find.label, strand: 'find', icon: STRANDS.find.icon, games: ['clue', 'gap'] },
  { id: 'know', label: STRANDS.know.label, strand: 'know', icon: STRANDS.know.icon, games: ['web', 'pair', 'meaning'] },
  { id: 'spell', label: STRANDS.spell.label, strand: 'spell', icon: STRANDS.spell.icon, games: ['cover', 'missing', 'proof', 'dictate', 'scramble'] },
  { id: 'hands', label: 'Hands-on', icon: Hand, games: HANDS },
];

/**
 * The Arcade: free play. The place to come back to when the path is done for
 * the day. One big mix of whatever is due, then every game as a tile.
 */
const ROUND = 6;
/** A small stable number from a string, so today's filler words stay the same all day. */
function jitter(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * The words for one arcade round. With only a few words learned, a single-game round would ask the same
 * word over and over, so it is topped up with bank words around the learner's level: six different words, always.
 */
function openGame(id: GameId) {
  const s = useStore.getState();
  const mine = learnedWords(s)
    .filter((w) => {
      const lex = lexOf(s, w.id);
      return !!lex && canPlay(lex, id);
    })
    .map((w) => w.id);
  if (mine.length >= ROUND) {
    router.push(`/play/game?game=${id}`);
    return;
  }
  const strand = GAME_STRAND[id];
  const theta = s.skill[strand];
  const day = today(s);
  const fill = BANK.filter((b) => !s.words[b.id] && canPlay(lexemeFor(b.id)!, id))
    .map((b) => ({ id: b.id, score: Math.abs((strand === 'spell' ? b.spell : b.level) - theta) + jitter(`${b.id}:${day}:${id}`) * 0.8 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, ROUND - mine.length)
    .map((x) => x.id);
  router.push(`/play/game?game=${id}&words=${[...mine, ...fill].join(',')}`);
}

export default function Practice() {
  const { c } = useTheme();
  const due = useStore((s) => dueCount(s));
  const skill = useStore((s) => s.skill);
  const log = useStore((s) => s.log);
  const counters = useStore((s) => s.counters);
  const companion = useStore((s) => s.display.companion);

  // A game is "new" until it shows up in the attempt log (or, for the hands-on games, in their counters).
  const played = useMemo(() => {
    const set = new Set<string>(log.map((a) => a.game));
    for (const k of HANDS) if ((counters[k] ?? 0) > 0) set.add(k);
    return set;
  }, [log, counters]);

  return (
    <Screen bottomSpace={TAB_SPACE} gap={18}>
      <Txt v="display" accessibilityRole="header" style={{ marginTop: 4 }}>
        Arcade
      </Txt>

      {/* Daily mix. Root stands on top of it, so the wrapper leaves headroom and is not clipped. */}
      <Rise>
        {/* Room for Root to stand on the card; none is kept when Root is switched off. */}
        <View style={{ position: 'relative', marginTop: companion === 'off' ? 0 : 80 }}>
          <Block tone="brand" pad={22} onPress={() => router.push('/play/mix')} a11y={due ? `Daily mix. ${due} ${due === 1 ? 'word' : 'words'} due.` : 'Daily mix'} style={{ minHeight: 168, justifyContent: 'space-between', borderBottomWidth: 6, borderBottomColor: LIP.brand }}>
            <Shine round={radius.xl} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Shuffle size={26} color="#FFFFFF" strokeWidth={2.6} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                {due > 0 && <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 50, lineHeight: 54, color: ON_BLOCK.ink }}>{due}</Text>}
                <Txt v="title">Daily mix</Txt>
              </View>
              {/* Looks like the app's play button; the whole card is the button. */}
              <View style={{ height: 58, paddingHorizontal: 26, borderRadius: radius.pill, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: '#000000' }}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
          </Block>
          <Perch pose="wave" size={84} side="right" inset={26} />
        </View>
      </Rise>

      {GROUPS.map((g, gi) => {
        const theta = g.strand ? skill[g.strand] : 0;
        const tone = g.strand ? STRANDS[g.strand].tone : 'butter';
        return (
          <Rise key={g.id} i={gi + 1} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c[tone], alignItems: 'center', justifyContent: 'center' }}>
                <g.icon size={20} color={ON_BLOCK.ink} strokeWidth={2.5} />
              </View>
              <Txt v="title" accessibilityRole="header" style={{ flex: 1 }}>
                {g.label}
              </Txt>
              {g.strand && (
                <View accessible accessibilityLabel={`${g.label} level ${levelOf(theta)}`}>
                  <Ring value={levelProgress(theta)} size={46} stroke={5} color={c.ink}>
                    <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 16, color: c.ink }}>{levelOf(theta)}</Text>
                  </Ring>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {g.games.map((id) => {
                const game = GAMES[id];
                const fresh = !played.has(id);
                return (
                  <Block key={id} tone={game.tone} pad={16} onPress={() => openGame(id)} a11y={`${game.name}${fresh ? ', new' : ''}. ${game.a11y}.`} style={{ flexBasis: '46%', flexGrow: 1, minHeight: 132, gap: 10, justifyContent: 'space-between', borderBottomWidth: 5, borderBottomColor: LIP[game.tone] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: ON_BLOCK.ink, alignItems: 'center', justifyContent: 'center' }}>
                        <game.icon size={23} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {fresh && (
                          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles size={16} color={ON_BLOCK.ink} strokeWidth={2.5} />
                          </View>
                        )}
                        {/* Which strand a game feeds, in that strand's colour. Only where the tile itself does not already say so. */}
                        {STRANDS[game.strand].tone !== game.tone && <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c[STRANDS[game.strand].tone], borderWidth: 2.5, borderColor: ON_BLOCK.ink }} />}
                      </View>
                    </View>
                    <Txt v="heading" numberOfLines={2}>
                      {game.name}
                    </Txt>
                  </Block>
                );
              })}
            </View>
          </Rise>
        );
      })}
    </Screen>
  );
}
