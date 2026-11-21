import { Activity, BookOpen, Brain, Briefcase, Laptop, Cpu, GraduationCap, Heart, HeartPulse, Home, Landmark, Leaf, Music, Palette, PenLine, Plane, Search, Store, Trophy, Users, Utensils, Wallet, Wrench, type LucideIcon } from 'lucide-react-native';

import type { BlockTone } from '@/theme/tokens';
import type { Topic } from './schema';

/** The three things Root trains. Told apart by icon and name; they carry no colour of their own (see tokens.ts). */
export type Strand = 'know' | 'find' | 'spell';
export const STRANDS: Record<Strand, { label: string; goal: string; icon: LucideIcon; tone: BlockTone }> = {
  know: { label: 'Know', goal: 'Grow my words', icon: BookOpen, tone: 'stone' },
  find: { label: 'Find', goal: 'Find words faster', icon: Search, tone: 'stone' },
  spell: { label: 'Spell', goal: 'Spell with confidence', icon: PenLine, tone: 'stone' },
};
export const STRAND_ORDER: Strand[] = ['know', 'find', 'spell'];

/** What a learner's days look like. It flavours examples and nudges which words come first; it never limits them. */
export type DayId = 'study' | 'office' | 'hands' | 'care' | 'service' | 'creative' | 'home';
export const DAYS: { id: DayId; label: string; icon: LucideIcon; topics: Topic[] }[] = [
  { id: 'study', label: 'Studying', icon: GraduationCap, topics: ['mind', 'society'] },
  { id: 'office', label: 'At a desk', icon: Laptop, topics: ['work', 'money', 'tech'] },
  { id: 'hands', label: 'With my hands', icon: Wrench, topics: ['work', 'home'] },
  { id: 'care', label: 'Caring', icon: HeartPulse, topics: ['body', 'people', 'feelings'] },
  { id: 'service', label: 'With people', icon: Store, topics: ['people', 'money', 'food'] },
  { id: 'creative', label: 'Making things', icon: Palette, topics: ['arts', 'mind'] },
  { id: 'home', label: 'Home and family', icon: Home, topics: ['home', 'people', 'food'] },
];

export const TOPICS: Record<Topic, { label: string; icon: LucideIcon; tone: BlockTone }> = {
  home: { label: 'Home', icon: Home, tone: 'stone' },
  food: { label: 'Food', icon: Utensils, tone: 'stone' },
  people: { label: 'People', icon: Users, tone: 'stone' },
  feelings: { label: 'Feelings', icon: Heart, tone: 'stone' },
  body: { label: 'Health', icon: Activity, tone: 'stone' },
  nature: { label: 'Nature', icon: Leaf, tone: 'stone' },
  money: { label: 'Money', icon: Wallet, tone: 'stone' },
  work: { label: 'Work', icon: Briefcase, tone: 'stone' },
  travel: { label: 'Travel', icon: Plane, tone: 'stone' },
  tech: { label: 'Tech', icon: Cpu, tone: 'stone' },
  arts: { label: 'Music and art', icon: Music, tone: 'stone' },
  sport: { label: 'Sport', icon: Trophy, tone: 'stone' },
  mind: { label: 'Ideas', icon: Brain, tone: 'stone' },
  society: { label: 'The world', icon: Landmark, tone: 'stone' },
};
export const TOPIC_ORDER: Topic[] = ['food', 'people', 'feelings', 'body', 'nature', 'home', 'money', 'work', 'travel', 'tech', 'arts', 'sport', 'mind', 'society'];
