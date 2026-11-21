// Root · Design language v3 — "bold pastel".
//
// What each colour means. Every colour has one job, and the learner can rely on it everywhere:
//
//   press (blue)  press this: the main button, the active tab, the play buttons
//   ink (black)   text, and whatever is selected in a group of options
//   orange        Root, and "you are here": the next stop, the beat being said, the live mic.
//                 Never right or wrong.
//   mint (green)  right, done, saved. Nothing else.
//   butter/sun    look here: a hint, a tip, the letter that is off. Never "wrong", never a reward.
//   brand         the app's accent, periwinkle: Root's world (the chapter card, story pages,
//                 celebrations, your profile) and your progress (level rings, gems).
//                 Never right or wrong, never an exercise control.
//   stone         the accent's pale wash: games, strands and topics. Told apart by icon and name.
//   white         everything else.
//   error (red)   deleting something. Never a learning answer.
//
// Pink and lilac are kept as names only and are the same periwinkle; no control or label uses them.
//
// What each shape means:
//   an edge (an outline) or a solid fill   you can press it: buttons, options, pressable cards
//   no edge                                you read it: titles, info cards, tags
//   pill                                   only buttons and options; a tag is a small square-cornered label
//   a filled circle around an icon         only on a button; an icon that does nothing sits bare
// Big colour blocks, black pills, round icon buttons, very large radii.
// Colour blocks keep the same hue in light and dark and always carry black
// text, so a periwinkle card reads the same on a white or a black canvas.

export type ThemeName = 'light' | 'paper' | 'dark';

export type Colors = {
  canvas: string;
  surface: string;
  surface2: string;
  line: string;
  ink: string;
  ink2: string;
  ink3: string;
  onInk: string;
  /** The main button's fill: a confident blue from the accent family, with white text. */
  press: string;
  /** Accent for small things that must stay readable: links, active icons, traced letters. */
  indigo: string;
  indigoDeep: string;
  onIndigo: string;
  sprout: string;
  // Blocks (same in every theme, always with black text)
  brand: string; // periwinkle
  orange: string; // Root's colour
  pink: string;
  mint: string;
  butter: string;
  lilac: string;
  /** A neutral block: grey, for things that need a fill but have no meaning to carry. */
  stone: string;
  // Soft tints (theme-aware backgrounds for states)
  lavender: string;
  peach: string;
  sky: string;
  sun: string;
  mintTint: string;
  success: string;
  warn: string;
  error: string;
  errorTint: string;
  scrim: string;
};

/** Text colours used on top of any colour block. */
export const ON_BLOCK = { ink: '#0E0E13', ink2: 'rgba(14,14,19,0.66)', ink3: 'rgba(14,14,19,0.42)' } as const;

// One accent family (periwinkle, its pale wash, and indigo for small marks) plus the three meaning
// colours, nothing more: a calmer, older look than a rainbow of pastels. Pink and lilac fold into
// the accent so no screen mixes hues for no reason.
const blocks = { brand: '#9DB7FF', orange: '#F7953A', pink: '#9DB7FF', mint: '#BDEFCB', butter: '#FFE7A0', lilac: '#9DB7FF', stone: '#E3E9FF' };

export const palettes: Record<ThemeName, Colors> = {
  light: {
    canvas: '#F1F3FB',
    surface: '#FFFFFF',
    surface2: '#E8EBF6',
    line: '#DFE3F0',
    ink: '#0E0E13',
    ink2: '#5A5D6B',
    ink3: '#62656F',
    onInk: '#FFFFFF',
    press: '#3F51E0',
    indigo: '#4C5CEB',
    indigoDeep: '#2F3BB8',
    onIndigo: '#FFFFFF',
    sprout: '#45B649',
    ...blocks,
    lavender: '#E2E9FF',
    peach: '#FFE4C8',
    sky: '#D6E2FF',
    sun: '#FFF1C4',
    mintTint: '#DDF6E4',
    success: '#1FA35B',
    warn: '#E08A00',
    error: '#E0483F',
    errorTint: '#FFE0DC',
    scrim: 'rgba(14,14,19,0.45)',
  },
  paper: {
    canvas: '#F5EFE3',
    surface: '#FFFBF2',
    surface2: '#ECE4D4',
    line: '#E3D9C6',
    ink: '#1B1712',
    ink2: '#5F584C',
    ink3: '#6B6452',
    onInk: '#FFFBF2',
    press: '#3F51E0',
    indigo: '#4553D6',
    indigoDeep: '#2F3BB8',
    onIndigo: '#FFFFFF',
    sprout: '#3FA844',
    ...blocks,
    lavender: '#DFE4F7',
    peach: '#FBE0C4',
    sky: '#D3DDF5',
    sun: '#FAEBB8',
    mintTint: '#D9EFDC',
    success: '#1B8F51',
    warn: '#C97B00',
    error: '#C93A37',
    errorTint: '#FADDD6',
    scrim: 'rgba(27,23,18,0.45)',
  },
  dark: {
    canvas: '#0C0C10',
    surface: '#1A1A21',
    surface2: '#26262F',
    line: '#32323D',
    ink: '#F4F4F7',
    ink2: '#A9ACBA',
    ink3: '#9093A2',
    onInk: '#0E0E13',
    press: '#6F82FF',
    indigo: '#9DB7FF',
    indigoDeep: '#4C5CEB',
    onIndigo: '#0E0E13',
    sprout: '#5FD07E',
    ...blocks,
    lavender: '#232A45',
    peach: '#40291A',
    sky: '#1D2A4A',
    sun: '#3B3214',
    mintTint: '#17382A',
    success: '#49C481',
    warn: '#F0A63A',
    error: '#F0706C',
    errorTint: '#45211F',
    scrim: 'rgba(0,0,0,0.62)',
  },
};

export type BlockTone = 'brand' | 'orange' | 'pink' | 'mint' | 'butter' | 'lilac' | 'stone';

/**
 * Syllables alternate between two shades of one quiet sand colour, so the eye can chunk a word
 * without reading a meaning into the colour. These two shades are used for nothing else: strands,
 * topics, right and wrong all have colours of their own. The same in every theme, with black text.
 */
export const SYLLABLE_FILLS = ['#F3E4C6', '#E2C995'] as const;
/** The nth syllable's fill. */
export const sylFill = (i: number) => SYLLABLE_FILLS[i % SYLLABLE_FILLS.length];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, x3: 32, x4: 40 } as const;
// Tighter corners than before: very round cards read young.
export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;
export const GUTTER = 20;

export const motion = { tap: 120, part: 160, screen: 260, sheet: 320, fill: 450 } as const;

export type FontId = 'lexend' | 'jakarta' | 'atkinson';
export type Weight = 'r' | 'm' | 's' | 'b';

export const fonts: Record<FontId, Record<Weight, string>> = {
  lexend: { r: 'Lexend_400Regular', m: 'Lexend_500Medium', s: 'Lexend_600SemiBold', b: 'Lexend_700Bold' },
  jakarta: {
    r: 'PlusJakartaSans_400Regular',
    m: 'PlusJakartaSans_500Medium',
    s: 'PlusJakartaSans_600SemiBold',
    b: 'PlusJakartaSans_700Bold',
  },
  atkinson: {
    r: 'AtkinsonHyperlegible_400Regular',
    m: 'AtkinsonHyperlegible_400Regular',
    s: 'AtkinsonHyperlegible_700Bold',
    b: 'AtkinsonHyperlegible_700Bold',
  },
};

export const fontLabels: Record<FontId, { name: string }> = {
  lexend: { name: 'Lexend' },
  jakarta: { name: 'Plus Jakarta Sans' },
  atkinson: { name: 'Atkinson Hyperlegible' },
};

export type Variant = 'hero' | 'display' | 'title' | 'heading' | 'body' | 'bodyS' | 'label' | 'caption' | 'word' | 'button' | 'num';

export const type: Record<Variant, { size: number; lh: number; w: Weight; track: number; caps?: boolean }> = {
  hero: { size: 40, lh: 46, w: 'b', track: -0.6 },
  display: { size: 28, lh: 34, w: 'b', track: -0.3 },
  title: { size: 25, lh: 32, w: 'b', track: -0.1 },
  heading: { size: 19, lh: 26, w: 's', track: 0 },
  body: { size: 17, lh: 26, w: 'm', track: 0.1 },
  bodyS: { size: 15, lh: 22, w: 'm', track: 0.1 },
  label: { size: 15, lh: 20, w: 's', track: 0.1 },
  caption: { size: 13.5, lh: 18, w: 'm', track: 0.1 },
  word: { size: 44, lh: 52, w: 'b', track: 0.8 },
  button: { size: 17, lh: 22, w: 's', track: 0.1 },
  num: { size: 30, lh: 34, w: 'b', track: -0.4 },
};

export const textScales = [1, 1.1, 1.2] as const;
export const trackSteps = [0, 0.7] as const;
