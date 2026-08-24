import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  groupByMonth,
  isNetCredit,
  TransactionRow,
  TRANSACTION_FILTERS,
} from '@/components/money';
import { ScreenHeader } from '@/components/navigation';
import {
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  FilterChips,
  Screen,
  SearchField,
  Skeleton,
} from '@/components/ui';
import { useRefreshOnFocus, useTransactions } from '@/hooks';
import { colors } from '@/theme';
import type { Transaction } from '@/types';
import { formatSignedMoney } from '@/utils';

/** Every movement, grouped by month, filterable and searchable. */
export default function TransactionsScreen() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const { results, search, setSearch, filter, setFilter } = useTransactions(accountId);
  useRefreshOnFocus(results.reload);

  const openTransaction = (transaction: Transaction) =>
    router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } });

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader title="Transactions" />

      <SearchField value={search} onChangeText={setSearch} testID="transactions-search" />

      <FilterChips chips={TRANSACTION_FILTERS} selected={filter} onSelect={setFilter} />

      {results.status === 'loading' ? (
        <View style={styles.list}>
          <Skeleton height={16} width={120} cornerRadius={4} />
          <Skeleton height={230} />
          <Skeleton height={16} width={120} cornerRadius={4} />
          <Skeleton height={68} />
        </View>
      ) : results.status === 'error' ? (
        <ErrorState
          title="We couldn't load your transactions"
          description="Check your connection and try again."
          onRetry={results.reload}
        />
      ) : results.data.length === 0 ? (
        <EmptyState
          title={search ? 'Nothing matches that' : 'No transactions yet'}
          description={
            search
              ? 'Try a different name, amount or reference.'
              : 'Your transactions will appear here as soon as money moves.'
          }
          actionLabel={search ? undefined : 'Add money'}
          onActionPress={search ? undefined : () => router.push('/add-money')}
        />
      ) : (
        groupByMonth(results.data).map((group) => (
          <View key={group.key} style={styles.list}>
            <Eyebrow
              label={group.label}
              value={formatSignedMoney(group.net, isNetCredit(group.net) ? 'credit' : 'debit')}
              valueColor={isNetCredit(group.net) ? colors.success : colors.inkMuted}
            />
            <Card padded={false}>
              {group.transactions.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onPress={openTransaction}
                  divided={index < group.transactions.length - 1}
                />
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  list: { gap: 10 },
});
