import { useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Attempt = { guess: string; feedback: Feedback };

export default function GameScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Game'>) {
  const { digits } = route.params;
  const [secret, setSecret] = useState(() => generateSecret(digits));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const won = attempts.length > 0 && attempts[0].feedback.plus === digits;

  const submit = () => {
    const message = validateGuess(input, digits);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    const feedback = evaluateGuess(secret, input);
    setAttempts([{ guess: input, feedback }, ...attempts]);
    setInput('');
    if (feedback.plus === digits) addRecord(attempts.length + 1, digits);
  };

  const restart = () => {
    setSecret(generateSecret(digits));
    setAttempts([]);
    setInput('');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {won ? (
        <View style={styles.winBox}>
          <Text style={styles.winText}>🎉 {attempts.length} tahminde buldun!</Text>
          <Pressable style={styles.button} onPress={restart}>
            <Text style={styles.buttonText}>Yeni Oyun</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(t) => setInput(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={digits}
            placeholder={`${digits} basamaklı tahminin`}
            onSubmitEditing={submit}
          />
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
  container: { flex: 1, padding: 24, gap: 12 },
  input: {
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 8,
  },
  error: { color: '#dc2626', textAlign: 'center' },
  button: { padding: 14, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  winBox: { gap: 12 },
  winText: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  list: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#aaa',
  },
  rowIndex: { width: 40, color: '#777', fontSize: 18 },
  rowGuess: { flex: 1, fontSize: 20, fontWeight: '600', letterSpacing: 3 },
  rowFeedback: { fontSize: 20, fontWeight: '700' },
});
