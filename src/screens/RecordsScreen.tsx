import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../profile/Avatar';
import { useAuth } from '../auth/AuthProvider';
import { useCustomization } from '../game/CustomizationProvider';
import { pendingRecords } from '../game/outbox';
import { THEMES } from '../game/store';
import { recordsApi, type LeaderboardRow, type ServerRecord } from '../game/storeApi';

type Tab = 'mine' | 'board';
type Row = { key: string; digits: number; attempts: number; date: string; status: 'verified' | 'unverified' | 'pending' };

const STATUS_LABEL = { verified: '', unverified: 'doğrulanmamış', pending: 'gönderilmedi' };
const byBest = (a: Row, b: Row) => a.digits - b.digits || a.attempts - b.attempts;

export default function RecordsScreen() {
  const { token, user } = useAuth();
  const { store } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];
  const [tab, setTab] = useState<Tab>('mine');
  const [digits, setDigits] = useState<3 | 4 | 5>(4);
  const [rows, setRows] = useState<Row[]>([]);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [offline, setOffline] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token || !user) return;
      let cancelled = false;
      (async () => {
        const pending: Row[] = (await pendingRecords(user.id)).map((record, index) => ({
          key: `pending-${index}`,
          digits: record.digits,
          attempts: record.attempts,
          date: record.playedAt,
          status: 'pending',
        }));
        let server: ServerRecord[] = [];
        try {
          server = await recordsApi.mine(token);
          if (!cancelled) setOffline(false);
        } catch {
          if (!cancelled) setOffline(true);
        }
        if (cancelled) return;
        const synced: Row[] = server.map((record) => ({
          key: record.id,
          digits: record.digits,
          attempts: record.attempts,
          date: record.date,
          status: record.verified ? 'verified' : 'unverified',
        }));
        setRows([...synced, ...pending].sort(byBest));
      })();
      return () => {
        cancelled = true;
      };
    }, [token, user]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!token || tab !== 'board') return;
      let cancelled = false;
      recordsApi
        .leaderboard(token, digits)
        .then((result) => !cancelled && (setBoard(result), setOffline(false)))
        .catch(() => !cancelled && setOffline(true));
      return () => {
        cancelled = true;
      };
    }, [token, tab, digits]),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.tabs}>
        {(['mine', 'board'] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.tab, tab === value && { backgroundColor: theme.primary }]}
            onPress={() => setTab(value)}
          >
            <Text style={[styles.tabText, { color: tab === value ? theme.primaryText : theme.text }]}>
              {value === 'mine' ? 'Rekorlarım' : 'Sıralama'}
            </Text>
          </Pressable>
        ))}
      </View>
      {offline && <Text style={styles.offline}>Çevrimdışısın; sunucu verisi güncellenemedi.</Text>}

      {tab === 'mine' ? (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.text }]}>Henüz rekor yok</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rank}>{index + 1}.</Text>
              <View style={styles.main}>
                <Text style={[styles.attempts, { color: theme.text }]}>{item.attempts} tahmin</Text>
                {item.status !== 'verified' && (
                  <Text style={styles.badge}>{STATUS_LABEL[item.status]}</Text>
                )}
              </View>
              <Text style={styles.mode}>{item.digits} basamak</Text>
              <Text style={styles.date}>{new Date(item.date).toLocaleDateString('tr-TR')}</Text>
            </View>
          )}
        />
      ) : (
        <>
          <View style={styles.tabs}>
            {([3, 4, 5] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.tab, digits === value && { backgroundColor: theme.primary }]}
                onPress={() => setDigits(value)}
              >
                <Text
                  style={[styles.tabText, { color: digits === value ? theme.primaryText : theme.text }]}
                >
                  {value} basamak
                </Text>
              </Pressable>
            ))}
          </View>
          <FlatList
            data={board}
            keyExtractor={(item) => String(item.rank)}
            ListEmptyComponent={<Text style={[styles.empty, { color: theme.text }]}>Henüz sıralama yok</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rank}>{item.rank}.</Text>
                <Avatar id={item.avatarId} size={30} />
                <Text style={[styles.attempts, styles.main, styles.boardName, { color: theme.text }]}>
                  {item.displayName}
                </Text>
                <Text style={[styles.attempts, { color: theme.text }]}>{item.attempts}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#e2e8f0' },
  tabText: { fontWeight: '700' },
  offline: { color: '#b45309', textAlign: 'center', marginBottom: 8 },
  empty: { textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#aaa',
  },
  rank: { width: 36, fontSize: 18, color: '#777' },
  main: { flex: 1 },
  attempts: { fontSize: 18, fontWeight: '700' },
  boardName: { marginLeft: 10 },
  badge: { fontSize: 12, color: '#b45309' },
  mode: { fontSize: 14, color: '#555', marginRight: 10 },
  date: { fontSize: 14, color: '#555' },
});
