export type ThemeId = 'classic' | 'midnight' | 'sunset';
export type KeypadSkinId = 'classic' | 'mint' | 'violet';
export type WinEffectId = 'confetti' | 'golden' | 'neon';
export type StoreItemId =
  | 'theme-classic'
  | 'theme-midnight'
  | 'theme-sunset'
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

export const THEMES = {
  classic: { background: '#f8fafc', primary: '#2563eb', primaryText: '#fff', text: '#0f172a' },
  midnight: { background: '#111827', primary: '#7c3aed', primaryText: '#fff', text: '#f8fafc' },
  sunset: { background: '#fff7ed', primary: '#ea580c', primaryText: '#fff', text: '#9a3412' },
} satisfies Record<ThemeId, { background: string; primary: string; primaryText: string; text: string }>;

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
