import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { fromMajor } from '@/types';
import { findAccount, getAccounts, getTransactions, resetStore } from './data/store';
import { InsufficientFundsError } from '@/services/contracts';
import {
  buildExchangeQuote,
  convert,
  mockFxService,
  rateBetween,
  totalDebit,
} from './fxService';
import { totalBalanceOf } from './walletService';
import { resetIdempotency } from './idempotency';
import { configureMockBehaviour } from './latency';

// Run the mock layer without artificial latency inside unit tests.
configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetIdempotency();
  resetStore();
});

describe('rateBetween', () => {
  it('is symmetric through USD', () => {
    const usdToSar = rateBetween('USD', 'SAR');
    const sarToUsd = rateBetween('SAR', 'USD');
    assert.ok(Math.abs(usdToSar * sarToUsd - 1) < 1e-9);
  });

  it('is 1 for the same currency', () => {
    assert.equal(rateBetween('USD', 'USD'), 1);
  });
});

describe('convert', () => {
  it('rounds once, at the target currency', () => {
    const result = convert(fromMajor(100, 'USD'), 'SAR', 3.7475);
    assert.deepEqual(result, { minorUnits: 37475, currency: 'SAR' });
  });
});

describe('buildExchangeQuote', () => {
  it('converts the full amount and charges the spread on top', () => {
    const quote = buildExchangeQuote({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(1000, 'USD'),
    });

    assert.equal(quote.from, 'USD');
    assert.equal(quote.to, 'SAR');
    assert.equal(quote.feeRate, 0.0025);
    assert.deepEqual(quote.fee, fromMajor(2.5, 'USD'));
    // The figure the approved Exchange screen shows for $1,000 at 3.7475.
    assert.deepEqual(quote.targetAmount, { minorUnits: 374750, currency: 'SAR' });
    assert.deepEqual(totalDebit(quote), fromMajor(1002.5, 'USD'));
  });

  it('expires in the future', () => {
    const quote = buildExchangeQuote({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(10, 'USD'),
    });
    assert.ok(Date.parse(quote.expiresAt) > Date.now());
  });
});

describe('executeExchange', () => {
  it('moves money between the two accounts and records both sides', async () => {
    const before = findAccount('acc_usd')!.balance.minorUnits;
    const quote = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(1000, 'USD'),
    });

    const result = await mockFxService.executeExchange(quote.id);

    // 1,000 plus the 2.50 spread leaves the USD account.
    assert.equal(findAccount('acc_usd')!.balance.minorUnits, before - 100250);
    assert.equal(findAccount('acc_sar')!.balance.minorUnits, 1520000 + 374750);
    assert.deepEqual(result.targetAmount, { minorUnits: 374750, currency: 'SAR' });

    const recorded = getTransactions().slice(0, 2);
    assert.equal(recorded.length, 2);
    assert.ok(recorded.some((entry) => entry.direction === 'debit' && entry.type === 'fx'));
    assert.ok(recorded.some((entry) => entry.direction === 'credit' && entry.type === 'fx'));
  });

  it('moves the one balance by the spread only — an exchange is value-neutral', async () => {
    const before = totalBalanceOf(getAccounts()).minorUnits;
    const quote = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(1000, 'USD'),
    });
    await mockFxService.executeExchange(quote.id);

    // $1,000 leaves USD and comes back as SAR at the same rate, so only the
    // $2.50 spread is lost. Cent-rounding on the SAR leg allows a cent of drift.
    const after = totalBalanceOf(getAccounts()).minorUnits;
    assert.ok(Math.abs(before - after - 250) <= 1, `moved by ${before - after}`);
  });

  it('rejects an exchange larger than the source balance', async () => {
    const quote = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(99_000, 'USD'),
    });

    await assert.rejects(
      () => mockFxService.executeExchange(quote.id),
      (error: Error) => error instanceof InsufficientFundsError,
    );
    assert.equal(findAccount('acc_usd')!.balance.minorUnits, 825000);
  });

  it('rejects an exchange the fee pushes over the balance', async () => {
    // The balance covers the amount exactly, but not the spread on top.
    const quote = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(8250, 'USD'),
    });

    await assert.rejects(
      () => mockFxService.executeExchange(quote.id),
      (error: Error) => error instanceof InsufficientFundsError,
    );
    assert.equal(findAccount('acc_usd')!.balance.minorUnits, 825000);
  });

  it('refuses to book the same quote twice', async () => {
    const quote = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(100, 'USD'),
    });
    await mockFxService.executeExchange(quote.id);
    await assert.rejects(() => mockFxService.executeExchange(quote.id));
  });
});
