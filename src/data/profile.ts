import { Activity, BookOpen, Brain, Briefcase, Laptop, Cpu, GraduationCap, Heart, HeartPulse, Home, Landmark, Leaf, Music, Palette, PenLine, Plane, Search, Store, Trophy, Users, Utensils, Wallet, Wrench, type LucideIcon } from 'lucide-react-native';

import type { BlockTone } from '@/theme/tokens';
import type { Topic } from './schema';

/** The three things Root trains. The colours are the same everywhere a strand appears. */
export type Strand = 'know' | 'find' | 'spell';
export const STRANDS: Record<Strand, { label: string; goal: string; icon: LucideIcon; tone: BlockTone }> = {
  know: { label: 'Know', goal: 'Grow my words', icon: BookOpen, tone: 'brand' },
  find: { label: 'Find', goal: 'Find words faster', icon: Search, tone: 'pink' },
  spell: { label: 'Spell', goal: 'Spell with confidence', icon: PenLine, tone: 'mint' },
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
  home: { label: 'Home', icon: Home, tone: 'butter' },
  food: { label: 'Food', icon: Utensils, tone: 'orange' },
  people: { label: 'People', icon: Users, tone: 'pink' },
  feelings: { label: 'Feelings', icon: Heart, tone: 'pink' },
  body: { label: 'Health', icon: Activity, tone: 'mint' },
  nature: { label: 'Nature', icon: Leaf, tone: 'mint' },
  money: { label: 'Money', icon: Wallet, tone: 'butter' },
  work: { label: 'Work', icon: Briefcase, tone: 'brand' },
  travel: { label: 'Travel', icon: Plane, tone: 'brand' },
  tech: { label: 'Tech', icon: Cpu, tone: 'lilac' },
  arts: { label: 'Music and art', icon: Music, tone: 'lilac' },
  sport: { label: 'Sport', icon: Trophy, tone: 'orange' },
  mind: { label: 'Ideas', icon: Brain, tone: 'lilac' },
  society: { label: 'The world', icon: Landmark, tone: 'brand' },
};
export const TOPIC_ORDER: Topic[] = ['food', 'people', 'feelings', 'body', 'nature', 'home', 'money', 'work', 'travel', 'tech', 'arts', 'sport', 'mind', 'society'];
