import { StyleSheet, View } from 'react-native';

import { CurrencyDisc } from '@/components/money';
import { Tappable, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';
import type { Account } from '@/types';
import { formatMoney } from '@/utils';

export type SourceAccountRowProps = {
  account: Account;
  onChange: () => void;
  divided?: boolean;
};

/** "Pay from USD account · $8,250.00 available · Change". */
export function SourceAccountRow({ account, onChange, divided = true }: SourceAccountRowProps) {
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`Pay from ${account.name}. Change source account.`}
      testID="send-source-account"
      onPress={onChange}
      style={StyleSheet.flatten([styles.row, divided && styles.divided])}
    >
      <CurrencyDisc currency={account.currency} size={36} />
      <View style={styles.body}>
        <Text variant="label">{`Pay from ${account.name}`}</Text>
        <Text variant="captionSm" color={colors.inkMuted} numeric>
          {`${formatMoney(account.balance)} available`}
        </Text>
      </View>
      <Text variant="action" color={colors.primary}>
        Change
      </Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  body: { flex: 1, gap: 2 },
});
