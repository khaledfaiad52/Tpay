import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { ProviderEventEnvelope } from '@/services/contracts';
import { newIdempotencyKey } from '@/services/contracts';
import { fromMajor } from '@/types';
import { currentAccountState } from './accountGuard';
import { mockCardService, resetCards } from './cardService';
import { getAccounts, getTransactions, resetStore } from './data/store';
import { resetIdempotency } from './idempotency';
import { currentKycStatus, resetKyc } from './kycService';
import { configureMockBehaviour } from './latency';
import { mockProviderEventService, resetProviderEvents } from './providerEvents';
import { resetSecurity } from './securityService';
import { mockTransferService, resetTransfers } from './transferService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetStore();
  resetIdempotency();
  resetProviderEvents();
  resetTransfers();
  resetCards();
  resetKyc();
  resetSecurity();
});

const service = mockProviderEventService;

function envelope(overrides: Partial<ProviderEventEnvelope> = {}): ProviderEventEnvelope {
  return {
    eventId: `evt_${Math.random().toString(36).slice(2)}`,
    domain: 'kyc',
    providerStatus: 'approved',
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

const usdBalance = () =>
  getAccounts().find((account) => account.id === 'acc_usd')!.balance.minorUnits;

describe('the provider event router', () => {
  it('lists the domains it can normalise', async () => {
    const domains = await service.supportedDomains();
    for (const expected of ['kyc', 'transfer', 'card-lifecycle', 'account-status']) {
      assert.ok(domains.includes(expected as never), expected);
    }
  });

  it('normalises a verification outcome into a TPay status', async () => {
    const outcome = await service.handleEvent(envelope({ providerStatus: 'approved' }));
    assert.equal(outcome.applied, true);
    assert.equal(currentKycStatus(), 'VERIFIED');
  });

  it('translates the provider vocabulary rather than storing it', async () => {
    await service.handleEvent(envelope({ providerStatus: 'requires_action' }));
    assert.equal(currentKycStatus(), 'ACTION_REQUIRED');
  });

  it('refuses a status it cannot read rather than guessing', async () => {
    const outcome = await service.handleEvent(envelope({ providerStatus: 'kinda_ok' }));
    assert.equal(outcome.applied, false);
    assert.equal(outcome.skipped, 'unrecognised-status');
  });
});

describe('duplicate provider events', () => {
  it('applies a redelivered verification event once', async () => {
    const event = envelope({ providerStatus: 'declined' });
    assert.equal((await service.handleEvent(event)).applied, true);

    const repeat = await service.handleEvent(event);
    assert.equal(repeat.applied, false);
    assert.equal(repeat.skipped, 'duplicate');
  });

  it('does not credit a returned transfer twice', async () => {
    const priced = await mockTransferService.quoteTransfer({
      recipientId: 'rcp_sara',
      sourceAccountId: 'acc_usd',
      sendAmount: fromMajor(100, 'USD'),
    });
    const created = await mockTransferService.createTransfer({
      idempotencyKey: newIdempotencyKey('trf'),
      quoteId: priced.id,
    });
    const afterDebit = usdBalance();

    const event = envelope({
      domain: 'transfer',
      providerStatus: 'returned',
      subjectId: created.transfer.id,
      reason: 'The receiving bank rejected the account.',
    });

    await service.handleEvent(event);
    const afterReturn = usdBalance();
    assert.equal(afterReturn, afterDebit + priced.totalDebit.minorUnits);

    // The same event again must not invent money.
    await service.handleEvent(event);
    assert.equal(usdBalance(), afterReturn);
  });

  it('does not debit twice for a redelivered card authorisation', async () => {
    const before = usdBalance();
    const event = envelope({
      domain: 'card-transaction',
      providerStatus: 'approved',
      subjectId: 'card_primary',
      amount: fromMajor(25, 'USD'),
      metadata: { merchant: 'Panda Hypermarket' },
    });

    await service.handleEvent(event);
    assert.equal(usdBalance(), before - 2_500);

    await service.handleEvent(event);
    assert.equal(usdBalance(), before - 2_500);
  });

  it('writes one ledger entry for a redelivered authorisation', async () => {
    const before = getTransactions().length;
    const event = envelope({
      domain: 'card-transaction',
      providerStatus: 'approved',
      subjectId: 'card_primary',
      amount: fromMajor(25, 'USD'),
      metadata: { merchant: 'Panda Hypermarket' },
    });
    await service.handleEvent(event);
    await service.handleEvent(event);
    assert.equal(getTransactions().length, before + 1);
  });
});

describe('card lifecycle events', () => {
  it('moves a card to frozen when the issuer blocks it', async () => {
    const outcome = await service.handleEvent(
      envelope({
        domain: 'card-lifecycle',
        providerStatus: 'blocked',
        subjectId: 'card_primary',
        reason: 'Blocked by the issuer pending review.',
      }),
    );
    assert.equal(outcome.applied, true);
    assert.equal((await mockCardService.getCardById('card_primary')).status, 'frozen');
  });

  it('never reopens a cancelled card', async () => {
    await mockCardService.reportLostOrStolen('card_primary', 'stolen');
    await service.handleEvent(
      envelope({ domain: 'card-lifecycle', providerStatus: 'activated', subjectId: 'card_primary' }),
    );
    assert.equal((await mockCardService.getCardById('card_primary')).status, 'cancelled');
  });

  it('skips an event about a card TPay does not know', async () => {
    const outcome = await service.handleEvent(
      envelope({ domain: 'card-lifecycle', providerStatus: 'blocked', subjectId: 'card_nope' }),
    );
    assert.equal(outcome.applied, false);
    assert.equal(outcome.skipped, 'unknown-subject');
  });
});

describe('account status events', () => {
  it('holds the account when a provider says so', async () => {
    await service.handleEvent(envelope({ domain: 'account-status', providerStatus: 'hold' }));
    assert.equal(currentAccountState().restricted, true);
    assert.equal(currentAccountState().restriction?.code, 'account-frozen');
  });

  it('releases it again', async () => {
    await service.handleEvent(envelope({ domain: 'account-status', providerStatus: 'hold' }));
    await service.handleEvent(envelope({ domain: 'account-status', providerStatus: 'released' }));
    assert.equal(currentAccountState().restricted, false);
  });
});
