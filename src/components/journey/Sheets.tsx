import { Check, Gift, Snowflake } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { Reaction } from '@/components/Buddy';
import { CountUp, Pop } from '@/components/fx';
import { Chest, StreakFlame } from '@/components/rewards';
import { Block, Btn, Sheet, Txt } from '@/components/ui';
import { PROPS } from '@/data/story';
import { buzz } from '@/lib/audio';
import { useHoldUnlocks } from '@/lib/buddy';
import { weekOf } from '@/lib/dates';
import { sfx } from '@/lib/sfx';
import { GEMS, MAX_FREEZES, streak, today, useStore } from '@/lib/store';
import { ON_BLOCK, useTheme } from '@/theme';

// Two letters each: a lone T or S could be either day.
const DAY_LETTERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The streak, the week as dots, and the freezes that cover a missed day. */
export function StreakSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const s = useStore();
  const t = today(s);
  const n = streak(s);
  const lit = s.practiceDays.includes(t);
  const week = weekOf(t);
  const canBuy = s.gems >= GEMS.freeze && s.freezes < MAX_FREEZES;

  const buy = () => {
    if (!s.buyFreeze()) return buzz.nudge();
    sfx.play('gem');
    buzz.good();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 4 }}>
        {visible && <StreakFlame n={n} lit={lit} size={104} count />}
        {visible && <Reaction pose={n >= 3 ? 'flex' : lit ? 'thumbs' : 'wave'} size={118} pokable={false} />}
      </View>

      <Block pad={14} round={999} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18 }}>
        {week.map((d, i) => {
          const did = s.practiceDays.includes(d);
          const frozen = !did && s.frozenDays.includes(d);
          const isToday = d === t;
          return (
            <View key={d} style={{ alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${DAY_NAMES[i]}${did ? ', practiced' : frozen ? ', covered by a freeze' : ''}${isToday ? ', today' : ''}`}>
              <Text style={{ fontFamily: isToday ? 'Lexend_700Bold' : 'Lexend_500Medium', fontSize: 13, color: isToday ? c.ink : c.ink3 }}>{DAY_LETTERS[i]}</Text>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: did ? (isToday ? c.orange : c.ink) : frozen ? c.brand : 'transparent', borderWidth: did || frozen ? 0 : 2, borderColor: isToday ? c.orange : c.line, borderStyle: did || frozen || isToday ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                {did && <Check size={17} color={isToday ? ON_BLOCK.ink : c.onInk} strokeWidth={3.2} />}
                {frozen && <Snowflake size={17} color={ON_BLOCK.ink} strokeWidth={2.6} />}
              </View>
            </View>
          );
        })}
      </Block>

      {/* Freezes: each one covers a missed day so the streak survives it. */}
      <Block tone="brand" pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <Txt v="heading">Streak freeze</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }} accessible accessibilityLabel={`${s.freezes} of ${MAX_FREEZES} held`}>
            {Array.from({ length: MAX_FREEZES }, (_, i) => {
              const held = i < s.freezes;
              return (
                <View key={i} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: held ? ON_BLOCK.ink : 'rgba(14,14,19,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  {held ? (
                    <Pop key="held" from={0.3}>
                      <Snowflake size={22} color="#FFFFFF" strokeWidth={2.6} />
                    </Pop>
                  ) : (
                    <Snowflake size={22} color={ON_BLOCK.ink3} strokeWidth={2.4} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
        <Btn
          kind="white"
          small
          disabled={!canBuy}
          a11y={s.freezes >= MAX_FREEZES ? 'You hold the most freezes you can' : `Buy a streak freeze for ${GEMS.freeze} gems`}
          onPress={buy}
          label={String(GEMS.freeze)}
          icon={Snowflake}
          style={{ minWidth: 112 }}
        />
      </Block>
    </Sheet>
  );
}

/** A chest on the path. One tap: it rattles open, the gems fly, the count lands. */
export function ChestSheet({ index, onClose }: { index: number | null; onClose: () => void }) {
  const openChest = useStore((s) => s.openChest);
  const [won, setWon] = useState<number | null>(null);
  // Anything the chest unlocks (a streak, the daily goal) waits until the sheet is closed.
  useHoldUnlocks(index !== null);

  const open = () => {
    if (index === null || won !== null) return;
    setWon(openChest(index));
  };
  const close = () => {
    setWon(null);
    onClose();
  };

  return (
    <Sheet visible={index !== null} onClose={close}>
      <View style={{ alignItems: 'center', paddingTop: 70, paddingBottom: 6, gap: 10 }}>
        {index !== null && <Chest open={won !== null} size={170} onPress={won === null ? open : undefined} a11y="Open the chest" />}
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {won !== null && won > 0 && (
            <Pop delay={380} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={PROPS.gem.src} style={{ width: 34, height: (34 * PROPS.gem.h) / PROPS.gem.w }} resizeMode="contain" />
              <CountUp to={won} prefix="+" delay={420} v="display" />
            </Pop>
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        {index !== null && <Reaction key={won === null ? 'wait' : 'won'} pose={won === null ? 'gasp' : 'cheer'} size={104} pokable={false} />}
        <View style={{ flex: 1 }}>{won === null ? <Btn icon={Gift} label="Open" onPress={open} /> : <Btn kind="soft" icon={Check} label="Done" onPress={close} />}</View>
      </View>
    </Sheet>
  );
}
