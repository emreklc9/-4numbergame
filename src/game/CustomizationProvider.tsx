import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import { enqueueRecord, enqueueSpend, flushOutbox, pendingGold } from './outbox';
import {
  defaultStoreState,
  findEquippedItemId,
  STORE_ITEMS,
  type StoreItemId,
  type StoreState,
} from './store';
import { storeApi, type ServerStore } from './storeApi';

type Cache = { gold: number; store: StoreState; equipDirty: boolean };

type CustomizationContextValue = {
  gold: number;
  store: StoreState | null;
  // Son sunucu iletişimi başarılıysa true. Mağaza alışverişi yalnızca çevrimiçiyken yapılır.
  online: boolean;
  refresh: () => Promise<void>;
  setServerGold: (gold: number) => void;
  recordOfflineWin: (attempts: number, digits: 3 | 4 | 5) => Promise<void>;
  spendOffline: (amount: number) => Promise<void>;
  purchase: (itemId: StoreItemId) => Promise<void>;
  equip: (itemId: StoreItemId) => Promise<void>;
};

const CustomizationContext = createContext<CustomizationContextValue | null>(null);
const cacheKey = (userId: string) => `wallet:${userId}`;

export function CustomizationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const userId = user?.id ?? null;
  const [serverGold, setServerGold] = useState(0);
  const [pending, setPending] = useState(0);
  const [store, setStore] = useState<StoreState | null>(null);
  const [online, setOnline] = useState(false);
  const equipDirty = useRef(false);
  // refresh kimliği sabit kalsın diye güncel mağaza durumu ref üzerinden okunur.
  const storeRef = useRef<StoreState | null>(null);
  storeRef.current = store;

  const save = useCallback(
    (gold: number, nextStore: StoreState) => {
      if (!userId) return;
      const cache: Cache = { gold, store: nextStore, equipDirty: equipDirty.current };
      AsyncStorage.setItem(cacheKey(userId), JSON.stringify(cache));
    },
    [userId],
  );

  const applyServer = useCallback(
    (state: ServerStore) => {
      const nextStore = { ownedItems: state.ownedItems, equipped: state.equipped };
      setServerGold(state.gold);
      setStore(nextStore);
      save(state.gold, nextStore);
    },
    [save],
  );

  const reloadPending = useCallback(async () => {
    setPending(userId ? await pendingGold(userId) : 0);
  }, [userId]);

  // Hesap değişince o hesabın önbelleği yüklenir; sunucudan güncel değer sonra gelir.
  useEffect(() => {
    setOnline(false);
    equipDirty.current = false;
    setServerGold(0);
    setStore(userId ? defaultStoreState : null);
    if (!userId) return setPending(0);
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(cacheKey(userId));
      const cache = raw ? (JSON.parse(raw) as Cache) : null;
      if (cancelled) return;
      if (cache) {
        equipDirty.current = cache.equipDirty;
        setServerGold(cache.gold);
        setStore({
          ownedItems: [...new Set([...defaultStoreState.ownedItems, ...cache.store.ownedItems])],
          equipped: { ...defaultStoreState.equipped, ...cache.store.equipped },
        });
      }
      setPending(await pendingGold(userId));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Bekleyen kayıtları gönderir, ardından bakiye ve mağaza durumunu sunucudan alır.
  const refresh = useCallback(async () => {
    if (!token || !userId) return;
    try {
      const result = await flushOutbox(token, userId);
      if (result.gold !== null) setServerGold(result.gold);
      await reloadPending();
      const current = storeRef.current;
      if (equipDirty.current && current) {
        // Çevrimdışı seçilen görünüm sunucuya iletilir; reddedilirse sunucudaki değer geçerli olur.
        for (const [type, value] of Object.entries(current.equipped)) {
          const id = findEquippedItemId(type as 'theme', value);
          if (id) await storeApi.equip(token, id).catch((e) => {
            if (e instanceof ApiError && e.status === 0) throw e;
          });
        }
        equipDirty.current = false;
      }
      applyServer(await storeApi.get(token));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [token, userId, reloadPending, applyServer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordOfflineWin = useCallback(
    async (attempts: number, digits: 3 | 4 | 5) => {
      if (!userId) return;
      await enqueueRecord(userId, attempts, digits);
      await reloadPending();
      refresh();
    },
    [userId, reloadPending, refresh],
  );

  const spendOffline = useCallback(
    async (amount: number) => {
      if (!userId) return;
      await enqueueSpend(userId, amount);
      await reloadPending();
    },
    [userId, reloadPending],
  );

  const purchase = useCallback(
    async (itemId: StoreItemId) => {
      if (!token || !userId) throw new Error('Önce giriş yapmalısın');
      const offlineError = new Error('Mağaza için internet bağlantısı gerekli');
      // Çevrimdışı kazanılan altın sunucuya ulaşmadan harcanamaz.
      const flushed = await flushOutbox(token, userId);
      if (!flushed.drained) {
        setOnline(false);
        throw offlineError;
      }
      try {
        applyServer(await storeApi.purchase(token, itemId));
        setOnline(true);
        await reloadPending();
      } catch (error) {
        if (error instanceof ApiError && error.status === 0) {
          setOnline(false);
          throw offlineError;
        }
        throw error;
      }
    },
    [token, userId, applyServer, reloadPending],
  );

  const equip = useCallback(
    async (itemId: StoreItemId) => {
      const item = STORE_ITEMS.find((candidate) => candidate.id === itemId);
      if (!item || !store?.ownedItems.includes(itemId)) throw new Error('Bu ürüne sahip değilsin');
      const next = { ...store, equipped: { ...store.equipped, [item.type]: item.value } };
      setStore(next);
      try {
        if (!token) throw new ApiError('', 0);
        applyServer(await storeApi.equip(token, itemId));
      } catch (error) {
        // Çevrimdışıyken seçim cihazda kalır ve bağlantı gelince sunucuya iletilir.
        if (!(error instanceof ApiError && error.status === 0)) {
          setStore(store);
          throw error;
        }
        equipDirty.current = true;
        save(serverGold, next);
      }
    },
    [token, store, serverGold, applyServer, save],
  );

  const gold = Math.max(serverGold + pending, 0);
  const value = useMemo(
    () => ({ gold, store, online, refresh, setServerGold, recordOfflineWin, spendOffline, purchase, equip }),
    [gold, store, online, refresh, recordOfflineWin, spendOffline, purchase, equip],
  );

  return <CustomizationContext.Provider value={value}>{children}</CustomizationContext.Provider>;
}

export function useCustomization(): CustomizationContextValue {
  const context = useContext(CustomizationContext);
  if (!context) throw new Error('CustomizationProvider uygulama kökünde kullanılmalı');
  return context;
}
