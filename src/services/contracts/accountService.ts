import type { Account, AccountDetails } from '@/types';

export type AccountService = {
  listAccounts(): Promise<readonly Account[]>;
  getAccount(accountId: string): Promise<Account>;
  /** Shareable coordinates (IBAN, SWIFT, routing) for receiving money. */
  getAccountDetails(accountId: string): Promise<AccountDetails>;
};
