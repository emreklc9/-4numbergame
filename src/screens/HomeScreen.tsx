import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const gameModes: Array<3 | 4 | 5> = [3, 4, 5];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>+/- Sayı Oyunu</Text>
      <Text style={styles.subtitle}>Bir oyun modu seç ve bilgisayarın tuttuğu sayıyı bul</Text>
      <View style={styles.modes}>
        {gameModes.map((digits) => (
          <Pressable
            key={digits}
            style={styles.button}
            onPress={() => navigation.navigate('Game', { digits })}
          >
            <Text style={styles.buttonText}>{digits} Basamaklı Oyna</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[styles.button, styles.secondary]}
        onPress={() => navigation.navigate('Records')}
      >
        <Text style={styles.buttonText}>Rekorlar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 36, fontWeight: '800' },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 24 },
  button: {
    width: '100%',
    maxWidth: 320,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modes: { width: '100%', maxWidth: 320, gap: 12 },
  secondary: { backgroundColor: '#7c3aed' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
