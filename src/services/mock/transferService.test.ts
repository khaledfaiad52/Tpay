import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  InsufficientFundsError,
  UnsupportedCorridorError,
  type Recipient,
  type RecipientDraft,
  newIdempotencyKey,
} from '@/services/contracts';
import { fromMajor } from '@/types';
import { findAccount, getTransactions, resetStore } from './data/store';
import { rateBetween } from './fxService';
import { resetIdempotency } from './idempotency';
import { configureMockBehaviour } from './latency';
import { mockTransferService, resetTransfers } from './transferService';
import { mockWalletService } from './walletService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetIdempotency();
  resetStore();
  resetTransfers();
});

const service = mockTransferService;

/** Adds a recipient of the given shape and returns it. */
async function recipient(overrides: Partial<RecipientDraft> = {}): Promise<Recipient> {
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

async function quoteFor(
  target: Recipient,
  sourceAccountId: string,
  major: number,
  currency: Parameters<typeof fromMajor>[1],
) {
  return service.quoteTransfer({
    recipientId: target.id,
    sourceAccountId,
    sendAmount: fromMajor(major, currency),
  });
}

describe('quoteTransfer — the recipient receives exactly what was entered', () => {
  it('USD → USD leaves the amount untouched and adds the fee on top', async () => {
    const target = await recipient({ country: 'United States', currency: 'USD' });
    const quote = await quoteFor(target, 'acc_usd', 1000, 'USD');

    assert.deepEqual(quote.sendAmount, fromMajor(1000, 'USD'));
    assert.deepEqual(quote.receiveAmount, fromMajor(1000, 'USD'));
    assert.deepEqual(quote.fee, fromMajor(2.5, 'USD'));
    assert.deepEqual(quote.totalDebit, fromMajor(1002.5, 'USD'));
    assert.equal(quote.fxRate, undefined, 'same currency needs no rate');
  });

  it('USD → EGP converts the full amount at the corridor rate', async () => {
    const target = await recipient();
    const quote = await quoteFor(target, 'acc_usd', 1000, 'USD');

    const rate = rateBetween('USD', 'EGP');
    assert.equal(quote.fxRate, rate);
    assert.deepEqual(quote.receiveAmount, fromMajor(1000 * rate, 'EGP'));
    // The fee never comes out of what the recipient gets.
    assert.deepEqual(quote.totalDebit, fromMajor(1002.5, 'USD'));
  });

  it('SAR → EGP works the same from a non-USD wallet', async () => {
    const target = await recipient();
    const quote = await quoteFor(target, 'acc_sar', 1000, 'SAR');

    assert.equal(quote.sendAmount.currency, 'SAR');
    assert.equal(quote.receiveAmount.currency, 'EGP');
    assert.equal(quote.fxRate, rateBetween('SAR', 'EGP'));
    assert.equal(quote.fee.currency, 'SAR', 'the fee is charged where it is debited');
    assert.equal(
      quote.totalDebit.minorUnits,
      quote.sendAmount.minorUnits + quote.fee.minorUnits,
    );
  });

  it('prices the same fee in whichever currency it is charged', async () => {
    const target = await recipient();
    const fromUsd = await quoteFor(target, 'acc_usd', 100, 'USD');
    const fromSar = await quoteFor(target, 'acc_sar', 100, 'SAR');

    assert.deepEqual(fromUsd.fee, fromMajor(2.5, 'USD'));
    // $2.50 expressed in riyals.
    assert.deepEqual(fromSar.fee, fromMajor(2.5 * rateBetween('USD', 'SAR'), 'SAR'));
  });

  it('charges nothing to send to another TPay user', async () => {
    const target = await recipient({
      kind: 'tpay-user',
      handle: '@nour',
      country: undefined,
      currency: 'USD',
      institution: 'TPay balance',
    });
    const quote = await quoteFor(target, 'acc_usd', 250, 'USD');

    assert.equal(quote.fee.minorUnits, 0);
    assert.deepEqual(quote.totalDebit, quote.sendAmount);
    assert.equal(quote.estimatedDelivery, 'Arrives instantly');
  });

  it('rejects a corridor TPay cannot pay out on', async () => {
    // TPay has no mobile-wallet operator in the United Kingdom.
    const target = await recipient({
      kind: 'mobile-wallet',
      country: 'United Kingdom',
      currency: 'GBP',
      institution: 'Some wallet',
    });

    await assert.rejects(
      () => quoteFor(target, 'acc_usd', 100, 'USD'),
      (error: Error) => error instanceof UnsupportedCorridorError,
    );
  });
});

describe('createTransfer — a successful send', () => {
  it('debits the total, not just the amount sent', async () => {
    const target = await recipient();
    const before = findAccount('acc_usd')!.balance.minorUnits;
    const quote = await quoteFor(target, 'acc_usd', 1000, 'USD');

    await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    assert.equal(findAccount('acc_usd')!.balance.minorUnits, before - 100250);
  });

  it('debits whichever wallet was chosen', async () => {
    const target = await recipient();
    const usdBefore = findAccount('acc_usd')!.balance.minorUnits;
    const sarBefore = findAccount('acc_sar')!.balance.minorUnits;

    const quote = await quoteFor(target, 'acc_sar', 100, 'SAR');
    await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    assert.equal(findAccount('acc_usd')!.balance.minorUnits, usdBefore, 'USD untouched');
    assert.equal(
      findAccount('acc_sar')!.balance.minorUnits,
      sarBefore - quote.totalDebit.minorUnits,
    );
  });

  it('creates one transaction on the source account', async () => {
    const target = await recipient();
    const quote = await quoteFor(target, 'acc_usd', 1000, 'USD');
    const { transaction } = await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    assert.ok(transaction);
    assert.equal(transaction.type, 'transfer');
    assert.equal(transaction.direction, 'debit');
    assert.equal(transaction.accountId, 'acc_usd');
    assert.deepEqual(transaction.amount, quote.totalDebit);
    assert.deepEqual(transaction.fee, quote.fee);
    assert.equal(getTransactions()[0].id, transaction.id, 'it leads the activity list');
  });

  it('lowers the wallet total by the amount that left', async () => {
    const target = await recipient({ country: 'United States', currency: 'USD' });
    const before = (await mockWalletService.getBalance()).total.minorUnits;

    const quote = await quoteFor(target, 'acc_usd', 500, 'USD');
    await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    const after = (await mockWalletService.getBalance()).total.minorUnits;
    assert.equal(after, before - quote.totalDebit.minorUnits);
  });

  it('records a transfer that can be read back', async () => {
    const target = await recipient();
    const quote = await quoteFor(target, 'acc_usd', 1000, 'USD');
    const { transfer } = await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    const stored = await service.getTransfer(transfer.id);
    assert.equal(stored.id, transfer.id);
    assert.deepEqual(stored.receiveAmount, quote.receiveAmount);
    assert.equal((await service.listTransfers())[0].id, transfer.id);
  });

  it('refuses to book the same quote twice', async () => {
    const target = await recipient();
    const quote = await quoteFor(target, 'acc_usd', 10, 'USD');
    await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    await assert.rejects(() => service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id }));
  });
});

describe('createTransfer — pending and instant settlement', () => {
  it('leaves a bank payout processing, with a pending transaction', async () => {
    const target = await recipient();
    const quote = await quoteFor(target, 'acc_usd', 100, 'USD');
    const { transfer, transaction } = await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    assert.equal(transfer.status, 'processing');
    assert.equal(transaction?.status, 'pending');
    assert.equal(transfer.estimatedDelivery, '1–2 business days');
  });

  it('settles a TPay-to-TPay send immediately', async () => {
    const target = await recipient({
      kind: 'tpay-user',
      handle: '@nour',
      country: undefined,
      currency: 'USD',
      institution: 'TPay balance',
    });
    const quote = await quoteFor(target, 'acc_usd', 100, 'USD');
    const { transfer, transaction } = await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });

    assert.equal(transfer.status, 'completed');
    assert.equal(transaction?.status, 'completed');
  });
});

describe('createTransfer — nothing moves when it fails', () => {
  it('leaves the balance untouched on a rejected transfer', async () => {
    const target = await recipient();
    const before = findAccount('acc_usd')!.balance.minorUnits;
    const transactionsBefore = getTransactions().length;

    const quote = await quoteFor(target, 'acc_usd', 1000, 'USD');
    const { transfer, transaction } = await service.createTransfer({
      idempotencyKey: newIdempotencyKey(),
      quoteId: quote.id,
      demoOutcome: 'failure',
    });

    assert.equal(transfer.status, 'failed');
    assert.equal(transaction, undefined, 'a failed transfer has no ledger entry');
    assert.equal(findAccount('acc_usd')!.balance.minorUnits, before);
    assert.equal(getTransactions().length, transactionsBefore);
    assert.ok(transfer.failureReason);
    assert.equal(transfer.errorCode, 'RECIPIENT_REJECTED');
  });

  it('still records the attempt, so the user can see what happened', async () => {
    const target = await recipient();
    const quote = await quoteFor(target, 'acc_usd', 1000, 'USD');
    const { transfer } = await service.createTransfer({
      idempotencyKey: newIdempotencyKey(),
      quoteId: quote.id,
      demoOutcome: 'failure',
    });

    assert.equal((await service.getTransfer(transfer.id)).status, 'failed');
  });

  it('rejects a transfer the balance cannot cover, fee included', async () => {
    const target = await recipient({ country: 'United States', currency: 'USD' });
    // The balance covers the amount exactly, but not the $2.50 on top.
    const quote = await quoteFor(target, 'acc_usd', 8250, 'USD');

    await assert.rejects(
      () => service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id }),
      (error: Error) => error instanceof InsufficientFundsError,
    );
    assert.equal(findAccount('acc_usd')!.balance.minorUnits, 825000);
  });
});

describe('recipients', () => {
  it('keeps a recipient the user chose to save', async () => {
    const before = (await service.listRecipients()).length;
    await recipient({ name: 'Hana Saleh', save: true });

    const after = await service.listRecipients();
    assert.equal(after.length, before + 1);
    assert.equal(after[0].name, 'Hana Saleh');
    assert.equal(after[0].initials, 'HS');
  });

  it('does not keep one the user declined to save', async () => {
    const before = (await service.listRecipients()).length;
    const created = await recipient({ name: 'One Off', save: false });

    assert.equal((await service.listRecipients()).length, before);
    assert.equal(created.saved, false);
  });

  it('can still be paid even when it was not saved', async () => {
    const created = await recipient({ name: 'One Off', save: false });
    const quote = await quoteFor(created, 'acc_usd', 50, 'USD');

    const { transfer } = await service.createTransfer({ idempotencyKey: newIdempotencyKey(), quoteId: quote.id });
    assert.equal(transfer.recipient.id, created.id);
  });

  it('finds a saved recipient by username, with or without the @', async () => {
    assert.equal((await service.findRecipient('@ahmed'))?.name, 'Ahmed Mansour');
    assert.equal((await service.findRecipient('ahmed'))?.name, 'Ahmed Mansour');
  });

  it('returns nothing for an unknown handle', async () => {
    assert.equal(await service.findRecipient('@nobody-here'), null);
  });
});
