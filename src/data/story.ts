import type { Pose } from '@/components/Mascot';
import type { BlockTone } from '@/theme/tokens';

// The story. The valley grows words. A fog called the Hush has rolled in, and
// words slip away just when you reach for them. Every word the learner roots
// clears a little more. One place per chapter; the fog lifts when it is done.
//
// Lines are short on purpose: one thought, said plainly, a little dry.

export type SceneId = 'garden' | 'orchard' | 'market' | 'woods' | 'harbour' | 'summit';
export type Beat = { pose: Pose; line: string };
export type Chapter = { n: number; scene: SceneId; name: string; tone: BlockTone; intro: Beat[]; outro: Beat[]; keepsake: string };

export const SCENES: Record<SceneId, { src: number; w: number; h: number }> = {
  garden: { src: require('../../assets/scenes/garden.png'), w: 490, h: 467 },
  orchard: { src: require('../../assets/scenes/orchard.png'), w: 502, h: 563 },
  market: { src: require('../../assets/scenes/market.png'), w: 506, h: 508 },
  woods: { src: require('../../assets/scenes/woods.png'), w: 443, h: 582 },
  harbour: { src: require('../../assets/scenes/harbour.png'), w: 462, h: 566 },
  summit: { src: require('../../assets/scenes/summit.png'), w: 450, h: 565 },
};

export const PROPS = {
  chest: { src: require('../../assets/props/chest.png'), w: 472, h: 479 },
  chestOpen: { src: require('../../assets/props/chest-open.png'), w: 453, h: 572 },
  gem: { src: require('../../assets/props/gem.png'), w: 405, h: 364 },
} as const;

export const PROLOGUE: Beat[] = [
  { pose: 'lantern', line: 'This is the valley where words grow.' },
  { pose: 'gasp', line: 'A fog rolled in. We call it the Hush. Now words slip away just as you reach for them.' },
  { pose: 'flex', line: 'They are still here. Every word we root clears a little more.' },
];

const STORY: Chapter[] = [
  {
    n: 1, scene: 'garden', name: 'The Garden', tone: 'mint', keepsake: 'Watering can',
    intro: [{ pose: 'water', line: 'We start at home. My garden. It is small, but it is a start.' }],
    outro: [
      { pose: 'cheer', line: 'Look at that. The garden can breathe again.' },
      { pose: 'point', line: 'The fog is thinner over the orchard. Shall we?' },
    ],
  },
  {
    n: 2, scene: 'orchard', name: 'The Orchard', tone: 'orange', keepsake: 'Fruit basket',
    intro: [{ pose: 'search', line: 'There is a ladder somewhere in this orchard. I had the word for it a second ago.' }],
    outro: [
      { pose: 'laugh', line: 'Found the ladder. Found the word. It was “ladder”.' },
      { pose: 'listen', line: 'I can hear the market from here. It used to be louder.' },
    ],
  },
  {
    n: 3, scene: 'market', name: 'The Market', tone: 'pink', keepsake: 'Bunting',
    intro: [{ pose: 'think', line: 'A market with no chatter. Nobody can name what they are selling.' }],
    outro: [
      { pose: 'dance', line: 'Hear that? Haggling. The best sound there is.' },
      { pose: 'lantern', line: 'The woods are next. Bring a light.' },
    ],
  },
  {
    n: 4, scene: 'woods', name: 'Lantern Woods', tone: 'lilac', keepsake: 'Lantern',
    intro: [{ pose: 'lantern', line: 'The Hush is thickest in here. Stay close. One word at a time.' }],
    outro: [
      { pose: 'love', line: 'Every lantern lit. I knew you had it in you.' },
      { pose: 'point', line: 'There is salt on the wind. The harbor.' },
    ],
  },
  {
    n: 5, scene: 'harbour', name: 'The Harbor', tone: 'brand', keepsake: 'Compass',
    intro: [{ pose: 'think', line: 'The lighthouse is dark. Ships cannot find the way in. I know the feeling.' }],
    outro: [
      { pose: 'trophy', line: 'The light is back on. They can see us from miles off.' },
      { pose: 'walk', line: 'One climb left. The summit, where the fog comes from.' },
    ],
  },
  {
    n: 6, scene: 'summit', name: 'The Summit', tone: 'butter', keepsake: 'Telescope',
    intro: [{ pose: 'flex', line: 'Top of the valley. Deep breath. Whatever is up here, we have the words for it.' }],
    outro: [
      { pose: 'gasp', line: 'It was never a monster. Just fog. It lifts when you keep showing up.' },
      { pose: 'proud', line: 'The valley is clear. Your words are rooted. Let us keep them that way.' },
    ],
  },
];

const BEYOND_INTRO: Beat[][] = [
  [{ pose: 'walk', line: 'New ground. Same plan: one word at a time.' }],
  [{ pose: 'search', line: 'There is more valley than I remembered. Good.' }],
  [{ pose: 'lantern', line: 'A wisp of the Hush drifted back. We know what to do.' }],
];
const BEYOND_OUTRO: Beat[][] = [
  [{ pose: 'cheer', line: 'Another patch cleared.' }],
  [{ pose: 'proud', line: 'Clear skies again. You make this look easy.' }],
  [{ pose: 'dance', line: 'Rooted. All of them.' }],
];

/** Chapters 1 to 6 tell the story; after that the valley keeps going, cycling through its places. */
export function chapterOf(n: number): Chapter {
  if (n <= STORY.length) return STORY[Math.max(1, n) - 1];
  const base = STORY[(n - 1) % STORY.length];
  const lap = Math.floor((n - 1) / STORY.length) + 1;
  return { ...base, n, name: `${base.name} ${'I'.repeat(Math.min(lap, 3))}`, intro: BEYOND_INTRO[n % BEYOND_INTRO.length], outro: BEYOND_OUTRO[n % BEYOND_OUTRO.length] };
}
export const STORY_LENGTH = STORY.length;
