import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../auth/AuthProvider';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { signInAsGuest, signInWithEmail, registerWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      setError('Geçerli bir e-posta ve en az 6 karakterli şifre gir');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    run(() =>
      mode === 'login'
        ? signInWithEmail(normalizedEmail, password)
        : registerWithEmail(normalizedEmail, password),
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <BrandLogo size={72} />
          <Text style={styles.title}>Sayı Avı</Text>
          <Text style={styles.subtitle}>Rekorlarını kaydetmek için giriş yap veya misafir olarak başla.</Text>
        </View>

        <Pressable
          style={[styles.primaryButton, busy && styles.disabled]}
          onPress={() => run(signInAsGuest)}
          disabled={busy}
        >
          <Text style={styles.primaryText}>Misafir olarak devam et</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>veya e-posta ile</Text>
          <View style={styles.line} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          placeholder={mode === 'register' ? 'Şifre (en az 6 karakter)' : 'Şifre'}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          onSubmitEditing={mode === 'login' ? submit : undefined}
        />
        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Şifre (tekrar)"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={confirm}
            onChangeText={setConfirm}
            editable={!busy}
            onSubmitEditing={submit}
          />
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.secondaryButton, busy && styles.disabled]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.secondaryText}>{mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setConfirm('');
            setError(null);
          }}
          disabled={busy}
        >
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 },
  hero: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '800', color: '#0f172a', marginTop: 16 },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#64748b', textAlign: 'center', marginTop: 8 },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#cbd5e1' },
  dividerText: { color: '#94a3b8', fontSize: 13 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  error: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#2563eb', fontSize: 16, fontWeight: '800' },
  switchText: { color: '#475569', textAlign: 'center', fontSize: 14, marginTop: 4 },
  disabled: { opacity: 0.6 },
});
