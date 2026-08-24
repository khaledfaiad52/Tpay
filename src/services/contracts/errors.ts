/**
 * Errors any adapter may throw, so screens can react to a cause rather than
 * matching on a message. A provider-backed adapter maps its own error codes
 * onto these.
 */
import type { CurrencyCode } from '@/types';
import type { PasswordProblem } from './securityService';
import type { RecipientKind, TransferLimit } from './transferService';

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found`);
    this.name = 'NotFoundError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(message = 'There is not enough in that account.') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

export class QuoteExpiredError extends Error {
  constructor(message = 'That rate has expired. Refresh to get a new one.') {
    super(message);
    this.name = 'QuoteExpiredError';
  }
}

/** A password change was refused, and why. */
export class PasswordRejectedError extends Error {
  readonly problem: PasswordProblem;

  constructor(problem: PasswordProblem, message: string) {
    super(message);
    this.name = 'PasswordRejectedError';
    this.problem = problem;
  }
}

/** The device cannot do biometrics, or the user declined the prompt. */
export class BiometricUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BiometricUnavailableError';
  }
}

/** The transfer is larger than a limit that applies to this user. */
export class TransferLimitExceededError extends Error {
  readonly limitId: string;
  /** The whole limit, so a screen can explain the ceiling and the way past it. */
  readonly limit: TransferLimit;

  constructor(limit: TransferLimit) {
    super(
      limit.max.minorUnits === 0
        ? `Sending is paused while your ${limit.label} applies.`
        : `This transfer is over your ${limit.label}.`,
    );
    this.name = 'TransferLimitExceededError';
    this.limitId = limit.id;
    this.limit = limit;
  }
}

/** TPay cannot pay out that currency by that method — yet. */
export class UnsupportedCorridorError extends Error {
  readonly kind: RecipientKind;
  readonly currency: CurrencyCode;

  constructor(kind: RecipientKind, currency: CurrencyCode) {
    super(`TPay cannot pay out ${currency} to a ${kind} recipient yet.`);
    this.name = 'UnsupportedCorridorError';
    this.kind = kind;
    this.currency = currency;
  }
}
