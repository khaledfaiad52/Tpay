import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { CardSpending } from '@/types';
import { formatMoney, percentageOf } from '@/utils';

export type SpendMeterProps = {
  spending: CardSpending;
  testID?: string;
};

/**
 * Month-to-date card spend against its monthly limit.
 *
 * The limit caps the card, not the wallet — the balance underneath is the one
 * shared balance every other TPay surface shows.
 */
export function SpendMeter({ spending, testID }: SpendMeterProps) {
  const used = percentageOf(spending.monthToDate.minorUnits, spending.monthlyLimit.minorUnits);
  const remaining = Math.max(
    spending.monthlyLimit.minorUnits - spending.monthToDate.minorUnits,
    0,
  );
  const overLimit = used >= 100;

  return (
    <View style={styles.block} testID={testID}>
      <View style={styles.header}>
        <Text variant="caption" color={colors.inkMuted}>
          Spent this month
        </Text>
        <Text variant="amountMd" numeric testID="card-spend-mtd">
          {formatMoney(spending.monthToDate)}
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { flex: Math.max(used, 1), backgroundColor: overLimit ? colors.danger : colors.primary },
          ]}
        />
        <View style={[styles.rest, { flex: Math.max(100 - used, 0) }]} />
      </View>

      <View style={styles.header}>
        <Text variant="captionSm" color={colors.inkMuted} numeric>
          {`${formatMoney(spending.monthlyLimit)} monthly limit`}
        </Text>
        <Text variant="captionSm" color={overLimit ? colors.danger : colors.inkMuted} numeric>
          {overLimit
            ? 'Limit reached'
            : `${formatMoney({ ...spending.monthlyLimit, minorUnits: remaining })} left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 9, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  fill: { height: 10 },
  rest: { height: 10, backgroundColor: colors.surfaceSunken },
});
