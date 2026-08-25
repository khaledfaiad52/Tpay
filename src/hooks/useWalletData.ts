import { useCallback } from 'react';

import { services, type AccountState } from '@/services';
import type { Account, AccountDetails, Money, Transaction, UpcomingSalary } from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

export type WalletData = {
  readonly total: Money;
  readonly accounts: readonly Account[];
};

async function loadWallet(): Promise<WalletData> {
  return services.wallet.getBalance();
}

export function useWalletData(): AsyncResult<WalletData> {
  return useAsyncData(loadWallet);
}

export type AccountData = {
  readonly account: Account;
  readonly transactions: readonly Transaction[];
};

/** How many movements the single-account screen previews. */
const ACCOUNT_ACTIVITY_COUNT = 3;

export function useAccountData(accountId: string): AsyncResult<AccountData> {
  const load = useCallback(async (): Promise<AccountData> => {
    const [account, page] = await Promise.all([
      services.account.getAccount(accountId),
      services.transaction.listTransactions({ accountId, limit: ACCOUNT_ACTIVITY_COUNT }),
    ]);
    return { account, transactions: page.items };
  }, [accountId]);

  return useAsyncData(load);
}

export type AccountDetailsData = {
  readonly account: Account;
  readonly details: AccountDetails;
};

export function useAccountDetails(accountId: string): AsyncResult<AccountDetailsData> {
  const load = useCallback(async (): Promise<AccountDetailsData> => {
    const [account, details] = await Promise.all([
      services.account.getAccount(accountId),
      services.account.getAccountDetails(accountId),
    ]);
    return { account, details };
  }, [accountId]);

  return useAsyncData(load);
}

export type AddMoneyData = {
  /** Coordinates of the primary account — where a bank transfer should land. */
  readonly details: AccountDetails;
  /** Shown as a third, automatic way money arrives. */
  readonly nextSalary: UpcomingSalary | null;
  /**
   * Whether the account can be used. Deposit coordinates are still shown when
   * it cannot, but the user is told first rather than after sending money.
   */
  readonly accountState: AccountState;
};

async function loadAddMoney(): Promise<AddMoneyData> {
  const accounts = await services.account.listAccounts();
  const primary = accounts.find((account) => account.isPrimary) ?? accounts[0];
  const [details, nextSalary, accountState] = await Promise.all([
    services.account.getAccountDetails(primary.id),
    services.salary.getNextSalary(),
    services.security.getAccountState(),
  ]);
  return { details, nextSalary, accountState };
}

export function useAddMoneyData(): AsyncResult<AddMoneyData> {
  return useAsyncData(loadAddMoney);
}
