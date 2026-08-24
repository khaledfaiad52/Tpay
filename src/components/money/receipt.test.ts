import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromMajor, type Transaction } from '@/types';
import { detailRows, formatCountdown, heroSubject } from './receipt';

const TRANSFER: Transaction = {
  id: 'txn_1002',
  type: 'transfer',
  direction: 'debit',
  description: 'Ahmed Mansour',
  amount: fromMajor(850, 'USD'),
  occurredAt: '2026-08-18T14:22:00.000Z',
  status: 'completed',
  accountId: 'acc_usd',
  reference: 'TPY-8842-KF19',
  counterpartyBank: 'Emirates NBD',
  fee: fromMajor(2.5, 'USD'),
  fxRate: { from: 'USD', to: 'AED', rate: 3.6725 },
  counterAmount: fromMajor(3121.63, 'AED'),
};

const CARD_PAYMENT: Transaction = {
  id: 'txn_1003',
  type: 'card',
  direction: 'debit',
  description: 'Netflix',
  amount: fromMajor(15.99, 'USD'),
  occurredAt: '2026-08-16T19:05:00.000Z',
  status: 'completed',
  accountId: 'acc_usd',
};

describe('heroSubject', () => {
  it('describes each type in the user’s terms', () => {
    assert.equal(heroSubject(TRANSFER), 'Transfer to Ahmed Mansour');
    assert.equal(heroSubject(CARD_PAYMENT), 'Card payment · Netflix');
    assert.equal(
      heroSubject({ ...TRANSFER, type: 'salary', counterpartyBank: 'Acme Technologies payroll' }),
      'Salary from Acme Technologies payroll',
    );
  });

  it('shows what an exchange produced', () => {
    assert.equal(heroSubject({ ...TRANSFER, type: 'fx' }), 'Converted to AED 3,121.63');
  });
});

describe('detailRows', () => {
  it('includes every field a rich transfer has', () => {
    const labels = detailRows(TRANSFER, { currency: 'USD', maskedNumber: '4821' }).map(
      (row) => row.label,
    );
    assert.deepEqual(labels, [
      'Date & time',
      'From',
      'Recipient bank',
      'Exchange rate',
      'Recipient receives',
      'Fee',
      'Reference',
    ]);
  });

  it('omits rows a plain card payment does not have', () => {
    const labels = detailRows(CARD_PAYMENT).map((row) => row.label);
    assert.deepEqual(labels, ['Date & time', 'Fee']);
  });

  it('says "No fee" rather than leaving the row blank', () => {
    const fee = detailRows(CARD_PAYMENT).find((row) => row.label === 'Fee');
    assert.equal(fee?.value, 'No fee');
  });

  it('labels the account row by direction', () => {
    const account = { currency: 'USD', maskedNumber: '4821' } as const;
    assert.equal(detailRows(TRANSFER, account)[1].label, 'From');
    assert.equal(detailRows({ ...TRANSFER, direction: 'credit' }, account)[1].label, 'To');
  });

  it('renders the reference in monospace', () => {
    const reference = detailRows(TRANSFER).find((row) => row.label === 'Reference');
    assert.equal(reference?.monospaced, true);
  });
});

describe('formatCountdown', () => {
  it('pads to mm:ss', () => {
    assert.equal(formatCountdown(28), '00:28');
    assert.equal(formatCountdown(90), '01:30');
    assert.equal(formatCountdown(0), '00:00');
  });

  it('never goes negative', () => {
    assert.equal(formatCountdown(-5), '00:00');
  });
});
