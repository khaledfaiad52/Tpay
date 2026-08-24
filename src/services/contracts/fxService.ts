import type { CurrencyCode, Money, Transaction } from '@/types';
import type { IdempotencyKey } from './idempotency';

export type FxQuote = {
  readonly id: string;
  readonly from: CurrencyCode;
  readonly to: CurrencyCode;
  /** Units of `to` per one unit of `from`. */
  readonly rate: number;
  readonly sourceAmount: Money;
  readonly targetAmount: Money;
  readonly fee: Money;
  /** ISO-8601 timestamp after which the quote must be refreshed. */
  readonly expiresAt: string;
};

/** A quote that can actually be booked, because it names both accounts. */
export type ExchangeQuote = FxQuote & {
  readonly sourceAccountId: string;
  readonly targetAccountId: string;
  /** The spread TPay applies, as a fraction — 0.0025 is 0.25%. */
  readonly feeRate: number;
};

export type ExchangeQuoteRequest = {
  readonly sourceAccountId: string;
  readonly targetAccountId: string;
  readonly sendAmount: Money;
};

export type ExchangeResult = {
  readonly exchangeId: string;
  /** The debit on the source account. */
  readonly sourceTransaction: Transaction;
  /** The credit on the target account. */
  readonly targetTransaction: Transaction;
  readonly targetAmount: Money;
};

export type FxService = {
  getRate(from: CurrencyCode, to: CurrencyCode): Promise<number>;
  /** Indicative pricing for any conversion, including inside a transfer. */
  quote(sourceAmount: Money, to: CurrencyCode): Promise<FxQuote>;
  /** A bookable wallet-to-wallet conversion between two of the user's accounts. */
  quoteExchange(request: ExchangeQuoteRequest): Promise<ExchangeQuote>;
  /**
   * Books a quote. Rejects when the quote has expired or funds are short.
   * Safe to retry with the same `idempotencyKey`.
   */
  executeExchange(quoteId: string, idempotencyKey?: IdempotencyKey): Promise<ExchangeResult>;
};
