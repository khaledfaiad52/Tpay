import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/navigation';
import { DocumentThumbnail } from '@/components/work';
import {
  Button,
  Card,
  DetailRow,
  ErrorState,
  FadeInUp,
  ListRow,
  Screen,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useBenefit } from '@/hooks';
import { services } from '@/services';
import { colors, radius } from '@/theme';
import type { Benefit } from '@/types';
import { formatLongDate, formatMoney } from '@/utils';

/** One benefit in full: the card, what it covers, and its paperwork. */
export default function BenefitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const benefit = useBenefit(id);
  const { showToast } = useToast();

  if (benefit.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Benefit" />
        <Skeleton height={170} cornerRadius={radius.sheet} />
        <Skeleton height={260} />
      </Screen>
    );
  }

  if (benefit.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Benefit" />
        <ErrorState
          title="We couldn't load this benefit"
          description="Check your connection and try again."
          onRetry={benefit.reload}
        />
      </Screen>
    );
  }

  const data = benefit.data;
  const unavailable = data.status === 'not-eligible' || data.status === 'inactive';

  const openPolicy = async (documentId: string) => {
    try {
      const opened = await services.documents.openDocument(documentId);
      await Clipboard.setStringAsync(opened.shareText);
      showToast('Policy summary copied — the file opens once document storage lands');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "That document isn't ready");
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title={data.name} />

      {unavailable ? (
        <Card tone="gold" testID="benefit-unavailable">
          <Text variant="label" color={colors.warningText}>
            Not available yet
          </Text>
          <Text variant="caption" color={colors.warningTextSoft} style={styles.reason}>
            {data.unavailableReason ?? data.summary}
          </Text>
        </Card>
      ) : null}

      {data.coverage ? (
        <FadeInUp>
          <Card tone="dark" style={styles.card} testID="benefit-coverage">
            <View style={styles.cardHeader}>
              <Text variant="eyebrow" color={colors.primaryOnDarkMuted}>
                {data.provider.toUpperCase()}
              </Text>
              <View style={styles.cardBadge}>
                <Text variant="badge" color={colors.successOnDark}>
                  {data.statusLabel ?? 'Active'}
                </Text>
              </View>
            </View>
            <Text variant="displayXs" color={colors.onDark}>
              {data.coverage.memberName}
            </Text>
            <View style={styles.cardFooter}>
              <CardField label="MEMBER ID" value={data.coverage.memberId} />
              <CardField label="VALID UNTIL" value={formatLongDate(data.coverage.validUntil)} />
            </View>
          </Card>
        </FadeInUp>
      ) : null}

      {data.allowance ? (
        <Card testID="benefit-allowance" style={styles.allowance}>
          <Text variant="caption" color={colors.inkMuted}>
            {`Remaining ${data.allowance.periodLabel}`}
          </Text>
          <Text variant="balanceMd" numeric>
            {formatMoney(data.allowance.remaining)}
          </Text>
          <View style={styles.allowanceRail}>
            <View
              style={[
                styles.allowanceFill,
                {
                  width: `${
                    (data.allowance.remaining.minorUnits / data.allowance.total.minorUnits) * 100
                  }%`,
                },
              ]}
            />
          </View>
          <Text variant="captionSm" color={colors.inkMuted}>
            {`of ${formatMoney(data.allowance.total)} allowed`}
          </Text>
        </Card>
      ) : null}

      <Card padded={false}>
        {data.coverage ? (
          // Coverage rows already name the provider; repeating it here read
          // as a duplicate.
          data.coverage.rows.map((row, index, rows) => (
            <DetailRow
              key={row.label}
              label={row.label}
              value={row.value}
              valueColor={row.highlight ? colors.success : colors.ink}
              divided={index < rows.length - 1}
            />
          ))
        ) : (
          <>
            <DetailRow label="Provider" value={data.provider} divided />
            <DetailRow label="What it covers" value={data.summary} />
          </>
        )}
      </Card>

      {data.coverage?.documentId ? (
        <Card padded={false}>
          <ListRow
            leading={<DocumentThumbnail />}
            title="Policy document"
            subtitle="Network hospitals & claim rules"
            onPress={() => openPolicy(data.coverage!.documentId!)}
            trailing={
              <Text variant="badge" color={colors.primary}>
                Open
              </Text>
            }
            style={styles.documentRow}
          />
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Get support"
          block
          style={styles.action}
          testID="benefit-support"
          onPress={() => router.push('/requests/new')}
        />
        <Button
          label="Share details"
          variant="secondary"
          block
          style={styles.action}
          onPress={async () => {
            await Clipboard.setStringAsync(formatBenefitSummary(data));
            showToast('Benefit details copied');
          }}
        />
      </View>
    </Screen>
  );
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cardField}>
      <Text variant="tab" color={colors.primaryOnDarkMuted}>
        {label}
      </Text>
      <Text variant="mono" color={colors.onDark}>
        {value}
      </Text>
    </View>
  );
}

/** Plain-text summary, for sharing a benefit's details. */
export function formatBenefitSummary(benefit: Benefit): string {
  return [
    `TPay benefit · ${benefit.name}`,
    benefit.provider,
    benefit.summary,
    ...(benefit.coverage
      ? [
          `Member: ${benefit.coverage.memberName}`,
          `Member ID: ${benefit.coverage.memberId}`,
          ...benefit.coverage.rows.map((row) => `${row.label}: ${row.value}`),
        ]
      : []),
  ].join('\n');
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  reason: { lineHeight: 18 },
  card: { borderRadius: radius.sheet, padding: 20, gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardBadge: {
    backgroundColor: colors.overlayOnDarkStrong,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardField: { gap: 3 },
  allowance: { gap: 6 },
  allowanceRail: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: 4,
  },
  allowanceFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  documentRow: { paddingVertical: 16, gap: 13 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, borderRadius: radius.xl, paddingVertical: 15 },
});
