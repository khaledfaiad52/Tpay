import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { NotFoundError, type Recipient, type RecipientDraft } from '@/services/contracts';
import { fromMajor } from '@/types';
import { findAccount, getTransactions, resetStore } from './data/store';
import { configureMockBehaviour } from './latency';
import { breachedLimit, limitApplies, mockTransferService, resetTransfers } from './transferService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetStore();
  resetTransfers();
});

const service = mockTransferService;

async function bankRecipient(overrides: Partial<RecipientDraft> = {}): Promise<Recipient> {
  return service.createRecipient({
    kind: 'bank-account',
    name: 'Nour Adel',
    handle: 'DEMO •••• 1234',
    country: 'Egypt',
    currency: 'EGP',
    institution: 'Banque Misr',
    save: true,
    ...overrides,
  });
}

async function sendUsd(recipient: Recipient, major = 1000) {
  const quote = await service.quoteTransfer({
    recipientId: recipient.id,
    sourceAccountId: 'acc_usd',
    sendAmount: fromMajor(major, 'USD'),
  });
  return service.createTransfer({ quoteId: quote.id });
}

describe('handleTransferCallback', () => {
  it('settles a processing transfer and its pending transaction', async () => {
    const { transfer, transaction } = await sendUsd(await bankRecipient());
    assert.equal(transfer.status, 'processing');
    assert.equal(transaction?.status, 'pending');

    const settled = await service.handleTransferCallback({
      transferId: transfer.id,
      providerStatus: 'settled',
    });

    assert.equal(settled.status, 'completed');
    const ledgerEntry = getTransactions().find((entry) => entry.id === transaction!.id);
    assert.equal(ledgerEntry?.status, 'completed');
  });

  it('matches on the reference a provider echoes back', async () => {
    const { transfer } = await sendUsd(await bankRecipient());

    const settled = await service.handleTransferCallback({
      reference: transfer.reference,
      providerStatus: 'paid',
    });

    assert.equal(settled.id, transfer.id);
    assert.equal(settled.status, 'completed');
  });

  it('returns the money when the payout network sends it back', async () => {
    const before = findAccount('acc_usd')!.balance.minorUnits;
    const { transfer, transaction } = await sendUsd(await bankRecipient());
    assert.equal(findAccount('acc_usd')!.balance.minorUnits, before - transfer.totalDebit.minorUnits);

    const returned = await service.handleTransferCallback({
      transferId: transfer.id,
      providerStatus: 'returned',
      reason: 'The recipient account was closed.',
      errorCode: 'ACCOUNT_CLOSED',
    });

    assert.equal(returned.status, 'failed');
    assert.equal(returned.errorCode, 'ACCOUNT_CLOSED');
    assert.equal(findAccount('acc_usd')!.balance.minorUnits, before, 'the debit was reversed');
    const ledgerEntry = getTransactions().find((entry) => entry.id === transaction!.id);
    assert.equal(ledgerEntry?.status, 'failed');
  });

  it('normalises provider vocabulary into TPay statuses', async () => {
    for (const [providerStatus, expected] of [
      ['submitted', 'processing'],
      ['in_transit', 'processing'],
    ] as const) {
      resetStore();
      resetTransfers();
      const { transfer } = await sendUsd(await bankRecipient());
      const next = await service.handleTransferCallback({
        transferId: transfer.id,
        providerStatus,
      });
      assert.equal(next.status, expected, providerStatus);
    }
  });

  it('will not reopen a settled transfer', async () => {
    const { transfer } = await sendUsd(await bankRecipient());
    await service.handleTransferCallback({ transferId: transfer.id, providerStatus: 'settled' });

    const again = await service.handleTransferCallback({
      transferId: transfer.id,
      providerStatus: 'returned',
    });

    assert.equal(again.status, 'completed', 'a late callback cannot undo settlement');
  });

  it('rejects an unknown transfer', async () => {
    await assert.rejects(
      () => service.handleTransferCallback({ transferId: 'trf_nope', providerStatus: 'settled' }),
      (error: Error) => error instanceof NotFoundError,
    );
  });

  it('rejects a status it does not recognise', async () => {
    const { transfer } = await sendUsd(await bankRecipient());
    await assert.rejects(() =>
      service.handleTransferCallback({ transferId: transfer.id, providerStatus: 'wat' }),
    );
  });

  it('does not settle on its own — only a callback moves it', async () => {
    const { transfer } = await sendUsd(await bankRecipient());
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal((await service.getTransfer(transfer.id)).status, 'processing');
  });
});

describe('transfer limits', () => {
  const context = {
    kycStatus: 'VERIFIED',
    country: 'Egypt',
    currency: 'USD',
    payoutCurrency: 'EGP',
    kind: 'bank-account',
  } as const;

  it('matches a limit only when every condition holds', () => {
    assert.equal(limitApplies({ kycStatus: 'VERIFIED' }, context), true);
    assert.equal(limitApplies({ kycStatus: 'NOT_STARTED' }, context), false);
    assert.equal(limitApplies({ country: 'Egypt' }, context), true);
    assert.equal(limitApplies({ country: 'Kenya' }, context), false);
    assert.equal(limitApplies({ kind: 'mobile-wallet' }, context), false);
    assert.equal(limitApplies({ corridor: { from: 'USD', to: 'EGP' } }, context), true);
    assert.equal(limitApplies({ corridor: { from: 'SAR', to: 'EGP' } }, context), false);
  });

  it('applies an unscoped limit to everyone', () => {
    assert.equal(limitApplies({}, context), true);
  });

  it('finds the limit an amount breaches', () => {
    const limits = [
      {
        id: 'lim_test',
        label: 'test limit',
        scope: {},
        period: 'per-transaction' as const,
        max: fromMajor(1000, 'USD'),
      },
    ];
    assert.equal(breachedLimit(fromMajor(999, 'USD'), context, limits), undefined);
    assert.equal(breachedLimit(fromMajor(1001, 'USD'), context, limits)?.id, 'lim_test');
  });

  it('compares across currencies at the current rate', () => {
    const limits = [
      {
        id: 'lim_usd',
        label: 'test limit',
        scope: {},
        period: 'per-transaction' as const,
        max: fromMajor(100, 'USD'),
      },
    ];
    // SAR 100 is about $27 — under a $100 ceiling.
    assert.equal(breachedLimit(fromMajor(100, 'SAR'), context, limits), undefined);
    // SAR 1,000 is about $267 — over it.
    assert.equal(breachedLimit(fromMajor(1000, 'SAR'), context, limits)?.id, 'lim_usd');
  });

  it('publishes the limits that apply today', async () => {
    const limits = await service.listTransferLimits();
    assert.ok(limits.length > 0);
    assert.ok(limits.every((limit) => limit.period === 'per-transaction'));
  });
});
