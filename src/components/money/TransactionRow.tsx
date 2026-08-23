import { StyleSheet, View } from 'react-native';

import { AmountText, IconTile, ListRow, Text } from '@/components/ui';
import type { Transaction } from '@/types';
import { formatShortDate } from '@/utils';
import {
  transactionAmountColor,
  transactionIcon,
  transactionStatusColor,
  transactionStatusLabel,
  transactionTone,
  transactionTypeLabel,
} from './transactionPresentation';

export type TransactionRowProps = {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  divided?: boolean;
};

/** "Netflix · Card · Aug 16 · −$15.99 · Completed" — the app's activity row. */
export function TransactionRow({ transaction, onPress, divided = false }: TransactionRowProps) {
  return (
    <ListRow
      leading={<IconTile name={transactionIcon(transaction)} tone={transactionTone(transaction)} />}
      title={transaction.description}
      subtitle={`${transactionTypeLabel(transaction)} · ${formatShortDate(transaction.occurredAt)}`}
      divided={divided}
      onPress={onPress ? () => onPress(transaction) : undefined}
      trailing={
        <View style={styles.trailing}>
          <AmountText
            value={transaction.amount}
            direction={transaction.direction}
            color={transactionAmountColor(transaction)}
          />
          <Text variant="tabIdle" color={transactionStatusColor(transaction)}>
            {transactionStatusLabel(transaction)}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  trailing: { alignItems: 'flex-end', gap: 2 },
});
