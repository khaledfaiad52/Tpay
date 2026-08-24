import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatDateTime } from '@/components/money';
import { formatRecipientDestination, RecipientAvatar } from '@/components/send';
import { ScreenHeader } from '@/components/navigation';
import {
  AmountText,
  Button,
  Card,
  DetailRow,
  ErrorState,
  FadeInUp,
  Screen,
  Skeleton,
  StatusPill,
  Text,
  type StatusPillTone,
} from '@/components/ui';
import { useTransferDetail } from '@/hooks';
import type { TransferStatus } from '@/services';
import { colors } from '@/theme';
import { formatMoney, formatShortDate } from '@/utils';

const STATUS_LABELS: Record<TransferStatus, string> = {
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

const STATUS_TONES: Record<TransferStatus, StatusPillTone> = {
  processing: 'pending',
  completed: 'success',
  failed: 'failed',
};

/** The full record of one send, including where it is on its way. */
export default function TransferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useTransferDetail(id);

  if (detail.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Transfer" />
        <Skeleton height={160} />
        <Skeleton height={300} />
      </Screen>
    );
  }

  if (detail.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Transfer" />
        <ErrorState
          title="We couldn't load this transfer"
          description="Check your connection and try again."
          onRetry={detail.reload}
        />
      </Screen>
    );
  }

  const { transfer, sourceAccount } = detail.data;

  return (
    <Screen>
      <ScreenHeader title="Transfer" />

      <FadeInUp>
        <View style={styles.hero}>
          <RecipientAvatar
            initials={transfer.recipient.initials}
            seed={transfer.recipient.id}
            size={64}
          />
          <AmountText value={transfer.receiveAmount} variant="amountHero" />
          <Text variant="rowTitle" color={colors.inkMuted}>
            {`To ${transfer.recipient.name}`}
          </Text>
          <StatusPill
            label={STATUS_LABELS[transfer.status]}
            tone={STATUS_TONES[transfer.status]}
          />
        </View>
      </FadeInUp>

      {transfer.failureReason ? (
        <Card tone="danger">
          <Text variant="caption" color={colors.dangerText} style={styles.reason}>
            {transfer.failureReason}
          </Text>
        </Card>
      ) : null}

      <Card padded={false}>
        <DetailRow label="You sent" value={formatMoney(transfer.sendAmount)} divided />
        <DetailRow label="Transfer fee" value={formatMoney(transfer.fee)} divided />
        <DetailRow label="Total debited" value={formatMoney(transfer.totalDebit)} divided />
        {transfer.fxRate ? (
          <DetailRow
            label="Exchange rate"
            value={`1 ${transfer.sendAmount.currency} = ${transfer.fxRate.toFixed(4)} ${transfer.receiveAmount.currency}`}
            divided
          />
        ) : null}
        <DetailRow
          label="Recipient receives"
          value={formatMoney(transfer.receiveAmount)}
          divided
        />
        {sourceAccount ? (
          <DetailRow
            label="From"
            value={`${sourceAccount.currency} account ••${sourceAccount.maskedNumber}`}
            divided
          />
        ) : null}
        <DetailRow
          label="To"
          value={formatRecipientDestination(transfer.recipient)}
          divided
        />
        <DetailRow
          label="Payout"
          value={`${transfer.payoutMethod} · ${transfer.receiveAmount.currency}`}
          divided
        />
        <DetailRow label="Sent" value={formatDateTime(transfer.createdAt)} divided />
        {transfer.status !== 'failed' ? (
          <DetailRow label="Arrives by" value={formatShortDate(transfer.arrivesBy)} divided />
        ) : null}
        <DetailRow label="Reference" value={transfer.reference} monospaced />
      </Card>

      {transfer.transactionId ? (
        <Button
          label="View the transaction"
          variant="secondary"
          block
          style={styles.action}
          onPress={() =>
            router.push({
              pathname: '/transactions/[id]',
              params: { id: transfer.transactionId! },
            })
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  reason: { lineHeight: 18 },
  action: { paddingVertical: 15 },
});
