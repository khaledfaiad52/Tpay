import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';
import { Text } from './Text';
import { Tappable } from './Tappable';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ink'
  | 'danger'
  /** White ground, deep-green label — a primary action on a dark screen. */
  | 'light'
  /** Outlined in white — a secondary action on a dark screen. */
  | 'ghostOnDark';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Stretches the button to fill its container. */
  block?: boolean;
  style?: ViewStyle;
  testID?: string;
};

const VARIANTS: Record<ButtonVariant, { container: ViewStyle; foreground: string }> = {
  primary: { container: { backgroundColor: colors.primary }, foreground: colors.onDark },
  secondary: {
    container: { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
    foreground: colors.ink,
  },
  ink: { container: { backgroundColor: colors.ink }, foreground: colors.onDark },
  danger: { container: { backgroundColor: colors.danger }, foreground: colors.onDark },
  light: { container: { backgroundColor: colors.surface }, foreground: colors.primaryDark },
  ghostOnDark: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    foreground: colors.onDark,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  block = false,
  style,
  testID,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
      style={StyleSheet.flatten([
        styles.button,
        palette.container,
        block && styles.block,
        (disabled || loading) && styles.disabled,
        style,
      ])}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={palette.foreground} /> : null}
        <Text variant="label" color={palette.foreground}>
          {label}
        </Text>
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  block: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
});
