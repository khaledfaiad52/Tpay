import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AccountRow, accountWalletSubtitle } from '@/components/money';
import { AccountDetailsRow, OpenWalletRow, WalletBalanceCard } from '@/components/wallet';
import {
  ErrorState,
  FadeInUp,
  Screen,
  SectionHeader,
  Skeleton,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useRefreshOnFocus, useWalletData } from '@/hooks';
import { colors, radius } from '@/theme';
import type { Account } from '@/types';

/** Currencies TPay can open on request but the user does not hold yet. */
const OFFERED_CURRENCY = 'GBP';

export default function WalletScreen() {
  const wallet = useWalletData();
  useRefreshOnFocus(wallet.reload);
  const { showToast } = useToast();

  const openAccount = (account: Account) =>
    router.push({ pathname: '/accounts/[id]', params: { id: account.id } });

  if (wallet.status === 'loading') {
    return (
      <Screen>
        <WalletSkeleton />
      </Screen>
    );
  }

  if (wallet.status === 'error') {
    return (
      <Screen>
        <WalletHeader />
        <ErrorState
          title="We couldn't load your wallet"
          description="Your money is safe. Check your connection and try again."
          onRetry={wallet.reload}
        />
      </Screen>
    );
  }

  const { total, accounts } = wallet.data;
  const primary = accounts.find((account) => account.isPrimary) ?? accounts[0];

  return (
    <Screen>
      <WalletHeader />

      <FadeInUp>
        <WalletBalanceCard total={total} additionalCurrencies={Math.max(accounts.length - 1, 0)} />
      </FadeInUp>

      <FadeInUp delay={40}>
        <AccountDetailsRow
          onPress={() =>
            router.push({ pathname: '/accounts/[id]/details', params: { id: primary.id } })
          }
        />
      </FadeInUp>

      <FadeInUp delay={80}>
        <View style={styles.section}>
          <SectionHeader title="Your accounts" />
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              subtitle={accountWalletSubtitle(account)}
              useShortName
              shareOfTotal={account.isPrimary ? total : undefined}
              onPress={openAccount}
            />
          ))}
          <OpenWalletRow
            currency={OFFERED_CURRENCY}
            onPress={() => showToast(`We'll email you when ${OFFERED_CURRENCY} wallets open up`)}
          />
        </View>
      </FadeInUp>
    </Screen>
  );
}

function WalletHeader() {
  return (
    <View style={styles.header}>
      <Text variant="screenTitle">TPay Wallet</Text>
      <Tappable
        accessibilityRole="button"
        testID="wallet-exchange"
        onPress={() => router.push('/exchange')}
        style={styles.exchangeChip}
      >
        <Text variant="action" color={colors.primary}>
          Exchange
        </Text>
      </Tappable>
    </View>
  );
}

function WalletSkeleton() {
  return (
    <View style={styles.section}>
      <Skeleton height={30} width={170} cornerRadius={radius.sm} />
      <Skeleton height={130} cornerRadius={radius.sheet} />
      <Skeleton height={72} />
      <Skeleton height={74} />
      <Skeleton height={74} />
      <Skeleton height={74} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exchangeChip: {
    backgroundColor: colors.primarySoft,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: radius.md,
  },
  section: { gap: 10 },
});
