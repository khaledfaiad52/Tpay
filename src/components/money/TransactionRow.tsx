import { StyleSheet, View } from 'react-native';

import { AmountText, IconTile, ListRow, Text } from '@/components/ui';
import type { Transaction } from '@/types';
import { formatShortDate } from '@/utils';
import {
  transactionIcon,
  transactionStatusLabel,
  transactionTypeLabel,
} from './transactionLabels';
import {
  transactionAmountColor,
  transactionStatusColor,
  transactionTone,
} from './transactionPresentation';

export type TransactionRowProps = {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  divided?: boolean;
  /**
   * `full` — "Transfer · Aug 18" with the status underneath.
   * `compact` — date only, amount only. Used inside a single account's
   * activity list, where the account already supplies the context.
   */
  variant?: 'full' | 'compact';
};

/** "Netflix · Card · Aug 16 · −$15.99 · Completed" — the app's activity row. */
export function TransactionRow({
  transaction,
  onPress,
  divided = false,
  variant = 'full',
}: TransactionRowProps) {
  const isFailed = transaction.status === 'failed';
  const date = formatShortDate(transaction.occurredAt);
  const subtitle =
    variant === 'compact' ? date : `${transactionTypeLabel(transaction)} · ${date}`;

  const amount = (
    <AmountText
      value={transaction.amount}
      direction={transaction.direction}
      color={transactionAmountColor(transaction)}
      strikethrough={isFailed}
    />
  );

  return (
    <ListRow
      leading={<IconTile name={transactionIcon(transaction)} tone={transactionTone(transaction)} />}
      title={transaction.description}
      subtitle={subtitle}
      divided={divided}
      onPress={onPress ? () => onPress(transaction) : undefined}
      trailing={
        variant === 'compact' && !isFailed ? (
          amount
        ) : (
          <View style={styles.trailing}>
            {amount}
            <Text variant="tabIdle" color={transactionStatusColor(transaction)}>
              {transactionStatusLabel(transaction)}
            </Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  trailing: { alignItems: 'flex-end', gap: 2 },
});
