import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  evaluateGuess,
  formatFeedback,
  generateSecret,
  validateGuess,
  type Feedback,
} from '../game/logic';
import { addRecord } from '../game/records';
import { enqueueRecord, flushOutbox } from '../game/outbox';
import { gameApi } from '../game/serverGame';
import { ApiError } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import LoadingScreen from '../components/LoadingScreen';
import ConfettiBurst from '../components/ConfettiBurst';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useCustomization } from '../game/CustomizationProvider';
import { KEYPAD_SKINS, THEMES, WIN_EFFECTS } from '../game/store';

type Attempt = { guess: string; feedback: Feedback };

const REVEAL_HINT_COST = 1;
const ELIMINATE_HINT_COST = 1;

export default function GameScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { digits } = route.params;
  const [secret, setSecret] = useState(() => generateSecret(digits));
  const [input, setInput] = useState<string[]>(() => Array(digits).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lockedDigits, setLockedDigits] = useState<boolean[]>(() => Array(digits).fill(false));
  const [activeIndex, setActiveIndex] = useState(0);
  const [eliminatedDigits, setEliminatedDigits] = useState<string[]>([]);
  const [isUsingHelp, setIsUsingHelp] = useState(false);
  const helpRequestInFlight = useRef(false);
  const [serverGameId, setServerGameId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const { gold, store, earnGold, spendGold } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];
  const keypadSkin = KEYPAD_SKINS[store?.equipped.keypad ?? 'classic'];
  const effectColors = WIN_EFFECTS[store?.equipped.effect ?? 'confetti'];
  const won = attempts.length > 0 && attempts[0].feedback.plus === digits;
  const nextReward = Math.max(20 - attempts.length, 1);
  const goldReward = Math.max(21 - attempts.length, 1);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(timeout);
  }, []);

  // Sunucuda oyun açılabiliyorsa tahminler sunucuda doğrulanır; açılamazsa yerel (çevrimdışı) oyun oynanır.
  const openServerGame = useCallback(async () => {
    setSessionReady(false);
    try {
      const game = token ? await gameApi.create(token, digits) : null;
      setServerGameId(game?.id ?? null);
    } catch {
      setServerGameId(null);
    } finally {
      setSessionReady(true);
    }
  }, [token, digits]);

  useEffect(() => {
    openServerGame();
  }, [openServerGame]);

  const isOffline = sessionReady && serverGameId === null;

  useFocusEffect(
    useCallback(() => {
      const tabNavigation = navigation.getParent();
      tabNavigation?.setOptions({ tabBarStyle: { display: 'none' } });

      return () => {
        tabNavigation?.setOptions({
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: '#e2e8f0',
            height: 66,
          },
        });
      };
    }, [navigation, theme.background]),
  );

  const applyResult = (guess: string, feedback: Feedback, attemptCount: number) => {
    setAttempts((current) => [{ guess, feedback }, ...current]);
    setInput((current) => current.map((value, index) => (lockedDigits[index] ? value : '')));
    const firstUnlockedIndex = lockedDigits.findIndex((locked) => !locked);
    setActiveIndex(firstUnlockedIndex === -1 ? 0 : firstUnlockedIndex);
    if (feedback.plus === digits) {
      addRecord(attemptCount, digits);
      earnGold(Math.max(20 - (attemptCount - 1), 1));
    }
  };

  const submit = async () => {
    if (isSubmitting) return;
    const guess = input.join('');
    const message = validateGuess(guess, digits);
    if (message) {
      setError(message);
      return;
    }
    setError(null);

    if (serverGameId && token) {
      setIsSubmitting(true);
      try {
        const result = await gameApi.guess(token, serverGameId, guess);
        applyResult(guess, result.feedback, result.attempts);
        if (result.status === 'lost') {
          // Bitmiş sunucu oyunu üzerinde devam edilemez; yeni oyun açılır.
          restart();
          setError(`Deneme sınırına ulaştın. Sayı: ${result.secret}`);
        }
      } catch (caught) {
        setError(
          caught instanceof ApiError && caught.status === 0
            ? 'Bağlantı koptu. Tekrar dene.'
            : caught instanceof Error
              ? caught.message
              : 'Tahmin gönderilemedi',
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const feedback = evaluateGuess(secret, guess);
    applyResult(guess, feedback, attempts.length + 1);
    if (feedback.plus === digits) {
      // Çevrimdışı rekor cihazda biriktirilir; bağlantı olunca doğrulanmamış olarak toplu gönderilir.
      enqueueRecord(attempts.length + 1, digits).then(() => {
        if (token) flushOutbox(token);
      });
    }
  };

  const nextUnlockedIndex = (startIndex: number, locks = lockedDigits): number => {
    for (let index = startIndex + 1; index < digits; index++) {
      if (!locks[index]) return index;
    }
    return startIndex;
  };

  const enterDigit = (digit: string) => {
    if (lockedDigits[activeIndex]) return;

    setInput((current) =>
      current.map((value, index) => (index === activeIndex ? digit : value)),
    );
    setActiveIndex(nextUnlockedIndex(activeIndex));
  };

  const toggleLock = (index: number) => {
    if (!input[index]) return;

    const nextLocks = lockedDigits.map((locked, lockIndex) =>
      lockIndex === index ? !locked : locked,
    );
    setLockedDigits(nextLocks);
    if (nextLocks[index] && activeIndex === index) setActiveIndex(nextUnlockedIndex(index, nextLocks));
  };

  const toggleEliminatedDigit = (digit: string) => {
    setEliminatedDigits((current) =>
      current.includes(digit) ? current.filter((item) => item !== digit) : [...current, digit],
    );
  };

  const useRevealHint = async () => {
    if (helpRequestInFlight.current) return;

    const availableIndexes = lockedDigits
      .map((locked, index) => (locked ? -1 : index))
      .filter((index) => index !== -1);
    if (availableIndexes.length === 0) {
      setError('Açılabilecek bir hane kalmadı');
      return;
    }

    helpRequestInFlight.current = true;
    setIsUsingHelp(true);
    try {
      await spendGold(REVEAL_HINT_COST);
      let hintIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
      let hintDigit = secret[hintIndex];
      if (serverGameId && token) {
        try {
          const hint = await gameApi.hint(token, serverGameId, 'reveal');
          if (hint.type !== 'reveal') throw new Error('Beklenmeyen ipucu yanıtı');
          hintIndex = hint.index;
          hintDigit = hint.digit;
        } catch (hintError) {
          await earnGold(REVEAL_HINT_COST);
          throw hintError;
        }
      }
      setInput((current) =>
        current.map((value, index) => (index === hintIndex ? hintDigit : value)),
      );
      setLockedDigits((current) =>
        current.map((locked, index) => (index === hintIndex ? true : locked)),
      );
      setActiveIndex(nextUnlockedIndex(hintIndex));
      setError(null);
    } catch (hintError) {
      setError(hintError instanceof Error ? hintError.message : 'İpucu kullanılamadı');
    } finally {
      helpRequestInFlight.current = false;
      setIsUsingHelp(false);
    }
  };

  const useEliminateHint = async () => {
    if (helpRequestInFlight.current) return;

    const candidates = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].filter(
      (digit) => !secret.includes(digit) && !eliminatedDigits.includes(digit),
    );
    if (candidates.length === 0) {
      setError('İşaretlenecek rakam kalmadı');
      return;
    }

    helpRequestInFlight.current = true;
    setIsUsingHelp(true);
    try {
      await spendGold(ELIMINATE_HINT_COST);
      let digit = candidates[Math.floor(Math.random() * candidates.length)];
      if (serverGameId && token) {
        try {
          const hint = await gameApi.hint(token, serverGameId, 'eliminate');
          if (hint.type !== 'eliminate') throw new Error('Beklenmeyen ipucu yanıtı');
          digit = hint.digit;
        } catch (hintError) {
          await earnGold(ELIMINATE_HINT_COST);
          throw hintError;
        }
      }
      setEliminatedDigits((current) => (current.includes(digit) ? current : [...current, digit]));
      setError(null);
    } catch (hintError) {
      setError(hintError instanceof Error ? hintError.message : 'İpucu kullanılamadı');
    } finally {
      helpRequestInFlight.current = false;
      setIsUsingHelp(false);
    }
  };

  const restart = () => {
    setSecret(generateSecret(digits));
    setAttempts([]);
    setInput(Array(digits).fill(''));
    setLockedDigits(Array(digits).fill(false));
    setActiveIndex(0);
    setEliminatedDigits([]);
    setError(null);
    openServerGame();
  };

  if (isLoading || !sessionReady) {
    return <LoadingScreen message={`${digits} basamaklı oyun hazırlanıyor`} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.goldBalance}>
        <Text style={styles.goldBalanceText}>{gold} Altın</Text>
      </View>
      {won && <ConfettiBurst colors={effectColors} />}
      {won ? (
        <View style={styles.winBox}>
          <Text style={styles.winText}>🎉 {attempts.length} tahminde buldun!</Text>
          <View style={styles.reward}>
            <Text style={styles.rewardAmount}>+{goldReward} Altın</Text>
            <Text style={styles.rewardDescription}>Başarılı tahmin ödülün</Text>
          </View>
          <Pressable style={styles.button} onPress={restart}>
            <Text style={styles.buttonText}>Yeni Oyun</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.instruction}>{digits} basamaklı tahminini gir</Text>
          {isOffline && (
            <Text style={styles.offlineNote}>Çevrimdışı mod · rekorun bağlantı gelince gönderilecek</Text>
          )}
          <Text style={styles.rewardPreview}>Bu turu kazanırsan {nextReward} altın</Text>
          <Text style={styles.keypadHint}>Olmayan bir rakamı işaretlemek için tuşa basılı tut</Text>
          <View style={styles.helpPanel}>
            <Text style={styles.helpTitle}>Yardımlar</Text>
            <View style={styles.helpButtons}>
              <Pressable
                style={[styles.hintButton, gold < REVEAL_HINT_COST && styles.disabledHintButton]}
                onPress={useRevealHint}
                disabled={gold < REVEAL_HINT_COST || isUsingHelp}
              >
                <Text style={styles.hintButtonText}>Sayı Göster · {REVEAL_HINT_COST}</Text>
              </Pressable>
              <Pressable
                style={[styles.hintButton, gold < ELIMINATE_HINT_COST && styles.disabledHintButton]}
                onPress={useEliminateHint}
                disabled={gold < ELIMINATE_HINT_COST || isUsingHelp}
              >
                <Text style={styles.hintButtonText}>Sayı Sil · {ELIMINATE_HINT_COST}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.digitInputs}>
            {input.map((value, index) => (
              <View key={index} style={styles.digitBox}>
                <Pressable
                  style={[
                    styles.input,
                    activeIndex === index && styles.activeInput,
                    lockedDigits[index] && styles.lockedInput,
                  ]}
                  onPress={() => !lockedDigits[index] && setActiveIndex(index)}
                >
                  <Text style={styles.inputText}>{value}</Text>
                </Pressable>
                <Pressable
                  style={[styles.lockButton, lockedDigits[index] && styles.lockButtonActive]}
                  onPress={() => toggleLock(index)}
                  disabled={!value}
                  accessibilityLabel={lockedDigits[index] ? 'Kilidi aç' : 'Rakamı kilitle'}
                >
                  <Text style={[styles.lockText, lockedDigits[index] && styles.lockTextActive]}>
                    {lockedDigits[index] ? '🔒' : '🔓'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.keypad}>
            {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
              <Pressable
                key={key}
                style={[
                  styles.key,
                  { backgroundColor: keypadSkin.background, borderColor: keypadSkin.border },
                  eliminatedDigits.includes(key) && styles.eliminatedKey,
                ]}
                onPress={() => enterDigit(key)}
                onLongPress={() => toggleEliminatedDigit(key)}
                delayLongPress={300}
              >
                <Text
                  style={[
                    styles.keyText,
                    { color: keypadSkin.text },
                    eliminatedDigits.includes(key) && styles.eliminatedKeyText,
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={[styles.button, isSubmitting && { opacity: 0.6 }]} onPress={submit} disabled={isSubmitting}>
            <Text style={styles.buttonText}>Tahmin Et</Text>
          </Pressable>
        </>
      )}
      <FlatList
        style={styles.list}
        data={attempts}
        keyExtractor={(_, i) => String(attempts.length - i)}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rowIndex}>{attempts.length - index}.</Text>
            <Text style={styles.rowGuess}>{item.guess}</Text>
            <Text style={styles.rowFeedback}>{formatFeedback(item.feedback)}</Text>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  offlineNote: { color: '#b45309', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  container: { flex: 1, padding: 24, gap: 14, backgroundColor: '#f8fafc' },
  goldBalance: {
    alignSelf: 'flex-end',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goldBalanceText: { color: '#92400e', fontSize: 14, fontWeight: '800' },
  instruction: { color: '#475569', fontSize: 17, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  digitInputs: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  digitBox: { alignItems: 'center', position: 'relative' },
  input: {
    width: 54,
    height: 64,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#fff',
    borderRadius: 14,
    fontSize: 30,
    fontWeight: '800',
    color: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInput: { borderWidth: 2, borderColor: '#2563eb' },
  lockedInput: { backgroundColor: '#dbeafe', borderColor: '#60a5fa' },
  inputText: { color: '#1e3a8a', fontSize: 30, fontWeight: '800' },
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
  keyText: { color: '#1e293b', fontSize: 20, fontWeight: '800' },
  eliminatedKey: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  eliminatedKeyText: { color: '#b91c1c' },
  error: { color: '#dc2626', textAlign: 'center' },
  rewardPreview: { color: '#b45309', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: -8 },
  keypadHint: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: -8 },
  helpPanel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  helpTitle: { color: '#334155', fontSize: 14, fontWeight: '800' },
  helpButtons: { flexDirection: 'row', gap: 8 },
  hintButton: {
    flex: 1,
    borderRadius: 99,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  disabledHintButton: { backgroundColor: '#cbd5e1' },
  hintButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  button: { padding: 16, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  winBox: { gap: 12 },
  winText: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  reward: {
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  rewardAmount: { color: '#b45309', fontSize: 25, fontWeight: '800' },
  rewardDescription: { color: '#92400e', fontSize: 14, marginTop: 3 },
  list: { marginTop: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#aaa',
  },
  rowIndex: { width: 40, color: '#64748b', fontSize: 18 },
  rowGuess: { flex: 1, color: '#1e293b', fontSize: 20, fontWeight: '600', letterSpacing: 3 },
  rowFeedback: { color: '#1d4ed8', fontSize: 20, fontWeight: '700' },
});
