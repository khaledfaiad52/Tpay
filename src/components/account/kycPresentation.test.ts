import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { KycState } from '@/services';
import type { KycStatus } from '@/types';
import { presentKyc } from './kycPresentation';

const ALL: readonly KycStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'ACTION_REQUIRED',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED',
];

function state(status: KycStatus, reason?: string): KycState {
  return { status, reason, updatedAt: '2026-03-18T10:00:00.000Z' };
}

describe('presentKyc', () => {
  it('covers all seven verification states', () => {
    for (const status of ALL) {
      const presentation = presentKyc(state(status));
      assert.ok(presentation.headline.length > 0, status);
      assert.ok(presentation.detail.length > 0, status);
      assert.ok(presentation.badge.length > 0, status);
    }
  });

  it('gives a verified account nothing left to do', () => {
    const presentation = presentKyc(state('VERIFIED'));
    assert.equal(presentation.action, undefined);
    assert.equal(presentation.tone, 'verified');
    assert.match(presentation.detail, /verified 18 March 2026/);
  });

  it('waits quietly while a submission is in review', () => {
    const presentation = presentKyc(state('SUBMITTED'));
    assert.equal(presentation.action, undefined);
    assert.equal(presentation.tone, 'pending');
  });

  it('sends an unverified user into verification', () => {
    for (const status of ['NOT_STARTED', 'IN_PROGRESS', 'ACTION_REQUIRED'] as const) {
      assert.equal(presentKyc(state(status)).action?.target, 'verify', status);
    }
  });

  it('sends a blocked account to support, not back into verification', () => {
    for (const status of ['REJECTED', 'SUSPENDED'] as const) {
      assert.equal(presentKyc(state(status)).action?.target, 'support', status);
      assert.equal(presentKyc(state(status)).tone, 'blocked', status);
    }
  });

  it('prefers the reviewer reason over the generic copy', () => {
    const presentation = presentKyc(
      state('ACTION_REQUIRED', 'Your proof of address is older than three months.'),
    );
    assert.equal(presentation.detail, 'Your proof of address is older than three months.');
  });

  it('uses icons from the icon system, never an emoji', () => {
    for (const status of ALL) {
      assert.match(presentKyc(state(status)).icon, /^[a-z-]+$/);
    }
  });
});
