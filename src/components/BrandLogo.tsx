import { StyleSheet, Text, View } from 'react-native';

type BrandLogoProps = {
  size: number;
};

export default function BrandLogo({ size }: BrandLogoProps) {
  const tileSize = (size - 14) / 2;

  return (
    <View style={[styles.logo, { width: size, height: size, borderRadius: size * 0.3 }]}>
      {['1', '2', '+', '−'].map((symbol) => (
        <View key={symbol} style={[styles.tile, { width: tileSize, height: tileSize }]}>
          <Text style={[styles.symbol, { fontSize: tileSize * 0.48 }]}>{symbol}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: '#0f172a',
    padding: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tile: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 6 },
  symbol: { color: '#fff', fontWeight: '800' },
});
