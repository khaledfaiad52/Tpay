import { View } from 'react-native';

import { TransactionRow } from '@/components/money';
import { Card, EmptyState, SectionHeader } from '@/components/ui';
import type { Transaction } from '@/types';

export type RecentActivityProps = {
  transactions: readonly Transaction[];
  onViewAll: () => void;
  onSelect: (transaction: Transaction) => void;
  onAddMoney: () => void;
};

/** The five most recent movements, or the empty state when there are none. */
export function RecentActivity({
  transactions,
  onViewAll,
  onSelect,
  onAddMoney,
}: RecentActivityProps) {
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader
        title="Recent activity"
        actionLabel={transactions.length > 0 ? 'View all' : undefined}
        onActionPress={transactions.length > 0 ? onViewAll : undefined}
      />
      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Your transactions will appear here as soon as money moves."
          actionLabel="Add money"
          onActionPress={onAddMoney}
        />
      ) : (
        <Card padded={false}>
          {transactions.map((transaction, index) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onPress={onSelect}
              divided={index < transactions.length - 1}
            />
          ))}
        </Card>
      )}
    </View>
  );
}
