import type { CurrencyCode, Money } from '@/types';

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

export type FxService = {
  getRate(from: CurrencyCode, to: CurrencyCode): Promise<number>;
  quote(sourceAmount: Money, to: CurrencyCode): Promise<FxQuote>;
};
