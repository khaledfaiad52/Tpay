import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, radius } from '@/theme';

export type SkeletonProps = {
  height: number;
  width?: ViewStyle['width'];
  cornerRadius?: number;
  style?: ViewStyle;
};

/** Width of the travelling highlight, matching the design's 240px sweep. */
const SWEEP = 240;
const DURATION = 1200;

/**
 * Shimmering placeholder block — the `tShimmer` animation from the design,
 * rebuilt with a translating gradient.
 */
export function Skeleton({ height, width = '100%', cornerRadius = radius.card, style }: SkeletonProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  // Created once, lazily — a ref would be read during render.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-SWEEP, trackWidth || SWEEP],
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { height, width, borderRadius: cornerRadius }, style]}
    >
      <Animated.View style={[styles.sweep, { transform: [{ translateX }] }]}>
        <Svg width={SWEEP} height={height}>
          <Defs>
            <LinearGradient id="tShimmer" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.surfaceSunken} stopOpacity={0} />
              <Stop offset="0.5" stopColor={colors.canvas} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.surfaceSunken} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={SWEEP} height={height} fill="url(#tShimmer)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  sweep: { position: 'absolute', top: 0, bottom: 0, width: SWEEP },
});
