import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCustomization } from '../game/CustomizationProvider';
import { STORE_ITEMS, THEMES, type StoreItem } from '../game/store';

const categories: Array<{ title: string; types: StoreItem['type'][] }> = [
  { title: 'Temalar', types: ['theme'] },
  { title: 'Tuş Takımları', types: ['keypad'] },
  { title: 'Zafer Efektleri', types: ['effect'] },
];

export default function StoreScreen() {
  const { gold, store, online, refresh, purchase, equip } = useCustomization();
  const [message, setMessage] = useState<string | null>(null);
  const theme = THEMES[store?.equipped.theme ?? 'classic'];

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleItem = async (item: StoreItem) => {
    try {
      if (store?.ownedItems.includes(item.id)) {
        await equip(item.id);
        setMessage(`${item.name} donatıldı`);
      } else {
        await purchase(item.id);
        setMessage(`${item.name} satın alındı`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İşlem tamamlanamadı');
    }
  };

  const isEquipped = (item: StoreItem) => item.value === store?.equipped[item.type];

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.balance}>
        <Text style={styles.balanceLabel}>ALTIN BAKİYESİ</Text>
        <Text style={styles.balanceAmount}>{gold} Altın</Text>
      </View>
      <Text style={styles.intro}>Stilini seç, zaferini kişiselleştir.</Text>
      {!online && (
        <Text style={styles.offlineNotice}>
          Çevrimdışısın. Satın alma için internet gerekli; sahip olduklarını kullanabilirsin.
        </Text>
      )}
      {message && <Text style={styles.message}>{message}</Text>}
      {categories.map((category) => (
        <View key={category.title} style={styles.category}>
          <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.title}</Text>
          {STORE_ITEMS.filter((item) => category.types.includes(item.type)).map((item) => {
            const owned = store?.ownedItems.includes(item.id);
            const equipped = isEquipped(item);
            return (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                <Pressable
                  style={[
                    styles.itemButton,
                    equipped && styles.equippedButton,
                    !owned && !online && styles.disabledButton,
                  ]}
                  onPress={() => handleItem(item)}
                  disabled={equipped || (!owned && !online)}
                >
                  <Text style={styles.itemButtonText}>
                    {equipped ? 'Seçili' : owned ? 'Kullan' : `${item.price} Altın`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', padding: 20, gap: 22 },
  balance: {
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 20,
  },
  balanceLabel: { color: '#92400e', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  balanceAmount: { color: '#b45309', fontSize: 28, fontWeight: '800', marginTop: 4 },
  intro: { color: '#64748b', fontSize: 15, marginTop: -12 },
  offlineNotice: { color: '#b45309', fontWeight: '600', textAlign: 'center' },
  message: { color: '#047857', fontWeight: '700', textAlign: 'center' },
  category: { gap: 10 },
  categoryTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  item: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemCopy: { flex: 1 },
  itemName: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
  itemDescription: { color: '#64748b', fontSize: 13, lineHeight: 18, marginTop: 3 },
  itemButton: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  equippedButton: { backgroundColor: '#16a34a' },
  disabledButton: { backgroundColor: '#94a3b8' },
  itemButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
