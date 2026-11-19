// A dry run of the learner model, with made-up learners whose true ability is known.
//
//   npx tsx tools/sim/run.ts
//
// It answers the questions that matter before the model is trusted with a real person:
//   - If the placement got someone wrong, do the words find their real level?
//   - Do the guesses get better as answers come in?
//   - Do the gaps between reviews settle where about 85% of reviews succeed?
//   - Does a learner with one weak spelling pattern get that pattern noticed?
// It uses the same functions the app does (lib/mind, lib/engine); only the learner is fake.

import { BANK_BY_ID } from '../../src/data/words';
import { addDays } from '../../src/lib/dates';
import { askFor, difficulty, emptyMem, levelOf, nextMem, pickSet, STRAND_LIST } from '../../src/lib/engine';
import { makeCard, readCard } from '../../src/lib/friends';
import { lexemeFor } from '../../src/lib/lexicon';
import { freshMind, gapFor, levelDrift, mainSlip, observe, predict, settle, slipsIn, weight, type Ask, type Mind } from '../../src/lib/mind';

type Strand = 'know' | 'find' | 'spell';
type Truth = { name: string; theta: Record<Strand, number>; start: Record<Strand, number>; weak?: string; speed: number };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const sig = (z: number) => 1 / (1 + Math.exp(-z));
const GAMES: Record<Strand, string[]> = { know: ['meaning', 'web', 'pair'], find: ['clue', 'gap'], spell: ['cover', 'missing', 'proof', 'dictate'] };
const EASE: Record<string, number> = { meaning: 0.7, web: 0.4, pair: 0.5, gap: 0.6, clue: -0.1, proof: 0.7, missing: 0.6, cover: 0.5, dictate: -0.3 };

/** What the made-up learner really does with a question. The model never sees this function. */
function really(t: Truth, a: Ask, rnd: () => number): { r: 0 | 0.5 | 1; ms: number } {
  let z = t.theta[a.strand] - a.hard + (a.game ? (EASE[a.game] ?? 0) : 0);
  if (a.taught) z += 1.5 + 0.5 * (a.box ?? 0) - 0.7 * (a.overdue ?? 0);
  if (a.strand === 'spell' && a.pattern && a.pattern === t.weak) z -= 1.4;
  const p = sig(z);
  const u = rnd();
  const r: 0 | 0.5 | 1 = u < p * 0.9 ? 1 : u < p + (1 - p) * 0.3 ? 0.5 : 0;
  return { r, ms: Math.round(7000 * t.speed * Math.exp((rnd() - 0.5) * 0.8) * (r === 1 ? 1 : 1.4)) };
}

function run(t: Truth, days: number, seed: number) {
  const rnd = rng(seed);
  let mind: Mind = freshMind();
  const s: any = { words: {}, skill: { ...t.start }, profile: { name: '', guest: false, days: [], interests: [], goals: [] }, patterns: {}, journey: { chapter: 1, stops: [], prologueSeen: true, introSeen: true, cleared: [] }, counters: { lessons: 0 }, mod: { micMiss: false, dayOffset: 0 }, mind };
  const day0 = '2026-01-01';
  const rows: string[] = [];
  let sq = 0, nq = 0, revOk = 0, revN = 0;
  const first: number[] = [], last: number[] = [];

  for (let d = 0; d < days; d++) {
    const today = addDays(day0, d);
    // The engine reads "today" from the clock plus an offset; give it the day we are simulating.
    s.mod = { micMiss: false, dayOffset: Math.round((new Date(today).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000) };
    s.mind = mind;

    // Reviews: everything due.
    let pos = 0;
    for (const w of Object.values<any>(s.words)) {
      for (const strand of STRAND_LIST as Strand[]) {
        const m = w.mem[strand];
        if (!m.due || m.due > today) continue;
        const game = GAMES[strand][Math.floor(rnd() * GAMES[strand].length)] as any;
        const ask = askFor(s, w.id, strand, game, { pos: pos++ % 8, hour: 19 })!;
        const p = predict(mind, ask);
        const ans = really(t, ask, rnd);
        sq += (p - ans.r) * (p - ans.r); nq++;
        (d < 10 ? first : d >= days - 10 ? last : []).push((p - ans.r) * (p - ans.r));
        revN++; revOk += ans.r;
        const gap = gapFor(mind, game, ans.r, ans.ms);
        const was = m;
        const now = nextMem(was, ans.r, today, gap);
        w.mem[strand] = now;
        // The level follows mastery, as in the store.
        const hard = difficulty(lexemeFor(w.id), strand);
        const ease = Math.max(0, Math.min(1, (now.ok / Math.max(1, now.seen) - 0.6) / 0.4));
        if (now.box >= 3 && (was.top ?? was.box) < 3 && hard >= levelOf(s.skill[strand])) s.skill[strand] = Math.min(6.9, s.skill[strand] + 0.08 * ease);
        else if (ans.r === 0 && was.box >= 2 && hard <= levelOf(s.skill[strand])) s.skill[strand] = Math.max(1, s.skill[strand] - 0.04);
        const attempt = strand === 'spell' && ans.r < 1 && t.weak === 'double' ? w.text.replace(/(.)\1/, '$1') : undefined;
        mind = observe(mind, { k: 'answer', ask, id: w.id, r: ans.r, ms: ans.ms, review: true, attempt, target: w.text });
        const drift = levelDrift(mind, strand);
        if (drift) {
          s.skill[strand] = Math.max(1, Math.min(6.9, s.skill[strand] + drift));
          mind = settle(mind, strand, drift);
        }
        s.mind = mind;
      }
    }

    // Two stops of new words. Each lesson is a handful of cold questions on the word; trouble is how many went wrong.
    const picked: string[] = [];
    for (let stop = 0; stop < 2; stop++) {
      const set = pickSet(s, 2, picked);
      for (const id of set) {
        picked.push(id);
        const lex = lexemeFor(id)!;
        let trouble = 0;
        for (const strand of ['know', 'spell', 'spell'] as Strand[]) {
          const ask = askFor(s, id, strand)!;
          if (really(t, { ...ask, hard: ask.hard - 1.2 }, rnd).r < 1) trouble++;
        }
        mind = observe(mind, { k: 'lesson', ms: 90000, hints: trouble, retries: 0, skipped: 0, topics: lex.topics });
        const mem = () => ({ ...emptyMem(), box: 1, due: addDays(today, 1), seen: 1, ok: 1, last: today });
        s.words[id] = { id, text: lex.text, status: 'learning', origin: 'path', addedAt: d, mem: { know: mem(), find: mem(), spell: mem() } };
        s.counters.lessons++;
        s.mind = mind;
      }
    }
    if (d % 5 === 4 || d === 0) {
      const lv = picked.map((id) => BANK_BY_ID[id].level), sp = picked.map((id) => BANK_BY_ID[id].spell);
      const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
      rows.push(`  day ${String(d + 1).padStart(2)}  new words: level ${avg(lv)} spell ${avg(sp)}   level shown ${s.skill.know.toFixed(2)}/${s.skill.spell.toFixed(2)}  model reads ${(s.skill.know + weight(mind, 'a:know')).toFixed(2)}/${(s.skill.spell + weight(mind, 'a:spell')).toFixed(2)}  stretch ${mind.stretch.toFixed(2)}  gaps x${mind.spacing.toFixed(2)}  mood ${mind.mood.toFixed(2)}`);
    }
  }
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  console.log(`\n${t.name}\n  true level know ${t.theta.know} spell ${t.theta.spell}; placed at ${t.start.know}/${t.start.spell}${t.weak ? `; weak pattern: ${t.weak}` : ''}`);
  rows.forEach((r) => console.log(r));
  console.log(`  reviews right: ${(100 * revOk / Math.max(1, revN)).toFixed(0)}% of ${revN}   guess error (Brier): first 10 days ${mean(first).toFixed(3)} -> last 10 days ${mean(last).toFixed(3)} (always-50% guess = 0.250)   calls right ${(100 * mind.cal.hit).toFixed(0)}%`);
  if (t.weak) console.log(`  weight learned for "${t.weak}": ${weight(mind, `p:${t.weak}`).toFixed(2)} (others near 0); main slip: ${JSON.stringify(mainSlip(mind))}`);
  return { mind, s };
}

const even = (v: number) => ({ know: v, find: v, spell: v });
run({ name: 'A. Placed too low (really level 4.5, placed at 2.5)', theta: even(4.5), start: even(2.5), speed: 0.8 }, 40, 1);
run({ name: 'B. Placed too high (really level 2.2, placed at 4)', theta: even(2.2), start: even(4), speed: 1.3 }, 40, 2);
run({ name: 'C. Placed right, strong on meaning, weak on spelling, trips on doubles', theta: { know: 4.2, find: 4, spell: 2.6 }, start: { know: 4.2, find: 4, spell: 2.6 }, weak: 'double', speed: 1 }, 40, 3);

// Spot checks on the small tools.
console.log('\nSlips:');
for (const [a, b] of [['recieve', 'receive'], ['acommodate', 'accommodate'], ['seperate', 'separate'], ['dog', 'bog'], ['definately', 'definitely'], ['untill', 'until'], ['wich', 'which']]) console.log(`  ${a} -> ${b}: ${slipsIn(a, b).map((x) => x.kind + (x.pair ? `(${x.pair})` : '')).join(', ')}`);
const card = makeCard({ id: 'abc123xyz789', name: 'Sam O.Neil', streak: 12, week: 340, rooted: 27, day: '2026-11-19', at: 1795000000000 });
const same = (f: unknown) => (JSON.stringify(f) === JSON.stringify(readCard(card)) ? 'ok' : `WRONG ${JSON.stringify(f)}`);
console.log(`\nCard: ${card}\n  read back: ${JSON.stringify(readCard(card))}`);
console.log(`  inside a link: ${same(readCard(`Join me! rootvocab://friends?add=${encodeURIComponent(card)} see you`))}   unescaped by an app: ${same(readCard(decodeURIComponent(card)))}   in a message: ${same(readCard(`Add me:\n${card}\nthanks`))}   damaged: ${JSON.stringify(readCard(card.replace('abc', 'abd')))}`);
