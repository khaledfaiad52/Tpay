import { useEffect, useState } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';

export type FadeInUpProps = {
  children: React.ReactNode;
  /** Stagger offset in milliseconds — sections enter one after another. */
  delay?: number;
  style?: ViewStyle;
};

/** The design's `tRise`: 10pt up-shift with a fade, 220ms ease-out. */
export function FadeInUp({ children, delay = 0, style }: FadeInUpProps) {
  // Created once, lazily — a ref would be read during render.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
