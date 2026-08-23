import type { Money } from './money';

/** Every movement of money in TPay is one of these. */
export type TransactionType = 'salary' | 'transfer' | 'card' | 'deposit' | 'fx' | 'fee';

export type TransactionStatus = 'completed' | 'pending' | 'failed';

/** Money entering the wallet vs. leaving it. */
export type TransactionDirection = 'credit' | 'debit';

export type Transaction = {
  readonly id: string;
  readonly type: TransactionType;
  readonly direction: TransactionDirection;
  /** Counterparty or merchant — "Ahmed Mansour", "Netflix", "August salary". */
  readonly description: string;
  /** Signed against the user's wallet, in the transaction's own currency. */
  readonly amount: Money;
  /** ISO-8601 timestamp. */
  readonly occurredAt: string;
  readonly status: TransactionStatus;
  /** Account the movement settled against. */
  readonly accountId?: string;
  readonly reference?: string;
};
