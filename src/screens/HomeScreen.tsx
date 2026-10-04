import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { getGold } from '../game/gold';
import BrandLogo from '../components/BrandLogo';

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const [gold, setGold] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getGold().then(setGold);
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.goldBalance}>
        <Text style={styles.goldIcon}>●</Text>
        <Text style={styles.goldAmount}>{gold}</Text>
        <Text style={styles.goldLabel}>ALTIN</Text>
      </View>
      <View style={styles.hero}>
        <BrandLogo size={76} />
        <Text style={styles.title}>Sayı Avı</Text>
        <Text style={styles.subtitle}>
          Gizli sayıyı en az tahminle bul. Her işaret seni doğru cevaba yaklaştırır.
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Mode')}>
          <Text style={styles.buttonText}>Tek Oyna</Text>
          <Text style={styles.buttonHint}>Bilgisayara karşı oyna</Text>
        </Pressable>
        <View style={[styles.button, styles.disabledButton]}>
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>YAKINDA</Text>
          </View>
          <Text style={styles.disabledButtonText}>PvP</Text>
          <Text style={styles.disabledHint}>Arkadaşlarınla mücadele et</Text>
        </View>
        <Pressable style={styles.recordsButton} onPress={() => navigation.navigate('Records')}>
          <Text style={styles.recordsButtonText}>Rekorlar</Text>
          <Text style={styles.recordsArrow}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center' },
  goldBalance: {
    position: 'absolute',
    top: 56,
    right: 24,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goldIcon: { color: '#d97706', fontSize: 14 },
  goldAmount: { color: '#92400e', fontSize: 17, fontWeight: '800' },
  goldLabel: { color: '#b45309', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  hero: { alignItems: 'center', marginBottom: 52 },
  title: { fontSize: 38, fontWeight: '800', color: '#0f172a', marginTop: 20 },
  subtitle: { fontSize: 16, lineHeight: 24, color: '#64748b', textAlign: 'center', marginTop: 10 },
  actions: { gap: 14 },
  button: {
    width: '100%',
    minHeight: 92,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  buttonText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  buttonHint: { color: '#dbeafe', fontSize: 14, marginTop: 4 },
  disabledButton: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButtonText: { color: '#64748b', fontSize: 22, fontWeight: '800' },
  disabledHint: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  comingSoon: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#cbd5e1',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonText: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  recordsButton: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordsButtonText: { color: '#334155', fontSize: 17, fontWeight: '700' },
  recordsArrow: { color: '#64748b', fontSize: 30, lineHeight: 30 },
});
