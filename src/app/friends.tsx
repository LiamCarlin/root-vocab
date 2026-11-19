import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { BellRing, ClipboardPaste, Flame, Gem, Plus, Send, ShieldCheck, Trash2, UserPlus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { Growth } from '@/components/Mascot';
import { Block, Btn, Field, IconBtn, Rise, Screen, SectionLabel, Sheet, Tap, TopBar, Txt, useToast } from '@/components/ui';
import { buzz } from '@/lib/audio';
import { cardAge, cardWhen, makeCard, readCard, type Friend } from '@/lib/friends';
import { sfx } from '@/lib/sfx';
import { clock } from '@/lib/signals';
import { streak, today, useStore, weekEarned } from '@/lib/store';
import { ON_BLOCK, radius, useTheme, type BlockTone } from '@/theme';

const TONES: BlockTone[] = ['pink', 'mint', 'butter', 'lilac', 'brand', 'orange'];
const toneOf = (id: string): BlockTone => TONES[id.split('').reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];
/** A card older than this says little about how someone is doing now. */
const STALE_DAYS = 7;

/**
 * Friends: a few people who are doing this too, so that somebody notices when you show up.
 *
 * There is no account and no server. You send your card (a first name, your streak, the gems you have
 * earned this week, the words you have rooted) through whatever you already use to talk to people, and
 * they add it; they send theirs back. A friend's numbers are as fresh as the last card they sent, and the
 * list says how old that is. Sending yours is the nudge.
 */
export default function Friends() {
  const { c, e1 } = useTheme();
  const s = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ add?: string }>();
  const linked = Array.isArray(params.add) ? params.add[0] : params.add;
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Friend | null>(null);
  const used = useRef(false);
  const [now] = useState(() => Date.now());

  const t = today(s);
  const rooted = Object.values(s.words).filter((w) => w.status === 'known').length;
  const didToday = s.practiceDays.includes(t);
  const me: Friend = { id: s.me.id || 'me', name: s.profile.name.trim() || 'Me', streak: streak(s), week: weekEarned(s), rooted, day: s.practiceDays.reduce((m, d) => (d > m ? d : m), ''), at: now };
  const board = [me, ...s.friends].sort((a, b) => b.week - a.week || b.streak - a.streak);

  const add = (text: string) => {
    const f = readCard(text);
    if (!f) {
      buzz.nudge();
      toast({ text: 'That is not a card' });
      return false;
    }
    if (f.id === s.me.id) {
      toast({ text: 'That is your own card' });
      return false;
    }
    const known = s.friends.some((x) => x.id === f.id);
    s.addFriend(f);
    sfx.play('good');
    buzz.good();
    toast({ text: known ? `${f.name} updated` : `${f.name} added`, tone: 'success' });
    return true;
  };

  // Opened from a link someone sent: add them straight away. Before setup is done, setup comes first.
  useEffect(() => {
    if (used.current) return;
    if (!useStore.getState().onboarded) {
      router.replace('/');
      return;
    }
    if (linked) {
      used.current = true;
      add(linked);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked]);

  /** Sends this learner's card. With `to`, the words are a nudge to that friend. */
  const send = async (to?: Friend) => {
    const card = makeCard({ ...me, id: s.myId(), at: clock() });
    const link = Linking.createURL('friends', { queryParams: { add: card } });
    const lead = to ? (didToday ? `${to.name}, I did my words today. Your turn?` : `${to.name}, shall we both do our words today?`) : `${me.name === 'Me' ? 'I am' : `${me.name} is`} on a ${me.streak}-day streak on Root, with ${me.rooted} ${me.rooted === 1 ? 'word' : 'words'} rooted.`;
    const message = `${lead}\n\nAdd me: ${link}\n\nOr paste this into Root, under Friends:\n${card}`;
    try {
      await Share.share({ message });
    } catch {
      // No share sheet here (a browser, for one): the card goes on the clipboard instead.
      try {
        await Clipboard.setStringAsync(message);
        toast({ text: 'Card copied', tone: 'success' });
      } catch {
        toast({ text: 'Could not share' });
      }
    }
  };

  const paste = async () => {
    try {
      setCode(await Clipboard.getStringAsync());
    } catch {}
  };

  const submit = () => {
    if (add(code)) {
      setCode('');
      setAdding(false);
    }
  };

  const stat = (node: React.ReactNode, value: number, a11y: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 50, justifyContent: 'flex-end' }} accessible accessibilityLabel={a11y}>
      {node}
      <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 16, color: c.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );

  return (
    <Screen top={<TopBar center={<Txt v="heading">Friends</Txt>} right={<IconBtn icon={UserPlus} label="Add a friend from their card" kind="ghost" size={48} onPress={() => setAdding(true)} />} />} gap={14}>
      {/* Your card: what a friend sees. */}
      <Block tone="brand" pad={18} style={{ gap: 14 }} a11y={`Your card. ${me.streak} day streak, ${me.week} gems this week, ${me.rooted} words rooted.`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt v="title" style={{ flex: 1 }} numberOfLines={1}>
            {me.name === 'Me' ? 'Your card' : me.name}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Flame size={20} color={ON_BLOCK.ink} fill={didToday ? c.orange : 'transparent'} strokeWidth={2.4} />
            <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 18, color: ON_BLOCK.ink }}>{me.streak}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Gem size={19} color={ON_BLOCK.ink} strokeWidth={2.4} />
            <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 18, color: ON_BLOCK.ink }}>{me.week}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Growth stage={3} size={24} />
            <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 18, color: ON_BLOCK.ink }}>{me.rooted}</Text>
          </View>
        </View>
        <Btn kind="ink" icon={Send} label="Send my card" a11y="Send your card to a friend, through any app you use to message people" onPress={() => send()} />
      </Block>

      {s.friends.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
          <Figure pose="wave" size={150} />
          <Txt v="title" center>
            Better with two
          </Txt>
          <Txt v="body" color="ink2" center>
            Send your card. Add theirs.
          </Txt>
          <Btn kind="soft" icon={Plus} label="Add a card" onPress={() => setAdding(true)} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <SectionLabel>This week</SectionLabel>
          {board.map((f, i) => {
            const mine = f === me;
            const old = !mine && cardAge(f, now) >= STALE_DAYS;
            const lit = mine ? didToday : f.day !== '' && cardAge(f, now) === 0;
            const inner = (
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: mine ? c.sun : c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingVertical: 12, paddingHorizontal: 14, opacity: old ? 0.6 : 1 }, e1]}>
                <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 15, color: c.ink3, width: 18, textAlign: 'center' }}>{i + 1}</Text>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: mine ? c.orange : c[toneOf(f.id)], alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 18, color: ON_BLOCK.ink }}>{f.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="body" numberOfLines={1}>
                    {mine ? 'You' : f.name}
                  </Txt>
                  {!mine && (
                    <Txt v="caption" color="ink2" numberOfLines={1}>
                      Sent {cardWhen(f, now)}
                    </Txt>
                  )}
                </View>
                {stat(<Flame size={18} color={lit ? c.orange : c.ink3} fill={lit ? c.orange : 'transparent'} strokeWidth={2.2} />, f.streak, `${f.streak} day streak`)}
                {stat(<Gem size={17} color={c.indigo} strokeWidth={2.4} />, f.week, `${f.week} gems this week`)}
              </View>
            );
            return (
              <Rise key={f.id} i={i}>
                {mine ? (
                  <View accessible accessibilityLabel={`You, number ${i + 1}. ${f.streak} day streak, ${f.week} gems this week.`}>{inner}</View>
                ) : (
                  <Tap onPress={() => setOpen(f)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`${f.name}, number ${i + 1}. ${f.streak} day streak, ${f.week} gems this week. Card from ${cardWhen(f, now)}. Open.`}>
                    {inner}
                  </Tap>
                )}
              </Rise>
            );
          })}
        </>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4, paddingTop: 4 }}>
        <ShieldCheck size={18} color={c.ink3} strokeWidth={2.4} style={{ marginTop: 2 }} />
        <Txt v="caption" color="ink2" style={{ flex: 1 }}>
          Nothing is uploaded. A friend sees only the card you send them.
        </Txt>
      </View>

      {/* Add a friend: paste the card (or the whole message it came in). */}
      <Sheet visible={adding} onClose={() => setAdding(false)} title="Add a friend">
        <Field value={code} onChangeText={setCode} placeholder="Paste their card" accessibilityLabel="Their card, or the message it came in" autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={submit} right={<IconBtn icon={ClipboardPaste} label="Paste from clipboard" kind="soft" size={44} onPress={paste} />} />
        <Btn icon={Plus} label="Add" disabled={!code.trim()} onPress={submit} />
      </Sheet>

      {/* One friend: their card, a nudge, or take them off the list. */}
      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.name}>
        {open && (
          <>
            <Block tone={toneOf(open.id)} pad={18} style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                { icon: <Flame size={26} color={ON_BLOCK.ink} strokeWidth={2.3} />, n: open.streak, a11y: `${open.streak} day streak` },
                { icon: <Gem size={25} color={ON_BLOCK.ink} strokeWidth={2.3} />, n: open.week, a11y: `${open.week} gems this week` },
                { icon: <Growth stage={3} size={30} />, n: open.rooted, a11y: `${open.rooted} words rooted` },
              ].map((x, i) => (
                <View key={i} style={{ alignItems: 'center', gap: 4 }} accessible accessibilityLabel={x.a11y}>
                  {x.icon}
                  <Text style={{ fontFamily: 'Lexend_700Bold', fontSize: 24, color: ON_BLOCK.ink }}>{x.n}</Text>
                </View>
              ))}
            </Block>
            <Txt v="bodyS" color="ink2" center>
              Card from {cardWhen(open, now)}
            </Txt>
            <Btn
              icon={BellRing}
              label="Nudge"
              a11y={`Send ${open.name} a nudge, with your card`}
              onPress={() => {
                const to = open;
                setOpen(null);
                send(to);
              }}
            />
            <Btn
              kind="ghost"
              icon={Trash2}
              label="Remove"
              onPress={() => {
                s.removeFriend(open.id);
                setOpen(null);
              }}
            />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
