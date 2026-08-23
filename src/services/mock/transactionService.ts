import type { TransactionService } from '@/services/contracts';
import { mockTransactions } from './data/fixtures';
import { NotFoundError, respond } from './latency';

export const mockTransactionService: TransactionService = {
  listTransactions: (query = {}) => {
    const { limit, accountId, types } = query;
    let items = [...mockTransactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    if (accountId) items = items.filter((item) => item.accountId === accountId);
    if (types?.length) items = items.filter((item) => types.includes(item.type));
    const page = limit ? items.slice(0, limit) : items;
    return respond('transactionService.listTransactions', {
      items: page,
      nextCursor: page.length < items.length ? String(page.length) : undefined,
    });
  },

  getTransaction: (transactionId) => {
    const transaction = mockTransactions.find((candidate) => candidate.id === transactionId);
    if (!transaction) return Promise.reject(new NotFoundError('Transaction', transactionId));
    return respond('transactionService.getTransaction', transaction);
  },
};
