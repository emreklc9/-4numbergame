import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords, type GameRecord } from '../game/records';

export default function RecordsScreen() {
  const [records, setRecords] = useState<GameRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecords().then(setRecords);
    }, []),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.date}
        ListEmptyComponent={<Text style={styles.empty}>Henüz rekor yok</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}.</Text>
            <Text style={styles.mode}>{item.digits} basamak</Text>
            <Text style={styles.attempts}>{item.attempts} tahmin</Text>
            <Text style={styles.date}>{new Date(item.date).toLocaleDateString('tr-TR')}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  empty: { textAlign: 'center', color: '#777', marginTop: 40 },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#aaa',
  },
  rank: { width: 40, fontSize: 18, color: '#777' },
  mode: { width: 100, fontSize: 16, color: '#555' },
  attempts: { flex: 1, fontSize: 18, fontWeight: '700' },
  date: { fontSize: 16, color: '#555' },
});
