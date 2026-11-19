// Root · Design language v3 — "bold pastel".
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

const blocks = { brand: '#9DB7FF', orange: '#F7953A', pink: '#EFA8F6', mint: '#BDEFCB', butter: '#FFE7A0', lilac: '#DCCBFF' };

export const palettes: Record<ThemeName, Colors> = {
  light: {
    canvas: '#F4F4F8',
    surface: '#FFFFFF',
    surface2: '#EBEBF1',
    line: '#E2E3EA',
    ink: '#0E0E13',
    ink2: '#5A5D6B',
    ink3: '#9A9DAA',
    onInk: '#FFFFFF',
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
    ink3: '#9B937F',
    onInk: '#FFFBF2',
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
    ink3: '#6F7282',
    onInk: '#0E0E13',
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

export type BlockTone = 'brand' | 'orange' | 'pink' | 'mint' | 'butter' | 'lilac';

/** One colour per syllable, in order, so the eye can chunk a word the same way everywhere. */
export const SYLLABLE_TONES: BlockTone[] = ['orange', 'pink', 'brand', 'mint', 'butter', 'lilac'];

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, x3: 32, x4: 40 } as const;
export const radius = { sm: 14, md: 20, lg: 28, xl: 38, pill: 999 } as const;
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
  display: { size: 32, lh: 38, w: 'b', track: -0.4 },
  title: { size: 25, lh: 32, w: 'b', track: -0.1 },
  heading: { size: 19, lh: 26, w: 's', track: 0 },
  body: { size: 17, lh: 26, w: 'm', track: 0.1 },
  bodyS: { size: 15, lh: 22, w: 'm', track: 0.1 },
  label: { size: 12.5, lh: 16, w: 's', track: 0.9, caps: true },
  caption: { size: 13.5, lh: 18, w: 'm', track: 0.1 },
  word: { size: 44, lh: 52, w: 'b', track: 0.8 },
  button: { size: 17, lh: 22, w: 's', track: 0.1 },
  num: { size: 30, lh: 34, w: 'b', track: -0.4 },
};

export const textScales = [1, 1.1, 1.2] as const;
export const trackSteps = [0, 0.7] as const;
