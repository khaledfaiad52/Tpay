import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Recipient } from '@/services';
import {
  formatRecipientDestination,
  formatRecipientHandle,
  maskTail,
} from './recipientDisplay';

function recipient(overrides: Partial<Recipient>): Recipient {
  return {
    id: 'rcp_test',
    kind: 'bank-account',
    name: 'Ahmed Mansour',
    handle: 'AE12 0260 0010 2233 4455 667',
    initials: 'AM',
    institution: 'Emirates NBD',
    ...overrides,
  };
}

describe('maskTail', () => {
  it('keeps the last four characters, ignoring spacing', () => {
    assert.equal(maskTail('AE12 0260 0010 2233 4455 667'), '••5667');
  });

  it('does not mask something already short', () => {
    assert.equal(maskTail('1234'), '1234');
  });
});

describe('formatRecipientHandle', () => {
  it('masks a bank account number', () => {
    assert.equal(formatRecipientHandle(recipient({})), '••5667');
    assert.equal(formatRecipientHandle(recipient({ kind: 'international' })), '••5667');
  });

  it('leaves a username as the user knows it', () => {
    assert.equal(
      formatRecipientHandle(recipient({ kind: 'tpay-user', handle: '@ahmed' })),
      '@ahmed',
    );
  });

  it('leaves a phone number readable, so it can be checked', () => {
    assert.equal(
      formatRecipientHandle(recipient({ kind: 'mobile-wallet', handle: '+20 10 1234 5678' })),
      '+20 10 1234 5678',
    );
  });
});

describe('formatRecipientDestination', () => {
  it('names the institution before the destination', () => {
    assert.equal(formatRecipientDestination(recipient({})), 'Emirates NBD ••5667');
  });

  it('falls back to the destination alone', () => {
    assert.equal(
      formatRecipientDestination(
        recipient({ kind: 'username', handle: '@layla', institution: undefined }),
      ),
      '@layla',
    );
  });
});
