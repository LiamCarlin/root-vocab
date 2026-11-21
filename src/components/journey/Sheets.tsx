import { Check, Gem, Snowflake } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Figure } from '@/components/Buddy';
import { Pop } from '@/components/fx';
import { StreakFlame } from '@/components/rewards';
import { Block, Btn, Sheet, Txt } from '@/components/ui';
import { buzz } from '@/lib/audio';
import { weekOf } from '@/lib/dates';
import { sfx } from '@/lib/sfx';
import { GEMS, MAX_FREEZES, repairable, streak, today, useStore } from '@/lib/store';
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
  const fix = repairable(s);

  const mend = () => {
    if (!s.repairStreak()) return buzz.nudge();
    sfx.play('gem');
    buzz.good();
  };

  const buy = () => {
    if (!s.buyFreeze()) return buzz.nudge();
    sfx.play('gem');
    buzz.good();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingTop: 4 }}>
        {visible && <StreakFlame n={n} lit={lit} size={104} count />}
        {visible && <Figure pose={n >= 3 ? 'proud' : lit ? 'thumbs' : 'wave'} size={118} />}
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

      {/* What the streak is and what gems do for it, said once in plain words. */}
      <Txt v="body" center>
        {n === 1 ? '1 day in a row of practice.' : `${n} days in a row of practice.`} Miss a day and it starts again, unless a freeze covers it.
      </Txt>

      {/* A streak that broke in the last couple of days can be mended. */}
      {fix && (
        <Block tone="butter" pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="heading">Mend streak</Txt>
            <Txt v="bodyS" color="ink2">
              {s.gems < fix.cost ? `Bring back your ${fix.lost} day streak. You need ${fix.cost} gems and have ${s.gems}.` : `Bring back your ${fix.lost} day streak.`}
            </Txt>
          </View>
          <Btn kind="white" small disabled={s.gems < fix.cost} a11y={`Mend your ${fix.lost} day streak for ${fix.cost} gems`} onPress={mend} label={`Mend · ${fix.cost}`} icon={Gem} style={{ minWidth: 112 }} />
        </Block>
      )}

      {/* Freezes: each one covers a missed day so the streak survives it. */}
      <Block pad={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1, gap: 10 }}>
          <Txt v="heading">Streak freeze</Txt>
          {/* Says why the button is off, when it is. */}
          <Txt v="bodyS" color="ink2">
            {s.freezes >= MAX_FREEZES ? `Saves your streak on a day you miss. You hold ${MAX_FREEZES}, the most.` : s.gems < GEMS.freeze ? `Saves your streak on a day you miss. You need ${GEMS.freeze} gems and have ${s.gems}.` : 'Saves your streak on a day you miss.'}
          </Txt>
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
          label={`Buy · ${GEMS.freeze}`}
          icon={Gem}
          style={{ minWidth: 112 }}
        />
      </Block>
    </Sheet>
  );
}
