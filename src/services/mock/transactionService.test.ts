import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromMajor, type Transaction } from '@/types';
import { filterTransactions } from './transactionService';

const SOURCE: readonly Transaction[] = [
  {
    id: 'salary',
    type: 'salary',
    direction: 'credit',
    description: 'August salary',
    amount: fromMajor(4500, 'USD'),
    occurredAt: '2026-08-20T09:00:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
    reference: 'TPY-SAL-4471',
  },
  {
    id: 'transfer',
    type: 'transfer',
    direction: 'debit',
    description: 'Ahmed Mansour',
    amount: fromMajor(850, 'USD'),
    occurredAt: '2026-08-18T14:22:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
  },
  {
    id: 'sar-card',
    type: 'card',
    direction: 'debit',
    description: 'Jarir Bookstore',
    amount: fromMajor(410, 'SAR'),
    occurredAt: '2026-08-12T17:20:00.000Z',
    status: 'completed',
    accountId: 'acc_sar',
  },
];

describe('filterTransactions', () => {
  it('sorts newest first', () => {
    assert.deepEqual(
      filterTransactions(SOURCE).map((item) => item.id),
      ['salary', 'transfer', 'sar-card'],
    );
  });

  it('narrows to one account', () => {
    assert.deepEqual(
      filterTransactions(SOURCE, { accountId: 'acc_sar' }).map((item) => item.id),
      ['sar-card'],
    );
  });

  it('narrows by type', () => {
    assert.deepEqual(
      filterTransactions(SOURCE, { types: ['salary'] }).map((item) => item.id),
      ['salary'],
    );
  });

  it('narrows by direction, which is what the Income chip means', () => {
    assert.deepEqual(
      filterTransactions(SOURCE, { direction: 'credit' }).map((item) => item.id),
      ['salary'],
    );
  });

  it('searches the description case-insensitively', () => {
    assert.deepEqual(
      filterTransactions(SOURCE, { search: 'ahmed' }).map((item) => item.id),
      ['transfer'],
    );
  });

  it('searches the reference too', () => {
    assert.deepEqual(
      filterTransactions(SOURCE, { search: 'TPY-SAL' }).map((item) => item.id),
      ['salary'],
    );
  });

  it('combines filters', () => {
    assert.deepEqual(filterTransactions(SOURCE, { accountId: 'acc_sar', types: ['salary'] }), []);
  });

  it('returns everything for an empty query', () => {
    assert.equal(filterTransactions(SOURCE, {}).length, SOURCE.length);
  });
});
