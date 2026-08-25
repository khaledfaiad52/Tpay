import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromMajor, type Transaction } from '@/types';
import { filterToQuery, groupByMonth, isNetCredit } from './transactionFilters';

function txn(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'occurredAt'>): Transaction {
  return {
    type: 'card',
    direction: 'debit',
    description: 'Test',
    amount: fromMajor(10, 'USD'),
    status: 'completed',
    ...overrides,
  };
}

describe('filterToQuery', () => {
  it('maps each chip to the query it stands for', () => {
    assert.deepEqual(filterToQuery('all'), {});
    assert.deepEqual(filterToQuery('salary'), { types: ['salary'] });
    assert.deepEqual(filterToQuery('transfers'), { types: ['transfer'] });
    assert.deepEqual(filterToQuery('card'), { types: ['card'] });
    assert.deepEqual(filterToQuery('fees'), { types: ['fee'] });
  });

  it('treats Income as a direction, not a type', () => {
    assert.deepEqual(filterToQuery('income'), { direction: 'credit' });
  });
});

describe('groupByMonth', () => {
  const transactions: readonly Transaction[] = [
    txn({ id: 'a', occurredAt: '2026-08-18T14:22:00.000Z', amount: fromMajor(850, 'USD') }),
    txn({ id: 'b', occurredAt: '2026-08-16T19:05:00.000Z', amount: fromMajor(15.99, 'USD') }),
    txn({
      id: 'c',
      occurredAt: '2026-07-31T09:00:00.000Z',
      direction: 'credit',
      amount: fromMajor(4500, 'USD'),
    }),
  ];

  it('groups by calendar month, newest first', () => {
    const groups = groupByMonth(transactions);
    assert.deepEqual(
      groups.map((group) => group.key),
      ['2026-08', '2026-07'],
    );
    assert.equal(groups[0].label, 'August 2026');
    assert.equal(groups[0].transactions.length, 2);
  });

  it('nets debits against credits within a group', () => {
    const [august, july] = groupByMonth(transactions);
    assert.equal(august.net.minorUnits, -86599);
    assert.equal(july.net.minorUnits, 450000);
    assert.equal(isNetCredit(july.net), true);
    assert.equal(isNetCredit(august.net), false);
  });

  it('excludes failed movements, which never left the account', () => {
    const withFailure = [
      ...transactions,
      txn({
        id: 'd',
        occurredAt: '2026-08-11T09:47:00.000Z',
        status: 'failed',
        amount: fromMajor(300, 'USD'),
      }),
    ];
    const [august] = groupByMonth(withFailure);
    assert.equal(august.transactions.length, 3);
    assert.equal(august.net.minorUnits, -86599);
  });

  it('returns nothing for an empty list', () => {
    assert.deepEqual(groupByMonth([]), []);
  });
});
