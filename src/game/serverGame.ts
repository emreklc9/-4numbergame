import { request } from '../auth/api';
import type { Feedback } from './logic';

export type ServerGame = { id: string; digits: 3 | 4 | 5; status: 'active' | 'won' | 'lost'; attempts: number };
export type GuessResult = {
  id: string;
  status: 'active' | 'won' | 'lost';
  attempts: number;
  feedback: Feedback;
  secret?: string;
};
export type HintResult =
  | { type: 'reveal'; index: number; digit: string }
  | { type: 'eliminate'; digit: string };

// Oyun açma kısa zaman aşımıyla denenir; sunucuya ulaşılamazsa çevrimdışı moda geçilir.
const CREATE_TIMEOUT_MS = 4_000;

export const gameApi = {
  create: (token: string, digits: number) =>
    request<ServerGame>('/games', { method: 'POST', body: { digits }, token, timeoutMs: CREATE_TIMEOUT_MS }),
  guess: (token: string, gameId: string, guess: string) =>
    request<GuessResult>(`/games/${gameId}/guesses`, { method: 'POST', body: { guess }, token }),
  hint: (token: string, gameId: string, type: 'reveal' | 'eliminate') =>
    request<HintResult>(`/games/${gameId}/hints`, { method: 'POST', body: { type }, token }),
};
