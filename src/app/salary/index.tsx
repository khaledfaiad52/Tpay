import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { payrollCycleProgress } from '@/components/work';
import {
  AmountText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  FadeInUp,
  ListRow,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
  type BadgeTone,
} from '@/components/ui';
import { Icon } from '@/icons';
import { useRefreshOnFocus, useSalaryData } from '@/hooks';
import { colors, radius } from '@/theme';
import type { SalaryRecord, SalaryStatus, UpcomingSalary } from '@/types';
import { formatLongDate, formatShortDate } from '@/utils';

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

/**
 * Salary — the money side of employment.
 *
 * The relationship it makes visible is employer → TPay → wallet: what is
 * coming, when, and what has already landed.
 */
export default function SalaryScreen() {
  const salary = useSalaryData();
  useRefreshOnFocus(salary.reload);

  if (salary.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Salary" />
        <Skeleton height={230} cornerRadius={radius.sheet} />
        <Skeleton height={72} />
        <Skeleton height={220} />
      </Screen>
    );
  }

  if (salary.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Salary" />
        <ErrorState
          title="We couldn't load your salary"
          description="Check your connection and try again."
          onRetry={salary.reload}
        />
      </Screen>
    );
  }

  const { next, history } = salary.data;

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Salary" />

      {next ? (
        <FadeInUp>
          <NextSalaryPanel salary={next} latestPaidId={history[0]?.id} />
        </FadeInUp>
      ) : (
        <EmptyState
          title="No salary scheduled"
          description="When your employer schedules the next payroll run, it will appear here."
        />
      )}

      <Card tone="tinted" onPress={() => router.push('/requests')} style={styles.banner}>
        <View style={styles.bannerTile}>
          <Icon name="headset" size={18} color={colors.primary} />
        </View>
        <View style={styles.bannerBody}>
          <Text variant="label" color={colors.primaryDark}>
            Need a payslip or letter?
          </Text>
          <Text variant="captionSm" color={colors.primaryOnDarkSubtle}>
            Download payslips or request an employment letter
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.primary} />
      </Card>

      <View style={styles.section}>
        <SectionHeader
          title="Salary history"
          actionLabel="Payslips"
          actionTestID="salary-payslips"
          onActionPress={() => router.push('/salary/payslips')}
        />
        {history.length === 0 ? (
          <EmptyState
            title="No pay runs yet"
            description="Your first salary from this employer will show up here once it is paid."
          />
        ) : (
          <Card padded={false}>
            {history.map((record, index) => (
              <SalaryHistoryRow
                key={record.id}
                record={record}
                divided={index < history.length - 1}
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

function NextSalaryPanel({
  salary,
  latestPaidId,
}: {
  salary: UpcomingSalary;
  /** The most recent pay run, which is what a breakdown can actually show. */
  latestPaidId: string | undefined;
}) {
  const cycle = payrollCycleProgress(salary.cycleStartDate, salary.payDate);

  return (
    <Card style={styles.panel}>
      <View style={styles.panelHeader}>
        <Eyebrow label="Next salary" />
        <Badge label={STATUS_LABELS[salary.status]} tone={STATUS_TONES[salary.status]} />
      </View>

      <View style={styles.panelAmount}>
        <AmountText value={salary.netAmount} variant="balanceSm" />
        <Text variant="body" color={colors.inkMuted}>
          {`Expected ${formatLongDate(salary.payDate)} · ${salary.employerName}`}
        </Text>
      </View>

      <View style={styles.cycle}>
        <View style={styles.cycleRail}>
          <View style={[styles.cycleFill, { width: `${cycle.fraction * 100}%` }]} />
        </View>
        <View style={styles.cycleLabels}>
          <Text variant="captionSm" color={colors.inkMuted}>
            Payroll cycle open
          </Text>
          <Text variant="captionSm" color={colors.inkMuted}>
            {cycle.remainingLabel}
          </Text>
        </View>
      </View>

      {latestPaidId ? (
        <Button
          label="View salary breakdown"
          block
          style={styles.panelCta}
          testID="salary-breakdown"
          onPress={() => router.push({ pathname: '/salary/[id]', params: { id: latestPaidId } })}
        />
      ) : null}
    </Card>
  );
}

function SalaryHistoryRow({ record, divided }: { record: SalaryRecord; divided: boolean }) {
  const subtitle = record.note
    ? `Paid ${formatShortDate(record.paidAt)} · ${record.note}`
    : `Paid ${formatShortDate(record.paidAt)} · USD account`;

  return (
    <ListRow
      title={record.period}
      subtitle={subtitle}
      divided={divided}
      onPress={() => router.push({ pathname: '/salary/[id]', params: { id: record.id } })}
      trailing={<AmountText value={record.net} direction="credit" color={colors.success} />}
      style={styles.historyRow}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  panel: { borderRadius: radius.sheet, padding: 20, gap: 16 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelAmount: { gap: 4 },
  cycle: { gap: 9 },
  cycleRail: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  cycleFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  cycleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  panelCta: { borderRadius: radius.xl, paddingVertical: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: { flex: 1, gap: 3 },
  section: { gap: 10 },
  historyRow: { paddingVertical: 15, gap: 12 },
});
