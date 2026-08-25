import { StyleSheet, View } from 'react-native';

import { Tappable, Text } from '@/components/ui';
import { Icon } from '@/icons';
import { colors, radius, spacing } from '@/theme';

export type OpenWalletRowProps = {
  /** The currency being offered, e.g. "GBP". */
  currency: string;
  onPress: () => void;
};

/** Dashed prompt to open an additional currency wallet. */
export function OpenWalletRow({ currency, onPress }: OpenWalletRowProps) {
  return (
    <Tappable
      accessibilityRole="button"
      testID="open-currency-wallet"
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.disc}>
        <Icon name="plus" size={20} color={colors.inkMuted} />
      </View>
      <Text variant="rowTitle" color={colors.inkSecondary} style={styles.label}>
        {`Open a ${currency} wallet`}
      </Text>
      <Icon name="chevron-right" size={18} color={colors.inkFaint} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    padding: spacing.lg,
  },
  disc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
