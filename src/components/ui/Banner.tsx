import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Text } from './Text';

export type BannerProps = {
  children: string;
};

/** Quiet informational note in the brand tint. */
export function Banner({ children }: BannerProps) {
  return (
    <View style={styles.banner}>
      <Text variant="caption" color={colors.primaryDark} style={styles.copy}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    padding: spacing.lg - 2,
  },
  copy: { lineHeight: 18 },
});
