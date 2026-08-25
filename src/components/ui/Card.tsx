import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Tappable } from './Tappable';

export type CardProps = ViewProps & {
  /** Renders the card as a button when supplied. */
  onPress?: () => void;
  /** `plain` white surface, `tinted` primary-soft, `dark` deep green, `ink` near-black. */
  tone?: CardTone;
  padded?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
};

export type CardTone = 'plain' | 'tinted' | 'dark' | 'ink' | 'gold' | 'danger';

const TONES: Record<CardTone, ViewStyle> = {
  plain: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tinted: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
  },
  dark: { backgroundColor: colors.primaryDark },
  ink: { backgroundColor: colors.ink },
  gold: { backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.goldSoftBorder },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerSoftBorder,
  },
};

/** The product's surface primitive: radius 20, 1px border, 16pt padding. */
export function Card({ onPress, tone = 'plain', padded = true, style, children, ...rest }: CardProps) {
  const composed = StyleSheet.flatten([
    styles.base,
    TONES[tone],
    padded && styles.padded,
    style,
  ]) as ViewStyle;

  if (onPress) {
    return (
      <Tappable accessibilityRole="button" onPress={onPress} style={composed} {...rest}>
        {children}
      </Tappable>
    );
  }
  return (
    <View style={composed} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.card, overflow: 'hidden' },
  padded: { padding: spacing.lg },
});
