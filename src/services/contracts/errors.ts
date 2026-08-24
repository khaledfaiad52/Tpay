/**
 * Errors any adapter may throw, so screens can react to a cause rather than
 * matching on a message. A provider-backed adapter maps its own error codes
 * onto these.
 */
import type { CurrencyCode } from '@/types';
import type { AccountRestriction, PasswordProblem } from './securityService';
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

/**
 * The account may not move money.
 *
 * Thrown by every service that moves money, from one shared check, so a
 * restriction cannot be honoured in one place and forgotten in another. The
 * cause — a freeze the user applied, or a verification TPay declined — is on
 * the restriction rather than in the error's name.
 */
export class AccountRestrictedError extends Error {
  readonly restriction: AccountRestriction;

  constructor(restriction: AccountRestriction) {
    super(restriction.explanation);
    this.name = 'AccountRestrictedError';
    this.restriction = restriction;
  }
}

/**
 * The card cannot pay for this.
 *
 * `code` says which rule stopped it, so the screen can point at the control
 * the user can actually change rather than showing one generic refusal.
 */
export class CardDeclinedError extends Error {
  readonly code: CardDeclineCode;
  /** The control or state that would have to change. */
  readonly remedy?: string;

  constructor(code: CardDeclineCode, message: string, remedy?: string) {
    super(message);
    this.name = 'CardDeclinedError';
    this.code = code;
    this.remedy = remedy;
  }
}

export type CardDeclineCode =
  | 'card-frozen'
  | 'card-pending'
  | 'card-expired'
  | 'card-cancelled'
  | 'online-payments-off'
  | 'atm-withdrawals-off'
  | 'international-payments-off'
  | 'contactless-off'
  | 'monthly-limit-reached'
  | 'atm-limit-reached';

/** The identifier and password did not match anything. */
export class InvalidCredentialsError extends Error {
  constructor(message = "That email or password isn't right.") {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

/** The code was wrong. Carries what is left so the screen can warn in time. */
export class OtpInvalidError extends Error {
  readonly attemptsRemaining: number;

  constructor(attemptsRemaining: number) {
    super(
      attemptsRemaining > 0
        ? `That code isn't right. ${attemptsRemaining} ${attemptsRemaining === 1 ? 'try' : 'tries'} left.`
        : "That code isn't right.",
    );
    this.name = 'OtpInvalidError';
    this.attemptsRemaining = attemptsRemaining;
  }
}

/** The code was right once, but it has run out. */
export class OtpExpiredError extends Error {
  constructor(message = 'That code has expired. Send a new one.') {
    super(message);
    this.name = 'OtpExpiredError';
  }
}

/** Too many wrong attempts. `retryAfter` is an ISO-8601 timestamp. */
export class TooManyAttemptsError extends Error {
  readonly retryAfter: string;

  constructor(retryAfter: string, message = 'Too many attempts. Try again in a few minutes.') {
    super(message);
    this.name = 'TooManyAttemptsError';
    this.retryAfter = retryAfter;
  }
}

/** The session ran out. The app must return to the login screen. */
export class SessionExpiredError extends Error {
  constructor(message = 'Your session has expired. Log in again to continue.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/** The request never reached anything. Distinct from a rejection. */
export class NetworkError extends Error {
  constructor(message = "We couldn't reach TPay. Check your connection and try again.") {
    super(message);
    this.name = 'NetworkError';
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
