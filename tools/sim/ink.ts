// Tunes and checks the handwriting check (src/lib/ink.ts) against simulated writers.
//
//   npx tsx tools/sim/ink.ts
//
// For each beat in the word bank it writes the beat the way a messy hand might (letters stretched,
// squashed and nudged, the whole thing slanted and turned a little, shaky lines, strokes reversed and
// in a different order), and also writes one likely slip of it (a mirrored or lookalike letter, two
// letters swapped, one left out). Then it reports, for a range of thresholds:
//   accept   how often the right beat is read as right       (want high: a miss here is unfair)
//   catch    how often a slip is NOT read as right            (want high: a miss here lets an error by)
// It also writes scribbles and a different beat altogether, which should come back "unclear".
// Real finger-writing is messier than this, so the numbers are an upper bound, not a promise.

import { BANK } from '../../src/data/words';
import { layoutLetters, traceable, type Pt } from '../../src/lib/glyphs';
import { candidatesFor, readBeat, type Read } from '../../src/lib/ink';

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const between = (a: number, b: number) => a + (b - a) * rnd();
const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());

/** One messy handwritten copy of `text`. `mess` 1 is ordinary, 1.6 is careless. */
function scrawl(text: string, mess = 1): Pt[][] {
  const lay = layoutLetters(text.split(''), 600, 260, { pad: 20, maxScale: 3 });
  const h = 180 * lay.scale;
  const slant = between(-0.25, 0.25) * mess;
  const turn = (between(-5, 5) * mess * Math.PI) / 180;
  const strokes: Pt[][] = [];
  for (const l of lay.letters) {
    const sx = 1 + between(-0.2, 0.25) * mess;
    const sy = 1 + between(-0.15, 0.2) * mess;
    const dx = between(-0.12, 0.12) * l.w * mess;
    const dy = between(-0.06, 0.06) * h * mess;
    const cx = l.x + l.w / 2;
    for (const t of l.tracks) {
      const phase = between(0, 6.28);
      let pts = t.pts.map((p, i) => {
        let x = cx + (p.x - cx) * sx + dx;
        let y = lay.base + (p.y - lay.base) * sy + dy;
        x += slant * (lay.base - y);
        // A slow wobble along the stroke, plus a little shake.
        x += Math.sin(i / 6 + phase) * 0.02 * h * mess + gauss() * 0.008 * h * mess;
        y += Math.cos(i / 7 + phase) * 0.02 * h * mess + gauss() * 0.008 * h * mess;
        return { x: x * Math.cos(turn) - y * Math.sin(turn), y: x * Math.sin(turn) + y * Math.cos(turn) };
      });
      if (rnd() < 0.3) pts = pts.reverse();
      strokes.push(pts);
    }
  }
  // Strokes in a different order now and then (a crossbar first, the dots last or first).
  if (rnd() < 0.4) strokes.sort(() => rnd() - 0.5);
  return strokes;
}

const beats = [...new Set(BANK.flatMap((b) => b.parts.map((p) => p.toLowerCase())))].filter((p) => p.length > 0 && traceable(p)).slice(0, 260);
const scribble = (): Pt[][] =>
  Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => {
    let x = between(0, 400), y = between(0, 200);
    return Array.from({ length: 40 }, () => ({ x: (x += between(-25, 25)), y: (y += between(-25, 25)) }));
  });
const pct = (reads: Read[], v: Read['verdict']) => `${((reads.filter((r) => r.verdict === v).length / Math.max(1, reads.length)) * 100).toFixed(0).padStart(3)}%`;

for (const mess of [1, 1.15, 1.6]) {
  const right: Read[] = [], slip: Read[] = [], other: Read[] = [], scrib: Read[] = [];
  for (const beat of beats) {
    right.push(readBeat(scrawl(beat, mess), beat));
    const slips = candidatesFor(beat).filter((c) => c !== beat);
    if (slips.length) slip.push(readBeat(scrawl(slips[Math.floor(rnd() * slips.length)], mess), beat));
    const o = beats[Math.floor(rnd() * beats.length)];
    if (o !== beat && o.length > 1) other.push(readBeat(scrawl(o, mess), beat));
    scrib.push(readBeat(scribble(), beat));
  }
  console.log(`mess ${mess}`);
  console.log(`  right beat      right ${pct(right, 'match')}   slip ${pct(right, 'slip')}   unclear ${pct(right, 'unclear')}`);
  console.log(`  one slip        right ${pct(slip, 'match')}   slip ${pct(slip, 'slip')}   unclear ${pct(slip, 'unclear')}`);
  console.log(`  another beat    right ${pct(other, 'match')}   slip ${pct(other, 'slip')}   unclear ${pct(other, 'unclear')}`);
  console.log(`  scribble        right ${pct(scrib, 'match')}   slip ${pct(scrib, 'slip')}   unclear ${pct(scrib, 'unclear')}`);
}
