import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromMajor, type Card, type CardStatus } from '@/types';
import {
  canCardSpend,
  canReplace,
  canUnfreeze,
  cardBlockedReason,
  CARD_STATUS_LABELS,
  CARD_STATUS_TONES,
} from './cardPresentation';

const ALL: readonly CardStatus[] = ['active', 'frozen', 'pending', 'expired', 'cancelled'];

function card(status: CardStatus, overrides: Partial<Card> = {}): Card {
  return {
    id: 'card_test',
    format: 'physical',
    status,
    last4: '4429',
    holderName: 'Khaled Faiad',
    expiry: '09/29',
    network: 'visa',
    monthToDateSpend: fromMajor(0, 'USD'),
    isPrimary: true,
    ...overrides,
  };
}

describe('card presentation', () => {
  it('labels all five states', () => {
    for (const status of ALL) {
      assert.ok(CARD_STATUS_LABELS[status].length > 0, status);
      assert.ok(CARD_STATUS_TONES[status].length > 0, status);
    }
  });

  it('lets only an active card spend', () => {
    for (const status of ALL) {
      assert.equal(canCardSpend(card(status)), status === 'active', status);
    }
  });

  it('explains every state that cannot spend', () => {
    for (const status of ALL) {
      const reason = cardBlockedReason(card(status));
      if (status === 'active') assert.equal(reason, undefined);
      else assert.ok(reason && reason.length > 0, status);
    }
  });

  it('prefers the reason the card carries over the generic copy', () => {
    const reason = cardBlockedReason(
      card('cancelled', { statusReason: 'Reported stolen on 12 August.' }),
    );
    assert.equal(reason, 'Reported stolen on 12 August.');
  });

  it('offers unfreeze only for a frozen card', () => {
    for (const status of ALL) {
      assert.equal(canUnfreeze(card(status)), status === 'frozen', status);
    }
  });

  it('offers a replacement for a physical card that is not already on its way', () => {
    assert.equal(canReplace(card('active')), true);
    assert.equal(canReplace(card('expired')), true);
    assert.equal(canReplace(card('pending')), false);
    assert.equal(canReplace(card('active', { format: 'virtual' })), false);
  });
});
