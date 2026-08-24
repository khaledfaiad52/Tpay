import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { AccountFrozenError, meetsRequirement } from '@/services/contracts';
import { fromMajor } from '@/types';
import { accountCanTransact, requireActiveAccount } from './accountGuard';
import { mockCardService, resetCards } from './cardService';
import { getAccounts, resetStore } from './data/store';
import { mockFxService } from './fxService';
import { resetKyc } from './kycService';
import { configureMockBehaviour } from './latency';
import { currentAccountState, mockSecurityService, resetSecurity } from './securityService';
import { mockTransferService, resetTransfers } from './transferService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetStore();
  resetSecurity();
  resetTransfers();
  resetKyc();
  resetCards();
});

const freeze = () => mockSecurityService.setAccountFrozen(true);

describe('the account-state gate', () => {
  it('reports the account usable by default', () => {
    assert.equal(currentAccountState().frozen, false);
    assert.equal(accountCanTransact(), true);
  });

  it('explains the freeze and names the way out of it', async () => {
    await freeze();
    const state = currentAccountState();
    assert.equal(state.frozen, true);
    assert.equal(state.restriction?.code, 'account-frozen');
    assert.equal(state.restriction?.action.kind, 'unfreeze-account');
    assert.ok(state.restriction?.explanation.includes('Unfreeze'));
  });

  it('throws from the one shared guard', async () => {
    await freeze();
    assert.throws(() => requireActiveAccount(), AccountFrozenError);
  });

  it('publishes the same state through the service', async () => {
    await freeze();
    assert.equal((await mockSecurityService.getAccountState()).frozen, true);
  });
});

describe('a frozen account cannot move money', () => {
  const quote = () =>
    mockTransferService.quoteTransfer({
      recipientId: 'rcp_ahmed',
      sourceAccountId: 'acc_usd',
      sendAmount: fromMajor(100, 'USD'),
    });

  it('refuses to quote a transfer', async () => {
    await freeze();
    await assert.rejects(quote, AccountFrozenError);
  });

  it('refuses to create a transfer booked before the freeze', async () => {
    const priced = await quote();
    await freeze();
    await assert.rejects(
      () => mockTransferService.createTransfer({ quoteId: priced.id }),
      AccountFrozenError,
    );
  });

  it('refuses to quote an exchange', async () => {
    await freeze();
    await assert.rejects(
      () =>
        mockFxService.quoteExchange({
          sourceAccountId: 'acc_usd',
          targetAccountId: 'acc_sar',
          sendAmount: fromMajor(100, 'USD'),
        }),
      AccountFrozenError,
    );
  });

  it('refuses to book an exchange quoted before the freeze', async () => {
    const priced = await mockFxService.quoteExchange({
      sourceAccountId: 'acc_usd',
      targetAccountId: 'acc_sar',
      sendAmount: fromMajor(100, 'USD'),
    });
    await freeze();
    await assert.rejects(() => mockFxService.executeExchange(priced.id), AccountFrozenError);
  });

  it('refuses a card payment', async () => {
    await freeze();
    await assert.rejects(
      () =>
        mockCardService.authorizePurchase({
          cardId: 'card_primary',
          amount: fromMajor(10, 'USD'),
          merchant: 'Panda Hypermarket',
        }),
      AccountFrozenError,
    );
  });

  it('refuses to unfreeze a card while the whole account is frozen', async () => {
    await mockCardService.freezeCard('card_primary');
    await freeze();
    await assert.rejects(() => mockCardService.unfreezeCard('card_primary'), AccountFrozenError);
  });

  it('lets everything through again once unfrozen', async () => {
    await freeze();
    await mockSecurityService.setAccountFrozen(false);
    assert.ok(await quote());
    assert.ok(
      await mockCardService.authorizePurchase({
        cardId: 'card_primary',
        amount: fromMajor(10, 'USD'),
        merchant: 'Panda Hypermarket',
      }),
    );
  });

  it('leaves the balance untouched when a payment is refused', async () => {
    await freeze();
    await assert.rejects(() =>
      mockCardService.authorizePurchase({
        cardId: 'card_primary',
        amount: fromMajor(10, 'USD'),
        merchant: 'Panda Hypermarket',
      }),
    );
    const usd = getAccounts().find((account) => account.id === 'acc_usd');
    assert.equal(usd?.balance.minorUnits, 825_000);
  });
});

describe('the password policy comes from the service', () => {
  it('publishes the rules rather than leaving them to the screen', async () => {
    const policy = await mockSecurityService.getPasswordPolicy();
    assert.equal(policy.minLength, 10);
    assert.equal(policy.requiresLetter, true);
    assert.equal(policy.requiresNumber, true);
    assert.deepEqual(
      policy.requirements.map((requirement) => requirement.id),
      ['min-length', 'letter-and-number'],
    );
  });

  it('judges a password by the policy, not by a rule written twice', async () => {
    const policy = await mockSecurityService.getPasswordPolicy();
    assert.equal(meetsRequirement('min-length', 'short', policy), false);
    assert.equal(meetsRequirement('min-length', 'riyadh2026spring', policy), true);
    assert.equal(meetsRequirement('letter-and-number', 'onlylettershere', policy), false);
    assert.equal(meetsRequirement('letter-and-number', 'riyadh2026', policy), true);
  });

  it('accepts a longer minimum without any screen change', async () => {
    const strict = { ...(await mockSecurityService.getPasswordPolicy()), minLength: 16 };
    assert.equal(meetsRequirement('min-length', 'riyadh2026sprin', strict), false);
    assert.equal(meetsRequirement('min-length', 'riyadh2026spring', strict), true);
  });
});
