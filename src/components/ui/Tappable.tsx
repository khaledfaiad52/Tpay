import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

export type TappableProps = Omit<PressableProps, 'style'> & {
  style?: ViewStyle | ViewStyle[];
  /** Opacity applied while the finger is down. */
  pressedOpacity?: number;
};

/**
 * Standard press affordance: a quiet dim, no ripple, and a 44pt minimum touch
 * target enforced by the caller's layout.
 */
export function Tappable({ style, pressedOpacity = 0.72, children, ...rest }: TappableProps) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        StyleSheet.flatten(style),
        pressed && !rest.disabled && { opacity: pressedOpacity },
      ]}
    >
      {children}
    </Pressable>
  );
}
