import type { Money } from './money';

export type CardStatus = 'active' | 'frozen' | 'not-issued' | 'blocked' | 'expired';

export type CardFormat = 'physical' | 'virtual';

/**
 * The TPay Card spends directly from the wallet balance — there is no separate
 * card balance, so this type deliberately has no `balance` field.
 */
export type Card = {
  readonly id: string;
  readonly format: CardFormat;
  readonly status: CardStatus;
  /** Last four digits only. Full PAN is never stored client-side. */
  readonly last4: string;
  readonly holderName: string;
  /** "09/29" */
  readonly expiry: string;
  readonly network: 'visa' | 'mastercard';
  /** Rolling month-to-date spend, for the card screen. */
  readonly monthToDateSpend: Money;
};
