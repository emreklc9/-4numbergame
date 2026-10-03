import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'records';
const MAX_RECORDS = 20;

export type GameRecord = { attempts: number; date: string; digits: 3 | 4 | 5 };

export async function getRecords(): Promise<GameRecord[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];

  return (JSON.parse(raw) as Array<Omit<GameRecord, 'digits'> & { digits?: 3 | 4 | 5 }>).map(
    (record) => ({ ...record, digits: record.digits ?? 4 }),
  );
}

export async function addRecord(attempts: number, digits: 3 | 4 | 5): Promise<void> {
  const records = await getRecords();
  records.push({ attempts, date: new Date().toISOString(), digits });
  records.sort(
    (a, b) => a.digits - b.digits || a.attempts - b.attempts || a.date.localeCompare(b.date),
  );
  await AsyncStorage.setItem(KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}
