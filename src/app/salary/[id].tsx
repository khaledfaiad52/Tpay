import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { DEDUCTION_COLORS, SalaryBreakdownBar } from '@/components/work';
import {
  AmountText,
  Button,
  Card,
  ErrorState,
  FadeInUp,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useSalaryRecord } from '@/hooks';
import { colors, radius, spacing } from '@/theme';
import type { SalaryLineItem, SalaryRecord } from '@/types';
import { formatLongDate, formatMoney, MINUS } from '@/utils';

/** Where a pay run's money went: gross in, deductions out, net to the wallet. */
export default function SalaryBreakdownScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const salary = useSalaryRecord(id);
  const { showToast } = useToast();

  if (salary.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Salary" />
        <Skeleton height={130} cornerRadius={radius.sheet} />
        <Skeleton height={10} cornerRadius={5} />
        <Skeleton height={310} />
      </Screen>
    );
  }

  if (salary.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Salary" />
        <ErrorState
          title="We couldn't load that pay run"
          description="Check your connection and try again."
          onRetry={salary.reload}
        />
      </Screen>
    );
  }

  const record = salary.data;

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title={`${record.period} salary`} />

      <FadeInUp>
        <Card tone="dark" style={styles.hero}>
          <Text variant="eyebrow" color={colors.primaryOnDarkMuted}>
            NET RECEIVED
          </Text>
          <AmountText value={record.net} variant="balanceSm" color={colors.onDark} />
          <Text variant="caption" color={colors.primaryOnDark}>
            {`Paid ${formatLongDate(record.paidAt)} to your TPay wallet`}
          </Text>
        </Card>
      </FadeInUp>

      <SalaryBreakdownBar
        netMinorUnits={record.net.minorUnits}
        deductions={record.deductions}
      />

      <Card padded={false}>
        <View style={[styles.row, styles.divided]}>
          <Text variant="label">Gross salary</Text>
          <AmountText value={record.gross} variant="amountSm" />
        </View>

        {record.additions
          .filter((item) => item.category === 'bonus')
          .map((item) => (
            <View key={item.label} style={[styles.row, styles.divided]}>
              <View style={styles.legendRow}>
                <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
                <Text variant="body" color={colors.inkMuted}>
                  {item.label}
                </Text>
              </View>
              <AmountText value={item.amount} variant="amountSm" direction="credit" />
            </View>
          ))}

        {record.deductions.map((item) => (
          <DeductionRow key={item.label} item={item} />
        ))}

        <View style={[styles.row, styles.total]}>
          <Text variant="rowTitleStrong">Net received</Text>
          <AmountText value={record.net} variant="headingSm" color={colors.primary} />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          label="View payslip"
          block
          style={styles.action}
          testID="salary-view-payslip"
          onPress={() => router.push('/salary/payslips')}
        />
        <Button
          label="Download PDF"
          variant="secondary"
          block
          style={styles.action}
          onPress={async () => {
            await Clipboard.setStringAsync(formatSalarySummary(record));
            showToast('Payslip summary copied — PDF export lands with document storage');
          }}
        />
      </View>
    </Screen>
  );
}

function DeductionRow({ item }: { item: SalaryLineItem }) {
  return (
    <View style={[styles.row, styles.divided]}>
      <View style={styles.legendRow}>
        <View style={[styles.swatch, { backgroundColor: DEDUCTION_COLORS[item.category] }]} />
        <Text variant="body" color={colors.inkMuted}>
          {item.label}
        </Text>
      </View>
      <Text variant="amountSm" numeric>
        {`${MINUS}${formatMoney(item.amount)}`}
      </Text>
    </View>
  );
}

/** Plain-text breakdown, for sharing until real payslip files exist. */
export function formatSalarySummary(record: SalaryRecord): string {
  return [
    `TPay salary · ${record.period}`,
    `Gross: ${formatMoney(record.gross)}`,
    ...record.deductions.map((item) => `${item.label}: ${MINUS}${formatMoney(item.amount)}`),
    `Net received: ${formatMoney(record.net)}`,
  ].join('\n');
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  hero: { borderRadius: radius.sheet, padding: 20, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
  },
  divided: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  swatch: { width: 8, height: 8, borderRadius: 3 },
  total: { backgroundColor: colors.canvas, paddingVertical: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, borderRadius: radius.xl, paddingVertical: 15 },
});
