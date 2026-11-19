// Day keys are local calendar days, "YYYY-MM-DD". Mastery counts separate days,
// so everything schedules by day key, never by timestamp.

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekdayName = (key: string) => WEEKDAYS[fromKey(key).getDay()];

/** "today", "tomorrow", "Thursday", or "Nov 28" for anything a week or more out. */
export function relDay(key: string, today: string): string {
  const n = diffDays(key, today);
  if (n <= 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 7) return weekdayName(key);
  const d = fromKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Sentence-ready: "today", "tomorrow", "on Thursday", "on Nov 28". */
export function relDayIn(key: string, today: string): string {
  const r = relDay(key, today);
  return r === 'today' || r === 'tomorrow' ? r : `on ${r}`;
}

export function niceDate(key: string): string {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** The seven day keys of the week containing `today`, Monday first. */
export function weekOf(today: string): string[] {
  const d = fromKey(today);
  const mondayOffset = (d.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - mondayOffset));
}

export function partOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}
