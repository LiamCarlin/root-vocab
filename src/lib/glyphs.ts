// Letter shapes as pen strokes.
//
// Tracing and the marble run both need to know how a letter is actually written: where the pen
// starts, which way it travels, and where it lifts. A typeface cannot say that, so every letter
// here is drawn as one or more strokes in the order and direction it is taught in handwriting
// (bowls anticlockwise from the top, stems top to bottom, crossbars and dots last).
//
// Units: x runs right from the glyph's left edge; y runs DOWN. The top of a tall letter is 0,
// the top of a small letter (the x-height) is 80, the baseline is 180, and tails reach 250.

export type Pt = { x: number; y: number };
/** One continuous pen movement. `dot` is a pen touch with no travel (the dot of i and j). */
export type Stroke = { pts: Pt[]; dot?: boolean };
export type Glyph = { w: number; strokes: Stroke[] };

export const EM = { asc: 0, x: 80, base: 180, desc: 250 } as const;
/** Space between letters, and the width of a space between words. */
export const GAP = 26;
export const SPACE = 52;

type Seg = Pt[];

/** A polyline through the given x, y pairs. */
const L = (...xy: number[]): Seg => {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < xy.length; i += 2) out.push({ x: xy[i], y: xy[i + 1] });
  return out;
};

/**
 * Part of an ellipse, from angle `a0` to `a1` in degrees. 0 is the right-hand point, 90 the
 * bottom (y runs down), so a rising angle travels clockwise on screen and a falling one anticlockwise.
 */
const A = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Seg => {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 6));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
};

/** Segments joined end to end into one stroke. */
const S = (...segs: Seg[]): Stroke => {
  const pts: Pt[] = [];
  for (const seg of segs) {
    for (const p of seg) {
      const last = pts[pts.length - 1];
      if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) pts.push(p);
    }
  }
  return { pts };
};
const DOT = (x: number, y: number): Stroke => ({ pts: [{ x, y }], dot: true });
const G = (w: number, ...strokes: Stroke[]): Glyph => ({ w, strokes });

// The round part of a small letter: a bowl 88 wide and 100 tall, centred on the middle of the x-height.
const BOWL = (a0: number, a1: number, cx = 44) => A(cx, 130, 44, 50, a0, a1);
/** An arch from a stem at x = `x0` over to x0 + 2r, as in n, m and h. */
const ARCH = (x0: number, r: number) => A(x0 + r, 80 + r, r, r, 180, 360);

const GLYPHS: Record<string, Glyph> = {
  a: G(88, S(BOWL(-40, -360), L(88, 80, 88, 180))),
  b: G(88, S(L(0, 0, 0, 180, 0, 130), BOWL(180, 540))),
  c: G(78, S(BOWL(-45, -315))),
  d: G(88, S(BOWL(-40, -360), L(88, 0, 88, 180))),
  e: G(88, S(L(2, 130, 88, 130), BOWL(0, -315))),
  f: G(68, S(A(50, 34, 28, 34, -50, -180), L(22, 180)), S(L(0, 80, 52, 80))),
  g: G(88, S(BOWL(-40, -360), L(88, 80, 88, 214), A(44, 214, 44, 36, 0, 150))),
  h: G(84, S(L(0, 0, 0, 180, 0, 122), ARCH(0, 42), L(84, 180))),
  i: G(12, S(L(6, 80, 6, 180)), DOT(6, 44)),
  j: G(40, S(L(30, 80, 30, 214), A(6, 214, 24, 36, 0, 150)), DOT(30, 44)),
  k: G(76, S(L(0, 0, 0, 180)), S(L(70, 80, 0, 136, 76, 180))),
  l: G(12, S(L(6, 0, 6, 180))),
  m: G(136, S(L(0, 80, 0, 180, 0, 114), ARCH(0, 34), L(68, 180, 68, 114), ARCH(68, 34), L(136, 180))),
  n: G(84, S(L(0, 80, 0, 180, 0, 122), ARCH(0, 42), L(84, 180))),
  o: G(92, S(A(46, 130, 46, 50, -90, -450))),
  p: G(88, S(L(0, 80, 0, 250, 0, 130), BOWL(180, 540))),
  q: G(88, S(BOWL(-40, -360), L(88, 80, 88, 250))),
  r: G(64, S(L(0, 80, 0, 180, 0, 120), A(40, 120, 40, 40, 180, 305))),
  s: G(72, S(A(36, 105, 32, 25, -35, -270), A(36, 155, 32, 25, -90, 145))),
  t: G(66, S(L(22, 24, 22, 152), A(50, 152, 28, 28, 180, 60)), S(L(0, 80, 54, 80))),
  u: G(84, S(L(0, 80, 0, 138), A(42, 138, 42, 42, 180, 0), L(84, 80, 84, 180))),
  v: G(80, S(L(0, 80, 40, 180, 80, 80))),
  w: G(116, S(L(0, 80, 28, 180, 58, 92, 88, 180, 116, 80))),
  x: G(76, S(L(0, 80, 76, 180)), S(L(76, 80, 0, 180))),
  y: G(80, S(L(0, 80, 40, 180)), S(L(80, 80, 12, 250))),
  z: G(76, S(L(0, 80, 74, 80, 0, 180, 76, 180))),

  A: G(112, S(L(56, 0, 0, 180)), S(L(56, 0, 112, 180)), S(L(22, 118, 90, 118))),
  B: G(102, S(L(0, 0, 0, 180)), S(L(0, 0, 50, 0), A(50, 42, 40, 42, -90, 90), L(0, 84, 56, 84), A(56, 132, 46, 48, -90, 90), L(0, 180))),
  C: G(118, S(A(70, 90, 70, 90, -50, -310))),
  D: G(120, S(L(0, 0, 0, 180)), S(L(0, 0, 40, 0), A(40, 90, 80, 90, -90, 90), L(0, 180))),
  E: G(92, S(L(0, 0, 0, 180)), S(L(0, 0, 90, 0)), S(L(0, 88, 74, 88)), S(L(0, 180, 92, 180))),
  F: G(90, S(L(0, 0, 0, 180)), S(L(0, 0, 90, 0)), S(L(0, 88, 72, 88))),
  G: G(140, S(A(70, 90, 70, 90, -50, -350), L(140, 94, 84, 94))),
  H: G(110, S(L(0, 0, 0, 180)), S(L(110, 0, 110, 180)), S(L(0, 88, 110, 88))),
  I: G(12, S(L(6, 0, 6, 180))),
  J: G(66, S(L(60, 0, 60, 130), A(30, 130, 30, 50, 0, 170))),
  K: G(104, S(L(0, 0, 0, 180)), S(L(98, 0, 0, 104)), S(L(36, 70, 104, 180))),
  L: G(88, S(L(0, 0, 0, 180, 88, 180))),
  M: G(130, S(L(0, 180, 0, 0, 65, 130, 130, 0, 130, 180))),
  N: G(110, S(L(0, 180, 0, 0, 110, 180, 110, 0))),
  O: G(140, S(A(70, 90, 70, 90, -90, -450))),
  P: G(96, S(L(0, 0, 0, 180)), S(L(0, 0, 50, 0), A(50, 46, 44, 46, -90, 90), L(0, 92))),
  Q: G(142, S(A(70, 90, 70, 90, -90, -450)), S(L(86, 128, 142, 186))),
  R: G(100, S(L(0, 0, 0, 180)), S(L(0, 0, 50, 0), A(50, 46, 44, 46, -90, 90), L(0, 92, 30, 92, 100, 180))),
  S: G(104, S(A(52, 46, 46, 46, -35, -270), A(52, 136, 50, 44, -90, 150))),
  T: G(110, S(L(55, 0, 55, 180)), S(L(0, 0, 110, 0))),
  U: G(110, S(L(0, 0, 0, 120), A(55, 120, 55, 60, 180, 0), L(110, 0))),
  V: G(110, S(L(0, 0, 55, 180, 110, 0))),
  W: G(156, S(L(0, 0, 38, 180, 78, 20, 118, 180, 156, 0))),
  X: G(104, S(L(0, 0, 104, 180)), S(L(104, 0, 0, 180))),
  Y: G(104, S(L(0, 0, 52, 92)), S(L(104, 0, 52, 92, 52, 180))),
  Z: G(104, S(L(0, 0, 100, 0, 0, 180, 104, 180))),

  '-': G(44, S(L(0, 130, 44, 130))),
  "'": G(12, S(L(8, 0, 4, 40))),
  '’': G(12, S(L(8, 0, 4, 40))),
};

/** The strokes for a character, or null when there is no drawing for it. */
export const glyphFor = (ch: string): Glyph | null => GLYPHS[ch] ?? null;

/** True when every character of `text` (spaces aside) can be traced. */
export const traceable = (text: string) => text.split('').every((ch) => ch === ' ' || !!GLYPHS[ch]);

// ── Laying letters out and walking along them ─────────────────────────────

/** A stroke placed on the pad: evenly spaced points, with the distance travelled to each one. */
export type Track = { pts: Pt[]; at: number[]; len: number; dot: boolean };
export type Placed = { ch: string; /** Left edge and width on the pad. */ x: number; w: number; tracks: Track[] };
export type Layout = { letters: Placed[]; scale: number; /** y of the baseline and of the x-height line on the pad. */ base: number; xh: number; width: number };

function resample(pts: Pt[], step: number): Track {
  if (pts.length < 2) return { pts: pts.slice(), at: pts.map(() => 0), len: 0, dot: true };
  const out: Pt[] = [pts[0]];
  const at: number[] = [0];
  let total = 0;
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d === 0) continue;
    let t = step - carry;
    while (t <= d) {
      out.push({ x: a.x + ((b.x - a.x) * t) / d, y: a.y + ((b.y - a.y) * t) / d });
      at.push(total + t);
      t += step;
    }
    carry = (carry + d) % step;
    total += d;
  }
  const last = pts[pts.length - 1];
  if (total - at[at.length - 1] > 0.5) {
    out.push(last);
    at.push(total);
  }
  return { pts: out, at, len: total, dot: false };
}

/**
 * Places `chars` in a box `w` × `h`, as large as fits (up to `maxScale`), centred. A character
 * with no drawing gets an empty slot so the others keep their places.
 */
export function layoutLetters(chars: string[], w: number, h: number, opts: { pad?: number; maxScale?: number; step?: number } = {}): Layout {
  const pad = opts.pad ?? 28;
  const glyphs = chars.map((ch) => (ch === ' ' ? null : glyphFor(ch)));
  const widths = chars.map((ch, i) => (ch === ' ' ? SPACE : (glyphs[i]?.w ?? 60)));
  const total = widths.reduce((sum, x) => sum + x, 0) + GAP * Math.max(0, chars.length - 1);
  const tall = chars.some((ch) => /[gjpqy]/.test(ch));
  const top = chars.some((ch) => /[A-Zbdfhklt'’]/.test(ch)) ? EM.asc : EM.x - 44; // room for the dot of i and j
  const bottom = tall ? EM.desc : EM.base;
  const scale = Math.min(opts.maxScale ?? 1.5, (w - pad * 2) / Math.max(1, total), (h - pad * 2) / (bottom - top));
  const x0 = (w - total * scale) / 2;
  const y0 = (h - (bottom - top) * scale) / 2 - top * scale;
  const step = opts.step ?? 3;
  let x = x0;
  const letters: Placed[] = chars.map((ch, i) => {
    const g = glyphs[i];
    const left = x;
    x += (widths[i] + GAP) * scale;
    const tracks = (g?.strokes ?? []).map((st) => {
      const pts = st.pts.map((p) => ({ x: left + p.x * scale, y: y0 + p.y * scale }));
      return st.dot ? { pts, at: [0], len: 0, dot: true } : resample(pts, step);
    });
    return { ch, x: left, w: widths[i] * scale, tracks };
  });
  return { letters, scale, base: y0 + EM.base * scale, xh: y0 + EM.x * scale, width: total * scale };
}

/** The point `s` along a track, and the direction of travel there (a unit vector). */
export function pointAt(t: Track, s: number): { p: Pt; dir: Pt } {
  const n = t.pts.length;
  if (n === 0) return { p: { x: 0, y: 0 }, dir: { x: 1, y: 0 } };
  if (n === 1 || t.len === 0) return { p: t.pts[0], dir: { x: 0, y: 1 } };
  const d = Math.max(0, Math.min(t.len, s));
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t.at[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = t.pts[lo], b = t.pts[hi];
  const span = Math.max(1e-6, t.at[hi] - t.at[lo]);
  const k = (d - t.at[lo]) / span;
  const dx = b.x - a.x, dy = b.y - a.y;
  const m = Math.max(1e-6, Math.hypot(dx, dy));
  return { p: { x: a.x + dx * k, y: a.y + dy * k }, dir: { x: dx / m, y: dy / m } };
}

/**
 * The nearest place on a track to `p`, looking only between `from` and `to` along it. Looking
 * in a window, not at the whole stroke, is what keeps a finger from jumping across where a
 * letter crosses or doubles back on itself.
 */
export function nearestOn(t: Track, p: Pt, from: number, to: number): { s: number; dist: number } {
  let best = Infinity;
  let s = from;
  for (let i = 0; i < t.pts.length; i++) {
    if (t.at[i] < from - 0.01 || t.at[i] > to + 0.01) continue;
    const d = Math.hypot(t.pts[i].x - p.x, t.pts[i].y - p.y);
    if (d < best) {
      best = d;
      s = t.at[i];
    }
  }
  return { s, dist: best };
}

/** SVG path data for a track (or for its first `upTo` points of travel). */
export function pathOf(t: Track, upTo = Infinity): string {
  if (!t.pts.length) return '';
  let d = `M${t.pts[0].x.toFixed(1)} ${t.pts[0].y.toFixed(1)}`;
  for (let i = 1; i < t.pts.length && t.at[i] <= upTo + 0.01; i++) d += `L${t.pts[i].x.toFixed(1)} ${t.pts[i].y.toFixed(1)}`;
  if (upTo < t.len && upTo > 0) {
    const { p } = pointAt(t, upTo);
    d += `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}
