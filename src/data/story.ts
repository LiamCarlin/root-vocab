import type { Pose } from '@/components/Mascot';
import type { BlockTone } from '@/theme/tokens';

// The story. The valley grows words. A fog called the Hush has rolled in, and words slip away
// just when you reach for them. Every word the learner roots clears a little more. One place
// per chapter; the fog lifts when it is done.
//
// Root tells it, in the first person, to an adult: plain, a little dry, never cute. A chapter
// has an opening, a line for the trail after each set of words, and an ending. The endings
// carry the method too: each one names, in a sentence, the thing that made the words stick.

export type SceneId = 'garden' | 'orchard' | 'market' | 'woods' | 'harbour' | 'summit';
export type Beat = { pose: Pose; line: string };
export type Chapter = {
  n: number;
  scene: SceneId;
  name: string;
  tone: BlockTone;
  intro: Beat[];
  /** What Root says on the trail after each set of new words, in order. */
  trail: string[];
  outro: Beat[];
  keepsake: string;
};

/** The six places, and the whole valley they sit in (shown while the story sets the scene). */
export const SCENES: Record<SceneId | 'valley', { src: number; w: number; h: number }> = {
  valley: { src: require('../../assets/scenes/valley.webp'), w: 760, h: 774 },
  garden: { src: require('../../assets/scenes/garden.png'), w: 490, h: 467 },
  orchard: { src: require('../../assets/scenes/orchard.png'), w: 502, h: 563 },
  market: { src: require('../../assets/scenes/market.png'), w: 506, h: 508 },
  woods: { src: require('../../assets/scenes/woods.png'), w: 443, h: 582 },
  harbour: { src: require('../../assets/scenes/harbour.png'), w: 462, h: 566 },
  summit: { src: require('../../assets/scenes/summit.png'), w: 450, h: 565 },
};

/** What each place gives back when its fog lifts. Square pictures. */
export const KEEPSAKES: Record<SceneId, number> = {
  garden: require('../../assets/props/keepsake-garden.webp'),
  orchard: require('../../assets/props/keepsake-orchard.webp'),
  market: require('../../assets/props/keepsake-market.webp'),
  woods: require('../../assets/props/keepsake-woods.webp'),
  harbour: require('../../assets/props/keepsake-harbour.webp'),
  summit: require('../../assets/props/keepsake-summit.webp'),
};

/** Small objects in the same clay as everything else: one for each kind of thing the learner does. Square pictures. */
export const OBJECTS = {
  sprout: require('../../assets/props/obj-sprout.webp'),
  magnifier: require('../../assets/props/obj-magnifier.webp'),
  pencil: require('../../assets/props/obj-pencil.webp'),
  sand: require('../../assets/props/obj-sand.webp'),
  flag: require('../../assets/props/obj-flag.webp'),
  book: require('../../assets/props/obj-book.webp'),
} as const;

export const PROPS = {
  chest: { src: require('../../assets/props/chest.png'), w: 472, h: 479 },
  chestOpen: { src: require('../../assets/props/chest-open.png'), w: 453, h: 572 },
  gem: { src: require('../../assets/props/gem.png'), w: 405, h: 364 },
} as const;

// Two pages, not six: the setup is said once, plainly, and then the learner is on the journey.
export const PROLOGUE: Beat[] = [
  { pose: 'map', line: 'This is the valley, where words grow. A fog called the Hush has rolled in. It holds words just out of reach, right when you need them.' },
  { pose: 'hike', line: 'Where a word is properly rooted, the fog cannot settle. So we root words, one place at a time.' },
];

const STORY: Chapter[] = [
  {
    n: 1, scene: 'garden', name: 'The Garden', tone: 'brand', keepsake: 'Watering can',
    intro: [
      { pose: 'water', line: 'We start at home. This is my garden. It is small and it is a mess, but I know where everything is.' },
      { pose: 'search', line: 'Or I did. The fog has been at the labels. Half the beds are just “that green one” now.' },
      { pose: 'trace', line: 'Here is how we get them back. We do not just read a word. We hear it, say it, tap it out, write it with a finger. Every way in we can find.' },
      { pose: 'hike', line: 'We get the labels back by taking each word in every way we can: hear it, say it, write it. One at a time. Let us go.' },
    ],
    trail: [
      'First one in the ground. See that? The fog has backed off the gate.',
      'The bean rows have their labels back. I had forgotten how many kinds of bean there are.',
      'Halfway. I can see the shed from here, which is new.',
      'The path to the well is clear. I found my good trowel on it, so that is a win twice over.',
      'Last bed planted. All that is left is to walk the whole garden once and see that it holds.',
    ],
    outro: [
      { pose: 'cheer', line: 'Look at that. The garden can breathe again.' },
      { pose: 'water', line: 'Every bed has its name back. So does the trowel. It is a trowel.' },
      { pose: 'calm', line: 'Notice that it did not take cleverness. It took going over the same ground more than once, on different days. That is all rooting is.' },
      { pose: 'point', line: 'The fog is thinner over the orchard. Bring the watering can. Shall we?' },
    ],
  },
  {
    n: 2, scene: 'orchard', name: 'The Orchard', tone: 'brand', keepsake: 'Fruit basket',
    intro: [
      { pose: 'search', line: 'The orchard. There is a ladder somewhere in here. I had the word for it a second ago.' },
      { pose: 'think', line: 'That is the Hush for you. It goes for the ordinary words first, the ones you would never think to hold on to.' },
      { pose: 'shiver', line: 'The pickers have stopped work. It is hard to ask for the third basket from the left when “basket” will not come.' },
      { pose: 'hike', line: 'So we get their words back, and they get their harvest in. Fair trade.' },
    ],
    trail: [
      'One more rooted. Somebody up a tree just shouted “ladder”. They sounded relieved.',
      'The near rows are clear. They are picking again, and arguing about whose turn it is to carry.',
      'Halfway down the orchard. The fog is sitting in the low corner as if it were sulking.',
      'They have started singing. Badly, but with all the words.',
      'That is the last tree. One walk through to check, and the orchard is ours.',
    ],
    outro: [
      { pose: 'laugh', line: 'Found the ladder. Found the word. It was “ladder”.' },
      { pose: 'basket', line: 'They filled this for us. I said we did not need paying. They said it was not payment, it was fruit.' },
      { pose: 'speak', line: 'Here is something I have noticed. The words that came back fastest were the ones we had said out loud. The mouth remembers what the eye lets go.' },
      { pose: 'listen', line: 'Listen. You can hear the market from here. It used to be much louder.' },
    ],
  },
  {
    n: 3, scene: 'market', name: 'The Market', tone: 'brand', keepsake: 'Bunting',
    intro: [
      { pose: 'think', line: 'A market with no chatter. The stalls are open, the goods are out, and nobody can name what they are selling.' },
      { pose: 'oops', line: 'People are pointing at things and saying “that”. It is the saddest haggling I have ever heard.' },
      { pose: 'speak', line: 'A market runs on talk. Prices, gossip, “not at that price you don’t”. Without the words it is a car park with vegetables.' },
      { pose: 'tap', line: 'Same as before. Beat by beat, letter by letter. Let us give them something to shout about.' },
    ],
    trail: [
      'The baker has “sourdough” back and will not stop saying it.',
      'One stall is haggling properly now. Nobody is enjoying it more than they are.',
      'Halfway round the square. Somebody has hung the first string of flags back up.',
      'The fishmonger just called something “exquisite”. I think he is showing off.',
      'Last corner of the market. One lap to make sure it sticks.',
    ],
    outro: [
      { pose: 'cheer', line: 'Hear that? Haggling. The best sound there is.' },
      { pose: 'laugh', line: 'They gave us the bunting. I tried to say no. I did not try very hard.' },
      { pose: 'tap', line: 'What worked here was the beats. A long word is short pieces said in a row. Nobody can hold “extraordinary”. Anybody can hold five small beats.' },
      { pose: 'lantern', line: 'The woods are next, and it gets dark in there. Bring a light.' },
    ],
  },
  {
    n: 4, scene: 'woods', name: 'Lantern Woods', tone: 'brand', keepsake: 'Lantern',
    intro: [
      { pose: 'lantern', line: 'Lantern Woods. The Hush is thickest in here. Stay close.' },
      { pose: 'shiver', line: 'There is a lamp on every tree, and every one has gone out. Each lamp was lit by a word. No word, no light.' },
      { pose: 'think', line: 'I will not pretend this part is quick. These are harder words, and the fog knows it.' },
      { pose: 'hike', line: 'But we know how this goes now. One word, then the next. The dark is only the part we have not done yet.' },
    ],
    trail: [
      'One lamp lit. It is remarkable how much difference one lamp makes.',
      'I can see the path now, which means I can see how much of it there is. Mixed feelings.',
      'Halfway. Look back. That whole lit stretch is yours.',
      'An owl just gave us a look. I think that was approval.',
      'Last lamp. Then we walk it end to end and see whether the light holds.',
    ],
    outro: [
      { pose: 'love', line: 'Every lantern lit. I knew you had it in you.' },
      { pose: 'lantern', line: 'Keep this one. It is the first lamp we lit, and it has not flickered since.' },
      { pose: 'idea', line: 'The hard ones stuck because of the tricky bit. Every word has one place it likes to go wrong. Find that place, look straight at it, and the rest of the word behaves.' },
      { pose: 'point', line: 'There is salt on the wind. That way is the harbor.' },
    ],
  },
  {
    n: 5, scene: 'harbour', name: 'The Harbor', tone: 'brand', keepsake: 'Compass',
    intro: [
      { pose: 'think', line: 'The harbor. And the lighthouse is dark.' },
      { pose: 'compass', line: 'There are ships sitting out past the point, waiting. They cannot find the way in. I know the feeling.' },
      { pose: 'speak', line: 'The keeper is up there now with the logbook open, trying to remember the word for the thing that goes round and makes the light.' },
      { pose: 'hike', line: 'Let us go and remind her.' },
    ],
    trail: [
      'One more. The harbor bell rang by itself just now. I am choosing to take that as a good sign.',
      'The quay has its signs back. “Mooring.” “Customs.” “No fishing”, which is being ignored.',
      'Halfway up the lighthouse stairs. There are a lot of stairs.',
      'The keeper says the lamp is nearly ready. She also says “nearly” is her favourite word to have back.',
      'Top of the stairs. One last check before she lights it.',
    ],
    outro: [
      { pose: 'trophy', line: 'The light is back on. They can see us from miles off.' },
      { pose: 'compass', line: 'The keeper gave us her compass. She says she will not need it now that she can read the charts again.' },
      { pose: 'calm', line: 'Did you notice that you have stopped guessing? You go to the beat, then the letters, then the whole word. That is a method. Methods do not get lost in fog.' },
      { pose: 'hike', line: 'One climb left. The summit, where the fog comes from.' },
    ],
  },
  {
    n: 6, scene: 'summit', name: 'The Summit', tone: 'brand', keepsake: 'Telescope',
    intro: [
      { pose: 'hike', line: 'Top of the valley. This is where the Hush comes from.' },
      { pose: 'calm', line: 'Deep breath. The air is thin up here and the words are long.' },
      { pose: 'map', line: 'I have never been this far. From here on the map just says “fog”, which is not much help.' },
      { pose: 'proud', line: 'But look how much valley is clear behind us. Whatever is up here, we have the words for it.' },
    ],
    trail: [
      'One more, and I can see the next ridge.',
      'There is a bench up here. Someone carved “nearly there” into it, a long time ago.',
      'Halfway. Do not look down. Actually, do. Look at all of that.',
      'The fog is thinning, and there is nothing behind it. Just more hill.',
      'That is the last word. One walk across the top.',
    ],
    outro: [
      { pose: 'gasp', line: 'It was never a monster. There is nothing up here at all. Just weather.' },
      { pose: 'telescope', line: 'Somebody left a telescope. Have a look. Garden, orchard, market, woods, harbor. Every one of them clear.' },
      { pose: 'calm', line: 'The Hush settles wherever words are left alone. That is the whole secret. It is not beaten once. It lifts when you keep showing up.' },
      { pose: 'proud', line: 'The valley is clear, and your words are rooted. Let us keep them that way. There is more valley past the ridge.' },
    ],
  },
];

const BEYOND_INTRO: Beat[][] = [
  [
    { pose: 'map', line: 'New ground. This part of the valley is not on my map, so we will draw it as we go.' },
    { pose: 'hike', line: 'Same plan as ever: one word at a time, every way in we can find.' },
  ],
  [
    { pose: 'search', line: 'There is more valley than I remembered. Good.' },
    { pose: 'lantern', line: 'A wisp of the Hush has drifted back in over this corner. We know what to do about that.' },
  ],
  [
    { pose: 'telescope', line: 'I spotted this place from the summit. It looked closer through the telescope.' },
    { pose: 'hike', line: 'Never mind. We are here now. Let us root something.' },
  ],
];
const BEYOND_OUTRO: Beat[][] = [
  [
    { pose: 'cheer', line: 'Another patch cleared, and drawn on the map in ink.' },
    { pose: 'point', line: 'There is more that way. There is always more that way.' },
  ],
  [
    { pose: 'proud', line: 'Clear skies again. You make this look easy, and I know it is not.' },
    { pose: 'calm', line: 'It holds because you came back to it. Shall we keep going?' },
  ],
  [
    { pose: 'cheer', line: 'Rooted. All of them.' },
    { pose: 'hike', line: 'On we go.' },
  ],
];
const BEYOND_TRAIL = ['One more in the ground.', 'The fog has backed off another field.', 'Halfway across. Look how much is clear behind us.', 'Nearly there. I can see the far hedge.', 'That is the last word for this place. One walk through to check.'];

/** Chapters 1 to 6 tell the story; after that the valley keeps going, cycling through its places. */
/** A chapter's opening and ending are kept to two pages: the first and the last. The middle pages read long. */
const brief = (beats: Beat[]): Beat[] => (beats.length > 2 ? [beats[0], beats[beats.length - 1]] : beats);

export function chapterOf(n: number): Chapter {
  const ch = chapterFull(n);
  return { ...ch, intro: brief(ch.intro), outro: brief(ch.outro) };
}

function chapterFull(n: number): Chapter {
  if (n <= STORY.length) return STORY[Math.max(1, n) - 1];
  const base = STORY[(n - 1) % STORY.length];
  const lap = Math.floor((n - 1) / STORY.length) + 1;
  return { ...base, n, name: `${base.name} ${'I'.repeat(Math.min(lap, 3))}`, intro: BEYOND_INTRO[n % BEYOND_INTRO.length], outro: BEYOND_OUTRO[n % BEYOND_OUTRO.length], trail: BEYOND_TRAIL };
}
export const STORY_LENGTH = STORY.length;

/** Where the words just learned turn up in each place. `{w}` is the word, or the two of them. */
const WORD_LINES: Record<SceneId, [one: string, two: string]> = {
  garden: ['{w} is written on a new label.', '{w} are written on the new labels.'],
  orchard: ['Somebody has carved {w} into the ladder.', 'Somebody has carved {w} into the ladder.'],
  market: ['{w} is chalked up on the baker’s board.', '{w} are chalked up on the baker’s board.'],
  woods: ['The new lamp is {w}.', 'The two new lamps are {w}.'],
  harbour: ['{w} went into the keeper’s logbook.', '{w} went into the keeper’s logbook.'],
  summit: ['I said {w} out loud up here. It carried.', 'I said {w} out loud up here. They carried.'],
};

/**
 * One more line for the trail, with the learner's own words in it: the words they have just learned are now
 * part of the place. Empty when there are none.
 */
export function wordLine(n: number, words: string[]): string {
  const w = words.slice(0, 2).map((x) => `“${x}”`);
  if (!w.length) return '';
  return WORD_LINES[chapterOf(n).scene][w.length === 1 ? 0 : 1].replace('{w}', w.join(' and '));
}

/** What Root says on the trail after the `k`th set of words in chapter `n` (0-based). */
export const trailLine = (n: number, k: number): string => {
  const t = chapterOf(n).trail;
  return t[Math.max(0, Math.min(t.length - 1, k))] ?? '';
};
