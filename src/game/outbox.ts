import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, request } from '../auth/api';

const BATCH_SIZE = 50;
const MAX_QUEUE = 200;

type RecordEntry = {
  kind: 'record';
  clientId: string;
  digits: 3 | 4 | 5;
  attempts: number;
  playedAt: string;
};
type SpendEntry = { kind: 'spend'; clientId: string; amount: number };
export type OutboxEntry = RecordEntry | SpendEntry;
export type PendingRecord = Pick<RecordEntry, 'digits' | 'attempts' | 'playedAt'>;

// Çevrimdışı galibiyet ödülünün yerel tahmini; kesin tutarı sunucu hesaplar.
export const estimateWinReward = (attempts: number) => Math.max(21 - attempts, 1);

let inflight: Promise<FlushResult> | null = null;

// Kuyruk hesaba özeldir; hesap değişince önceki hesabın kayıtları karışmaz.
const keyFor = (userId: string) => `recordOutbox:${userId}`;

function newClientId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function readQueue(userId: string): Promise<OutboxEntry[]> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxEntry[];
  } catch {
    return [];
  }
}

async function push(userId: string, entry: OutboxEntry): Promise<void> {
  const queue = await readQueue(userId);
  queue.push(entry);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(queue.slice(-MAX_QUEUE)));
}

export const enqueueRecord = (userId: string, attempts: number, digits: 3 | 4 | 5) =>
  push(userId, {
    kind: 'record',
    clientId: newClientId(),
    digits,
    attempts,
    playedAt: new Date().toISOString(),
  });

export const enqueueSpend = (userId: string, amount: number) =>
  push(userId, { kind: 'spend', clientId: newClientId(), amount });

// Gönderilmemiş girdilerin bakiyeye etkisi (tahmini).
export async function pendingGold(userId: string): Promise<number> {
  const queue = await readQueue(userId);
  return queue.reduce(
    (sum, entry) =>
      sum + (entry.kind === 'record' ? estimateWinReward(entry.attempts) : -entry.amount),
    0,
  );
}

export async function pendingRecords(userId: string): Promise<PendingRecord[]> {
  const queue = await readQueue(userId);
  return queue.flatMap((entry) =>
    entry.kind === 'record'
      ? [
          {
            digits: entry.digits,
            attempts: entry.attempts,
            playedAt: entry.playedAt,
          },
        ]
      : [],
  );
}

export type FlushResult = { drained: boolean; gold: number | null };

// Gönderilemeyen girdiler kuyrukta kalır. Sunucu clientId ile tekrar gönderimleri yok sayar.
export function flushOutbox(token: string, userId: string): Promise<FlushResult> {
  inflight ??= runFlush(token, userId).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function runFlush(token: string, userId: string): Promise<FlushResult> {
  let gold: number | null = null;
  for (;;) {
    const queue = await readQueue(userId);
    if (queue.length === 0) return { drained: true, gold };
    const batch = queue.slice(0, BATCH_SIZE);
    const records = batch.flatMap((entry) =>
      entry.kind === 'record'
        ? [
            {
              clientId: entry.clientId,
              digits: entry.digits,
              attempts: entry.attempts,
              playedAt: entry.playedAt,
            },
          ]
        : [],
    );
    const spends = batch.flatMap((entry) =>
      entry.kind === 'spend' ? [{ clientId: entry.clientId, amount: entry.amount }] : [],
    );
    try {
      const result = await request<{ gold: number }>('/records/offline', {
        method: 'POST',
        body: { records, spends },
        token,
      });
      gold = result.gold;
    } catch (error) {
      // 400: girdiler geçersiz, tekrar denemek işe yaramaz. Diğer hatalarda sonra yeniden denenir.
      if (!(error instanceof ApiError && error.status === 400)) return { drained: false, gold };
    }
    // Gönderim sırasında eklenen yeni girdiler korunur.
    const sent = new Set(batch.map((entry) => entry.clientId));
    const latest = await readQueue(userId);
    await AsyncStorage.setItem(
      keyFor(userId),
      JSON.stringify(latest.filter((entry) => !sent.has(entry.clientId))),
    );
  }
}
