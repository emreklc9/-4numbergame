import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addGold, getGold, spendGold } from './gold';
import {
  equipItem as equipStoredItem,
  getStoreState,
  purchaseItem as purchaseStoredItem,
  type StoreItemId,
  type StoreState,
} from './store';

type CustomizationContextValue = {
  gold: number;
  store: StoreState | null;
  earnGold: (amount: number) => Promise<void>;
  purchase: (itemId: StoreItemId) => Promise<void>;
  equip: (itemId: StoreItemId) => Promise<void>;
  spendGold: (amount: number) => Promise<void>;
};

const CustomizationContext = createContext<CustomizationContextValue | null>(null);

export function CustomizationProvider({ children }: { children: React.ReactNode }) {
  const [gold, setGold] = useState(0);
  const [store, setStore] = useState<StoreState | null>(null);

  useEffect(() => {
    Promise.all([getGold(), getStoreState()]).then(([storedGold, storedStore]) => {
      setGold(storedGold);
      setStore(storedStore);
    });
  }, []);

  const earnGold = useCallback(async (amount: number) => {
    setGold(await addGold(amount));
  }, []);

  const purchase = useCallback(async (itemId: StoreItemId) => {
    const nextStore = await purchaseStoredItem(itemId);
    setStore(nextStore);
    setGold(await getGold());
  }, []);

  const equip = useCallback(async (itemId: StoreItemId) => {
    setStore(await equipStoredItem(itemId));
  }, []);

  const spend = useCallback(async (amount: number) => {
    setGold(await spendGold(amount));
  }, []);

  const value = useMemo(
    () => ({ gold, store, earnGold, purchase, equip, spendGold: spend }),
    [gold, store, earnGold, purchase, equip, spend],
  );

  return <CustomizationContext.Provider value={value}>{children}</CustomizationContext.Provider>;
}

export function useCustomization(): CustomizationContextValue {
  const context = useContext(CustomizationContext);
  if (!context) throw new Error('CustomizationProvider uygulama kökünde kullanılmalı');
  return context;
}
