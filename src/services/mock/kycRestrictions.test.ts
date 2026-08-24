import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { AccountRestrictedError, newIdempotencyKey } from '@/services/contracts';
import { fromMajor, type KycStatus } from '@/types';
import { accountCanTransact, currentAccountState } from './accountGuard';
import { mockCardService, resetCards } from './cardService';
import { resetStore } from './data/store';
import { mockKycService, resetKyc, setKycStatus } from './kycService';
import { resetIdempotency } from './idempotency';
import { configureMockBehaviour } from './latency';
import { mockSecurityService, resetSecurity } from './securityService';
import { demoOtpCode, demoPassword, mockSessionService, resetSession } from './sessionService';
import { mockTransferService, resetTransfers } from './transferService';
import { mockUserService, resetUser } from './userService';
import { mockWalletService } from './walletService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetIdempotency();
  resetStore();
  resetKyc();
  resetSecurity();
  resetSession();
  resetTransfers();
  resetCards();
  resetUser();
});

/** The two states that stop money without locking anyone out. */
const BLOCKED: readonly KycStatus[] = ['REJECTED', 'SUSPENDED'];

describe('a blocked verification does not lock the user out', () => {
  for (const status of BLOCKED) {
    it(`lets a ${status} user sign in`, async () => {
      setKycStatus(status);
      const outcome = await mockSessionService.signIn({
        identifier: 'khaled.faiad@demo.acme.sa',
        password: demoPassword,
      });
      // Two-factor is on for the demo account, so a fresh device is
      // challenged first — which is itself proof they are not locked out.
      const state =
        outcome.kind === 'session'
          ? outcome.state
          : await mockSessionService.verifySignInChallenge(
              outcome.challenge.id,
              demoOtpCode,
            );
      assert.equal(state.status, 'AUTHENTICATED');
    });

    it(`lets a ${status} user read their account`, async () => {
      setKycStatus(status);
      assert.ok(await mockUserService.getCurrentUser());
      assert.ok(await mockWalletService.getBalance());
      assert.ok(await mockCardService.listCards());
    });

    it(`shows a ${status} user their verification status`, async () => {
      setKycStatus(status, 'We could not match the document to your details.');
      const state = await mockKycService.getKycStatus();
      assert.equal(state.status, status);
      assert.ok(state.reason);
    });

    it(`tells a ${status} user why and points at support`, async () => {
      setKycStatus(status);
      const restriction = currentAccountState().restriction;
      assert.ok(restriction);
      assert.equal(restriction.action.kind, 'contact-support');
      assert.ok(restriction.explanation.length > 0);
      // The freeze flag is the user's own doing; this is not that.
      assert.equal(currentAccountState().frozen, false);
      assert.equal(currentAccountState().restricted, true);
    });
  }
});

describe('a blocked verification stops money', () => {
  for (const status of BLOCKED) {
    it(`blocks a transfer for a ${status} user`, async () => {
      setKycStatus(status);
      await assert.rejects(
        () =>
          mockTransferService.quoteTransfer({
            recipientId: 'rcp_ahmed',
            sourceAccountId: 'acc_usd',
            sendAmount: fromMajor(10, 'USD'),
          }),
        AccountRestrictedError,
      );
    });

    it(`blocks card spending for a ${status} user`, async () => {
      setKycStatus(status);
      await assert.rejects(
        () =>
          mockCardService.authorizePurchase({
            idempotencyKey: newIdempotencyKey(),
            cardId: 'card_primary',
            amount: fromMajor(10, 'USD'),
            merchant: 'Panda Hypermarket',
          }),
        AccountRestrictedError,
      );
    });

    it(`reports the account unable to transact while ${status}`, () => {
      setKycStatus(status);
      assert.equal(accountCanTransact(), false);
    });
  }

  it('lets money move again once verification clears', async () => {
    setKycStatus('SUSPENDED');
    assert.equal(accountCanTransact(), false);
    setKycStatus('VERIFIED');
    assert.equal(accountCanTransact(), true);
    assert.ok(
      await mockCardService.authorizePurchase({
        idempotencyKey: newIdempotencyKey(),
        cardId: 'card_primary',
        amount: fromMajor(10, 'USD'),
        merchant: 'Panda Hypermarket',
      }),
    );
  });

  it('does not restrict a merely unverified account — it limits it', async () => {
    setKycStatus('NOT_STARTED');
    assert.equal(accountCanTransact(), true);
    // A small transfer is still allowed; only the ceiling is lower.
    assert.ok(
      await mockTransferService.quoteTransfer({
        recipientId: 'rcp_ahmed',
        sourceAccountId: 'acc_usd',
        sendAmount: fromMajor(100, 'USD'),
      }),
    );
  });

  it('keeps a freeze naming the freeze, even when verification is fine', async () => {
    setKycStatus('VERIFIED');
    await mockSecurityService.setAccountFrozen(true);
    assert.equal(currentAccountState().restriction?.code, 'account-frozen');
  });

  it('lets a freeze outrank a blocked verification, so the user can act', async () => {
    setKycStatus('REJECTED');
    await mockSecurityService.setAccountFrozen(true);
    // The freeze is the thing the user can undo, so it is what they are told.
    assert.equal(currentAccountState().restriction?.code, 'account-frozen');
  });
});
