import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useEffect, useMemo } from 'react';

const COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export default function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        color: COLORS[index % COLORS.length],
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        rotation: new Animated.Value(0),
        opacity: new Animated.Value(1),
        destinationX: Math.round(Math.random() * 320 - 160),
        destinationY: Math.round(Math.random() * 320 + 100),
        spin: Math.round(Math.random() * 720 - 360),
      })),
    [],
  );

  useEffect(() => {
    Animated.parallel(
      particles.flatMap((particle) => [
        Animated.timing(particle.x, {
          toValue: particle.destinationX,
          duration: 950,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: particle.destinationY,
          duration: 950,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: particle.spin,
          duration: 950,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          delay: 600,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [particles]);

  return (
    <View pointerEvents="none" style={styles.container}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              backgroundColor: particle.color,
              opacity: particle.opacity,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ['-360deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    paddingTop: 80,
    overflow: 'hidden',
  },
  particle: { position: 'absolute', width: 9, height: 14, borderRadius: 2 },
});
