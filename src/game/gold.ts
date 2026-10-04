import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gold';

export async function getGold(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === null ? 0 : Number.parseInt(raw, 10);
}

export async function addGold(amount: number): Promise<number> {
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new RangeError('Altın miktarı pozitif bir tam sayı olmalı');
  }

  const total = (await getGold()) + amount;
  await AsyncStorage.setItem(KEY, String(total));
  return total;
}
