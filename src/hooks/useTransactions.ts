import { useCallback, useState } from 'react';

import { filterToQuery, type TransactionFilterId } from '@/components/money';
import { services } from '@/services';
import type { Account, Transaction } from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

export type TransactionsState = {
  results: AsyncResult<readonly Transaction[]>;
  search: string;
  setSearch: (value: string) => void;
  filter: TransactionFilterId;
  setFilter: (filter: TransactionFilterId) => void;
};

/**
 * The Transactions list: a filter chip, a search box and the rows behind them.
 * Filtering happens in the service, not the component, so a real backend can
 * do it server-side without touching the screen.
 */
export function useTransactions(accountId?: string): TransactionsState {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TransactionFilterId>('all');

  const load = useCallback(async (): Promise<readonly Transaction[]> => {
    const page = await services.transaction.listTransactions({
      ...filterToQuery(filter),
      accountId,
      search: search.trim() || undefined,
    });
    return page.items;
  }, [accountId, filter, search]);

  return { results: useAsyncData(load), search, setSearch, filter, setFilter };
}

export type TransactionDetail = {
  readonly transaction: Transaction;
  /** The account it settled against, when the movement names one. */
  readonly account: Account | undefined;
};

export function useTransaction(transactionId: string): AsyncResult<TransactionDetail> {
  const load = useCallback(async (): Promise<TransactionDetail> => {
    const transaction = await services.transaction.getTransaction(transactionId);
    const account = transaction.accountId
      ? await services.account.getAccount(transaction.accountId)
      : undefined;
    return { transaction, account };
  }, [transactionId]);

  return useAsyncData(load);
}
