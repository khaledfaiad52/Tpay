import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { newIdempotencyKey } from '@/services/contracts';
import { CURRENCIES, fromMajor, type Transaction, type TransactionType } from '@/types';
import { mockCardService, resetCards } from './cardService';
import { getAccounts, getTransactions, resetStore } from './data/store';
import { mockFxService } from './fxService';
import { resetIdempotency } from './idempotency';
import { resetKyc } from './kycService';
import { configureMockBehaviour } from './latency';
import { resetSecurity } from './securityService';
import { mockTransactionService } from './transactionService';
import { mockTransferService, resetTransfers } from './transferService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetStore();
  resetIdempotency();
  resetTransfers();
  resetCards();
  resetKyc();
  resetSecurity();
});

/** Every movement TPay can make lands in the same list. */
const ALL_TYPES: readonly TransactionType[] = [
  'salary',
  'transfer',
  'card',
  'deposit',
  'fx',
  'fee',
];

function isWellFormed(entry: Transaction): boolean {
  return (
    Number.isInteger(entry.amount.minorUnits) &&
    CURRENCIES.includes(entry.amount.currency) &&
    (entry.fee === undefined || Number.isInteger(entry.fee.minorUnits)) &&
    (entry.counterAmount === undefined || Number.isInteger(entry.counterAmount.minorUnits))
  );
}

describe('there is one ledger', () => {
  it('holds every kind of movement in the same shape', async () => {
    const page = await mockTransactionService.listTransactions();
    const present = new Set(page.items.map((entry) => entry.type));
    for (const type of ALL_TYPES) {
      assert.ok(present.has(type), `no seeded ${type} movement`);
    }
  });

  it('represents every amount as whole minor units in a known currency', async () => {
    const page = await mockTransactionService.listTransactions();
    for (const entry of page.items) {
      assert.ok(isWellFormed(entry), `${entry.id} (${entry.type}) is malformed`);
    }
  });

  it('never carries a floating-point amount', async () => {
    const page = await mockTransactionService.listTransactions();
    assert.ok(page.items.every((entry) => Number.isInteger(entry.amount.minorUnits)));
  });

  it('gives every movement a direction', async () => {
    const page = await mockTransactionService.listTransactions();
    assert.ok(
      page.items.every((entry) => entry.direction === 'credit' || entry.direction === 'debit'),
    );
  });
});

describe('every money-moving service writes into that one ledger', () => {
  const countOf = (type: TransactionType) =>
    getTransactions().filter((entry) => entry.type === type).length;

  it('a transfer adds one transfer entry', async () => {
    const before = countOf('transfer');
    const priced = await mockTransferService.quoteTransfer({
      recipientId: 'rcp_ahmed',
      sourceAccountId: 'acc_usd',
      sendAmount: fromMajor(50, 'USD'),
    });
    await mockTransferService.createTransfer({
      idempotencyKey: newIdempotencyKey('trf'),
      quoteId: priced.id,
    });
    assert.equal(countOf('transfer'), before + 1);
  });

  it('an exchange adds both sides', async () => {
    const before = countOf('fx');
    const priced = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(100, 'USD'),
    });
    await mockFxService.executeExchange(priced.id, newIdempotencyKey('fx'));
    assert.equal(countOf('fx'), before + 2);
  });

  it('a card payment adds one card entry, tagged with its card', async () => {
    const before = countOf('card');
    const transaction = await mockCardService.authorizePurchase({
      idempotencyKey: newIdempotencyKey('auth'),
      cardId: 'card_primary',
      amount: fromMajor(20, 'USD'),
      merchant: 'Panda Hypermarket',
    });
    assert.equal(countOf('card'), before + 1);
    assert.equal(transaction.cardId, 'card_primary');
  });

  it('shows a card payment in the wallet list as well as the card view', async () => {
    const transaction = await mockCardService.authorizePurchase({
      idempotencyKey: newIdempotencyKey('auth'),
      cardId: 'card_primary',
      amount: fromMajor(20, 'USD'),
      merchant: 'Panda Hypermarket',
    });
    const wallet = await mockTransactionService.listTransactions();
    const card = await mockCardService.listCardTransactions('card_primary');
    assert.ok(wallet.items.some((entry) => entry.id === transaction.id));
    assert.ok(card.some((entry) => entry.id === transaction.id));
  });
});

describe('balances only move through the ledger', () => {
  const usd = () => getAccounts().find((account) => account.id === 'acc_usd')!.balance;

  it('debits exactly what the transfer said it would', async () => {
    const before = usd().minorUnits;
    const priced = await mockTransferService.quoteTransfer({
      recipientId: 'rcp_ahmed',
      sourceAccountId: 'acc_usd',
      sendAmount: fromMajor(50, 'USD'),
    });
    await mockTransferService.createTransfer({
      idempotencyKey: newIdempotencyKey('trf'),
      quoteId: priced.id,
    });
    assert.equal(before - usd().minorUnits, priced.totalDebit.minorUnits);
  });

  it('keeps balances whole in minor units', () => {
    assert.ok(getAccounts().every((account) => Number.isInteger(account.balance.minorUnits)));
  });

  it('charges the fee on top, never out of what the recipient receives', async () => {
    const priced = await mockTransferService.quoteTransfer({
      recipientId: 'rcp_sara',
      sourceAccountId: 'acc_usd',
      sendAmount: fromMajor(1000, 'USD'),
    });
    assert.equal(priced.sendAmount.minorUnits, 100_000);
    assert.equal(
      priced.totalDebit.minorUnits,
      priced.sendAmount.minorUnits + priced.fee.minorUnits,
    );
  });
});
