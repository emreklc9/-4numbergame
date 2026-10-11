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
type OwnHints = { revealed: Array<{ index: number; digit: string }>; eliminated: string[] };
type MatchInfo = {
  matchId: string;
  digits: number;
  timeoutMs: number;
  opponent: Opponent;
  hints?: OwnHints;
  yourTurn?: boolean;
  mode?: PvpMode;
};
type MatchEnd = {
  result: 'won' | 'lost';
  reason: 'solved' | 'idle' | 'disconnect';
  secret: string;
  attempts: number;
  opponentAttempts: number;
  rewardGold?: number;
  gold?: number | null;
  stage?: 'secret' | 'guess';
};
type AwaitSecret = {
  matchId: string;
  digits: number;
  timeoutMs: number;
  mode: PvpMode;
  youReady: boolean;
  opponentReady: boolean;
  opponent: Opponent;
};
type Phase = 'pick' | 'connecting' | 'queued' | 'writing' | 'playing' | 'ended' | 'error';
type PvpMode = 'shared' | 'duel';
type Attempt = { guess: string; feedback: Feedback };

const SOCKET_URL = API_URL.replace(/\/v1\/?$/, '');
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const REVEAL_HINT_COST = 1;
const ELIMINATE_HINT_COST = 1;

const REASONS: Record<MatchEnd['reason'], { won: string; lost: string }> = {
  solved: { won: 'Sayıyı önce sen buldun!', lost: 'Rakibin sayıyı senden önce buldu.' },
  idle: { won: 'Rakibin süre içinde tahmin yapmadı.', lost: 'Süre içinde tahmin yapmadığın için kaybettin.' },
  disconnect: { won: 'Rakibinin bağlantısı koptu.', lost: 'Bağlantın kopunca süre doldu.' },
};

export default function PvpScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Pvp'>) {
  const { token } = useAuth();
  const { gold, store, setServerGold } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];
  const effectColors = WIN_EFFECTS[store?.equipped.effect ?? 'confetti'];

  const [phase, setPhase] = useState<Phase>('pick');
  const [mode, setMode] = useState<PvpMode | null>(null);
  const [secretSent, setSecretSent] = useState(false);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [slots, setSlots] = useState<string[]>(() => Array(4).fill(''));
  const [locks, setLocks] = useState<boolean[]>(() => Array(4).fill(false));
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hintBusy, setHintBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState<MatchEnd | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [yourTurn, setYourTurn] = useState(false);
  const [round, setRound] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const triedRefresh = useRef(false);
  const phaseRef = useRef<Phase>('connecting');
  phaseRef.current = phase;

  const resetMatch = () => {
    matchIdRef.current = null;
    setMatch(null);
    setOpponent(null);
    setAttempts([]);
    setSlots(Array(4).fill(''));
    setLocks(Array(4).fill(false));
    setEliminated([]);
    setActiveIndex(0);
    setHintBusy(false);
    setError(null);
    setEnd(null);
    deadlineRef.current = null;
    setSecondsLeft(null);
    setYourTurn(false);
    setSecretSent(false);
  };

  // Her yeni deneme (round) ve yenilenen belirteçle bağlantı baştan kurulur.
  useEffect(() => {
    if (!token || !mode) return;
    resetMatch();
    setPhase('connecting');
    const socket = io(`${SOCKET_URL}/pvp`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    const applyTurn = (isYourTurn: boolean, timeoutMs: number) => {
      setYourTurn(isYourTurn);
      deadlineRef.current = isYourTurn ? Date.now() + timeoutMs : null;
    };

    const joinQueue = (active: Socket, attempt = 0) => {
      active.emit('queue', { mode }, (response: { ok?: boolean }) => {
        if (response?.ok || !active.connected || attempt >= 5) return;
        setTimeout(() => joinQueue(active, attempt + 1), 200);
      });
    };

    socket.on('connect', () => {
      // Sunucu kopma sonrası aktif maçı matchStart ile geri gönderir; yoksa kuyruğa girilir.
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'writing') joinQueue(socket);
    });
    socket.on('connect_error', () => {
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'writing') {
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
    socket.on('awaitSecret', (info: AwaitSecret) => {
      const isNew = matchIdRef.current !== info.matchId;
      matchIdRef.current = info.matchId;
      setMatch({
        matchId: info.matchId,
        digits: info.digits,
        timeoutMs: info.timeoutMs,
        opponent: info.opponent,
        yourTurn: false,
        mode: 'duel',
      });
      setOpponent(info.opponent);
      setSecretSent(info.youReady);
      setPhase('writing');
      setEnd(null);
      if (info.youReady) deadlineRef.current = null;
      else if (isNew) deadlineRef.current = Date.now() + info.timeoutMs;
      if (!isNew) return;
      setAttempts([]);
      setSlots(Array(info.digits).fill(''));
      setLocks(Array(info.digits).fill(false));
      setEliminated([]);
      setActiveIndex(0);
      setError(null);
    });
    socket.on('matchStart', (info: MatchInfo & { attempts: number }) => {
      const continuing = matchIdRef.current === info.matchId && phaseRef.current === 'playing';
      matchIdRef.current = info.matchId;
      setMatch(info);
      setOpponent(info.opponent);
      setPhase('playing');
      applyTurn(info.yourTurn === true, info.timeoutMs);
      if (!continuing) {
        setAttempts([]);
        setActiveIndex(0);
        setError(null);
        setEnd(null);
      }
      const revealed = info.hints?.revealed ?? [];
      setSlots((current) => {
        const next = continuing && current.length === info.digits ? [...current] : Array(info.digits).fill('');
        for (const cell of revealed) next[cell.index] = cell.digit;
        return next;
      });
      setLocks((current) => {
        const next = continuing && current.length === info.digits ? [...current] : Array(info.digits).fill(false);
        for (const cell of revealed) next[cell.index] = true;
        return next;
      });
      setEliminated(info.hints?.eliminated ?? []);
    });
    socket.on('opponentProgress', ({ attempts: count }: { attempts: number }) =>
      setOpponent((current) => (current ? { ...current, attempts: count } : current)),
    );
    socket.on('opponentConnection', ({ connected }: { connected: boolean }) =>
      setOpponent((current) => (current ? { ...current, connected } : current)),
    );
    socket.on('turn', ({ yourTurn: isYourTurn, timeoutMs }: { yourTurn: boolean; timeoutMs: number }) => {
      applyTurn(isYourTurn, timeoutMs);
    });
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
  }, [token, round, mode, setServerGold]);

  // Tahmin bekleme süresi geri sayımı.
  useEffect(() => {
    const interval = setInterval(() => {
      const deadline = deadlineRef.current;
      setSecondsLeft(deadline ? Math.max(Math.ceil((deadline - Date.now()) / 1000), 0) : null);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const digits = match?.digits ?? 4;
  const enteringSecret = phase === 'writing' && !secretSent;
  const canType = enteringSecret || yourTurn;

  const submit = useCallback(() => {
    if (!match || !socketRef.current || !yourTurn) return;
    const guess = slots.join('');
    const message = validateGuess(guess, digits);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
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
        setSlots((current) => current.map((value, index) => (locks[index] ? value : '')));
        const firstOpen = locks.findIndex((locked) => !locked);
        setActiveIndex(firstOpen === -1 ? 0 : firstOpen);
        setYourTurn(false);
        deadlineRef.current = null;
      },
    );
  }, [slots, locks, digits, match, yourTurn]);

  const nextUnlocked = (start: number, nextLocks: boolean[]) => {
    for (let index = start + 1; index < digits; index++) {
      if (!nextLocks[index]) return index;
    }
    return start;
  };

  const press = (digit: string) => {
    if (!canType || (!enteringSecret && locks[activeIndex]) || slots.includes(digit)) return;
    setError(null);
    const next = slots.map((value, index) => (index === activeIndex ? digit : value));
    setSlots(next);
    const open = next.findIndex((value, index) => !locks[index] && !value);
    if (open >= 0) setActiveIndex(open);
  };

  const toggleLock = (index: number) => {
    if (!slots[index]) return;
    const nextLocks = locks.map((locked, lockIndex) => (lockIndex === index ? !locked : locked));
    setLocks(nextLocks);
    if (nextLocks[index] && activeIndex === index) setActiveIndex(nextUnlocked(index, nextLocks));
  };

  const toggleEliminated = (digit: string) => {
    setEliminated((current) =>
      current.includes(digit) ? current.filter((item) => item !== digit) : [...current, digit],
    );
  };

  const submitSecret = () => {
    if (!enteringSecret || !socketRef.current) return;
    const secret = slots.join('');
    const message = validateGuess(secret, digits);
    if (message) {
      setError(message);
      return;
    }
    if (secret.startsWith('0')) {
      setError('İlk rakam 0 olamaz');
      return;
    }
    setError(null);
    socketRef.current.emit('secret', { secret }, (response: { ok?: boolean; message?: string }) => {
      if (!response?.ok) {
        if (response?.message) setError(response.message);
        return;
      }
      setSecretSent(true);
      deadlineRef.current = null;
    });
  };

  const backspace = () => {
    if (!canType) return;
    let index = activeIndex;
    if (!slots[index] || locks[index]) {
      index = -1;
      for (let cursor = activeIndex - 1; cursor >= 0; cursor--) {
        if (!locks[cursor] && slots[cursor]) {
          index = cursor;
          break;
        }
      }
    }
    if (index < 0) return;
    setSlots((current) => current.map((value, cursor) => (cursor === index ? '' : value)));
    setActiveIndex(index);
  };

  const useHint = (type: 'reveal' | 'eliminate') => {
    if (hintBusy || phase !== 'playing' || !yourTurn || !socketRef.current) return;
    const cost = type === 'reveal' ? REVEAL_HINT_COST : ELIMINATE_HINT_COST;
    if (gold < cost) {
      setError('Yeterli altının yok');
      return;
    }
    setHintBusy(true);
    setError(null);
    socketRef.current.emit(
      'hint',
      { type },
      (response: { ok?: boolean; type?: string; index?: number; digit?: string; gold?: number; message?: string }) => {
        setHintBusy(false);
        if (!response?.ok || !response.digit || !response.type) {
          setError(response?.message ?? 'İpucu kullanılamadı');
          return;
        }
        if (typeof response.gold === 'number') setServerGold(response.gold);
        if (response.type === 'reveal' && typeof response.index === 'number') {
          const index = response.index;
          const digit = response.digit;
          setSlots((current) => {
            const next = current.map((value, cursor) => (cursor === index ? digit : value));
            setLocks((lockState) => {
              const nextLocks = lockState.map((locked, cursor) => (cursor === index ? true : locked));
              const open = next.findIndex((value, cursor) => !nextLocks[cursor] && !value);
              if (open >= 0) setActiveIndex(open);
              return nextLocks;
            });
            return next;
          });
        } else {
          const digit = response.digit;
          setEliminated((current) => (current.includes(digit) ? current : [...current, digit]));
          setSlots((current) => current.map((value, index) => (value === digit && !locks[index] ? '' : value)));
        }
      },
    );
  };

  // Aynı sokette yeniden kuyruğa girilir. Bağlantıyı koparmak, eski iptalin yeni aramayı silmesine yol açıyordu.
  const playAgain = () => {
    resetMatch();
    const socket = socketRef.current;
    if (socket?.connected) {
      setPhase('queued');
      socket.emit('queue', { mode }, (response: { ok?: boolean }) => {
        if (response?.ok || !socket.connected) return;
        setTimeout(() => socket.emit('queue', { mode }), 200);
      });
      return;
    }
    triedRefresh.current = false;
    setRound((value) => value + 1);
  };

  const chooseMode = (next: PvpMode) => {
    setMode(next);
    setPhase('connecting');
  };

  const won = end?.result === 'won';
  const endText = !end
    ? ''
    : end.reason === 'idle' && end.stage === 'secret'
      ? end.result === 'won'
        ? 'Rakibin sayısını yazmadı.'
        : 'Süre içinde sayını yazmadığın için kaybettin.'
      : end.reason === 'solved' && match?.mode === 'duel'
        ? end.result === 'won'
          ? 'Rakibinin sayısını buldun!'
          : 'Rakibin senin sayını buldu.'
        : REASONS[end.reason][end.result];

  if (!mode || phase === 'pick') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.bigIcon}>⚔</Text>
        <Text style={[styles.title, { color: theme.text }]}>Nasıl oynayalım?</Text>
        <Pressable style={[styles.modeButton, { backgroundColor: theme.primary }]} onPress={() => chooseMode('shared')}>
          <Text style={[styles.primaryText, { color: theme.primaryText }]}>Aynı sayı</Text>
          <Text style={[styles.modeHint, { color: theme.primaryText }]}>
            İkiniz de aynı gizli sayıyı sırayla tahmin eder.
          </Text>
        </Pressable>
        <Pressable style={[styles.modeButton, { backgroundColor: theme.primary }]} onPress={() => chooseMode('duel')}>
          <Text style={[styles.primaryText, { color: theme.primaryText }]}>Rakibinin sayısı</Text>
          <Text style={[styles.modeHint, { color: theme.primaryText }]}>
            Kendi sayını yazarsın. Rakibinin yazdığı sayıyı tahmin edersin.
          </Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'connecting' || phase === 'queued') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.bigIcon}>⚔</Text>
        <Text style={[styles.title, { color: theme.text }]}>
          {phase === 'connecting' ? 'Bağlanılıyor...' : 'Rakip aranıyor...'}
        </Text>
        <Text style={styles.sub}>
          {phase === 'queued'
            ? mode === 'duel'
              ? 'Aynı modu seçen rakip aranıyor. Eşleşince ikiniz de kendi sayınızı yazacaksınız.'
              : 'Aynı sayıyı seçen rakip aranıyor. Karşı taraf da aramalı.'
            : mode === 'duel'
              ? 'Eşleşince kendi sayını yazacaksın.'
              : 'Sırayla tahmin edilir. Aynı gizli sayıyı bulan kazanır.'}
        </Text>
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

  if (phase === 'writing') {
    return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
        {opponent && (
          <View style={styles.opponent}>
            <Avatar id={opponent.avatarId} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.opponentName}>{opponent.displayName}</Text>
              <Text style={styles.opponentSub}>
                {secretSent ? 'Sayısını yazması bekleniyor' : 'Rakibin de kendi sayısını yazıyor'}
              </Text>
            </View>
            {!secretSent && secondsLeft !== null && (
              <Text style={[styles.timer, secondsLeft <= 10 && styles.timerLow]}>{secondsLeft} sn</Text>
            )}
          </View>
        )}
        <Text style={[styles.title, { color: theme.text }]}>{secretSent ? 'Sayın hazır' : 'Sayını yaz'}</Text>
        <Text style={styles.sub}>
          {secretSent
            ? 'Rakibin sayısını yazınca tahmin sırası başlar.'
            : 'Rakibin bu sayıyı tahmin edecek. Rakamlar farklı olsun, ilk rakam 0 olmasın.'}
        </Text>
        <View style={styles.digits}>
          {Array.from({ length: digits }, (_, index) => (
            <Pressable
              key={index}
              style={[
                styles.box,
                { backgroundColor: theme.digit.background, borderColor: theme.digit.border },
                !secretSent && activeIndex === index && { borderColor: theme.digit.activeBorder },
              ]}
              onPress={() => !secretSent && setActiveIndex(index)}
            >
              <Text style={[styles.boxText, { color: theme.digit.text }]}>{slots[index] ?? ''}</Text>
            </Pressable>
          ))}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        {!secretSent && (
          <>
            <View style={styles.keypad}>
              {KEYS.map((key) => (
                <Pressable
                  key={key}
                  style={[
                    styles.key,
                    { backgroundColor: theme.digit.background, borderColor: theme.digit.border },
                    slots.includes(key) && styles.keyUsed,
                  ]}
                  onPress={() => press(key)}
                >
                  <Text style={[styles.keyText, { color: theme.digit.text }]}>{key}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.key} onPress={backspace}>
                <Text style={styles.keyText}>⌫</Text>
              </Pressable>
            </View>
            <Pressable
              style={[
                styles.primary,
                { backgroundColor: theme.primary },
                slots.some((value) => !value) && styles.disabled,
              ]}
              disabled={slots.some((value) => !value)}
              onPress={submitSecret}
            >
              <Text style={[styles.primaryText, { color: theme.primaryText }]}>Bu sayı olsun</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {opponent && (
        <View style={styles.opponent}>
          <Avatar id={opponent.avatarId} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.opponentName}>{opponent.displayName}</Text>
            <Text style={styles.opponentSub}>
              {opponent.connected ? `${opponent.attempts} tahmin yaptı` : 'Bağlantısı koptu, bekleniyor...'}
            </Text>
          </View>
          <View style={styles.sideStats}>
            <Text style={styles.goldText}>{gold} altın</Text>
            {phase === 'playing' && yourTurn && secondsLeft !== null && (
              <Text style={[styles.timer, secondsLeft <= 10 && styles.timerLow]}>{secondsLeft} sn</Text>
            )}
          </View>
        </View>
      )}

      {phase === 'ended' && end ? (
        <View style={styles.result}>
          <Text style={[styles.title, { color: theme.text }]}>{won ? '🏆 Kazandın!' : 'Kaybettin'}</Text>
          <Text style={styles.sub}>{endText}</Text>
          {end.secret ? (
            <Text style={[styles.secret, { color: theme.digit.text }]}>
              {match?.mode === 'duel' ? 'Rakibinin sayısı' : 'Sayı'}: {end.secret}
            </Text>
          ) : null}
          <Text style={styles.sub}>
            Sen {end.attempts} · Rakip {end.opponentAttempts} tahmin
          </Text>
          {won && end.rewardGold ? <Text style={styles.reward}>+{end.rewardGold} Altın</Text> : null}
          <Pressable style={[styles.primary, { backgroundColor: theme.primary }]} onPress={playAgain}>
            <Text style={[styles.primaryText, { color: theme.primaryText }]}>Yeni rakip bul</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              setMode(null);
              setPhase('pick');
            }}
          >
            <Text style={styles.secondaryText}>Başka mod</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryText}>Ana ekran</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={[styles.turnBanner, !yourTurn && styles.turnBannerWait]}>
            {yourTurn
              ? match?.mode === 'duel'
                ? 'Sıra sende. Rakibinin sayısını tahmin et.'
                : 'Sıra sende'
              : 'Rakibin sırası. Tahminini bekle.'}
          </Text>
          <Text style={styles.keypadHint}>Olmayan bir rakamı işaretlemek için tuşa basılı tut. Emin olduğunu kilitle.</Text>
          <View style={styles.digits}>
            {Array.from({ length: digits }, (_, index) => (
              <View key={index} style={styles.digitBox}>
                <Pressable
                  style={[
                    styles.box,
                    { backgroundColor: theme.digit.background, borderColor: theme.digit.border },
                    activeIndex === index && { borderColor: theme.digit.activeBorder },
                    locks[index] && {
                      backgroundColor: theme.digit.lockedBackground,
                      borderColor: theme.digit.lockedBorder,
                    },
                  ]}
                  onPress={() => !locks[index] && setActiveIndex(index)}
                >
                  <Text style={[styles.boxText, { color: theme.digit.text }]}>{slots[index] ?? ''}</Text>
                </Pressable>
                <Pressable
                  style={[styles.lockButton, locks[index] && styles.lockButtonActive]}
                  onPress={() => toggleLock(index)}
                  disabled={!slots[index]}
                  accessibilityLabel={locks[index] ? 'Kilidi aç' : 'Rakamı kilitle'}
                >
                  <Text style={[styles.lockText, locks[index] && styles.lockTextActive]}>
                    {locks[index] ? '🔒' : '🔓'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.helpButtons}>
            <Pressable
              style={[styles.hintButton, (!yourTurn || gold < REVEAL_HINT_COST || hintBusy) && styles.disabled]}
              disabled={!yourTurn || gold < REVEAL_HINT_COST || hintBusy}
              onPress={() => useHint('reveal')}
            >
              <Text style={styles.hintButtonText}>Sayı Göster · {REVEAL_HINT_COST}</Text>
            </Pressable>
            <Pressable
              style={[styles.hintButton, (!yourTurn || gold < ELIMINATE_HINT_COST || hintBusy) && styles.disabled]}
              disabled={!yourTurn || gold < ELIMINATE_HINT_COST || hintBusy}
              onPress={() => useHint('eliminate')}
            >
              <Text style={styles.hintButtonText}>Sayı Sil · {ELIMINATE_HINT_COST}</Text>
            </Pressable>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.keypad}>
            {KEYS.map((key) => {
              const marked = eliminated.includes(key);
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.key,
                    { backgroundColor: theme.digit.background, borderColor: theme.digit.border },
                    slots.includes(key) && styles.keyUsed,
                    marked && styles.eliminatedKey,
                  ]}
                  onPress={() => press(key)}
                  onLongPress={() => toggleEliminated(key)}
                  delayLongPress={300}
                >
                  <Text
                    style={[
                      styles.keyText,
                      { color: theme.digit.text },
                      marked && styles.eliminatedKeyText,
                    ]}
                  >
                    {key}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable style={[styles.key, !yourTurn && styles.disabled]} onPress={backspace} disabled={!yourTurn}>
              <Text style={styles.keyText}>⌫</Text>
            </Pressable>
          </View>
          <Pressable
            style={[
              styles.primary,
              { backgroundColor: theme.primary },
              (!yourTurn || slots.some((value) => !value)) && styles.disabled,
            ]}
            disabled={!yourTurn || slots.some((value) => !value)}
            onPress={submit}
          >
            <Text style={[styles.primaryText, { color: theme.primaryText }]}>Tahmin et</Text>
          </Pressable>
          {attempts.map((attempt, index) => (
            <View key={attempts.length - index} style={styles.row}>
              <Text style={styles.rowIndex}>{attempts.length - index}.</Text>
              <Text style={[styles.rowGuess, { color: theme.digit.text }]}>{attempt.guess}</Text>
              <Text style={[styles.rowFeedback, { color: '#047857' }]}>+{attempt.feedback.plus}</Text>
              <Text style={[styles.rowFeedback, { color: '#dc2626' }]}>−{attempt.feedback.minus}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
    {won && <ConfettiBurst colors={effectColors} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  container: { padding: 20, gap: 14, flexGrow: 1 },
  bigIcon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  turnBanner: {
    backgroundColor: '#ecfdf5',
    color: '#047857',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 10,
  },
  turnBannerWait: { backgroundColor: '#f1f5f9', color: '#475569' },
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
  sideStats: { alignItems: 'flex-end' },
  goldText: { color: '#92400e', fontSize: 12, fontWeight: '800' },
  timer: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  timerLow: { color: '#dc2626' },
  helpButtons: { flexDirection: 'row', gap: 8 },
  hintButton: { flex: 1, backgroundColor: '#d97706', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  hintButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  keypadHint: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  digits: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, paddingTop: 8 },
  digitBox: { alignItems: 'center', position: 'relative' },
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
  boxLocked: { backgroundColor: '#dbeafe', borderColor: '#60a5fa' },
  boxText: { fontSize: 30, fontWeight: '800', color: '#1e3a8a' },
  lockButton: {
    position: 'absolute',
    top: -7,
    left: -7,
    width: 24,
    height: 24,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  lockButtonActive: { backgroundColor: '#1d4ed8' },
  lockText: { color: '#475569', fontSize: 12 },
  lockTextActive: { color: '#fff' },
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
  eliminatedKey: { backgroundColor: '#fee2e2', borderColor: '#fca5a5', opacity: 1 },
  eliminatedKeyText: { color: '#b91c1c', textDecorationLine: 'line-through' },
  modeButton: { alignSelf: 'stretch', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, gap: 4 },
  modeHint: { fontSize: 13, fontWeight: '600', textAlign: 'center', opacity: 0.9 },
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
