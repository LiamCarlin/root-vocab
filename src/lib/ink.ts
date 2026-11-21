// Reading what a learner wrote with a finger, one beat at a time.
//
// It does not try to read any word at all. It knows which beat should be there, so it only has to
// tell that beat apart from the slips a dyslexic writer is likely to make in it: a mirrored or turned
// letter (b for d, n for u), two letters swapped, or one left out. Each candidate is drawn from the
// app's own letter strokes (lib/glyphs), so this runs on the phone and in the browser alike, offline,
// and nothing is sent anywhere.
//
// Two readings are combined, and the closest candidate wins (nearest-neighbour classification):
//   the whole beat as a cloud of points: the $P recognizer (Vatavu, Anthony and Wobbrock, "Gestures
//     as point clouds", ICMI 2012). A cloud has no order, so it does not matter which stroke came
//     first or which way it went, which suits learners who form letters their own way.
//   letter by letter: the writing fitted to the candidate's box, each letter compared on its own, so
//     a mirrored letter is a big difference and not a small part of a wide shape.
//
// It is a check, not a judge: when it cannot tell, it says so and the learner compares for
// themselves. A trained handwriting model (Google ML Kit's on-device digital ink recognizer, in a
// native build) could sit behind the same `readBeat` later.

import { layoutLetters, traceable, type Pt } from './glyphs';

/** Points per cloud. $P is accurate from about 32; a beat has several letters, so a few more. */
const N = 64;

type CloudPt = Pt & { id: number };

/**
 * Letters a dyslexic writer may put in place of each other: mirrors and turns (b d p q, n u, m w).
 * Lookalikes such as a/o, e/c, i/l or t/f are left out on purpose: in finger-writing they are a
 * matter of neatness, not spelling, and calling them errors would be unfair (they also cannot be
 * told apart reliably; see tools/sim/ink.ts).
 */
const CONFUSABLE: Record<string, string> = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'bdp', n: 'u', u: 'n', m: 'w', w: 'm' };

/** The beat itself, then the likely slips in it (a mirrored letter, two swapped, one left out), each written the way the app writes letters. */
export function candidatesFor(beat: string): string[] {
  const t = beat.toLowerCase();
  const out = new Set<string>([t]);
  for (let i = 0; i < t.length; i++) {
    for (const ch of CONFUSABLE[t[i]] ?? '') out.add(t.slice(0, i) + ch + t.slice(i + 1));
    if (i + 1 < t.length && t[i] !== t[i + 1]) out.add(t.slice(0, i) + t[i + 1] + t[i] + t.slice(i + 2));
    if (t.length > 1) out.add(t.slice(0, i) + t.slice(i + 1));
  }
  return [...out].filter((c) => c.length > 0 && traceable(c));
}

// ── $P ────────────────────────────────────────────────────────────────────

function pathLength(pts: CloudPt[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

function resample(points: CloudPt[], n: number): CloudPt[] {
  const total = pathLength(points);
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0] }));
  const I = total / (n - 1);
  const pts = points.map((p) => ({ ...p }));
  const out: CloudPt[] = [{ ...pts[0] }];
  let D = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].id !== pts[i - 1].id) continue;
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (D + d >= I && d > 0) {
      const q = { x: pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y), id: pts[i].id };
      out.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] });
  return out.slice(0, n);
}

/** Scaled to fit a unit box (keeping its shape) and centred on its centroid. */
function normalize(pts: CloudPt[]): CloudPt[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const scaled = pts.map((p) => ({ x: (p.x - minX) / size, y: (p.y - minY) / size, id: p.id }));
  const cx = scaled.reduce((s, p) => s + p.x, 0) / scaled.length;
  const cy = scaled.reduce((s, p) => s + p.y, 0) / scaled.length;
  return scaled.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
}

function cloudDistance(a: CloudPt[], b: CloudPt[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity;
    let index = 0;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = Math.hypot(a[i].x - b[j].x, a[i].y - b[j].y);
      if (d < min) {
        min = d;
        index = j;
      }
    }
    matched[index] = true;
    sum += (1 - ((i - start + n) % n) / n) * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyMatch(a: CloudPt[], b: CloudPt[]): number {
  const n = a.length;
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let min = Infinity;
  for (let i = 0; i < n; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

/** Strokes as a cloud. A tap (a dot over an i) becomes a tiny stroke, so it is not lost in resampling. */
function cloudOf(strokes: Pt[][]): CloudPt[] {
  const pts: CloudPt[] = [];
  strokes.forEach((st, id) => {
    if (st.length === 1) {
      pts.push({ ...st[0], id }, { x: st[0].x + 2, y: st[0].y + 2, id });
      return;
    }
    for (const p of st) pts.push({ ...p, id });
  });
  return pts.length ? normalize(resample(pts, N)) : [];
}

const templateCache = new Map<string, CloudPt[]>();
function templateFor(text: string): CloudPt[] {
  const hit = templateCache.get(text);
  if (hit) return hit;
  const lay = layoutLetters(text.split(''), 1000, 400, { pad: 0, maxScale: 3 });
  const strokes = lay.letters.flatMap((l) => l.tracks.map((t) => t.pts));
  const cloud = cloudOf(strokes);
  templateCache.set(text, cloud);
  return cloud;
}

// ── Letter by letter ──────────────────────────────────────────────────────
// A whole-beat cloud is scaled as one shape, so the difference between b and d is a small part of a
// wide beat. Here the writing is fitted to the candidate's box, each point goes to the letter slot
// it falls in, and each letter is compared on its own (centred, so a letter written a little to one
// side is not punished), by chamfer distance: the average gap from each point to the nearest point
// of the other shape, both ways. Units are the candidate's x-height-to-baseline height.

type Lettered = { box: { x0: number; x1: number; y0: number; y1: number }; letters: { x0: number; x1: number; pts: Pt[] }[]; h: number };
const letteredCache = new Map<string, Lettered>();
function lettered(text: string): Lettered {
  const hit = letteredCache.get(text);
  if (hit) return hit;
  const lay = layoutLetters(text.split(''), 1000, 400, { pad: 0, maxScale: 3, step: 4 });
  const letters = lay.letters.map((l) => ({ x0: l.x, x1: l.x + l.w, pts: l.tracks.flatMap((t) => t.pts) }));
  const all = letters.flatMap((l) => l.pts);
  const box = { x0: Math.min(...all.map((p) => p.x)), x1: Math.max(...all.map((p) => p.x)), y0: Math.min(...all.map((p) => p.y)), y1: Math.max(...all.map((p) => p.y)) };
  const out = { box, letters, h: lay.base - lay.xh };
  letteredCache.set(text, out);
  return out;
}

/** Points every `step` along each stroke (a tap stays one point). */
function dense(strokes: Pt[][], step: number): Pt[] {
  const out: Pt[] = [];
  for (const st of strokes) {
    if (!st.length) continue;
    out.push(st[0]);
    let carry = 0;
    for (let i = 1; i < st.length; i++) {
      const a = st[i - 1], b = st[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      let t = step - carry;
      while (t <= d) {
        out.push({ x: a.x + ((b.x - a.x) * t) / d, y: a.y + ((b.y - a.y) * t) / d });
        t += step;
      }
      carry = d > 0 ? (carry + d) % step : carry;
    }
  }
  return out;
}

const meanNearest = (from: Pt[], to: Pt[]) => {
  let sum = 0;
  for (const p of from) {
    let min = Infinity;
    for (const q of to) min = Math.min(min, (p.x - q.x) ** 2 + (p.y - q.y) ** 2);
    sum += Math.sqrt(min);
  }
  return sum / from.length;
};
const centred = (pts: Pt[]) => {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
};

function letterDistance(strokes: Pt[][], text: string): number {
  const L = lettered(text);
  const raw = strokes.flat();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of raw) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const fx = (L.box.x1 - L.box.x0) / Math.max(1, x1 - x0);
  const fy = (L.box.y1 - L.box.y0) / Math.max(1, y1 - y0);
  const fitted = strokes.map((st) => st.map((p) => ({ x: L.box.x0 + (p.x - x0) * fx, y: L.box.y0 + (p.y - y0) * fy })));
  const pts = dense(fitted, 4);
  const slots: Pt[][] = L.letters.map(() => []);
  for (const p of pts) {
    let best = 0, bestD = Infinity;
    L.letters.forEach((l, j) => {
      const d = p.x < l.x0 ? l.x0 - p.x : p.x > l.x1 ? p.x - l.x1 : 0;
      const c = Math.abs(p.x - (l.x0 + l.x1) / 2) * 1e-3;
      if (d + c < bestD) {
        bestD = d + c;
        best = j;
      }
    });
    slots[best].push(p);
  }
  let total = 0, weight = 0;
  L.letters.forEach((l, j) => {
    const w = l.pts.length;
    weight += w;
    if (!slots[j].length) {
      total += w * 1.0; // nothing written where this letter goes
      return;
    }
    const a = centred(slots[j]);
    const b = centred(l.pts);
    total += (w * (meanNearest(a, b) + meanNearest(b, a))) / L.h;
  });
  return total / weight;
}

// ── The check ─────────────────────────────────────────────────────────────

/** One score from both readings: the whole-beat cloud catches swapped and missing letters, the
 * letter-by-letter reading catches mirrored ones. Each is divided by its typical value for a correct
 * beat, so they weigh the same. */
const score = (strokes: Pt[][], cloud: CloudPt[], text: string) => greedyMatch(cloud, templateFor(text)) / 1.4 + letterDistance(strokes, text) / 0.14;

/**
 * Set against simulated writers (tools/sim/ink.ts): 260 beats from the word bank, written slanted,
 * stretched, shaky, letter by letter out of line, strokes reversed and reordered, and the same with
 * one slip in each. With these values, very messy writing of the right beat is read as right 93-96%
 * of the time, and a slip is caught 95-98% of the time. Scribbles and a different beat altogether
 * mostly score above `match`, which makes them "unclear". Real finger-writing is messier still, so
 * an unclear read hands back to the learner rather than saying "wrong".
 */
export const INK = { match: 3.6, margin: 0.1, minInk: 18 };

export type Read =
  | { verdict: 'match'; beat: string; score: number }
  | { verdict: 'slip'; beat: string; looksLike: string; score: number }
  | { verdict: 'unclear'; beat: string; why: 'little' | 'far' };

/**
 * Reads one beat from the finger's strokes (in pad points). `match` when the beat is the closest
 * candidate or within the margin of it; `slip` when a likely slip is clearly closer; `unclear` when
 * there is too little ink to read or nothing is close.
 */
export function readBeat(strokes: Pt[][], beat: string): Read {
  const t = beat.toLowerCase();
  const all = strokes.flat();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of all) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!all.length || Math.max(maxX - minX, maxY - minY) < INK.minInk) return { verdict: 'unclear', beat: t, why: 'little' };
  if (!traceable(t)) return { verdict: 'unclear', beat: t, why: 'far' };
  const cloud = cloudOf(strokes);
  const scores = candidatesFor(t).map((c) => ({ c, d: score(strokes, cloud, c) }));
  const mine = scores.find((s) => s.c === t)!;
  const best = scores.reduce((a, b) => (b.d < a.d ? b : a));
  if (mine.d <= INK.match && (best.c === t || mine.d <= best.d * (1 + INK.margin))) return { verdict: 'match', beat: t, score: mine.d };
  if (best.c !== t && best.d <= INK.match) return { verdict: 'slip', beat: t, looksLike: best.c, score: best.d };
  return { verdict: 'unclear', beat: t, why: 'far' };
}

/** For the simulator: each reading on its own. */
export const inkDistance = (strokes: Pt[][], text: string) => greedyMatch(cloudOf(strokes), templateFor(text));
export const inkLetterDistance = letterDistance;
