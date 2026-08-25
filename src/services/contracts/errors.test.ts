import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromMajor } from '@/types';
import {
  AccountRestrictedError,
  BiometricUnavailableError,
  CardDeclinedError,
  DomainError,
  DuplicateOperationError,
  hasCode,
  InsufficientFundsError,
  InvalidCredentialsError,
  isDomainError,
  isOutcomeUnknown,
  KycRequiredError,
  NetworkError,
  NotFoundError,
  OtpExpiredError,
  OtpInvalidError,
  PasswordRejectedError,
  ProviderUnavailableError,
  QuoteExpiredError,
  SessionExpiredError,
  TimeoutError,
  TooManyAttemptsError,
  TransferLimitExceededError,
  UnsupportedCorridorError,
  type DomainErrorCode,
} from './errors';

/** One of each, so nothing can be added without being covered here. */
const ALL: readonly DomainError[] = [
  new NotFoundError('Account', 'acc_x'),
  new InsufficientFundsError(),
  new AccountRestrictedError({
    code: 'account-frozen',
    title: 'Your account is frozen',
    explanation: 'Unfreeze it in Security.',
    action: { kind: 'unfreeze-account', label: 'Unfreeze in Security' },
  }),
  new KycRequiredError(),
  new TransferLimitExceededError({
    id: 'lim_x',
    label: 'per-transfer limit',
    scope: {},
    period: 'per-transaction',
    max: fromMajor(500, 'USD'),
  }),
  new UnsupportedCorridorError('mobile-wallet', 'GBP'),
  new QuoteExpiredError(),
  new CardDeclinedError('card-frozen', 'This card is frozen.'),
  new InvalidCredentialsError(),
  new OtpInvalidError(2),
  new OtpExpiredError(),
  new TooManyAttemptsError(new Date().toISOString()),
  new SessionExpiredError(),
  new PasswordRejectedError('too-short', 'Use at least 10 characters.'),
  new BiometricUnavailableError('No hardware.'),
  new DuplicateOperationError('key_x'),
  new ProviderUnavailableError(),
  new TimeoutError(),
  new NetworkError(),
];

describe('the domain error model', () => {
  it('gives every error a stable code', () => {
    const codes = ALL.map((error) => error.code);
    assert.equal(new Set(codes).size, codes.length, 'two errors share a code');
  });

  it('covers every code the domain declares', () => {
    const declared: readonly DomainErrorCode[] = [
      'not-found',
      'insufficient-funds',
      'account-restricted',
      'kyc-required',
      'transfer-limit-exceeded',
      'unsupported-corridor',
      'quote-expired',
      'card-declined',
      'invalid-credentials',
      'otp-invalid',
      'otp-expired',
      'too-many-attempts',
      'session-expired',
      'password-rejected',
      'biometric-unavailable',
      'duplicate-operation',
      'provider-unavailable',
      'timeout',
      'network',
    ];
    const produced = new Set(ALL.map((error) => error.code));
    for (const code of declared) {
      assert.ok(produced.has(code), `nothing produces "${code}"`);
    }
  });

  it('gives every error a message a person could read', () => {
    for (const error of ALL) {
      assert.ok(error.message.length > 0, error.code);
      assert.equal(error.message.includes('undefined'), false, error.code);
    }
  });

  it('names every error after its class, for logs and crash reports', () => {
    assert.equal(new NetworkError().name, 'NetworkError');
    assert.equal(new TimeoutError().name, 'TimeoutError');
  });

  it('recognises its own errors', () => {
    for (const error of ALL) assert.equal(isDomainError(error), true, error.code);
    assert.equal(isDomainError(new Error('plain')), false);
    assert.equal(isDomainError('a string'), false);
    assert.equal(isDomainError(undefined), false);
  });

  it('matches on a code without instanceof', () => {
    assert.equal(hasCode(new InsufficientFundsError(), 'insufficient-funds'), true);
    assert.equal(hasCode(new InsufficientFundsError(), 'network'), false);
    assert.equal(hasCode(new Error('plain'), 'network'), false);
  });

  it('marks only the failures a retry could fix as retryable', () => {
    assert.equal(new NetworkError().retryable, true);
    assert.equal(new TimeoutError().retryable, true);
    assert.equal(new ProviderUnavailableError().retryable, true);
    assert.equal(new InsufficientFundsError().retryable, false);
    assert.equal(new InvalidCredentialsError().retryable, false);
  });

  it('flags exactly the failures that leave the outcome unknown', () => {
    assert.equal(isOutcomeUnknown(new TimeoutError()), true);
    assert.equal(isOutcomeUnknown(new ProviderUnavailableError()), true);
    // A network failure never left the device, so nothing moved.
    assert.equal(isOutcomeUnknown(new NetworkError()), false);
    assert.equal(isOutcomeUnknown(new InsufficientFundsError()), false);
  });

  it('keeps a card decline reason distinct from the domain code', () => {
    const declined = new CardDeclinedError('monthly-limit-reached', 'Over the limit.');
    assert.equal(declined.code, 'card-declined');
    assert.equal(declined.declineCode, 'monthly-limit-reached');
  });

  it('carries what a screen needs to act on', () => {
    assert.equal(new OtpInvalidError(2).attemptsRemaining, 2);
    assert.equal(new DuplicateOperationError('key_x').idempotencyKey, 'key_x');
    assert.equal(new NotFoundError('Card', 'card_x').entityId, 'card_x');
    assert.equal(new KycRequiredError('SUBMITTED').requiredStatus, 'SUBMITTED');
  });

  it('is catchable as one family', () => {
    for (const error of ALL) assert.ok(error instanceof DomainError, error.code);
    assert.ok(new NetworkError() instanceof Error);
  });
});
