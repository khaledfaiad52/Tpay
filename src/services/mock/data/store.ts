/**
 * In-memory session state for the mock adapters.
 *
 * Fixtures are the seed; this store is what the services actually read and
 * write, so an exchange really does move money between accounts and shows up
 * in the transaction list. State lives for the lifetime of the app process —
 * a real backend replaces it wholesale.
 */
import type { Account, CurrencyCode, Money, Transaction } from '@/types';
import { mockAccounts, mockTransactions } from './fixtures';

let accounts: Account[] = mockAccounts.map((account) => ({ ...account }));
let transactions: Transaction[] = [...mockTransactions];

export function getAccounts(): readonly Account[] {
  return accounts;
}

export function findAccount(accountId: string): Account | undefined {
  return accounts.find((account) => account.id === accountId);
}

export function findAccountByCurrency(currency: CurrencyCode): Account | undefined {
  return accounts.find((account) => account.currency === currency);
}

export function getTransactions(): readonly Transaction[] {
  return transactions;
}

/** Applies a signed delta, in the account's own currency. */
export function adjustBalance(accountId: string, delta: Money): void {
  accounts = accounts.map((account) =>
    account.id === accountId
      ? {
          ...account,
          balance: { ...account.balance, minorUnits: account.balance.minorUnits + delta.minorUnits },
        }
      : account,
  );
}

export function recordTransactions(entries: readonly Transaction[]): void {
  transactions = [...entries, ...transactions];
}

/** Restores the seed state. Used by tests. */
export function resetStore(): void {
  accounts = mockAccounts.map((account) => ({ ...account }));
  transactions = [...mockTransactions];
}
