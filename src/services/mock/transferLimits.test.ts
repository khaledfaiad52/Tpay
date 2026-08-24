import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { TransferLimitExceededError } from '@/services/contracts';
import { fromMajor, type KycStatus } from '@/types';
import { resetKyc, setKycStatus } from './kycService';
import { configureMockBehaviour } from './latency';
import { resetStore } from './data/store';
import { mockTransferService, resetTransfers, sendingLimitFor } from './transferService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetStore();
  resetTransfers();
  resetKyc();
});

const service = mockTransferService;

/** A same-currency USD transfer, so only the KYC ceiling is in play. */
async function quoteUsd(major: number) {
  return service.quoteTransfer({
    recipientId: 'rcp_ahmed',
    sourceAccountId: 'acc_usd',
    sendAmount: fromMajor(major, 'USD'),
  });
}

describe('sendingLimitFor', () => {
  const EXPECTED: readonly [KycStatus, number][] = [
    ['NOT_STARTED', 500],
    ['IN_PROGRESS', 1_000],
    ['ACTION_REQUIRED', 500],
    ['SUBMITTED', 2_500],
    ['VERIFIED', 25_000],
    ['REJECTED', 0],
    ['SUSPENDED', 0],
  ];

  for (const [status, major] of EXPECTED) {
    it(`gives ${status} a ${major} USD ceiling`, () => {
      assert.equal(sendingLimitFor(status).max.minorUnits, major * 100);
    });
  }

  it('offers verification as the way past an unverified ceiling', () => {
    assert.equal(sendingLimitFor('NOT_STARTED').action?.kind, 'verify-identity');
  });

  it('offers support, not verification, when the account is blocked', () => {
    assert.equal(sendingLimitFor('SUSPENDED').action?.kind, 'contact-support');
    assert.equal(sendingLimitFor('REJECTED').action?.kind, 'contact-support');
  });

  it('leaves a verified account with nothing to do about its limit', () => {
    assert.equal(sendingLimitFor('VERIFIED').action, undefined);
  });
});

describe('KYC status drives the transfer limit', () => {
  it('prices a small transfer for an unverified account', async () => {
    setKycStatus('NOT_STARTED');
    const quote = await quoteUsd(400);
    assert.equal(quote.sendAmount.minorUnits, 40_000);
  });

  it('refuses a transfer over the unverified ceiling', async () => {
    setKycStatus('NOT_STARTED');
    await assert.rejects(() => quoteUsd(600), TransferLimitExceededError);
  });

  it('lets the same transfer through once the account is verified', async () => {
    setKycStatus('VERIFIED');
    const quote = await quoteUsd(600);
    assert.equal(quote.sendAmount.minorUnits, 60_000);
  });

  it('lifts the ceiling as verification progresses', async () => {
    setKycStatus('NOT_STARTED');
    await assert.rejects(() => quoteUsd(900), TransferLimitExceededError);
    setKycStatus('IN_PROGRESS');
    assert.ok(await quoteUsd(900));
  });

  it('blocks every amount while the account is suspended', async () => {
    setKycStatus('SUSPENDED');
    await assert.rejects(() => quoteUsd(1), TransferLimitExceededError);
  });

  it('blocks every amount after a rejection', async () => {
    setKycStatus('REJECTED');
    await assert.rejects(() => quoteUsd(1), TransferLimitExceededError);
  });

  it('carries the limit on the error so the screen can explain it', async () => {
    setKycStatus('NOT_STARTED');
    await assert.rejects(
      () => quoteUsd(600),
      (error: unknown) => {
        assert.ok(error instanceof TransferLimitExceededError);
        assert.equal(error.limit.max.minorUnits, 50_000);
        assert.equal(error.limit.action?.kind, 'verify-identity');
        assert.ok(error.limit.explanation);
        return true;
      },
    );
  });

  it('says sending is paused, not "over your limit", when blocked', async () => {
    setKycStatus('SUSPENDED');
    await assert.rejects(
      () => quoteUsd(10),
      (error: unknown) => {
        assert.ok(error instanceof TransferLimitExceededError);
        assert.match(error.message, /paused/);
        return true;
      },
    );
  });

  it('reports the current ceiling through the service', async () => {
    setKycStatus('IN_PROGRESS');
    const limit = await service.getSendingLimit();
    assert.equal(limit.max.minorUnits, 100_000);
  });

  it('keeps a narrower non-KYC limit in force for a verified account', async () => {
    setKycStatus('VERIFIED');
    // The mobile-wallet ceiling is 5,000 USD, well under the verified 25,000.
    await assert.rejects(
      () =>
        service.quoteTransfer({
          recipientId: 'rcp_mostafa',
          sourceAccountId: 'acc_usd',
          sendAmount: fromMajor(6_000, 'USD'),
        }),
      TransferLimitExceededError,
    );
  });
});
