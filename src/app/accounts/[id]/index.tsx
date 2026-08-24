import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CurrencyDisc, TransactionRow } from '@/components/money';
import { ScreenHeader } from '@/components/navigation';
import {
  AmountText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FadeInUp,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { Icon } from '@/icons';
import { useAccountData, useRefreshOnFocus } from '@/hooks';
import { colors, radius } from '@/theme';
import type { Transaction } from '@/types';

/** A single currency account: balance, its three actions, details and activity. */
export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccountData(id);
  useRefreshOnFocus(account.reload);

  const openTransaction = (transaction: Transaction) =>
    router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } });

  if (account.status === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Account" />
        <Skeleton height={140} cornerRadius={radius.sheet} />
        <Skeleton height={68} />
        <Skeleton height={190} />
      </Screen>
    );
  }

  if (account.status === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Account" />
        <ErrorState
          title="We couldn't load this account"
          description="Check your connection and try again."
          onRetry={account.reload}
        />
      </Screen>
    );
  }

  const { account: data, transactions } = account.data;

  return (
    <Screen>
      <ScreenHeader title={data.name} />

      <FadeInUp>
        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <CurrencyDisc currency={data.currency} size={44} />
            <View style={styles.balanceText}>
              <Text variant="caption" color={colors.inkMuted}>
                Available balance
              </Text>
              <AmountText value={data.balance} variant="balanceMd" />
            </View>
          </View>
          <View style={styles.actions}>
            <Button
              label="Send"
              block
              style={styles.action}
              testID="account-send"
              onPress={() => router.push('/send')}
            />
            <Button
              label="Deposit"
              variant="secondary"
              block
              style={styles.action}
              testID="account-deposit"
              onPress={() => router.push('/add-money')}
            />
            <Button
              label="Exchange"
              variant="secondary"
              block
              style={styles.action}
              testID="account-exchange"
              onPress={() => router.push('/exchange')}
            />
          </View>
        </Card>
      </FadeInUp>

      <FadeInUp delay={40}>
        <Card
          tone="dark"
          testID="account-details-link"
          onPress={() =>
            router.push({ pathname: '/accounts/[id]/details', params: { id: data.id } })
          }
          style={styles.detailsRow}
        >
          <View style={styles.detailsText}>
            <Text variant="label" color={colors.onDark}>
              Account details
            </Text>
            <Text variant="captionSm" color={colors.primaryOnDark}>
              IBAN, SWIFT and routing for deposits
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.primaryOnDark} />
        </Card>
      </FadeInUp>

      <FadeInUp delay={80}>
        <View style={styles.section}>
          <SectionHeader
            title={`${data.currency} activity`}
            actionLabel={transactions.length > 0 ? 'View all' : undefined}
            actionTestID="account-view-all"
            onActionPress={
              transactions.length > 0
                ? () => router.push({ pathname: '/transactions', params: { accountId: data.id } })
                : undefined
            }
          />
          {transactions.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description={`Movements on your ${data.currency} account will appear here.`}
              actionLabel="Add money"
              onActionPress={() => router.push('/add-money')}
            />
          ) : (
            <Card padded={false}>
              {transactions.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  variant="compact"
                  onPress={openTransaction}
                  divided={index < transactions.length - 1}
                />
              ))}
            </Card>
          )}
        </View>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: { borderRadius: radius.sheet, padding: 20, gap: 14 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  balanceText: { gap: 2, flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 8 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailsText: { flex: 1, gap: 3 },
  section: { gap: 10 },
});
