import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useCustomization } from '../game/CustomizationProvider';
import { evaluateGuess, formatFeedback, type Feedback } from '../game/logic';
import { THEMES } from '../game/store';

const SECRET = '4273';
type Tone = 'idle' | 'plus' | 'minus' | 'none';
type Demo = {
  secretHidden: boolean;
  typed: string[];
  tones: Tone[];
  history: Array<{ guess: string; feedback: Feedback }>;
  won: boolean;
  locked: number | null;
  struck: string[];
};

const EMPTY: Demo = {
  secretHidden: true,
  typed: ['', '', '', ''],
  tones: ['idle', 'idle', 'idle', 'idle'],
  history: [],
  won: false,
  locked: null,
  struck: [],
};

const STEPS = [
  {
    title: 'Gizli sayıyı bul',
    text: 'Bilgisayar 4 rakamlı gizli bir sayı tutar. Rakamların hepsi birbirinden farklıdır ve ilk rakam 0 olamaz. Sen en az tahminle bulmaya çalışırsın.',
  },
  {
    title: 'Tahmin et, ipucu al',
    text: '+  doğru rakam, doğru yerde.\n−  doğru rakam, ama yanlış yerde.\nÖrnek: 1234 tahmininde 2 doğru yerde (+1), 3 ve 4 gizli sayıda var ama yerleri yanlış (−2). 1 gizli sayıda yok.',
  },
  {
    title: 'Adım adım daralt',
    text: 'Her sonuçtan yeni bir ipucu çıkar. Rakamları değiştirerek ve yerlerini deneyerek ilerle. +4 aldığında sayıyı buldun!',
  },
  {
    title: 'Yardımcı araçlar',
    text: '🔒 Emin olduğun rakamı kilitle, sonraki tahminde yerinde kalsın.\nBir tuşa basılı tut: gizli sayıda olmadığını düşündüğün rakamı çiz.\nAltınla "Sayı Göster" ve "Sayı Sil" ipuçları alabilirsin.',
  },
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function toneFor(guess: string): Tone[] {
  return [...guess].map((digit, i) =>
    digit === SECRET[i] ? 'plus' : SECRET.includes(digit) ? 'minus' : 'none',
  );
}

export default function HowToPlayScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'HowToPlay'>) {
  const { store } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(0);
  const [demo, setDemo] = useState<Demo>(EMPTY);
  const last = step === STEPS.length - 1;

  const patch = useCallback((changes: Partial<Demo>) => setDemo((current) => ({ ...current, ...changes })), []);

  // Her adımın animasyonu bir senaryo olarak sırayla oynar; adım değişince iptal edilir.
  useEffect(() => {
    let cancelled = false;
    const pause = async (ms: number) => {
      await wait(ms);
      if (cancelled) throw new Error('cancelled');
    };
    const typeGuess = async (guess: string) => {
      const typed = ['', '', '', ''];
      for (let i = 0; i < guess.length; i++) {
        typed[i] = guess[i];
        patch({ typed: [...typed], tones: ['idle', 'idle', 'idle', 'idle'] });
        await pause(420);
      }
    };

    (async () => {
      setDemo(EMPTY);
      await pause(500);
      if (step === 0) {
        await pause(900);
        patch({ secretHidden: false });
        await pause(1800);
        patch({ secretHidden: true });
      } else if (step === 1) {
        await typeGuess('1234');
        await pause(500);
        patch({ tones: toneFor('1234'), history: [{ guess: '1234', feedback: evaluateGuess(SECRET, '1234') }] });
      } else if (step === 2) {
        for (const guess of ['1234', '4231', '4273']) {
          await typeGuess(guess);
          await pause(400);
          const feedback = evaluateGuess(SECRET, guess);
          setDemo((current) => ({
            ...current,
            tones: toneFor(guess),
            history: [{ guess, feedback }, ...current.history],
            won: feedback.plus === SECRET.length,
          }));
          await pause(1300);
        }
      } else {
        await typeGuess('42');
        patch({ locked: 0 });
        await pause(900);
        patch({ struck: ['5'] });
        await pause(900);
        patch({ struck: ['5', '8'] });
      }
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [step, replay, patch]);

  const finish = () => navigation.goBack();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.top}>
        <View style={styles.dots}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, { backgroundColor: index === step ? theme.primary : '#cbd5e1' }]}
            />
          ))}
        </View>
        {!last && (
          <Pressable onPress={finish} hitSlop={12}>
            <Text style={styles.skip}>Atla</Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{STEPS[step].title}</Text>

      <Pressable style={styles.stage} onPress={() => setReplay((count) => count + 1)}>
        <View style={styles.boxes}>
          {demo.typed.map((digit, index) => (
            <DigitBox
              key={index}
              value={step === 0 && !demo.secretHidden ? SECRET[index] : step === 0 ? '?' : digit}
              tone={step === 0 ? (demo.secretHidden ? 'idle' : 'plus') : demo.tones[index]}
              locked={demo.locked === index}
            />
          ))}
        </View>
        {step === 0 && (
          <Text style={styles.caption}>{demo.secretHidden ? 'Gizli sayı' : 'Örnek: 4273'}</Text>
        )}
        {(step === 1 || step === 2) && (
          <View style={styles.history}>
            {demo.history.map((row, index) => (
              <View key={`${row.guess}-${index}`} style={styles.historyRow}>
                <Text style={styles.historyGuess}>{row.guess}</Text>
                <Text style={styles.historyFeedback}>{formatFeedback(row.feedback)}</Text>
              </View>
            ))}
            {demo.won && <Text style={styles.win}>🎉 Buldun!</Text>}
          </View>
        )}
        {step === 3 && (
          <View style={styles.keys}>
            {['3', '5', '8', '9'].map((key) => (
              <View key={key} style={[styles.key, demo.struck.includes(key) && styles.keyStruck]}>
                <Text style={[styles.keyText, demo.struck.includes(key) && styles.keyTextStruck]}>{key}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.replay}>Tekrar izlemek için dokun</Text>
      </Pressable>

      <Text style={[styles.text, { color: theme.text }]}>{STEPS[step].text}</Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.secondary, step === 0 && styles.hidden]}
          disabled={step === 0}
          onPress={() => setStep((current) => current - 1)}
        >
          <Text style={[styles.secondaryText, { color: theme.primary }]}>Geri</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, { backgroundColor: theme.primary }]}
          onPress={() => (last ? finish() : setStep((current) => current + 1))}
        >
          <Text style={[styles.primaryText, { color: theme.primaryText }]}>
            {last ? (route.params?.firstRun ? 'Oyuna başla' : 'Tamam') : 'İleri'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const TONE_STYLE = {
  idle: { backgroundColor: '#fff', borderColor: '#93c5fd' },
  plus: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  minus: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  none: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
} satisfies Record<Tone, object>;

function DigitBox({ value, tone, locked }: { value: string; tone: Tone; locked: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!value) return;
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [value, tone, scale]);

  return (
    <Animated.View style={[styles.box, TONE_STYLE[tone], { transform: [{ scale }] }]}>
      <Text style={styles.boxText}>{value}</Text>
      {locked && <Text style={styles.lock}>🔒</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  skip: { color: '#64748b', fontWeight: '700', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800' },
  stage: {
    minHeight: 250,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  boxes: { flexDirection: 'row', gap: 10 },
  box: { width: 58, height: 68, borderWidth: 2, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  boxText: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  lock: { position: 'absolute', bottom: -14, fontSize: 16 },
  caption: { color: '#64748b', fontWeight: '700' },
  history: { alignSelf: 'stretch', gap: 6 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyGuess: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: 4 },
  historyFeedback: { fontSize: 20, fontWeight: '800', color: '#2563eb' },
  win: { textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#16a34a' },
  keys: { flexDirection: 'row', gap: 10, marginTop: 14 },
  key: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  keyStruck: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  keyText: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  keyTextStruck: { color: '#dc2626', textDecorationLine: 'line-through' },
  replay: { color: '#94a3b8', fontSize: 12, marginTop: 'auto' },
  text: { fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 'auto', alignItems: 'center' },
  secondary: { paddingVertical: 14, paddingHorizontal: 20 },
  secondaryText: { fontSize: 16, fontWeight: '800' },
  hidden: { opacity: 0 },
  primary: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800' },
});
