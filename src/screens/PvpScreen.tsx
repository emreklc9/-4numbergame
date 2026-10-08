import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../config';
import { authApi } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import Avatar from '../profile/Avatar';
import ConfettiBurst from '../components/ConfettiBurst';
import { useCustomization } from '../game/CustomizationProvider';
import { THEMES, WIN_EFFECTS } from '../game/store';
import { validateGuess, type Feedback } from '../game/logic';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Opponent = { displayName: string; avatarId: string; attempts: number; connected: boolean };
type MatchInfo = { matchId: string; digits: number; timeoutMs: number; opponent: Opponent };
type MatchEnd = {
  result: 'won' | 'lost';
  reason: 'solved' | 'idle' | 'disconnect';
  secret: string;
  attempts: number;
  opponentAttempts: number;
  rewardGold?: number;
  gold?: number | null;
};
type Phase = 'connecting' | 'queued' | 'playing' | 'ended' | 'error';
type Attempt = { guess: string; feedback: Feedback };

const SOCKET_URL = API_URL.replace(/\/v1\/?$/, '');
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const REASONS: Record<MatchEnd['reason'], { won: string; lost: string }> = {
  solved: { won: 'Sayıyı önce sen buldun!', lost: 'Rakibin sayıyı senden önce buldu.' },
  idle: { won: 'Rakibin süre içinde tahmin yapmadı.', lost: 'Süre içinde tahmin yapmadığın için kaybettin.' },
  disconnect: { won: 'Rakibinin bağlantısı koptu.', lost: 'Bağlantın kopunca süre doldu.' },
};

export default function PvpScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Pvp'>) {
  const { token } = useAuth();
  const { store, setServerGold } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];
  const effectColors = WIN_EFFECTS[store?.equipped.effect ?? 'confetti'];

  const [phase, setPhase] = useState<Phase>('connecting');
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState<MatchEnd | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const triedRefresh = useRef(false);
  const phaseRef = useRef<Phase>('connecting');
  phaseRef.current = phase;

  const resetMatch = () => {
    setMatch(null);
    setOpponent(null);
    setAttempts([]);
    setInput('');
    setError(null);
    setEnd(null);
    deadlineRef.current = null;
    setSecondsLeft(null);
  };

  // Her yeni deneme (round) ve yenilenen belirteçle bağlantı baştan kurulur.
  useEffect(() => {
    if (!token) return;
    resetMatch();
    setPhase('connecting');
    const socket = io(`${SOCKET_URL}/pvp`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    const armTimer = (timeoutMs: number) => {
      deadlineRef.current = Date.now() + timeoutMs;
    };

    socket.on('connect', () => {
      // Sunucu kopma sonrası aktif maçı matchStart ile geri gönderir; yoksa kuyruğa girilir.
      if (phaseRef.current !== 'playing') socket.emit('queue');
    });
    socket.on('connect_error', () => {
      if (phaseRef.current !== 'playing') {
        setError('Sunucuya ulaşılamadı. Bağlantını kontrol et.');
        setPhase('error');
      }
    });
    socket.on('error', async (payload: { code?: string }) => {
      if (payload?.code === 'UNAUTHORIZED' && !triedRefresh.current) {
        triedRefresh.current = true;
        // Süresi dolmuş belirteç istek sırasında yenilenir; token değişince bağlantı yeniden kurulur.
        await authApi.me(token).catch(() => undefined);
        return;
      }
      setError('Oturum geçersiz, tekrar giriş yap');
      setPhase('error');
    });
    socket.on('queued', () => setPhase('queued'));
    socket.on('matchStart', (info: MatchInfo & { attempts: number }) => {
      setMatch(info);
      setOpponent(info.opponent);
      setPhase('playing');
      armTimer(info.timeoutMs);
    });
    socket.on('opponentProgress', ({ attempts: count }: { attempts: number }) =>
      setOpponent((current) => (current ? { ...current, attempts: count } : current)),
    );
    socket.on('opponentConnection', ({ connected }: { connected: boolean }) =>
      setOpponent((current) => (current ? { ...current, connected } : current)),
    );
    socket.on('matchEnd', (result: MatchEnd) => {
      setEnd(result);
      setPhase('ended');
      deadlineRef.current = null;
      if (typeof result.gold === 'number') setServerGold(result.gold);
    });

    return () => {
      socket.emit('cancel');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, round, setServerGold]);

  // Tahmin bekleme süresi geri sayımı.
  useEffect(() => {
    const interval = setInterval(() => {
      const deadline = deadlineRef.current;
      setSecondsLeft(deadline ? Math.max(Math.ceil((deadline - Date.now()) / 1000), 0) : null);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const digits = match?.digits ?? 4;

  const submit = useCallback(() => {
    if (!match || !socketRef.current) return;
    const message = validateGuess(input, digits);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    const guess = input;
    socketRef.current.emit(
      'guess',
      { guess },
      (response: { ok: boolean; feedback?: Feedback; message?: string }) => {
        if (!response?.ok) {
          // Maç bittiyse matchEnd zaten geliyor; diğer hatalar gösterilir.
          if (response?.message) setError(response.message);
          return;
        }
        setAttempts((current) => [{ guess, feedback: response.feedback! }, ...current]);
        setInput('');
        deadlineRef.current = Date.now() + (match.timeoutMs ?? 60_000);
      },
    );
  }, [input, digits, match]);

  const press = (digit: string) => {
    if (input.length >= digits || input.includes(digit)) return;
    setError(null);
    setInput(input + digit);
  };

  const playAgain = () => {
    triedRefresh.current = false;
    setRound((value) => value + 1);
  };

  const won = end?.result === 'won';

  if (phase === 'connecting' || phase === 'queued') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.bigIcon}>⚔</Text>
        <Text style={[styles.title, { color: theme.text }]}>
          {phase === 'connecting' ? 'Bağlanılıyor...' : 'Rakip aranıyor...'}
        </Text>
        <Text style={styles.sub}>Aynı gizli sayıyı önce bulan kazanır.</Text>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Vazgeç</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.bigIcon}>📡</Text>
        <Text style={[styles.title, { color: theme.text }]}>Bağlanılamadı</Text>
        <Text style={styles.sub}>{error}</Text>
        <Pressable style={[styles.primary, { backgroundColor: theme.primary }]} onPress={playAgain}>
          <Text style={[styles.primaryText, { color: theme.primaryText }]}>Tekrar dene</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {won && <ConfettiBurst colors={effectColors} />}
      {opponent && (
        <View style={styles.opponent}>
          <Avatar id={opponent.avatarId} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.opponentName}>{opponent.displayName}</Text>
            <Text style={styles.opponentSub}>
              {opponent.connected ? `${opponent.attempts} tahmin yaptı` : 'Bağlantısı koptu, bekleniyor...'}
            </Text>
          </View>
          {phase === 'playing' && secondsLeft !== null && (
            <Text style={[styles.timer, secondsLeft <= 10 && styles.timerLow]}>{secondsLeft} sn</Text>
          )}
        </View>
      )}

      {phase === 'ended' && end ? (
        <View style={styles.result}>
          <Text style={[styles.title, { color: theme.text }]}>{won ? '🏆 Kazandın!' : 'Kaybettin'}</Text>
          <Text style={styles.sub}>{REASONS[end.reason][end.result]}</Text>
          <Text style={[styles.secret, { color: theme.text }]}>Sayı: {end.secret}</Text>
          <Text style={styles.sub}>
            Sen {end.attempts} · Rakip {end.opponentAttempts} tahmin
          </Text>
          {won && end.rewardGold ? <Text style={styles.reward}>+{end.rewardGold} Altın</Text> : null}
          <Pressable style={[styles.primary, { backgroundColor: theme.primary }]} onPress={playAgain}>
            <Text style={[styles.primaryText, { color: theme.primaryText }]}>Yeni rakip bul</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryText}>Ana ekran</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.digits}>
            {Array.from({ length: digits }, (_, index) => (
              <View key={index} style={[styles.box, index === input.length && { borderColor: theme.primary }]}>
                <Text style={styles.boxText}>{input[index] ?? ''}</Text>
              </View>
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.keypad}>
            {KEYS.map((key) => (
              <Pressable
                key={key}
                style={[styles.key, input.includes(key) && styles.keyUsed]}
                onPress={() => press(key)}
              >
                <Text style={styles.keyText}>{key}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.key} onPress={() => setInput(input.slice(0, -1))}>
              <Text style={styles.keyText}>⌫</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.primary, { backgroundColor: theme.primary }, input.length < digits && styles.disabled]}
            disabled={input.length < digits}
            onPress={submit}
          >
            <Text style={[styles.primaryText, { color: theme.primaryText }]}>Tahmin et</Text>
          </Pressable>
          {attempts.map((attempt, index) => (
            <View key={attempts.length - index} style={styles.row}>
              <Text style={styles.rowIndex}>{attempts.length - index}.</Text>
              <Text style={styles.rowGuess}>{attempt.guess}</Text>
              <Text style={[styles.rowFeedback, { color: '#047857' }]}>+{attempt.feedback.plus}</Text>
              <Text style={[styles.rowFeedback, { color: '#dc2626' }]}>−{attempt.feedback.minus}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  container: { padding: 20, gap: 14, flexGrow: 1 },
  bigIcon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  opponent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    padding: 10,
  },
  opponentName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  opponentSub: { fontSize: 13, color: '#475569' },
  timer: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  timerLow: { color: '#dc2626' },
  digits: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
  box: {
    width: 54,
    height: 64,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxText: { fontSize: 30, fontWeight: '800', color: '#1e3a8a' },
  error: { color: '#dc2626', fontWeight: '700', textAlign: 'center' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  key: {
    width: '18%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyUsed: { opacity: 0.4 },
  keyText: { color: '#1e293b', fontSize: 20, fontWeight: '800' },
  primary: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800' },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowIndex: { color: '#94a3b8', fontWeight: '700', width: 28 },
  rowGuess: { flex: 1, fontSize: 20, fontWeight: '800', color: '#1e293b', letterSpacing: 2 },
  rowFeedback: { fontSize: 18, fontWeight: '800' },
  result: { alignItems: 'center', gap: 10, marginTop: 24 },
  secret: { fontSize: 32, fontWeight: '800', letterSpacing: 4 },
  reward: { color: '#92400e', fontSize: 22, fontWeight: '800' },
});
