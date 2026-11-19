// The assembled word bank. Types and the `w()` helper live in ./schema so the level files can import them without a cycle.

import { L1 } from './bank/l1';
import { L2 } from './bank/l2';
import { L3 } from './bank/l3';
import { L4 } from './bank/l4';
import { L5 } from './bank/l5';
import { L6 } from './bank/l6';

import type { BankWord } from './schema';

export * from './schema';

const seen = new Set<string>();
/** Every word once; if two level files both have a word, the lower level wins. */
export const BANK: BankWord[] = [...L1, ...L2, ...L3, ...L4, ...L5, ...L6].filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));

export const BANK_BY_ID: Record<string, BankWord> = Object.fromEntries(BANK.map((b) => [b.id, b]));
