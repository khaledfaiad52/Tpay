import { StyleSheet, View } from 'react-native';

import { AmountText, Badge, Card, IconTile, Text } from '@/components/ui';
import { colors } from '@/theme';
import type { BadgeTone } from '@/components/ui';
import type { SalaryStatus, UpcomingSalary } from '@/types';
import { formatShortDate } from '@/utils';

export type NextSalaryCardProps = {
  salary: UpcomingSalary;
  onPress: () => void;
};

const STATUS_LABELS: Record<SalaryStatus, string> = {
  scheduled: 'Scheduled',
  processing: 'Processing',
  paid: 'Paid',
  delayed: 'Delayed',
};

const STATUS_TONES: Record<SalaryStatus, BadgeTone> = {
  scheduled: 'pending',
  processing: 'pending',
  paid: 'success',
  delayed: 'danger',
};

/** "Next salary · Acme Technologies — $4,500.00 · Aug 31 · Scheduled". */
export function NextSalaryCard({ salary, onPress }: NextSalaryCardProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <IconTile name="banknote" tone="gold" size={44} />
      <View style={styles.body}>
        <Text variant="action" color={colors.inkMuted}>
          {`Next salary · ${salary.employerName}`}
        </Text>
        <View style={styles.amountRow}>
          <AmountText value={salary.netAmount} variant="amountLg" />
          <Text variant="caption" color={colors.inkMuted} numeric>
            {formatShortDate(salary.payDate)}
          </Text>
        </View>
      </View>
      <Badge label={STATUS_LABELS[salary.status]} tone={STATUS_TONES[salary.status]} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  body: { flex: 1, gap: 3 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
