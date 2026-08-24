import type { TransactionQuery, TransactionService } from '@/services/contracts';
import type { Transaction } from '@/types';
import { getTransactions } from './data/store';
import { NotFoundError, respond } from './latency';

/** Applies a query to a list. Exported so it can be unit tested directly. */
export function filterTransactions(
  source: readonly Transaction[],
  query: TransactionQuery = {},
): readonly Transaction[] {
  const { accountId, types, direction, search } = query;
  const needle = search?.trim().toLowerCase();

  return source
    .filter((item) => (accountId ? item.accountId === accountId : true))
    .filter((item) => (types?.length ? types.includes(item.type) : true))
    .filter((item) => (direction ? item.direction === direction : true))
    .filter((item) =>
      needle
        ? item.description.toLowerCase().includes(needle) ||
          (item.reference?.toLowerCase().includes(needle) ?? false)
        : true,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export const mockTransactionService: TransactionService = {
  listTransactions: (query = {}) => {
    const matches = filterTransactions(getTransactions(), query);
    const page = query.limit ? matches.slice(0, query.limit) : matches;
    return respond('transactionService.listTransactions', {
      items: page,
      nextCursor: page.length < matches.length ? String(page.length) : undefined,
    });
  },

  getTransaction: (transactionId) => {
    const transaction = getTransactions().find((candidate) => candidate.id === transactionId);
    if (!transaction) return Promise.reject(new NotFoundError('Transaction', transactionId));
    return respond('transactionService.getTransaction', transaction);
  },
};
