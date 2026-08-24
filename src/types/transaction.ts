import type { CurrencyCode, Money } from './money';

/** Every movement of money in TPay is one of these. */
export type TransactionType = 'salary' | 'transfer' | 'card' | 'deposit' | 'fx' | 'fee';

export type TransactionStatus = 'completed' | 'pending' | 'failed';

/** Money entering the wallet vs. leaving it. */
export type TransactionDirection = 'credit' | 'debit';

export type Transaction = {
  readonly id: string;
  readonly type: TransactionType;
  readonly direction: TransactionDirection;
  /** Counterparty or merchant — "Ahmed Mansour", "Netflix", "August salary". */
  readonly description: string;
  /** Signed against the user's wallet, in the transaction's own currency. */
  readonly amount: Money;
  /** ISO-8601 timestamp. */
  readonly occurredAt: string;
  readonly status: TransactionStatus;
  /** Account the movement settled against. */
  readonly accountId?: string;
  /**
   * The card that made the payment, for `card` movements. Card activity is
   * kept in this one ledger and tagged, never split into a second one.
   */
  readonly cardId?: string;
  /** Where the card was used, when the merchant is not the description. */
  readonly merchantCategory?: string;
  readonly reference?: string;
  /** Counterparty institution, shown on the detail screen when known. */
  readonly counterpartyBank?: string;
  /** Charged on top of `amount`. */
  readonly fee?: Money;
  /** Rate applied when the movement crossed currencies. */
  readonly fxRate?: FxRate;
  /** What the other side received, for transfers and exchanges. */
  readonly counterAmount?: Money;
  /** Explains a `failed` status to the user. */
  readonly failureReason?: string;
};

/** A rate as it is quoted to the user: "1 USD = 3.7500 SAR". */
export type FxRate = {
  readonly from: CurrencyCode;
  readonly to: CurrencyCode;
  readonly rate: number;
};
