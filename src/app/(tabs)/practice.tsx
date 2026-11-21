import { router } from 'expo-router';
import { Play, Shuffle } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import { GAMES } from '@/components/games';
import { Block, Ring, Rise, Screen, Txt } from '@/components/ui';
import { STRANDS, type Strand } from '@/data/profile';
import { OBJECTS } from '@/data/story';
import { BANK } from '@/data/words';
import { GAME_STRAND, HANDS, canPlay, levelProgress, type GameId } from '@/lib/engine';
import { lexemeFor } from '@/lib/lexicon';
import { dueCount, learnedWords, levelOf, lexOf, today, useStore } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { TAB_SPACE } from './_layout';

type Group = { id: string; label: string; strand?: Strand; /** The clay object that stands for the group. */ art: number; games: GameId[] };

/** Every game, grouped by what it trains. "Hands-on" is the word through the hand, the arm and the voice. */
const GROUPS: Group[] = [
  { id: 'find', label: STRANDS.find.label, strand: 'find', art: OBJECTS.magnifier, games: ['clue', 'gap'] },
  { id: 'know', label: STRANDS.know.label, strand: 'know', art: OBJECTS.book, games: ['web', 'pair', 'meaning'] },
  { id: 'spell', label: STRANDS.spell.label, strand: 'spell', art: OBJECTS.pencil, games: ['cover', 'missing', 'proof', 'dictate', 'scramble'] },
  { id: 'hands', label: 'Hands-on', art: OBJECTS.sand, games: HANDS },
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
  const companion = useStore((s) => s.display.companion);

  return (
    <Screen bottomSpace={TAB_SPACE} gap={18}>
      <Txt v="display" accessibilityRole="header" style={{ marginTop: 4 }}>
        Arcade
      </Txt>

      {/* Daily mix. Root sits on top of it, so the wrapper leaves headroom and is not clipped. */}
      <Rise>
        {/* Room for Root to sit on the card; none is kept when Root is switched off. */}
        <View style={{ position: 'relative', marginTop: companion === 'off' ? 0 : 70 }}>
          <Block tone="brand" pad={22} onPress={() => router.push('/play/mix')} a11y={due ? `Daily mix. ${due} ${due === 1 ? 'word' : 'words'} due.` : 'Daily mix'} style={{ minHeight: 168, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Shuffle size={30} color={ON_BLOCK.ink} strokeWidth={2.4} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                {due > 0 && <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 50, lineHeight: 54, color: ON_BLOCK.ink }}>{due}</Text>}
                <Txt v="title">Daily mix</Txt>
              </View>
              {/* Looks like the app's play button; the whole card is the button. */}
              <View style={{ height: 58, paddingHorizontal: 26, borderRadius: radius.pill, backgroundColor: c.press, alignItems: 'center', justifyContent: 'center' }}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
          </Block>
        </View>
      </Rise>

      {GROUPS.map((g, gi) => {
        const theta = g.strand ? skill[g.strand] : 0;
        return (
          <Rise key={g.id} i={gi + 1} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <Image source={g.art} style={{ width: 44, height: 44 }} resizeMode="contain" />
              <Txt v="title" accessibilityRole="header" style={{ flex: 1 }}>
                {g.label}
              </Txt>
              {g.strand && (
                <View accessible accessibilityLabel={`${g.label} level ${levelOf(theta)}`}>
                  <Ring value={levelProgress(theta)} size={46} stroke={5} color={c.indigo}>
                    <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 16, color: c.ink }}>{levelOf(theta)}</Text>
                  </Ring>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {g.games.map((id) => {
                const game = GAMES[id];
                return (
                  <Block key={id} pad={16} onPress={() => openGame(id)} a11y={`${game.name}. ${game.a11y}.`} style={{ flexBasis: '46%', flexGrow: 1, minHeight: 132, gap: 10, justifyContent: 'space-between' }}>
                    <game.icon size={26} color={c.indigo} strokeWidth={2.3} />
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
