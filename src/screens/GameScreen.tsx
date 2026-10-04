import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  evaluateGuess,
  formatFeedback,
  generateSecret,
  validateGuess,
  type Feedback,
} from '../game/logic';
import { addRecord } from '../game/records';
import { addGold, getGold } from '../game/gold';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Attempt = { guess: string; feedback: Feedback };

export default function GameScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { digits } = route.params;
  const [secret, setSecret] = useState(() => generateSecret(digits));
  const [input, setInput] = useState<string[]>(() => Array(digits).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [gold, setGold] = useState(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const won = attempts.length > 0 && attempts[0].feedback.plus === digits;
  const nextReward = Math.max(20 - attempts.length, 1);
  const goldReward = Math.max(21 - attempts.length, 1);

  useEffect(() => {
    getGold().then(setGold);
  }, []);

  const submit = () => {
    const guess = input.join('');
    const message = validateGuess(guess, digits);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    const feedback = evaluateGuess(secret, guess);
    setAttempts([{ guess, feedback }, ...attempts]);
    setInput(Array(digits).fill(''));
    requestAnimationFrame(() => inputRefs.current[0]?.focus());
    if (feedback.plus === digits) {
      addRecord(attempts.length + 1, digits);
      addGold(nextReward).then(setGold);
    }
  };

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setInput((current) => current.map((item, itemIndex) => (itemIndex === index ? digit : item)));
    if (digit && index < digits - 1) inputRefs.current[index + 1]?.focus();
  };

  const restart = () => {
    setSecret(generateSecret(digits));
    setAttempts([]);
    setInput(Array(digits).fill(''));
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.goldBalance}>
        <Text style={styles.goldBalanceText}>{gold} Altın</Text>
      </View>
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
          <Text style={styles.rewardPreview}>Bu turu kazanırsan {nextReward} altın</Text>
          <View style={styles.digitInputs}>
            {input.map((value, index) => (
              <TextInput
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                style={styles.input}
                value={value}
                onChangeText={(text) => setDigit(index, text)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && !value && index > 0) {
                    inputRefs.current[index - 1]?.focus();
                  }
                }}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                onSubmitEditing={submit}
              />
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.button} onPress={submit}>
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
  digitInputs: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
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
    textAlign: 'center',
  },
  error: { color: '#dc2626', textAlign: 'center' },
  rewardPreview: { color: '#b45309', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: -8 },
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
