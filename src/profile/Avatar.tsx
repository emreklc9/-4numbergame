import { StyleSheet, Text, View } from 'react-native';
import { getAvatar } from './avatars';

export default function Avatar({ id, size = 40 }: { id: string | undefined; size?: number }) {
  const avatar = getAvatar(id);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.color },
      ]}
    >
      <Text style={{ fontSize: size * 0.55 }}>{avatar.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });
