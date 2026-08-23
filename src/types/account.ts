import type { CurrencyCode, Money } from './money';

/**
 * A currency balance inside the TPay Wallet.
 *
 * User-facing copy always says "TPay Account" / "TPay Wallet" — the regulated
 * institution behind it is an implementation detail of the service adapter and
 * must never surface in the UI.
 */
export type Account = {
  readonly id: string;
  readonly currency: CurrencyCode;
  /** "US Dollar account" */
  readonly name: string;
  /** "Salary account", "Local account" */
  readonly kind: AccountKind;
  readonly balance: Money;
  /** Masked tail of the account identifier, e.g. "4821". */
  readonly maskedNumber: string;
  /** The USD wallet the card and salary settle against. */
  readonly isPrimary: boolean;
};

export type AccountKind = 'salary' | 'local' | 'benefit' | 'multi-currency' | 'virtual';

/** Bank coordinates a user can share to receive money into a TPay account. */
export type AccountDetails = {
  readonly accountId: string;
  readonly holderName: string;
  readonly bankName: string;
  readonly fields: readonly AccountDetailField[];
};

export type AccountDetailField = {
  readonly label: string;
  readonly value: string;
  /** Render in IBM Plex Mono and offer copy-to-clipboard. */
  readonly monospaced?: boolean;
};

/** The "one balance" figure: every currency account converted to USD. */
export type WalletBalance = {
  readonly total: Money;
  readonly accounts: readonly Account[];
};

export type { CurrencyCode, Money };
