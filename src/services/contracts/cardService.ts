import type {
  Card,
  CardControls,
  CardReplacement,
  CardReplacementReason,
  CardSecrets,
  CardSpending,
  Money,
  Transaction,
} from '@/types';
import type { IdempotentRequest } from './idempotency';

/**
 * How the user proved it was them before a card acted.
 *
 * The same shape as `TransferConfirmation`: today every card action is
 * confirmed by tapping, and the field records that plainly. A PIN pad, device
 * biometrics, a 3-D Secure challenge or a device attestation each become
 * another `method` with a token — no screen or service signature changes.
 */
export type CardAuthorization = {
  readonly method: 'tap' | 'pin' | 'biometric' | 'device' | '3ds';
  /** Attestation from whatever performed the check, once there is one. */
  readonly token?: string;
};

/** What a purchase needs to know. A real terminal supplies the same fields. */
export type CardPurchaseRequest = IdempotentRequest & {
  readonly cardId: string;
  readonly amount: Money;
  readonly merchant: string;
  /** True for e-commerce, which the online-payments control governs. */
  readonly online?: boolean;
  /** True for a cash withdrawal, which the ATM control governs. */
  readonly atm?: boolean;
  /** True when the merchant is outside the user's country. */
  readonly international?: boolean;
  readonly authorization?: CardAuthorization;
};

export type CardControlsUpdate = Partial<CardControls>;

export type CardLimitsUpdate = {
  readonly monthlyLimit?: Money;
  readonly atmDailyLimit?: Money;
};

/**
 * The TPay Card.
 *
 * The card spends from the wallet balance, so this service never reports a
 * balance of its own — `getSpending` names the shared wallet balance the card
 * draws on, and every purchase moves that one balance through the same
 * transaction ledger every other TPay surface reads.
 *
 * The eventual issuer or processor implements this behind its own API; the
 * app never learns which one it is.
 */
export type CardService = {
  /** Every card on the account, primary first. */
  listCards(): Promise<readonly Card[]>;
  getCardById(cardId: string): Promise<Card>;
  /** The card Home and the wallet lead to; `null` when none is issued. */
  getCard(): Promise<Card | null>;
  /** Issues a virtual card, instantly and free, up to the account's cap. */
  createVirtualCard(): Promise<Card>;
  freezeCard(cardId: string): Promise<Card>;
  unfreezeCard(cardId: string): Promise<Card>;
  /** Full credentials, behind an authorization and never stored. */
  revealCardDetails(cardId: string, authorization: CardAuthorization): Promise<CardSecrets>;
  getControls(cardId: string): Promise<CardControls>;
  updateControls(cardId: string, update: CardControlsUpdate): Promise<CardControls>;
  getSpending(cardId: string): Promise<CardSpending>;
  updateLimits(cardId: string, update: CardLimitsUpdate): Promise<CardSpending>;
  /** This card's rows from the one transaction ledger — never a second one. */
  listCardTransactions(cardId: string): Promise<readonly Transaction[]>;
  /**
   * Authorises a purchase. Rejects when the account is frozen, the card
   * cannot spend, a control forbids it, a limit is reached or the shared
   * wallet balance is short.
   *
   * Safe to retry with the same `idempotencyKey`: a processor that redelivers
   * an authorisation must not debit the wallet twice.
   */
  authorizePurchase(request: CardPurchaseRequest): Promise<Transaction>;
  /** Cancels the card and orders a replacement. */
  reportLostOrStolen(cardId: string, reason: CardReplacementReason): Promise<CardReplacement>;
  /** The replacement on its way, if there is one. */
  getReplacement(cardId: string): Promise<CardReplacement | null>;
  /** Marks a delivered physical card usable. */
  activateCard(cardId: string, authorization: CardAuthorization): Promise<Card>;
  /**
   * A card event from the issuer or processor: a delivery reaching the next
   * stage, an issuer blocking a card, a settlement posting.
   *
   * Normalises the provider's vocabulary into TPay card states, exactly as
   * `handleTransferCallback` does for payouts. Safe against redelivery.
   */
  handleCardCallback(payload: CardCallbackPayload): Promise<Card>;
};

/** What an issuer or processor tells TPay after the fact. */
export type CardCallbackPayload = {
  /** The provider's own event id, for redelivery protection. */
  readonly eventId?: string;
  readonly cardId: string;
  /** The provider's word: "produced", "shipped", "blocked", "expired". */
  readonly providerStatus: string;
  readonly reason?: string;
};
