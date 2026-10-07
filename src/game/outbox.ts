import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, request } from '../auth/api';

const KEY = 'recordOutbox';
const BATCH_SIZE = 50;
const MAX_QUEUE = 200;

export type OutboxRecord = {
  clientId: string;
  digits: 3 | 4 | 5;
  attempts: number;
  playedAt: string;
};

let flushing = false;

function newClientId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function readQueue(): Promise<OutboxRecord[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxRecord[];
  } catch {
    return [];
  }
}

export async function enqueueRecord(attempts: number, digits: 3 | 4 | 5): Promise<void> {
  const queue = await readQueue();
  queue.push({ clientId: newClientId(), digits, attempts, playedAt: new Date().toISOString() });
  await AsyncStorage.setItem(KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
}

// Gönderilemeyen kayıtlar kuyrukta kalır. Sunucu clientId ile tekrar gönderimleri yok sayar.
export async function flushOutbox(token: string): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const queue = await readQueue();
      if (queue.length === 0) return;
      const batch = queue.slice(0, BATCH_SIZE);
      try {
        await request('/records/offline', { method: 'POST', body: { records: batch }, token });
      } catch (error) {
        // 400: kayıtlar geçersiz, tekrar denemek işe yaramaz. Diğer hatalarda sonra yeniden denenir.
        if (!(error instanceof ApiError && error.status === 400)) return;
      }
      // Gönderim sırasında eklenen yeni kayıtlar korunur.
      const sent = new Set(batch.map((record) => record.clientId));
      const latest = await readQueue();
      await AsyncStorage.setItem(KEY, JSON.stringify(latest.filter((r) => !sent.has(r.clientId))));
    }
  } finally {
    flushing = false;
  }
}
