import { services, unreadCount } from '@/services';
import type {
  Account,
  BenefitsSummary,
  Card,
  Employment,
  Money,
  Transaction,
  UpcomingSalary,
  User,
} from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

/** How many recent movements Home previews. */
const RECENT_TRANSACTION_COUNT = 5;

export type HomeData = {
  readonly user: User;
  readonly totalBalance: Money;
  readonly accounts: readonly Account[];
  readonly nextSalary: UpcomingSalary | null;
  readonly recentTransactions: readonly Transaction[];
  readonly card: Card | null;
  readonly employment: Employment | null;
  readonly benefits: BenefitsSummary;
  /** Drives the dot on the bell. */
  readonly unreadNotifications: number;
};

/**
 * Every service call Home needs, issued in parallel and resolved as one unit,
 * so the screen has a single loading state and a single failure boundary.
 */
async function loadHomeData(): Promise<HomeData> {
  const [user, wallet, nextSalary, transactions, card, employment, benefits, notifications] =
    await Promise.all([
      services.user.getCurrentUser(),
      services.wallet.getBalance(),
      services.salary.getNextSalary(),
      services.transaction.listTransactions({ limit: RECENT_TRANSACTION_COUNT }),
      services.card.getCard(),
      services.employment.getEmployment(),
      services.benefits.getSummary(),
      services.notifications.listNotifications(),
    ]);

  return {
    user,
    totalBalance: wallet.total,
    accounts: wallet.accounts,
    nextSalary,
    recentTransactions: transactions.items,
    card,
    employment,
    benefits,
    unreadNotifications: unreadCount(notifications),
  };
}

export function useHomeData(): AsyncResult<HomeData> {
  return useAsyncData(loadHomeData);
}
