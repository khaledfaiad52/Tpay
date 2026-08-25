import type { TransactionQuery } from '@/services';
import { toMajor, type Money, type Transaction } from '@/types';

/** The filter row on the Transactions screen, in the approved order. */
export const TRANSACTION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'salary', label: 'Salary' },
  { id: 'income', label: 'Income' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'card', label: 'Card' },
  { id: 'fees', label: 'Fees' },
] as const;

export type TransactionFilterId = (typeof TRANSACTION_FILTERS)[number]['id'];

/** Translates a chip into the service query it stands for. */
export function filterToQuery(filter: TransactionFilterId): TransactionQuery {
  switch (filter) {
    case 'salary':
      return { types: ['salary'] };
    case 'income':
      return { direction: 'credit' };
    case 'transfers':
      return { types: ['transfer'] };
    case 'card':
      return { types: ['card'] };
    case 'fees':
      return { types: ['fee'] };
    case 'all':
    default:
      return {};
  }
}

export type TransactionMonthGroup = {
  /** Sort key, "2026-08". */
  readonly key: string;
  /** "AUGUST 2026" is produced at render time from this label. */
  readonly label: string;
  readonly transactions: readonly Transaction[];
  /**
   * Net movement across the group, in the currency of its rows. Failed
   * movements never left the account, so they are excluded.
   */
  readonly net: Money;
};

/**
 * Splits a list into calendar-month groups, newest first, with a net total
 * per group — the structure the approved Transactions screen shows.
 */
export function groupByMonth(transactions: readonly Transaction[]): readonly TransactionMonthGroup[] {
  const buckets = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const key = transaction.occurredAt.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(transaction);
    else buckets.set(key, [transaction]);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({
      key,
      label: monthLabel(key),
      transactions: items,
      net: netOf(items),
    }));
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return `${date.toLocaleString('en-US', { month: 'long' })} ${year}`;
}

function netOf(transactions: readonly Transaction[]): Money {
  const currency = transactions[0]?.amount.currency ?? 'USD';
  const minorUnits = transactions
    .filter((transaction) => transaction.status !== 'failed')
    .filter((transaction) => transaction.amount.currency === currency)
    .reduce(
      (total, transaction) =>
        total +
        (transaction.direction === 'credit'
          ? transaction.amount.minorUnits
          : -transaction.amount.minorUnits),
      0,
    );
  return { minorUnits, currency };
}

/** True when a group's net is money in. */
export function isNetCredit(net: Money): boolean {
  return toMajor(net) > 0;
}
