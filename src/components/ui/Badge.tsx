import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'success' | 'pending' | 'danger' | 'onDark';

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

const TONES: Record<BadgeTone, { background: string; foreground: string }> = {
  neutral: { background: colors.surfaceMuted, foreground: colors.inkSecondary },
  success: { background: colors.primarySoft, foreground: colors.primary },
  pending: { background: colors.goldSoft, foreground: colors.goldText },
  danger: { background: colors.dangerSoft, foreground: colors.dangerText },
  onDark: { background: colors.primaryDeep, foreground: colors.successOnDark },
};

/** Status pill: 11/700, 5×9 padding, radius 8. */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text variant="badge" color={palette.foreground}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
});

export const badgeSpacing = spacing;
