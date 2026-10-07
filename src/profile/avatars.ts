// Kimlikler sunucudaki AVATAR_IDS ile aynı olmalı.
export const AVATARS = [
  { id: 'fox', emoji: '🦊', color: '#fed7aa' },
  { id: 'owl', emoji: '🦉', color: '#e9d5ff' },
  { id: 'cat', emoji: '🐱', color: '#fde68a' },
  { id: 'panda', emoji: '🐼', color: '#e2e8f0' },
  { id: 'lion', emoji: '🦁', color: '#fcd34d' },
  { id: 'frog', emoji: '🐸', color: '#bbf7d0' },
  { id: 'robot', emoji: '🤖', color: '#bae6fd' },
  { id: 'rocket', emoji: '🚀', color: '#fecdd3' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

export const getAvatar = (id: string | undefined) =>
  AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
