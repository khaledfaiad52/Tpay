import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { DocumentThumbnail } from '@/components/work';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  FadeInUp,
  ListRow,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { usePayslips } from '@/hooks';
import { colors } from '@/theme';
import type { Payslip } from '@/types';
import { formatMoney, formatShortDate } from '@/utils';

/** Every payslip TPay holds, newest first. */
export default function PayslipsScreen() {
  const payslips = usePayslips();
  const { showToast } = useToast();

  const share = async (payslip: Payslip, action: 'Downloaded' | 'Shared') => {
    await Clipboard.setStringAsync(
      `TPay payslip · ${payslip.period}\nNet ${formatMoney(payslip.net)}\nIssued ${payslip.issuedAt}`,
    );
    showToast(`${action} — payslip summary copied to your clipboard`);
  };

  if (payslips.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Payslips" />
        <Skeleton height={170} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (payslips.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Payslips" />
        <ErrorState
          title="We couldn't load your payslips"
          description="Check your connection and try again."
          onRetry={payslips.reload}
        />
      </Screen>
    );
  }

  const [latest, ...earlier] = payslips.data;

  if (!latest) {
    return (
      <Screen>
        <ScreenHeader title="Payslips" />
        <EmptyState
          title="No payslips yet"
          description="Payslips appear here after your first pay run with this employer."
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Payslips" />

      <FadeInUp>
        <Card style={styles.latest} testID="payslip-latest">
          <View style={styles.latestHeader}>
            <DocumentThumbnail width={44} height={56} />
            <View style={styles.latestBody}>
              <Text variant="sectionTitle">{latest.period}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {`Net ${formatMoney(latest.net)} · issued ${formatShortDate(latest.issuedAt)}`}
              </Text>
              {latest.verified ? (
                <Text variant="badge" color={colors.success}>
                  Verified by TPay
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.latestActions}>
            <Button
              label="View"
              block
              style={styles.latestAction}
              testID="payslip-view"
              onPress={() =>
                router.push({ pathname: '/salary/[id]', params: { id: latest.salaryId } })
              }
            />
            <Button
              label="Download"
              variant="secondary"
              block
              style={styles.latestAction}
              onPress={() => share(latest, 'Downloaded')}
            />
            <Button
              label="Share"
              variant="secondary"
              block
              style={styles.latestAction}
              onPress={() => share(latest, 'Shared')}
            />
          </View>
        </Card>
      </FadeInUp>

      {earlier.length > 0 ? (
        <>
          <Eyebrow label="Earlier" />
          <Card padded={false}>
            {earlier.map((payslip, index) => (
              <ListRow
                key={payslip.id}
                title={payslip.period}
                subtitle={`Net ${formatMoney(payslip.net)}`}
                divided={index < earlier.length - 1}
                onPress={() =>
                  router.push({ pathname: '/salary/[id]', params: { id: payslip.salaryId } })
                }
                trailing={
                  <Text variant="badge" color={colors.primary}>
                    PDF
                  </Text>
                }
                style={styles.earlierRow}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  latest: { gap: 14 },
  latestHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  latestBody: { flex: 1, gap: 4 },
  latestActions: { flexDirection: 'row', gap: 8 },
  latestAction: { flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 4 },
  earlierRow: { paddingVertical: 15, gap: 12 },
});
