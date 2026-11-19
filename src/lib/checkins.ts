import { Platform } from 'react-native';

import { chapterOf } from '@/data/story';
import { dueCount, streak, useStore, type CheckIn, type Data } from './store';

// Reminders are local notifications from Root. They are short, kind and specific:
// what is ready, how the streak stands, how far the fog has lifted. Never guilt,
// never a count of what was missed. The quiet voice says one neutral thing.
//
// A reminder repeats weekly with the text it was scheduled with, so anything that
// can go stale (a streak number, a due count) is only used for the next two days;
// later days get lines that stay true. `refreshCheckIns()` re-writes them whenever
// the app is opened.

type N = typeof import('expo-notifications');
let cached: N | null | undefined;
function lib(): N | null {
  if (Platform.OS === 'web') return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as N;
    cached.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
  } catch {
    cached = null;
  }
  return cached;
}

export const checkInsSupported = () => !!lib();

/** What Root can know about the learner at the moment a reminder is scheduled. */
export type CheckInContext = {
  /** Practice days in a row. */
  streak?: number;
  /** The place the learner is clearing: "The Orchard". */
  place?: string;
  /** How much of that place is done, 0..1. */
  cleared?: number;
};

const words = (n: number) => `${n} word${n === 1 ? '' : 's'}`;

function placeLine(ctx: CheckInContext): string | null {
  if (!ctx.place) return null;
  const p = ctx.cleared ?? 0;
  if (p >= 0.7) return `${ctx.place} is nearly clear.`;
  if (p >= 0.35) return `${ctx.place} is half clear.`;
  if (p > 0) return `The fog is lifting over ${ctx.place}.`;
  return `Next stop: ${ctx.place}.`;
}

// Lines that stay true however long they sit on the schedule.
const EVERGREEN = ['A few minutes is plenty today.', 'One word at a time.', 'Your words are where you left them.', 'Root saved you a spot.'];

/**
 * The lines Root can say right now, best first. `soon` lines mention numbers that
 * are only right for a day or two; the rest never go stale.
 */
function lines(voice: 'coach' | 'quiet', due: number, ctx: CheckInContext = {}): { soon: string[]; later: string[] } {
  if (voice === 'quiet') return { soon: [due > 0 ? `${words(due)} ready.` : 'Practice is ready.'], later: ['Practice is ready.'] };
  const soon: string[] = [];
  if (due > 0) soon.push(due === 1 ? '1 word is ready.' : `${due} words are ready.`);
  if ((ctx.streak ?? 0) >= 2) soon.push(`${ctx.streak} days so far.`);
  const place = placeLine(ctx);
  if (place) soon.push(place);
  return { soon: soon.length ? soon : [EVERGREEN[0]], later: place ? [place, ...EVERGREEN] : EVERGREEN };
}

export const NOTIFICATION = {
  title: 'Root',
  /** The line a reminder would carry today. `n` picks a different one for each reminder in a row. */
  body: (voice: 'coach' | 'quiet', due: number, ctx: CheckInContext = {}, n = 0) => {
    const l = lines(voice, due, ctx);
    return l.soon[n % l.soon.length];
  },
};

/** Everything a reminder needs from the learner's state: due words, streak, and the place being cleared. */
export function contextOf(s: Pick<Data, 'words' | 'mod' | 'practiceDays' | 'frozenDays' | 'journey'>): { due: number; ctx: CheckInContext } {
  const stops = s.journey.stops;
  return {
    due: dueCount(s),
    ctx: { streak: streak(s), place: chapterOf(s.journey.chapter).name, cleared: stops.length ? stops.filter((st) => st.done).length / stops.length : 0 },
  };
}

export async function askPermission(): Promise<boolean> {
  const n = lib();
  if (!n) return false;
  try {
    const cur = await n.getPermissionsAsync();
    if (cur.granted) return true;
    const res = await n.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

async function channel(n: N) {
  if (Platform.OS === 'android') await n.setNotificationChannelAsync('practice', { name: 'Reminders', importance: n.AndroidImportance.DEFAULT });
}

/** Replaces every scheduled reminder with the current settings. Returns how many were scheduled. */
export async function syncCheckIns(c: CheckIn, voice: 'coach' | 'quiet', due: number, ctx: CheckInContext = {}): Promise<number> {
  const n = lib();
  if (!n) return 0;
  try {
    await n.cancelAllScheduledNotificationsAsync();
    if (c.freq === 'off' || c.slots.length === 0) return 0;
    await channel(n);
    const days = c.freq === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : c.days;
    const now = new Date().getDay();
    const l = lines(voice, due, ctx);
    const at = new Date();
    let count = 0;
    for (const day of days) {
      const ahead = (day - now + 7) % 7; // 0 today, 1 tomorrow …
      for (const slot of c.slots) {
        const [hour, minute] = c.times[slot].split(':').map(Number);
        if (ahead <= 1) {
          // Today's and tomorrow's reminders can mention the streak or how many words are ready, so they are
          // sent once, on that date. A repeating trigger would say the same number again next week, by which
          // time it could be wrong. The following three weeks get lines that stay true.
          const first = new Date(at.getFullYear(), at.getMonth(), at.getDate() + ahead, hour, minute, 0, 0);
          for (let week = 0; week < 4; week++) {
            const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + week * 7, hour, minute, 0, 0);
            if (date.getTime() <= at.getTime() + 30000) continue;
            const pool = week === 0 ? l.soon : l.later;
            await n.scheduleNotificationAsync({
              content: { title: NOTIFICATION.title, body: pool[(ahead + count + week) % pool.length], data: { to: 'journey' } },
              trigger: { type: n.SchedulableTriggerInputTypes.DATE, date, channelId: 'practice' },
            });
          }
        } else {
          await n.scheduleNotificationAsync({
            content: { title: NOTIFICATION.title, body: l.later[(ahead + count) % l.later.length], data: { to: 'journey' } },
            trigger: { type: n.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute, channelId: 'practice' },
          });
        }
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Re-writes the scheduled reminders from the learner's current state, so the streak and
 * the place they mention are fresh. Never asks for permission; does nothing without it.
 * Call when the app opens or returns to the Journey.
 */
export async function refreshCheckIns(): Promise<number> {
  const n = lib();
  if (!n) return 0;
  try {
    if (!(await n.getPermissionsAsync()).granted) return 0;
    const s = useStore.getState();
    if (!s.onboarded) return 0;
    const { due, ctx } = contextOf(s);
    return await syncCheckIns(s.checkIn, s.voice, due, ctx);
  } catch {
    return 0;
  }
}

/** Sends one reminder a few seconds from now, so the learner can see exactly what it looks like. */
export async function sendTest(voice: 'coach' | 'quiet', due: number, ctx: CheckInContext = {}): Promise<boolean> {
  const n = lib();
  if (!n || !(await askPermission())) return false;
  try {
    await channel(n);
    await n.scheduleNotificationAsync({
      content: { title: NOTIFICATION.title, body: NOTIFICATION.body(voice, due, ctx), data: { to: 'journey' } },
      trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: 'practice' },
    });
    return true;
  } catch {
    return false;
  }
}

/** Calls `open` when a reminder is tapped (it should open the Journey). Returns an unsubscribe function. */
export function onCheckInTap(open: () => void): () => void {
  const n = lib();
  if (!n) return () => {};
  try {
    const sub = n.addNotificationResponseReceivedListener(() => open());
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
