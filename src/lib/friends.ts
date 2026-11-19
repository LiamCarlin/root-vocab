// Friends, without a server.
//
// Root keeps everything on the phone, and friends do not change that. A friend is added from a
// CARD: a short code that carries a first name, a streak, the gems earned this week and the words
// rooted. The learner sends their card through whatever they already use to talk to people (the
// share sheet), and the person who gets it opens the link or pastes the code. Nothing is uploaded
// and nothing is fetched, so a friend's numbers are exactly as fresh as the last card they sent,
// and the screen says how old that is. Sending a card is the nudge: "I did mine. Your turn."
//
// Pure functions: no React, no storage.

export type Friend = {
  id: string;
  name: string;
  streak: number;
  /** Gems earned in the week the card was made. */
  week: number;
  rooted: number;
  /** The last day they practised, as a day key. */
  day: string;
  /** When the card was made (ms). */
  at: number;
};

const MARK = 'R1';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9]{6,24}$/;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h;
}
const check = (body: string) => (hash(body) % 1679616).toString(36).padStart(4, '0');
const int = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : lo);

/** A friend record that is safe to keep, or null. Used for cards and for backups alike. */
export function cleanFriend(v: unknown): Friend | null {
  if (!v || typeof v !== 'object') return null;
  const f = v as Record<string, unknown>;
  if (typeof f.id !== 'string' || !ID_RE.test(f.id) || typeof f.day !== 'string' || (f.day !== '' && !DAY_RE.test(f.day))) return null;
  const name = (typeof f.name === 'string' ? f.name : '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
  return { id: f.id, name: name || 'Friend', streak: int(f.streak, 0, 9999), week: int(f.week, 0, 99999), rooted: int(f.rooted, 0, 99999), day: f.day, at: int(f.at, 0, 4102444800000) };
}

/** The code for a card: letters, digits, dots and percent signs only, so it survives any messaging app. */
export function makeCard(f: Friend): string {
  const name = encodeURIComponent(f.name.slice(0, 24)).replace(/\./g, '%2E');
  const body = [MARK, f.id, f.streak.toString(36), f.week.toString(36), f.rooted.toString(36), f.day.replace(/-/g, ''), Math.round(f.at / 1000).toString(36), name].join('.');
  return `${body}.${check(body)}`;
}

const decoded = (t: string) => {
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
};

/**
 * Finds a card anywhere in a piece of text (a pasted message, a link) and reads it. null if there is none or it
 * has been damaged. Links get escaped and unescaped on their way through apps, so the name is accepted however
 * many times that has happened: it is put back into the one form the check was made from before it is checked.
 */
export function readCard(text: string): Friend | null {
  let raw = text;
  for (let i = 0; i < 2 && /%25/i.test(raw); i++) raw = decoded(raw);
  const m = raw.match(/R1\.([a-z0-9]{6,24})\.([a-z0-9]+)\.([a-z0-9]+)\.([a-z0-9]+)\.(\d{0,8})\.([a-z0-9]+)\.([^\n]{0,160}?)\.([a-z0-9]{4})(?![A-Za-z0-9%])/);
  if (!m) return null;
  const [, id, streak, week, rooted, day, at, name, sum] = m;
  const said = decoded(name);
  const body = [MARK, id, streak, week, rooted, day, at, encodeURIComponent(said).replace(/\./g, '%2E')].join('.');
  if (check(body) !== sum) return null;
  return cleanFriend({ id, name: said, streak: parseInt(streak, 36), week: parseInt(week, 36), rooted: parseInt(rooted, 36), day: day.length === 8 ? `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)}` : '', at: parseInt(at, 36) * 1000 });
}

/** How old a card is, in whole days. */
export const cardAge = (f: Pick<Friend, 'at'>, now = Date.now()) => Math.max(0, Math.floor((now - f.at) / 86400000));

/** "today", "yesterday", "3 days ago": when the card was sent. */
export function cardWhen(f: Pick<Friend, 'at'>, now = Date.now()): string {
  const n = cardAge(f, now);
  return n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
}
