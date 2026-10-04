import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

const modes: Array<{ digits: 3 | 4 | 5; description: string }> = [
  { digits: 3, description: 'Kısa ve hızlı turlar' },
  { digits: 4, description: 'Klasik oyun deneyimi' },
  { digits: 5, description: 'Daha zor bir meydan okuma' },
];

export default function ModeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Mode'>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kaç basamak olsun?</Text>
      <Text style={styles.subtitle}>Her sayıdaki rakamlar birbirinden farklıdır.</Text>
      <View style={styles.modes}>
        {modes.map(({ digits, description }) => (
          <Pressable
            key={digits}
            style={styles.mode}
            onPress={() => navigation.navigate('Game', { digits })}
          >
            <View style={styles.digitBadge}>
              <Text style={styles.digitText}>{digits}</Text>
            </View>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>{digits} basamaklı</Text>
              <Text style={styles.modeDescription}>{description}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800', marginTop: 12 },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 8 },
  modes: { gap: 14, marginTop: 32 },
  mode: {
    minHeight: 90,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  digitBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: { color: '#1d4ed8', fontSize: 25, fontWeight: '800' },
  modeCopy: { flex: 1, marginLeft: 14 },
  modeTitle: { color: '#1e293b', fontSize: 18, fontWeight: '800' },
  modeDescription: { color: '#64748b', fontSize: 14, marginTop: 3 },
  arrow: { color: '#94a3b8', fontSize: 30 },
});
