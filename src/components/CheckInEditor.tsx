import { BellOff, CalendarCheck, CalendarDays, MessageCircle, Minus, Moon, Plus, Sun, Sunrise, VolumeX, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { NOTIFICATION, contextOf } from '@/lib/checkins';
import { formatTime } from '@/lib/dates';
import { SLOT_LABEL, useStore, type SlotId } from '@/lib/store';
import { ON_BLOCK, radius, useTheme } from '@/theme';
import { MascotBadge } from './Mascot';
import { Chip, ChipRow, IconBtn, Tap, Txt } from './ui';

const SLOTS: { id: SlotId; icon: LucideIcon }[] = [
  { id: 'morning', icon: Sunrise },
  { id: 'lunch', icon: Sun },
  { id: 'evening', icon: Moon },
];
const DAY_LETTERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const GOALS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: 'Easy' },
  { n: 2, label: 'Steady' },
  { n: 3, label: 'Keen' },
];

function shift(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** What a reminder looks like on the lock screen, with the line Root would send right now. */
export function NotificationPreview() {
  const { c, e1 } = useTheme();
  const voice = useStore((s) => s.voice);
  const body = useStore((s) => {
    const { due, ctx } = contextOf(s);
    return NOTIFICATION.body(voice, due, ctx);
  });
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, e1]} accessible accessibilityLabel={`Reminder preview. ${NOTIFICATION.title}. ${body}`}>
      <MascotBadge size={44} tone="brand" />
      <View style={{ flex: 1 }}>
        <Txt v="bodyS">{NOTIFICATION.title}</Txt>
        <Txt v="caption" color="ink2">
          {body}
        </Txt>
      </View>
    </View>
  );
}

/** How many stops make a day: one, two or three footprints. */
export function GoalPicker() {
  const { c, font } = useTheme();
  const goal = useStore((s) => s.goal);
  const patch = useStore((s) => s.patch);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Daily goal">
      {GOALS.map(({ n, label }) => {
        const on = goal === n;
        return (
          <Tap key={n} onPress={() => patch({ goal: n })} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${label}: ${n} stop${n === 1 ? '' : 's'} a day`} style={{ flex: 1, height: 96, borderRadius: radius.lg, backgroundColor: on ? c.orange : c.surface, borderWidth: on ? 0 : 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {Array.from({ length: n }, (_, i) => (
                <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: on ? ON_BLOCK.ink : c.ink3 }} />
              ))}
            </View>
            <Text style={{ fontFamily: font('s'), fontSize: 15, color: on ? ON_BLOCK.ink : c.ink2 }}>{label}</Text>
          </Tap>
        );
      })}
    </View>
  );
}

/** When Root reminds you, how it talks, and how much makes a day. Icons first; shared by setup and settings. */
export function CheckInEditor({ showGoal = true }: { showGoal?: boolean }) {
  const { c, font } = useTheme();
  const checkIn = useStore((s) => s.checkIn);
  const setCheckIn = useStore((s) => s.setCheckIn);
  const voice = useStore((s) => s.voice);
  const patch = useStore((s) => s.patch);
  const off = checkIn.freq === 'off';

  const toggleSlot = (id: SlotId) => setCheckIn({ slots: checkIn.slots.includes(id) ? checkIn.slots.filter((x) => x !== id) : SLOTS.map((s) => s.id).filter((x) => x === id || checkIn.slots.includes(x)) });
  const toggleDay = (d: number) => {
    const days = checkIn.days.includes(d) ? checkIn.days.filter((x) => x !== d) : [...checkIn.days, d].sort();
    if (days.length) setCheckIn({ days });
  };

  return (
    <View style={{ gap: 14 }}>
      <ChipRow>
        <Chip label="Daily" icon={CalendarCheck} selected={checkIn.freq === 'daily'} onPress={() => setCheckIn({ freq: 'daily' })} />
        <Chip label="Some days" icon={CalendarDays} selected={checkIn.freq === 'three'} onPress={() => setCheckIn({ freq: 'three' })} />
        <Chip label="Off" icon={BellOff} selected={off} onPress={() => setCheckIn({ freq: 'off' })} />
      </ChipRow>

      {checkIn.freq === 'three' && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAY_ORDER.map((d) => {
            const on = checkIn.days.includes(d);
            return (
              <Tap key={d} onPress={() => toggleDay(d)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={DAY_NAMES[d]} style={{ flex: 1, aspectRatio: 1, maxHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : c.surface, borderWidth: 1.5, borderColor: on ? c.ink : c.line }}>
                <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: font('s'), fontSize: 14, color: on ? c.onInk : c.ink2 }}>{DAY_LETTERS[d]}</Text>
              </Tap>
            );
          })}
        </View>
      )}

      {!off && (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {SLOTS.map(({ id, icon: Icon }) => {
              const on = checkIn.slots.includes(id);
              return (
                <Tap key={id} onPress={() => toggleSlot(id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${SLOT_LABEL[id]}, ${formatTime(checkIn.times[id])}`} style={{ flex: 1, height: 92, borderRadius: radius.lg, backgroundColor: on ? c.brand : c.surface, borderWidth: on ? 0 : 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon size={26} color={on ? ON_BLOCK.ink : c.ink2} strokeWidth={2.2} />
                  <Text style={{ fontFamily: font('s'), fontSize: 14, color: on ? ON_BLOCK.ink : c.ink3 }}>{formatTime(checkIn.times[id])}</Text>
                </Tap>
              );
            })}
          </View>
          {checkIn.slots.map((id) => {
            const Icon = SLOTS.find((s) => s.id === id)!.icon;
            return (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, paddingVertical: 8, paddingLeft: 18, paddingRight: 8 }}>
                <Icon size={20} color={c.ink2} strokeWidth={2.3} />
                <Txt v="heading" style={{ flex: 1 }}>
                  {formatTime(checkIn.times[id])}
                </Txt>
                <IconBtn icon={Minus} label={`${SLOT_LABEL[id]} 15 minutes earlier`} onPress={() => setCheckIn({ times: { ...checkIn.times, [id]: shift(checkIn.times[id], -15) } })} kind="soft" size={42} />
                <IconBtn icon={Plus} label={`${SLOT_LABEL[id]} 15 minutes later`} onPress={() => setCheckIn({ times: { ...checkIn.times, [id]: shift(checkIn.times[id], 15) } })} kind="soft" size={42} />
              </View>
            );
          })}
          <ChipRow>
            <Chip label="Coach" icon={MessageCircle} selected={voice === 'coach'} onPress={() => patch({ voice: 'coach' })} />
            <Chip label="Quiet" icon={VolumeX} selected={voice === 'quiet'} onPress={() => patch({ voice: 'quiet' })} />
          </ChipRow>
          <NotificationPreview />
        </>
      )}

      {showGoal && <GoalPicker />}
    </View>
  );
}
