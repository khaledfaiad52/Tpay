import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  DuplicateOperationError,
  newIdempotencyKey,
  type IdempotencyKey,
} from '@/services/contracts';
import { fromMajor } from '@/types';
import { mockCardService, resetCards } from './cardService';
import { getAccounts, getTransactions, resetStore } from './data/store';
import { mockFxService } from './fxService';
import { fingerprint, hasRecord, resetIdempotency, runOnce } from './idempotency';
import { resetKyc } from './kycService';
import { configureMockBehaviour } from './latency';
import { resetSecurity } from './securityService';
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

const usdBalance = () =>
  getAccounts().find((account) => account.id === 'acc_usd')!.balance.minorUnits;

const quote = () =>
  mockTransferService.quoteTransfer({
    recipientId: 'rcp_ahmed',
    sourceAccountId: 'acc_usd',
    sendAmount: fromMajor(100, 'USD'),
  });

describe('the idempotency store', () => {
  it('runs the work once and replays the result', async () => {
    let runs = 0;
    const work = () => {
      runs += 1;
      return Promise.resolve(runs);
    };
    const key: IdempotencyKey = 'key_1';

    assert.equal(await runOnce('demo', key, { a: 1 }, work), 1);
    assert.equal(await runOnce('demo', key, { a: 1 }, work), 1);
    assert.equal(runs, 1);
  });

  it('refuses a key reused for a different request', async () => {
    await runOnce('demo', 'key_2', { amount: 100 }, () => Promise.resolve('ok'));
    await assert.rejects(
      () => runOnce('demo', 'key_2', { amount: 999 }, () => Promise.resolve('ok')),
      DuplicateOperationError,
    );
  });

  it('keeps keys separate per operation', async () => {
    let runs = 0;
    const work = () => {
      runs += 1;
      return Promise.resolve(runs);
    };
    await runOnce('one', 'shared', {}, work);
    await runOnce('two', 'shared', {}, work);
    assert.equal(runs, 2);
  });

  it('does the work every time when no key is given', async () => {
    let runs = 0;
    const work = () => {
      runs += 1;
      return Promise.resolve(runs);
    };
    await runOnce('demo', undefined, {}, work);
    await runOnce('demo', undefined, {}, work);
    assert.equal(runs, 2);
  });

  it('fingerprints the same request identically whatever the key order', () => {
    assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
    assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }));
  });

  it('ignores undefined fields, so an omitted option is not a new request', () => {
    assert.equal(fingerprint({ a: 1, b: undefined }), fingerprint({ a: 1 }));
  });

  it('records the key so a retry can be recognised', async () => {
    await runOnce('demo', 'key_3', {}, () => Promise.resolve(1));
    assert.equal(hasRecord('demo', 'key_3'), true);
    assert.equal(hasRecord('demo', 'key_other'), false);
  });

  it('mints a different key every time', () => {
    const keys = new Set(Array.from({ length: 50 }, () => newIdempotencyKey()));
    assert.equal(keys.size, 50);
  });
});

describe('a retried transfer sends once', () => {
  it('debits the account once for two identical requests', async () => {
    const priced = await quote();
    const before = usdBalance();
    const key = newIdempotencyKey('trf');

    const first = await mockTransferService.createTransfer({
      idempotencyKey: key,
      quoteId: priced.id,
    });
    const retry = await mockTransferService.createTransfer({
      idempotencyKey: key,
      quoteId: priced.id,
    });

    assert.equal(first.transfer.id, retry.transfer.id);
    assert.equal(usdBalance(), before - priced.totalDebit.minorUnits);
  });

  it('writes one ledger entry, not two', async () => {
    const priced = await quote();
    const before = getTransactions().length;
    const key = newIdempotencyKey('trf');

    await mockTransferService.createTransfer({ idempotencyKey: key, quoteId: priced.id });
    await mockTransferService.createTransfer({ idempotencyKey: key, quoteId: priced.id });

    assert.equal(getTransactions().length, before + 1);
    assert.equal((await mockTransferService.listTransfers()).length, 1);
  });

  it('treats a new key as a new intent', async () => {
    const first = await quote();
    const before = usdBalance();
    await mockTransferService.createTransfer({
      idempotencyKey: newIdempotencyKey('trf'),
      quoteId: first.id,
    });

    // A second intent needs its own quote, as the flow provides.
    const second = await quote();
    await mockTransferService.createTransfer({
      idempotencyKey: newIdempotencyKey('trf'),
      quoteId: second.id,
    });

    assert.equal(usdBalance(), before - first.totalDebit.minorUnits * 2);
    assert.equal((await mockTransferService.listTransfers()).length, 2);
  });

  it('gives every transfer a distinct id even in the same millisecond', async () => {
    const ids = new Set<string>();
    for (let index = 0; index < 3; index += 1) {
      const priced = await quote();
      const result = await mockTransferService.createTransfer({
        idempotencyKey: newIdempotencyKey('trf'),
        quoteId: priced.id,
      });
      ids.add(result.transfer.id);
    }
    assert.equal(ids.size, 3);
  });
});

describe('a retried exchange converts once', () => {
  it('moves both balances once', async () => {
    const priced = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(100, 'USD'),
    });
    const before = usdBalance();
    const key = newIdempotencyKey('fx');

    const first = await mockFxService.executeExchange(priced.id, key);
    const retry = await mockFxService.executeExchange(priced.id, key);

    assert.equal(first.exchangeId, retry.exchangeId);
    assert.equal(usdBalance(), before - 10_025);
  });
});

describe('a redelivered card authorisation debits once', () => {
  it('debits the wallet once for the same key', async () => {
    const before = usdBalance();
    const key = newIdempotencyKey('auth');
    const request = {
      idempotencyKey: key,
      cardId: 'card_primary',
      amount: fromMajor(30, 'USD'),
      merchant: 'Panda Hypermarket',
    };

    const first = await mockCardService.authorizePurchase(request);
    const retry = await mockCardService.authorizePurchase(request);

    assert.equal(first.id, retry.id);
    assert.equal(usdBalance(), before - 3_000);
  });

  it('writes one ledger entry for a redelivery', async () => {
    const before = getTransactions().length;
    const request = {
      idempotencyKey: newIdempotencyKey('auth'),
      cardId: 'card_primary',
      amount: fromMajor(30, 'USD'),
      merchant: 'Panda Hypermarket',
    };
    await mockCardService.authorizePurchase(request);
    await mockCardService.authorizePurchase(request);
    assert.equal(getTransactions().length, before + 1);
  });
});
