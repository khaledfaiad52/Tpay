/**
 * The domain error model.
 *
 * Every failure the app can show a user is one of these. A provider-backed
 * adapter maps its own vocabulary onto them, so no screen ever sees a
 * provider's error code — or its name.
 *
 * Each error carries a stable `code`. `instanceof` works inside one bundle,
 * but a real adapter reconstructs errors from an HTTP response, and a code is
 * what survives that boundary. Screens should branch on `error.code` via
 * `isDomainError`, and use `instanceof` only when they need a field the
 * subclass adds.
 */
import type { CurrencyCode } from '@/types';
import type { AccountRestriction, PasswordProblem } from './securityService';
import type { RecipientKind, TransferLimit } from './transferService';

/**
 * Every code the domain can produce. Adding one here forces every exhaustive
 * mapping in the app to account for it.
 */
export type DomainErrorCode =
  /** Nothing with that identifier exists. */
  | 'not-found'
  /** The account does not hold enough for this movement. */
  | 'insufficient-funds'
  /** A frozen account, or one whose verification was declined or suspended. */
  | 'account-restricted'
  /** Verification has to be finished before this is allowed. */
  | 'kyc-required'
  /** Over a ceiling that applies to this user. */
  | 'transfer-limit-exceeded'
  /** TPay cannot pay out that currency by that method. */
  | 'unsupported-corridor'
  /** The priced rate is no longer good. */
  | 'quote-expired'
  /** The card refused the payment. */
  | 'card-declined'
  /** The identifier and password did not match. */
  | 'invalid-credentials'
  /** The one-time code was wrong. */
  | 'otp-invalid'
  /** The one-time code has run out. */
  | 'otp-expired'
  /** Too many attempts; the caller must wait. */
  | 'too-many-attempts'
  /** The session token is no longer good. */
  | 'session-expired'
  /** A new password was refused by the policy. */
  | 'password-rejected'
  /** The device cannot do biometrics, or the user cancelled. */
  | 'biometric-unavailable'
  /** The same operation was already carried out. */
  | 'duplicate-operation'
  /** The provider is down or returned something unusable. */
  | 'provider-unavailable'
  /** The request took too long; the outcome is unknown. */
  | 'timeout'
  /** The request never left the device. */
  | 'network';

/**
 * The base every domain error extends.
 *
 * `retryable` says whether repeating the same request could succeed —
 * a timeout could, insufficient funds could not. Anything retryable that
 * moves money must be retried with the *same* idempotency key.
 */
export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
  /** True when the same request, retried, might succeed. */
  readonly retryable: boolean = false;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Narrows an unknown catch to a domain error. */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/** True when `error` is the named domain failure. */
export function hasCode(error: unknown, code: DomainErrorCode): boolean {
  return isDomainError(error) && error.code === code;
}

/**
 * The outcome of a money-moving call is unknown after these.
 *
 * A caller that sees one must not assume the money did not move: it must
 * retry with the same idempotency key, or reconcile.
 */
export function isOutcomeUnknown(error: unknown): boolean {
  return hasCode(error, 'timeout') || hasCode(error, 'provider-unavailable');
}

export class NotFoundError extends DomainError {
  readonly code = 'not-found' as const;
  readonly entity: string;
  readonly entityId: string;

  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found`);
    this.entity = entity;
    this.entityId = id;
  }
}

export class InsufficientFundsError extends DomainError {
  readonly code = 'insufficient-funds' as const;

  constructor(message = 'There is not enough in that account.') {
    super(message);
  }
}

export class QuoteExpiredError extends DomainError {
  readonly code = 'quote-expired' as const;

  constructor(message = 'That rate has expired. Refresh to get a new one.') {
    super(message);
  }
}

/** A password change was refused, and why. */
export class PasswordRejectedError extends DomainError {
  readonly code = 'password-rejected' as const;
  readonly problem: PasswordProblem;

  constructor(problem: PasswordProblem, message: string) {
    super(message);
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
export class AccountRestrictedError extends DomainError {
  readonly code = 'account-restricted' as const;
  readonly restriction: AccountRestriction;

  constructor(restriction: AccountRestriction) {
    super(restriction.explanation);
    this.restriction = restriction;
  }
}

/**
 * The card cannot pay for this.
 *
 * `code` says which rule stopped it, so the screen can point at the control
 * the user can actually change rather than showing one generic refusal.
 */
export class CardDeclinedError extends DomainError {
  readonly code = 'card-declined' as const;
  /** Which card rule refused it, so the screen can point at the right control. */
  readonly declineCode: CardDeclineCode;
  /** The control or state that would have to change. */
  readonly remedy?: string;

  constructor(declineCode: CardDeclineCode, message: string, remedy?: string) {
    super(message);
    this.declineCode = declineCode;
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
export class InvalidCredentialsError extends DomainError {
  readonly code = 'invalid-credentials' as const;

  constructor(message = "That email or password isn't right.") {
    super(message);
  }
}

/** The code was wrong. Carries what is left so the screen can warn in time. */
export class OtpInvalidError extends DomainError {
  readonly code = 'otp-invalid' as const;
  readonly attemptsRemaining: number;

  constructor(attemptsRemaining: number) {
    super(
      attemptsRemaining > 0
        ? `That code isn't right. ${attemptsRemaining} ${attemptsRemaining === 1 ? 'try' : 'tries'} left.`
        : "That code isn't right.",
    );
    this.attemptsRemaining = attemptsRemaining;
  }
}

/** The code was right once, but it has run out. */
export class OtpExpiredError extends DomainError {
  readonly code = 'otp-expired' as const;

  constructor(message = 'That code has expired. Send a new one.') {
    super(message);
  }
}

/** Too many wrong attempts. `retryAfter` is an ISO-8601 timestamp. */
export class TooManyAttemptsError extends DomainError {
  readonly code = 'too-many-attempts' as const;
  readonly retryAfter: string;

  constructor(retryAfter: string, message = 'Too many attempts. Try again in a few minutes.') {
    super(message);
    this.retryAfter = retryAfter;
  }
}

/** The session ran out. The app must return to the login screen. */
export class SessionExpiredError extends DomainError {
  readonly code = 'session-expired' as const;

  constructor(message = 'Your session has expired. Log in again to continue.') {
    super(message);
  }
}

/** The request never reached anything. Distinct from a rejection. */
export class NetworkError extends DomainError {
  readonly code = 'network' as const;
  readonly retryable = true;

  constructor(message = "We couldn't reach TPay. Check your connection and try again.") {
    super(message);
  }
}

/**
 * The provider is down, or answered with something TPay cannot read.
 *
 * The outcome of a money-moving call is unknown after this — retry with the
 * same idempotency key rather than assuming nothing happened.
 */
export class ProviderUnavailableError extends DomainError {
  readonly code = 'provider-unavailable' as const;
  readonly retryable = true;
  /** The operation that could not be completed, for reconciliation. */
  readonly operation?: string;

  constructor(
    message = 'TPay could not complete that just now. Nothing has been confirmed — try again shortly.',
    operation?: string,
  ) {
    super(message);
    this.operation = operation;
  }
}

/** The request took too long. Like the above, the outcome is unknown. */
export class TimeoutError extends DomainError {
  readonly code = 'timeout' as const;
  readonly retryable = true;
  readonly operation?: string;

  constructor(
    message = 'That took too long to confirm. Check your activity before trying again.',
    operation?: string,
  ) {
    super(message);
    this.operation = operation;
  }
}

/**
 * The same operation has already been carried out.
 *
 * Adapters that cannot return the original result raise this rather than
 * performing the movement twice. Adapters that *can* return it should — a
 * retry with the same key is meant to be invisible.
 */
export class DuplicateOperationError extends DomainError {
  readonly code = 'duplicate-operation' as const;
  readonly idempotencyKey: string;

  constructor(idempotencyKey: string, message = 'That has already been done.') {
    super(message);
    this.idempotencyKey = idempotencyKey;
  }
}

/**
 * Verification has to be finished first.
 *
 * Distinct from `AccountRestrictedError`: nothing is wrong with the account,
 * there is simply a step the user has not taken yet.
 */
export class KycRequiredError extends DomainError {
  readonly code = 'kyc-required' as const;
  /** What the user has to do, for the screen's action. */
  readonly requiredStatus: 'VERIFIED' | 'SUBMITTED';

  constructor(
    requiredStatus: 'VERIFIED' | 'SUBMITTED' = 'VERIFIED',
    message = 'Verify your identity to do this.',
  ) {
    super(message);
    this.requiredStatus = requiredStatus;
  }
}

/** The device cannot do biometrics, or the user declined the prompt. */
export class BiometricUnavailableError extends DomainError {
  readonly code = 'biometric-unavailable' as const;
}

/** The transfer is larger than a limit that applies to this user. */
export class TransferLimitExceededError extends DomainError {
  readonly code = 'transfer-limit-exceeded' as const;
  readonly limitId: string;
  /** The whole limit, so a screen can explain the ceiling and the way past it. */
  readonly limit: TransferLimit;

  constructor(limit: TransferLimit) {
    super(
      limit.max.minorUnits === 0
        ? `Sending is paused while your ${limit.label} applies.`
        : `This transfer is over your ${limit.label}.`,
    );
    this.limitId = limit.id;
    this.limit = limit;
  }
}

/** TPay cannot pay out that currency by that method — yet. */
export class UnsupportedCorridorError extends DomainError {
  readonly code = 'unsupported-corridor' as const;
  readonly kind: RecipientKind;
  readonly currency: CurrencyCode;

  constructor(kind: RecipientKind, currency: CurrencyCode) {
    super(`TPay cannot pay out ${currency} to a ${kind} recipient yet.`);
    this.kind = kind;
    this.currency = currency;
  }
}
