import { Anchor, Armchair, Bird, Clock, DoorOpen, Fence, Fish, Flame, Flower2, Milestone, Music, PaintBucket, Ship, Signpost, Tent, Waves, Wind, Wine, type LucideIcon } from 'lucide-react-native';

// What gems are for. The fog years wore the valley out; once a place is clear, gems mend it,
// one thing at a time. Each thing built stays built, shows on the place, and gets a line from Root.
// Three per place, dearer as the valley goes on, so there is always something to save towards.

export type Restore = {
  id: string;
  /** The chapter (1 … 6) whose place this belongs to. It can be built once that place is clear. */
  place: number;
  /** Two words. */
  name: string;
  cost: number;
  icon: LucideIcon;
  /** What Root says once it is built. */
  line: string;
};

export const RESTORE: Restore[] = [
  { id: 'gate', place: 1, name: 'Garden gate', cost: 60, icon: DoorOpen, line: 'The gate shuts now. It used to just lean.' },
  { id: 'shed', place: 1, name: 'Painted shed', cost: 120, icon: PaintBucket, line: 'Green. I asked the shed. It had no objection.' },
  { id: 'pond', place: 1, name: 'Frog pond', cost: 220, icon: Waves, line: 'Frogs by Tuesday. You watch.' },

  { id: 'ladder', place: 2, name: 'New ladder', cost: 80, icon: Fence, line: 'A ladder with all its rungs. Luxury.' },
  { id: 'press', place: 2, name: 'Cider press', cost: 160, icon: Wine, line: 'The pickers are calling it research.' },
  { id: 'hives', place: 2, name: 'Beehives', cost: 260, icon: Flower2, line: 'The bees approve of the orchard. I approve of the bees.' },

  { id: 'awnings', place: 3, name: 'Stall awnings', cost: 100, icon: Tent, line: 'Stripes. A market should have stripes.' },
  { id: 'clock', place: 3, name: 'Town clock', cost: 180, icon: Clock, line: 'It used to be right twice a day. Now it manages all the other times too.' },
  { id: 'bandstand', place: 3, name: 'Bandstand', cost: 300, icon: Music, line: 'They play every Saturday. Mostly in tune.' },

  { id: 'signs', place: 4, name: 'Trail signs', cost: 100, icon: Signpost, line: 'Nobody has walked in a circle since.' },
  { id: 'bridge', place: 4, name: 'Footbridge', cost: 200, icon: Milestone, line: 'The stream was never deep. Only cold.' },
  { id: 'owls', place: 4, name: 'Owl boxes', cost: 320, icon: Bird, line: 'Three owls have moved in. They have opinions.' },

  { id: 'moorings', place: 5, name: 'Mooring posts', cost: 120, icon: Anchor, line: 'The boats stay where you leave them now.' },
  { id: 'fishstall', place: 5, name: 'Fish stall', cost: 220, icon: Fish, line: 'Open at six. Sold out by seven.' },
  { id: 'ferry', place: 5, name: 'The ferry', cost: 360, icon: Ship, line: 'First crossing in years. The whole quay turned out.' },

  { id: 'bench', place: 6, name: 'Summit bench', cost: 140, icon: Armchair, line: 'Someone will carve something into it. That is what benches are for.' },
  { id: 'vane', place: 6, name: 'Weather vane', cost: 240, icon: Wind, line: 'It points at whatever is coming. Today, nothing much.' },
  { id: 'beacon', place: 6, name: 'The beacon', cost: 400, icon: Flame, line: 'They can see it from every place in the valley. That is the point.' },
];
export const RESTORE_BY_ID: Record<string, Restore> = Object.fromEntries(RESTORE.map((r) => [r.id, r]));
export const restoreFor = (place: number) => RESTORE.filter((r) => r.place === place);

// The journal. Somebody walked this valley before, and left pages in the chests. One page is
// found in every chest and one each time a place is cleared, so the six places tell all twelve.
// Short on purpose: a page is three or four plain sentences, and each one ends wanting the next.

export type Page = { title: string; text: string };

export const JOURNAL: Page[] = [
  { title: 'Found in a chest', text: 'If you are reading this, you have found one of my chests. Good. I hid them where the fog sits thickest, so whoever opened one would already be doing the right thing.' },
  { title: 'The first fog', text: 'The Hush came the first time when I was young. We thought it was weather. Then the baker lost the word for bread, and we stopped thinking that.' },
  { title: 'What did not work', text: 'We tried shouting at it. We tried ignoring it. One man tried to fence it in. I write this down so you do not waste a week.' },
  { title: 'What did', text: 'What worked was small and dull. I said the names of my plants out loud every morning, and the fog would not settle on my garden. That was all. I was annoyed it was not cleverer.' },
  { title: 'The round', text: 'So I started a round. Garden, orchard, market, woods, harbor. A few words in each, every day. Not many. The fog does not care how many. It cares whether you come back.' },
  { title: 'The lamps', text: 'The lamps in the woods were my idea. One lamp, one word. People liked seeing what they knew lit up in a row. So did I, if I am honest.' },
  { title: 'Two of us', text: 'It went better once there were two of us. Not because two people say more words. Because on the days I would have stayed in, she knocked.' },
  { title: 'The stones', text: 'The bright stones the fog leaves behind are not worth anything, strictly. We spent them anyway, mending what the fog years had worn out. It is good to see where the effort went.' },
  { title: 'Slower now', text: 'I am slower on the hill these days. I miss mornings. When I miss three in a row there is grey on the summit by the weekend. It does not take long.' },
  { title: 'A plan', text: 'The round cannot depend on one old woman. So I have planted something by my gate, and I have given it every word I have.' },
  { title: 'It came up orange', text: 'I did not plan the orange. It asks a great many questions. But it will not start the round alone. It wants somebody to walk with.' },
  { title: 'To you', text: 'So that is you. Root will pretend it found you by accident. Be kind about that. Keep the round going. And if you can, knock for someone else.' },
];
