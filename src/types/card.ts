import type { Money } from './money';

/**
 * The five states a TPay Card can be in.
 *
 * There is no "not issued" state — an account with no card simply has no card
 * object, which is a different thing from a card that exists and cannot be
 * used.
 */
export type CardStatus = 'active' | 'frozen' | 'pending' | 'expired' | 'cancelled';

export type CardFormat = 'physical' | 'virtual';

/**
 * The TPay Card spends directly from the wallet balance — there is no separate
 * card balance, so this type deliberately has no `balance` field.
 */
export type Card = {
  readonly id: string;
  readonly format: CardFormat;
  readonly status: CardStatus;
  /** Last four digits only. The full number is fetched, never stored. */
  readonly last4: string;
  readonly holderName: string;
  /** "09/29" */
  readonly expiry: string;
  readonly network: 'visa' | 'mastercard';
  /** Rolling month-to-date spend, for the card screen. */
  readonly monthToDateSpend: Money;
  /** The card the wallet screen and Home lead to. */
  readonly isPrimary: boolean;
  /** Why the card is in its current state, when that needs saying. */
  readonly statusReason?: string;
  /** Where a physical card has got to, while one is on its way. */
  readonly delivery?: CardDelivery;
};

/** A physical card between being ordered and arriving. */
export type CardDelivery = {
  readonly stage: CardDeliveryStage;
  /** ISO-8601 date the card is expected to arrive. */
  readonly estimatedArrival: string;
  /** Masked, like everything else about an address in demo data. */
  readonly addressSummary: string;
};

export type CardDeliveryStage = 'ordered' | 'printing' | 'shipped' | 'delivered';

/**
 * What a card is allowed to do. Each flag is a control the user owns; a
 * frozen card overrides all of them at once.
 */
export type CardControls = {
  readonly onlinePayments: boolean;
  readonly atmWithdrawals: boolean;
  readonly internationalPayments: boolean;
  readonly contactlessPayments: boolean;
};

/**
 * Spending against the shared wallet balance.
 *
 * `monthlyLimit` caps the card, not the wallet — the wallet balance is the
 * same one every other TPay surface shows.
 */
export type CardSpending = {
  readonly monthToDate: Money;
  readonly monthlyLimit: Money;
  readonly atmDailyLimit: Money;
  /** The one shared balance the card draws on, in the wallet's headline currency. */
  readonly availableBalance: Money;
  readonly categories: readonly CardSpendCategory[];
};

export type CardSpendCategory = {
  readonly label: string;
  readonly amount: Money;
};

/**
 * The card's full credentials.
 *
 * Fetched on demand behind an authorization and never held in the store, so
 * nothing long-lived carries a full card number.
 */
export type CardSecrets = {
  readonly pan: string;
  readonly expiry: string;
  readonly cvv: string;
  /** ISO-8601 timestamp after which the reveal must be re-authorized. */
  readonly expiresAt: string;
};

/** Why a card is being replaced. */
export type CardReplacementReason = 'lost' | 'stolen' | 'damaged' | 'expired';

/** A replacement card between being ordered and arriving. */
export type CardReplacement = {
  readonly id: string;
  /** The card this one replaces. */
  readonly replacesCardId: string;
  readonly reason: CardReplacementReason;
  readonly orderedAt: string;
  readonly delivery: CardDelivery;
  /** The new card, once it has been issued. */
  readonly replacementCardId?: string;
};
