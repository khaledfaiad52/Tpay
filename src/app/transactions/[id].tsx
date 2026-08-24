import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  detailRows,
  formatReceipt,
  heroSubject,
  transactionIcon,
  transactionStatusLabel,
  transactionTone,
} from '@/components/money';
import { ScreenHeader } from '@/components/navigation';
import {
  AmountText,
  Button,
  Card,
  DetailRow,
  ErrorState,
  FadeInUp,
  IconTile,
  Screen,
  Skeleton,
  StatusPill,
  Text,
  useToast,
  type StatusPillTone,
} from '@/components/ui';
import { useTransaction } from '@/hooks';
import { colors } from '@/theme';
import type { Transaction } from '@/types';

const STATUS_TONES: Record<Transaction['status'], StatusPillTone> = {
  completed: 'success',
  pending: 'pending',
  failed: 'failed',
};

/** The receipt for a single movement. */
export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);
  const { showToast } = useToast();

  if (transaction.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Transaction" />
        <Skeleton height={150} />
        <Skeleton height={280} />
      </Screen>
    );
  }

  if (transaction.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Transaction" />
        <ErrorState
          title="We couldn't load this transaction"
          description="Check your connection and try again."
          onRetry={transaction.reload}
        />
      </Screen>
    );
  }

  const { transaction: data, account } = transaction.data;
  const rows = detailRows(data, account);

  return (
    <Screen>
      <ScreenHeader title="Transaction" />

      <FadeInUp>
        <View style={styles.hero}>
          <IconTile
            name={transactionIcon(data)}
            tone={transactionTone(data)}
            size={56}
            cornerRadius={18}
            strokeWidth={1.9}
          />
          <AmountText
            value={data.amount}
            variant="amountHero"
            direction={data.direction}
            color={data.status === 'failed' ? colors.inkFaint : colors.ink}
            strikethrough={data.status === 'failed'}
          />
          <Text variant="rowTitle" color={colors.inkMuted} style={styles.subject}>
            {heroSubject(data)}
          </Text>
          <StatusPill label={transactionStatusLabel(data)} tone={STATUS_TONES[data.status]} />
        </View>
      </FadeInUp>

      {data.failureReason ? (
        <Card tone="danger">
          <Text variant="caption" color={colors.dangerText} style={styles.reason}>
            {data.failureReason}
          </Text>
        </Card>
      ) : null}

      <Card padded={false}>
        {rows.map((row, index) => (
          <DetailRow
            key={row.label}
            label={row.label}
            value={row.value}
            monospaced={row.monospaced}
            divided={index < rows.length - 1}
          />
        ))}
      </Card>

      <View style={styles.actions}>
        <Button
          label="Share receipt"
          block
          style={styles.action}
          onPress={async () => {
            await Clipboard.setStringAsync(formatReceipt(data, account));
            showToast('Receipt copied — paste it anywhere');
          }}
        />
        <Button
          label="Get help"
          variant="secondary"
          block
          style={styles.action}
          onPress={() => router.push('/requests')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  subject: { textAlign: 'center' },
  reason: { lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, paddingVertical: 15 },
});
