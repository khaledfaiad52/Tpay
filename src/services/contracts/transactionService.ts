import type { Transaction, TransactionType } from '@/types';

export type TransactionQuery = {
  /** Cap on returned rows. Home asks for 5. */
  limit?: number;
  accountId?: string;
  types?: readonly TransactionType[];
  /** Opaque cursor for pagination; adapters define its shape. */
  cursor?: string;
};

export type TransactionPage = {
  readonly items: readonly Transaction[];
  readonly nextCursor?: string;
};

export type TransactionService = {
  listTransactions(query?: TransactionQuery): Promise<TransactionPage>;
  getTransaction(transactionId: string): Promise<Transaction>;
};
