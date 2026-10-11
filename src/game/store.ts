export type ThemeId = 'classic' | 'midnight' | 'sunset' | 'escape';
export type KeypadSkinId = 'classic' | 'mint' | 'violet';
export type WinEffectId = 'confetti' | 'golden' | 'neon';
export type StoreItemId =
  | 'theme-classic'
  | 'theme-midnight'
  | 'theme-sunset'
  | 'theme-escape'
  | 'keypad-classic'
  | 'keypad-mint'
  | 'keypad-violet'
  | 'effect-confetti'
  | 'effect-golden'
  | 'effect-neon';

type CosmeticType = 'theme' | 'keypad' | 'effect';

export type StoreItem = {
  id: StoreItemId;
  name: string;
  description: string;
  price: number;
  type: CosmeticType;
  value: ThemeId | KeypadSkinId | WinEffectId;
};

export type StoreState = {
  ownedItems: StoreItemId[];
  equipped: {
    theme: ThemeId;
    keypad: KeypadSkinId;
    effect: WinEffectId;
  };
};

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'theme-classic',
    name: 'Klasik Tema',
    description: 'Varsayılan mavi oyun görünümü',
    price: 0,
    type: 'theme',
    value: 'classic',
  },
  {
    id: 'keypad-classic',
    name: 'Klasik Tuş Takımı',
    description: 'Varsayılan açık tuş tasarımı',
    price: 0,
    type: 'keypad',
    value: 'classic',
  },
  {
    id: 'theme-midnight',
    name: 'Gece Teması',
    description: 'Koyu lacivert oyun yüzeyi',
    price: 30,
    type: 'theme',
    value: 'midnight',
  },
  {
    id: 'effect-confetti',
    name: 'Klasik Konfeti',
    description: 'Varsayılan renkli zafer efekti',
    price: 0,
    type: 'effect',
    value: 'confetti',
  },
  {
    id: 'theme-sunset',
    name: 'Gün Batımı Teması',
    description: 'Sıcak mercan ve altın tonları',
    price: 30,
    type: 'theme',
    value: 'sunset',
  },
  {
    id: 'theme-escape',
    name: 'Kaçış',
    description: 'Siyah kilit, yeşil rakam. Yalnızca görünüm.',
    price: 0,
    type: 'theme',
    value: 'escape',
  },
  {
    id: 'keypad-mint',
    name: 'Nane Tuş Takımı',
    description: 'Ferahlık veren yeşil tuşlar',
    price: 20,
    type: 'keypad',
    value: 'mint',
  },
  {
    id: 'keypad-violet',
    name: 'Mor Tuş Takımı',
    description: 'Mor vurgulu tuş tasarımı',
    price: 20,
    type: 'keypad',
    value: 'violet',
  },
  {
    id: 'effect-golden',
    name: 'Altın Yağmuru',
    description: 'Altın renkli zafer konfetisi',
    price: 50,
    type: 'effect',
    value: 'golden',
  },
  {
    id: 'effect-neon',
    name: 'Neon Patlama',
    description: 'Parlak neon renkli zafer efekti',
    price: 50,
    type: 'effect',
    value: 'neon',
  },
];

export type ThemeDigits = {
  background: string;
  border: string;
  text: string;
  activeBorder: string;
  lockedBackground: string;
  lockedBorder: string;
};

export type Theme = {
  background: string;
  primary: string;
  primaryText: string;
  text: string;
  dark: boolean;
  digit: ThemeDigits;
};

export const THEMES = {
  classic: {
    background: '#f8fafc',
    primary: '#2563eb',
    primaryText: '#fff',
    text: '#0f172a',
    dark: false,
    digit: {
      background: '#fff',
      border: '#93c5fd',
      text: '#1e3a8a',
      activeBorder: '#2563eb',
      lockedBackground: '#dbeafe',
      lockedBorder: '#60a5fa',
    },
  },
  midnight: {
    background: '#111827',
    primary: '#7c3aed',
    primaryText: '#fff',
    text: '#f8fafc',
    dark: true,
    digit: {
      background: '#1f2937',
      border: '#6d28d9',
      text: '#e9d5ff',
      activeBorder: '#a78bfa',
      lockedBackground: '#4c1d95',
      lockedBorder: '#c4b5fd',
    },
  },
  sunset: {
    background: '#fff7ed',
    primary: '#ea580c',
    primaryText: '#fff',
    text: '#9a3412',
    dark: false,
    digit: {
      background: '#fff',
      border: '#fdba74',
      text: '#9a3412',
      activeBorder: '#ea580c',
      lockedBackground: '#ffedd5',
      lockedBorder: '#fb923c',
    },
  },
  escape: {
    background: '#050805',
    primary: '#16a34a',
    primaryText: '#052e16',
    text: '#bbf7d0',
    dark: true,
    digit: {
      background: '#020617',
      border: '#14532d',
      text: '#4ade80',
      activeBorder: '#22c55e',
      lockedBackground: '#052e16',
      lockedBorder: '#4ade80',
    },
  },
} satisfies Record<ThemeId, Theme>;

export const KEYPAD_SKINS = {
  classic: { background: '#fff', border: '#cbd5e1', text: '#1e293b' },
  mint: { background: '#ecfdf5', border: '#6ee7b7', text: '#047857' },
  violet: { background: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' },
} satisfies Record<KeypadSkinId, { background: string; border: string; text: string }>;

export const WIN_EFFECTS = {
  confetti: ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'],
  golden: ['#fef3c7', '#fcd34d', '#f59e0b', '#d97706', '#b45309'],
  neon: ['#22d3ee', '#a3e635', '#f472b6', '#c084fc', '#facc15'],
} satisfies Record<WinEffectId, string[]>;

export const defaultStoreState: StoreState = {
  ownedItems: ['theme-classic', 'keypad-classic', 'effect-confetti'],
  equipped: { theme: 'classic', keypad: 'classic', effect: 'confetti' },
};

export const findEquippedItemId = (type: StoreItem['type'], value: string) =>
  STORE_ITEMS.find((item) => item.type === type && item.value === value)?.id;
