/**
 * Errors any adapter may throw, so screens can react to a cause rather than
 * matching on a message. A provider-backed adapter maps its own error codes
 * onto these.
 */
import type { CurrencyCode } from '@/types';
import type { RecipientKind } from './transferService';

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
