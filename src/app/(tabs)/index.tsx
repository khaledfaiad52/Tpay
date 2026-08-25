import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';

import {
  AccountsSection,
  BalanceCard,
  CardSection,
  HomeHeader,
  HomeSkeleton,
  NextSalaryCard,
  QuickActions,
  RecentActivity,
  RequestsBanner,
  WorkTiles,
  type QuickAction,
} from '@/components/home';
import { ErrorState, FadeInUp, Screen } from '@/components/ui';
import { useHomeData, useRefreshOnFocus } from '@/hooks';
import { colors } from '@/theme';
import type { Account, Transaction } from '@/types';
import { greeting } from '@/utils';

/**
 * Home — the approved hierarchy, top to bottom:
 * balance → quick actions → next salary → recent activity → accounts → card
 * → benefits & employer → HR requests.
 */
export default function HomeScreen() {
  const home = useHomeData();
  useRefreshOnFocus(home.reload);
  const [balanceHidden, setBalanceHidden] = useState(false);

  const quickActions = useMemo<readonly QuickAction[]>(
    () => [
      { key: 'send', label: 'Send', icon: 'arrow-up-right', onPress: () => router.push('/send') },
      { key: 'add', label: 'Add money', icon: 'plus', onPress: () => router.push('/add-money') },
      { key: 'exchange', label: 'Exchange', icon: 'exchange', onPress: () => router.push('/exchange') },
    ],
    [],
  );

  const openTransaction = useCallback((transaction: Transaction) => {
    router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } });
  }, []);

  const openAccount = useCallback((account: Account) => {
    router.push({ pathname: '/accounts/[id]', params: { id: account.id } });
  }, []);

  if (home.status === 'loading') {
    return (
      <Screen>
        <HomeSkeleton />
      </Screen>
    );
  }

  if (home.status === 'error') {
    return (
      <Screen>
        <ErrorState
          title="We couldn't load your account"
          description="Your money is safe. Check your connection and try again."
          onRetry={home.reload}
        />
      </Screen>
    );
  }

  const data = home.data;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={home.isRefreshing}
          onRefresh={home.reload}
          tintColor={colors.primary}
        />
      }
    >
      <HomeHeader
        greeting={greeting()}
        firstName={data.user.firstName}
        initials={data.user.initials}
        hasUnreadNotifications={data.unreadNotifications > 0}
        onNotificationsPress={() => router.push('/notifications')}
        onProfilePress={() => router.push('/profile')}
      />

      <FadeInUp>
        <BalanceCard
          total={data.totalBalance}
          accounts={data.accounts}
          hidden={balanceHidden}
          onToggleHidden={() => setBalanceHidden((hidden) => !hidden)}
        />
      </FadeInUp>

      <FadeInUp delay={40}>
        <QuickActions actions={quickActions} />
      </FadeInUp>

      {data.nextSalary ? (
        <FadeInUp delay={80}>
          <NextSalaryCard salary={data.nextSalary} onPress={() => router.push('/salary')} />
        </FadeInUp>
      ) : null}

      <FadeInUp delay={120}>
        <RecentActivity
          transactions={data.recentTransactions}
          onViewAll={() => router.push('/transactions')}
          onSelect={openTransaction}
          onAddMoney={() => router.push('/add-money')}
        />
      </FadeInUp>

      <FadeInUp delay={160}>
        <AccountsSection
          accounts={data.accounts}
          onSeeAll={() => router.push('/wallet')}
          onSelect={openAccount}
        />
      </FadeInUp>

      <FadeInUp delay={200}>
        <CardSection
          card={data.card}
          onManage={() => router.push('/cards')}
          onOpenCard={() =>
            data.card
              ? router.push({ pathname: '/cards/[id]', params: { id: data.card.id } })
              : router.push('/cards')
          }
        />
      </FadeInUp>

      <FadeInUp delay={240}>
        <WorkTiles
          benefits={data.benefits}
          employment={data.employment}
          onBenefitsPress={() => router.push('/benefits')}
          onEmployerPress={() => router.push('/employer')}
        />
      </FadeInUp>

      <FadeInUp delay={280}>
        <RequestsBanner onPress={() => router.push('/requests')} />
      </FadeInUp>
    </Screen>
  );
}
