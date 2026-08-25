import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  CardDeclinedError,
  InsufficientFundsError,
  newIdempotencyKey,
  NotFoundError,
} from '@/services/contracts';
import { fromMajor, type Card, type CardStatus } from '@/types';
import { declineReason, mockCardService, resetCards } from './cardService';
import { resetIdempotency } from './idempotency';
import { getAccounts, getTransactions, resetStore } from './data/store';
import { configureMockBehaviour } from './latency';
import { mockSecurityService, resetSecurity } from './securityService';
import { mockWalletService } from './walletService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetStore();
  resetCards();
  resetSecurity();
  resetIdempotency();
});

const service = mockCardService;
const PHYSICAL = 'card_primary';
const VIRTUAL = 'card_virtual_1';

/** A fresh purchase: a new key each time, as a real terminal would send. */
const buy = (cardId: string, major: number, extra: Record<string, boolean> = {}) =>
  service.authorizePurchase({
    idempotencyKey: newIdempotencyKey('auth'),
    cardId,
    amount: fromMajor(major, 'USD'),
    merchant: 'Panda Hypermarket',
    ...extra,
  });

describe('card overview', () => {
  it('lists the physical card first', async () => {
    const cards = await service.listCards();
    assert.equal(cards[0].isPrimary, true);
    assert.equal(cards[0].format, 'physical');
  });

  it('lists a virtual card alongside it', async () => {
    const cards = await service.listCards();
    assert.ok(cards.some((card) => card.format === 'virtual'));
  });

  it('names the primary card for Home', async () => {
    assert.equal((await service.getCard())?.id, PHYSICAL);
  });

  it('rejects a card that does not exist', async () => {
    await assert.rejects(() => service.getCardById('card_nope'), NotFoundError);
  });

  it('never carries a balance of its own', async () => {
    const card = await service.getCardById(PHYSICAL);
    assert.equal('balance' in card, false);
  });

  it('creates a virtual card instantly', async () => {
    const before = (await service.listCards()).length;
    const card = await service.createVirtualCard();
    assert.equal(card.format, 'virtual');
    assert.equal(card.status, 'active');
    assert.equal((await service.listCards()).length, before + 1);
  });

  it('stops at five virtual cards, as the design says', async () => {
    // One already exists, so four more reaches the cap.
    for (let index = 0; index < 4; index += 1) await service.createVirtualCard();
    await assert.rejects(() => service.createVirtualCard());
  });
});

describe('card details', () => {
  it('reveals the full number only behind an authorization', async () => {
    const secrets = await service.revealCardDetails(PHYSICAL, { method: 'tap' });
    assert.match(secrets.pan, /4429$/);
    assert.match(secrets.cvv, /^\d{3}$/);
    assert.ok(Date.parse(secrets.expiresAt) > Date.now());
  });

  it('keeps the full number out of the stored card', async () => {
    const card = await service.getCardById(PHYSICAL);
    assert.equal(card.last4.length, 4);
    assert.equal('pan' in card, false);
  });

  it('refuses to reveal a cancelled card', async () => {
    await service.reportLostOrStolen(PHYSICAL, 'lost');
    await assert.rejects(
      () => service.revealCardDetails(PHYSICAL, { method: 'tap' }),
      CardDeclinedError,
    );
  });

  it('accepts a stronger authorization method without any signature change', async () => {
    const secrets = await service.revealCardDetails(PHYSICAL, {
      method: 'biometric',
      token: 'demo-attestation',
    });
    assert.ok(secrets.pan.length > 0);
  });
});

describe('freeze and unfreeze', () => {
  it('freezes an active card', async () => {
    assert.equal((await service.freezeCard(PHYSICAL)).status, 'frozen');
  });

  it('unfreezes a frozen card', async () => {
    await service.freezeCard(PHYSICAL);
    assert.equal((await service.unfreezeCard(PHYSICAL)).status, 'active');
  });

  it('refuses to unfreeze a card that is not frozen', async () => {
    await assert.rejects(() => service.unfreezeCard(PHYSICAL));
  });

  it('refuses to freeze a cancelled card', async () => {
    await service.reportLostOrStolen(PHYSICAL, 'stolen');
    await assert.rejects(() => service.freezeCard(PHYSICAL));
  });

  it('freezes one card without touching the other', async () => {
    await service.freezeCard(PHYSICAL);
    assert.equal((await service.getCardById(VIRTUAL)).status, 'active');
  });
});

describe('a frozen card cannot transact', () => {
  it('declines a purchase and says why', async () => {
    await service.freezeCard(PHYSICAL);
    await assert.rejects(
      () => buy(PHYSICAL, 20),
      (error: unknown) => {
        assert.ok(error instanceof CardDeclinedError);
        assert.equal(error.declineCode, 'card-frozen');
        assert.match(error.message, /frozen/);
        assert.ok(error.remedy);
        return true;
      },
    );
  });

  it('does not move the balance when it declines', async () => {
    await service.freezeCard(PHYSICAL);
    const before = getAccounts().find((account) => account.id === 'acc_usd')!.balance.minorUnits;
    await assert.rejects(() => buy(PHYSICAL, 20));
    assert.equal(
      getAccounts().find((account) => account.id === 'acc_usd')!.balance.minorUnits,
      before,
    );
  });

  it('does not write a transaction when it declines', async () => {
    await service.freezeCard(PHYSICAL);
    const before = getTransactions().length;
    await assert.rejects(() => buy(PHYSICAL, 20));
    assert.equal(getTransactions().length, before);
  });

  it('lets the same purchase through once unfrozen', async () => {
    await service.freezeCard(PHYSICAL);
    await assert.rejects(() => buy(PHYSICAL, 20));
    await service.unfreezeCard(PHYSICAL);
    assert.ok(await buy(PHYSICAL, 20));
  });

  const BLOCKED: readonly [CardStatus, string][] = [
    ['pending', 'card-pending'],
    ['expired', 'card-expired'],
    ['cancelled', 'card-cancelled'],
  ];

  for (const [status, code] of BLOCKED) {
    it(`declines a ${status} card`, () => {
      const card = { ...baseCard(), status };
      const declined = declineReason(
        card,
        {
          onlinePayments: true,
          atmWithdrawals: true,
          internationalPayments: true,
          contactlessPayments: true,
        },
        {
          idempotencyKey: newIdempotencyKey('auth'),
          cardId: card.id,
          amount: fromMajor(10, 'USD'),
          merchant: 'Anywhere',
        },
      );
      assert.equal(declined?.declineCode, code);
    });
  }
});

describe('card controls', () => {
  it('declines an online payment when online payments are off', async () => {
    await service.updateControls(PHYSICAL, { onlinePayments: false });
    await assert.rejects(
      () => buy(PHYSICAL, 20, { online: true }),
      (error: unknown) => {
        assert.ok(error instanceof CardDeclinedError);
        assert.equal(error.declineCode, 'online-payments-off');
        return true;
      },
    );
  });

  it('still allows an in-store payment when only online is off', async () => {
    await service.updateControls(PHYSICAL, { onlinePayments: false });
    assert.ok(await buy(PHYSICAL, 20));
  });

  it('declines an international payment when that control is off', async () => {
    await assert.rejects(
      () => buy(PHYSICAL, 20, { international: true }),
      (error: unknown) => {
        assert.ok(error instanceof CardDeclinedError);
        assert.equal(error.declineCode, 'international-payments-off');
        return true;
      },
    );
  });

  it('declines an ATM withdrawal on a virtual card', async () => {
    await assert.rejects(
      () => buy(VIRTUAL, 20, { atm: true }),
      (error: unknown) => {
        assert.ok(error instanceof CardDeclinedError);
        assert.equal(error.declineCode, 'atm-withdrawals-off');
        return true;
      },
    );
  });

  it('refuses to turn on a control a virtual card cannot honour', async () => {
    await assert.rejects(() => service.updateControls(VIRTUAL, { atmWithdrawals: true }));
  });
});

describe('spending limits', () => {
  it('reports the shared wallet balance, never a card balance', async () => {
    const [spending, wallet] = await Promise.all([
      service.getSpending(PHYSICAL),
      mockWalletService.getBalance(),
    ]);
    assert.deepEqual(spending.availableBalance, wallet.total);
  });

  it('declines a purchase over the monthly limit', async () => {
    await service.updateLimits(PHYSICAL, { monthlyLimit: fromMajor(50, 'USD') });
    await assert.rejects(
      () => buy(PHYSICAL, 400),
      (error: unknown) => {
        assert.ok(error instanceof CardDeclinedError);
        assert.equal(error.declineCode, 'monthly-limit-reached');
        return true;
      },
    );
  });

  it('declines an ATM withdrawal over the daily limit', async () => {
    await service.updateControls(PHYSICAL, { atmWithdrawals: true });
    await service.updateLimits(PHYSICAL, { atmDailyLimit: fromMajor(20, 'USD') });
    await assert.rejects(
      () => buy(PHYSICAL, 100, { atm: true }),
      (error: unknown) => {
        assert.ok(error instanceof CardDeclinedError);
        assert.equal(error.declineCode, 'atm-limit-reached');
        return true;
      },
    );
  });

  it('declines when the shared balance is short, whatever the limit allows', async () => {
    await service.updateLimits(PHYSICAL, { monthlyLimit: fromMajor(1_000_000, 'USD') });
    await assert.rejects(() => buy(PHYSICAL, 900_000), InsufficientFundsError);
  });
});

describe('card transactions use the one ledger', () => {
  it('reads this card\u2019s rows out of the shared ledger', async () => {
    const rows = await service.listCardTransactions(PHYSICAL);
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.cardId === PHYSICAL));
  });

  it('does not mix another card in', async () => {
    const rows = await service.listCardTransactions(VIRTUAL);
    assert.ok(rows.every((row) => row.cardId === VIRTUAL));
  });

  it('writes a purchase into the same ledger the wallet reads', async () => {
    const before = getTransactions().length;
    const transaction = await buy(PHYSICAL, 30);
    assert.equal(getTransactions().length, before + 1);
    assert.equal(transaction.type, 'card');
    assert.equal(transaction.direction, 'debit');
    assert.equal(transaction.cardId, PHYSICAL);
    assert.ok(getTransactions().some((row) => row.id === transaction.id));
  });

  it('debits the shared wallet balance', async () => {
    const before = getAccounts().find((account) => account.id === 'acc_usd')!.balance.minorUnits;
    await buy(PHYSICAL, 30);
    assert.equal(
      getAccounts().find((account) => account.id === 'acc_usd')!.balance.minorUnits,
      before - 3_000,
    );
  });

  it('shows the purchase in the card view too', async () => {
    const transaction = await buy(PHYSICAL, 30);
    const rows = await service.listCardTransactions(PHYSICAL);
    assert.ok(rows.some((row) => row.id === transaction.id));
  });

  it('lists the newest first', async () => {
    const rows = await service.listCardTransactions(PHYSICAL);
    for (let index = 1; index < rows.length; index += 1) {
      assert.ok(rows[index - 1].occurredAt >= rows[index].occurredAt);
    }
  });
});

describe('replacing a card', () => {
  it('cancels the reported card', async () => {
    await service.reportLostOrStolen(PHYSICAL, 'stolen');
    const card = await service.getCardById(PHYSICAL);
    assert.equal(card.status, 'cancelled');
    assert.match(card.statusReason ?? '', /stolen/);
  });

  it('issues a replacement that is on its way', async () => {
    const replacement = await service.reportLostOrStolen(PHYSICAL, 'lost');
    assert.ok(replacement.replacementCardId);
    const issued = await service.getCardById(replacement.replacementCardId!);
    assert.equal(issued.status, 'pending');
    assert.equal(issued.delivery?.stage, 'ordered');
  });

  it('gives the replacement a different number', async () => {
    const replacement = await service.reportLostOrStolen(PHYSICAL, 'lost');
    const issued = await service.getCardById(replacement.replacementCardId!);
    assert.notEqual(issued.last4, '4429');
  });

  it('carries the controls over to the replacement', async () => {
    await service.updateControls(PHYSICAL, { onlinePayments: false });
    const replacement = await service.reportLostOrStolen(PHYSICAL, 'lost');
    const controls = await service.getControls(replacement.replacementCardId!);
    assert.equal(controls.onlinePayments, false);
  });

  it('refuses to report the same card twice', async () => {
    await service.reportLostOrStolen(PHYSICAL, 'lost');
    await assert.rejects(() => service.reportLostOrStolen(PHYSICAL, 'lost'));
  });

  it('does not post a replacement for a virtual card', async () => {
    const replacement = await service.reportLostOrStolen(VIRTUAL, 'stolen');
    assert.equal(replacement.replacementCardId, undefined);
  });

  it('reports the replacement against either card', async () => {
    const replacement = await service.reportLostOrStolen(PHYSICAL, 'lost');
    assert.equal((await service.getReplacement(PHYSICAL))?.id, replacement.id);
    assert.equal(
      (await service.getReplacement(replacement.replacementCardId!))?.id,
      replacement.id,
    );
  });
});

describe('activating a delivered card', () => {
  it('turns a pending card active', async () => {
    const replacement = await service.reportLostOrStolen(PHYSICAL, 'lost');
    const activated = await service.activateCard(replacement.replacementCardId!, {
      method: 'tap',
    });
    assert.equal(activated.status, 'active');
    assert.equal(activated.delivery, undefined);
  });

  it('refuses to activate a card that is already active', async () => {
    await assert.rejects(() => service.activateCard(VIRTUAL, { method: 'tap' }));
  });

  it('cannot be paid with until it is activated', async () => {
    const replacement = await service.reportLostOrStolen(PHYSICAL, 'lost');
    await assert.rejects(
      () => buy(replacement.replacementCardId!, 20),
      (error: unknown) => {
        assert.ok(error instanceof CardDeclinedError);
        assert.equal(error.declineCode, 'card-pending');
        return true;
      },
    );
  });
});

describe('the account freeze outranks the card', () => {
  it('blocks a card that is itself active', async () => {
    await mockSecurityService.setAccountFrozen(true);
    await assert.rejects(() => buy(PHYSICAL, 20));
  });
});

/** A card shaped like the demo one, for testing the decision table directly. */
function baseCard(): Card {
  return {
    id: 'card_test',
    format: 'physical',
    status: 'active',
    last4: '0000',
    holderName: 'Khaled Faiad',
    expiry: '09/29',
    network: 'visa',
    monthToDateSpend: fromMajor(0, 'USD'),
    isPrimary: false,
  };
}
