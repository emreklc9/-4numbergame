import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import BrandLogo from './BrandLogo';

type LoadingScreenProps = {
  message?: string;
};

export default function LoadingScreen({ message = 'Yükleniyor...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <BrandLogo size={82} />
      <Text style={styles.title}>CORDELIO GAME</Text>
      <Text style={styles.message}>{message}</Text>
      <ActivityIndicator style={styles.spinner} color="#bfdbfe" size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#fff', fontSize: 23, fontWeight: '800', letterSpacing: 2, marginTop: 22 },
  message: { color: '#dbeafe', fontSize: 15, marginTop: 9 },
  spinner: { marginTop: 28 },
});
