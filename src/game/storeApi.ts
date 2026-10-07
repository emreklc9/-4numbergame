import { request } from '../auth/api';
import type { StoreItemId, StoreState } from './store';

export type ServerStore = StoreState & { gold: number };

export const storeApi = {
  get: (token: string) => request<ServerStore>('/store', { token }),
  purchase: (token: string, itemId: StoreItemId) =>
    request<ServerStore>('/store/purchase', { method: 'POST', body: { itemId }, token }),
  equip: (token: string, itemId: StoreItemId) =>
    request<ServerStore>('/store/equip', { method: 'PUT', body: { itemId }, token }),
};

export type ServerRecord = {
  id: string;
  digits: 3 | 4 | 5;
  attempts: number;
  date: string;
  verified: boolean;
};
export type LeaderboardRow = { rank: number; displayName: string; avatarId: string; attempts: number };

export const recordsApi = {
  mine: (token: string) => request<ServerRecord[]>('/records', { token }),
  leaderboard: (token: string, digits: number) =>
    request<LeaderboardRow[]>(`/leaderboard?digits=${digits}`, { token }),
};
