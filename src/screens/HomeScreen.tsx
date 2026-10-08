import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import BrandLogo from '../components/BrandLogo';
import Avatar from '../profile/Avatar';
import { useAuth } from '../auth/AuthProvider';
import { useCustomization } from '../game/CustomizationProvider';
import { THEMES } from '../game/store';

const TUTORIAL_KEY = 'tutorial.seen';

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const { gold, store } = useCustomization();
  const { user } = useAuth();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];
  const [isModePickerVisible, setIsModePickerVisible] = useState(false);

  // Kurallar ilk açılışta bir kez gösterilir.
  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY).then((seen) => {
      if (seen) return;
      AsyncStorage.setItem(TUTORIAL_KEY, '1');
      navigation.navigate('HowToPlay', { firstRun: true });
    });
  }, [navigation]);

  const startGame = (digits: 3 | 4 | 5) => {
    setIsModePickerVisible(false);
    navigation.navigate('Game', { digits });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Pressable style={styles.account} onPress={() => navigation.navigate('Profile')}>
        <Avatar id={user?.avatarId} size={28} />
        <Text style={styles.accountText} numberOfLines={1}>
          {user?.displayName ?? 'Hesap'}
        </Text>
      </Pressable>
      <View style={styles.goldBalance}>
        <Text style={styles.goldIcon}>●</Text>
        <Text style={styles.goldAmount}>{gold}</Text>
        <Text style={styles.goldLabel}>ALTIN</Text>
      </View>
      <View style={styles.hero}>
        <BrandLogo size={76} />
        <Text style={[styles.title, { color: theme.text }]}>Sayı Avı</Text>
        <Text style={styles.subtitle}>
          Gizli sayıyı en az tahminle bul. Her işaret seni doğru cevaba yaklaştırır.
        </Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.gameActions}>
          <Pressable
            style={[styles.gameAction, { backgroundColor: theme.primary }]}
            onPress={() => setIsModePickerVisible(true)}
          >
            <Text style={styles.gameIcon}>▶</Text>
            <Text style={styles.buttonText}>Tek Oyna</Text>
            <Text style={styles.buttonHint}>Bilgisayara karşı</Text>
          </Pressable>
          <Pressable
            style={[styles.gameAction, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Pvp')}
          >
            <Text style={styles.gameIcon}>⚔</Text>
            <Text style={styles.buttonText}>PvP</Text>
            <Text style={styles.buttonHint}>Rakiple canlı oyna</Text>
          </Pressable>
        </View>
        <Pressable style={styles.howTo} onPress={() => navigation.navigate('HowToPlay')}>
          <Text style={[styles.howToText, { color: theme.primary }]}>❓ Nasıl oynanır?</Text>
        </Pressable>
      </View>
      <Modal
        visible={isModePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsModePickerVisible(false)}
          />
          <View style={styles.modeModal}>
            <Text style={styles.modalTitle}>Oyun modunu seç</Text>
            <Text style={styles.modalSubtitle}>Her sayıdaki rakamlar birbirinden farklıdır.</Text>
            <View style={styles.modeChoices}>
              {[3, 4, 5].map((digits) => (
                <Pressable
                  key={digits}
                  style={[styles.modeButton, { borderColor: theme.primary }]}
                  onPress={() => startGame(digits as 3 | 4 | 5)}
                >
                  <Text style={[styles.modeButtonNumber, { color: theme.primary }]}>{digits}</Text>
                  <Text style={styles.modeButtonText}>Basamak</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center' },
  account: {
    position: 'absolute',
    top: 56,
    left: 24,
    maxWidth: 150,
    backgroundColor: '#e2e8f0',
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
  },
  howTo: { alignItems: 'center', paddingVertical: 14 },
  howToText: { fontSize: 15, fontWeight: '800' },
  accountText: { flexShrink: 1, color: '#334155', fontSize: 14, fontWeight: '700' },
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
  gameActions: { flexDirection: 'row', gap: 12 },
  gameAction: {
    flex: 1,
    minHeight: 144,
    padding: 16,
    borderRadius: 20,
    justifyContent: 'center',
  },
  gameIcon: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10 },
  buttonText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  buttonHint: { color: '#dbeafe', fontSize: 14, marginTop: 4 },
  recordsArrow: { color: '#64748b', fontSize: 30, lineHeight: 30 },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    padding: 24,
  },
  modeModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  modalTitle: { color: '#0f172a', fontSize: 24, fontWeight: '800' },
  modalSubtitle: { color: '#64748b', fontSize: 14, marginBottom: 8 },
  modeChoices: { flexDirection: 'row', gap: 10 },
  modeButton: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonNumber: { fontSize: 30, fontWeight: '800' },
  modeButtonText: { color: '#1e293b', fontSize: 12, fontWeight: '700', marginTop: 2 },
});
