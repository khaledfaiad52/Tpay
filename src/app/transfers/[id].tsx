import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatDateTime } from '@/components/money';
import {
  formatRecipientDestination,
  isTransferSettled,
  RecipientAvatar,
  transferStatusLabel,
  transferStatusTone,
} from '@/components/send';
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
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useTransferDetail } from '@/hooks';
import { services } from '@/services';
import { colors } from '@/theme';
import { formatMoney, formatShortDate } from '@/utils';

/** The full record of one send, including where it is on its way. */
export default function TransferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useTransferDetail(id);
  const { showToast } = useToast();

  /**
   * Delivers a payout-network callback by hand.
   *
   * Nothing settles on a timer: a transfer leaves `processing` only when the
   * network reports back. Until there is a real provider, this stands in for
   * that webhook so the settled and returned paths can be exercised.
   */
  const deliverCallback = async (providerStatus: string) => {
    try {
      const settled = await services.transfer.handleTransferCallback({
        transferId: id,
        providerStatus,
        reason:
          providerStatus === 'returned'
            ? 'The receiving bank returned this payment. The money is back in your account.'
            : undefined,
        errorCode: providerStatus === 'returned' ? 'PAYOUT_RETURNED' : undefined,
      });
      detail.reload();
      showToast(`Provider reported: ${transferStatusLabel(settled.status).toLowerCase()}`);
    } catch {
      showToast("That callback couldn't be applied");
    }
  };

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
            label={transferStatusLabel(transfer.status)}
            tone={transferStatusTone(transfer.status)}
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
          testID="transfer-view-transaction"
          onPress={() =>
            router.push({
              pathname: '/transactions/[id]',
              params: { id: transfer.transactionId! },
            })
          }
        />
      ) : null}

      {isTransferSettled(transfer.status) ? null : (
        <View style={styles.callbacks}>
          <Text variant="captionSm" color={colors.inkFaint} style={styles.callbackNote}>
            Waiting on the payout network. Until a real provider is connected, deliver its
            callback by hand:
          </Text>
          <View style={styles.callbackRow}>
            <Tappable
              accessibilityRole="button"
              testID="transfer-callback-settled"
              onPress={() => deliverCallback('settled')}
              style={styles.callbackButton}
            >
              <Text variant="action" color={colors.primary}>
                Report settled
              </Text>
            </Tappable>
            <Tappable
              accessibilityRole="button"
              testID="transfer-callback-returned"
              onPress={() => deliverCallback('returned')}
              style={styles.callbackButton}
            >
              <Text variant="action" color={colors.danger}>
                Report returned
              </Text>
            </Tappable>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  reason: { lineHeight: 18 },
  action: { paddingVertical: 15 },
  callbacks: { gap: 10 },
  callbackNote: { textAlign: 'center', lineHeight: 16 },
  callbackRow: { flexDirection: 'row', gap: 10 },
  callbackButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
