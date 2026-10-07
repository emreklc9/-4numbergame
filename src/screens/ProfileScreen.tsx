import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { useCustomization } from '../game/CustomizationProvider';
import { THEMES } from '../game/store';
import Avatar from '../profile/Avatar';
import { AVATARS } from '../profile/avatars';

export default function ProfileScreen() {
  const { user, updateProfile, signOut } = useAuth();
  const { gold, store } = useCustomization();
  const theme = THEMES[store?.equipped.theme ?? 'classic'];
  const [name, setName] = useState(user?.displayName ?? '');
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? AVATARS[0].id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const trimmed = name.trim();
  const changed = trimmed !== user?.displayName || avatarId !== user?.avatarId;
  const valid = trimmed.length >= 2 && trimmed.length <= 30;

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ displayName: trimmed, avatarId });
      setMessage({ text: 'Profil güncellendi', ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Kaydedilemedi', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert(
      'Çıkış yap',
      user?.isGuest
        ? 'Misafir hesabından çıkarsan bu hesaba, altınlarına ve rekorlarına bir daha erişemezsin.'
        : 'Hesabından çıkış yapılsın mı?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkış yap', style: 'destructive', onPress: () => signOut() },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Avatar id={avatarId} size={96} />
        <Text style={[styles.name, { color: theme.text }]}>{trimmed || 'İsimsiz'}</Text>
        <Text style={styles.sub}>
          {user?.isGuest ? 'Misafir hesabı' : (user?.email ?? 'Kayıtlı hesap')} · {gold} altın
        </Text>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Avatar</Text>
      <View style={styles.grid}>
        {AVATARS.map((avatar) => (
          <Pressable
            key={avatar.id}
            accessibilityLabel={`Avatar ${avatar.id}`}
            onPress={() => setAvatarId(avatar.id)}
            style={[styles.avatarCell, avatarId === avatar.id && { borderColor: theme.primary }]}
          >
            <Avatar id={avatar.id} size={56} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Kullanıcı adı</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        maxLength={30}
        autoCapitalize="words"
        placeholder="2-30 karakter"
      />
      {message && (
        <Text style={[styles.message, { color: message.ok ? '#047857' : '#dc2626' }]}>
          {message.text}
        </Text>
      )}
      <Pressable
        style={[styles.save, { backgroundColor: theme.primary }, (!changed || !valid || saving) && styles.disabled]}
        disabled={!changed || !valid || saving}
        onPress={save}
      >
        <Text style={[styles.saveText, { color: theme.primaryText }]}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Text>
      </Pressable>

      <Pressable style={styles.signOut} onPress={confirmSignOut}>
        <Text style={styles.signOutText}>Çıkış yap</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  header: { alignItems: 'center', gap: 6, marginBottom: 8 },
  name: { fontSize: 24, fontWeight: '800' },
  sub: { color: '#64748b', fontSize: 14 },
  label: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarCell: { padding: 4, borderRadius: 40, borderWidth: 3, borderColor: 'transparent' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  message: { fontWeight: '700', textAlign: 'center' },
  save: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveText: { fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  signOut: { alignItems: 'center', paddingVertical: 14, marginTop: 16 },
  signOutText: { color: '#dc2626', fontWeight: '800', fontSize: 16 },
});
