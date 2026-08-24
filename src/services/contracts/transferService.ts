import type { CurrencyCode, Money, Transaction } from '@/types';

/**
 * How the recipient is addressed. One Send Money product covers all of them —
 * TPay has no separate "remittance" product.
 */
export type RecipientKind =
  | 'tpay-user'
  | 'username'
  | 'phone'
  | 'bank-account'
  | 'international'
  | 'mobile-wallet';

export type Recipient = {
  readonly id: string;
  readonly kind: RecipientKind;
  readonly name: string;
  /** Handle, masked account tail or wallet number, depending on `kind`. */
  readonly handle: string;
  readonly country?: string;
  /** The currency this recipient is paid in. */
  readonly currency?: CurrencyCode;
  readonly initials: string;
  /** Receiving institution or wallet operator, when there is one. */
  readonly institution?: string;
  /** True once the user has chosen to keep the recipient. */
  readonly saved?: boolean;
};

/** What the user fills in on the recipient step. */
export type RecipientDraft = {
  readonly kind: RecipientKind;
  readonly name: string;
  /** IBAN, @username, phone number or mobile-wallet number. */
  readonly handle: string;
  readonly country?: string;
  readonly currency?: CurrencyCode;
  readonly institution?: string;
  /** Keep this recipient for next time. */
  readonly save?: boolean;
};

/**
 * A payout route TPay can actually deliver on. Provider and corridor
 * limitations live behind this — the UI only ever asks what is supported.
 */
export type Corridor = {
  readonly kind: RecipientKind;
  readonly currency: CurrencyCode;
  readonly country?: string;
  /** "Arrives instantly", "1–2 business days". */
  readonly estimatedDelivery: string;
  /** How the money lands: "Bank deposit", "Mobile wallet", "TPay balance". */
  readonly payoutMethod: string;
};

/**
 * Everything the review screen must show before the user confirms.
 *
 * The recipient receives exactly `sendAmount`, converted when the currencies
 * differ. The fee is charged on top, so `totalDebit` is what actually leaves
 * the source account — the user is never surprised by the final figure.
 */
export type TransferQuote = {
  readonly id: string;
  readonly recipient: Recipient;
  readonly sourceAccountId: string;
  /** The amount the user entered, in the source account's currency. */
  readonly sendAmount: Money;
  /** What the recipient gets — `sendAmount` converted, with nothing deducted. */
  readonly receiveAmount: Money;
  readonly fee: Money;
  /** `sendAmount` + `fee`, in the source currency. */
  readonly totalDebit: Money;
  /** Absent for same-currency transfers. */
  readonly fxRate?: number;
  /** "Arrives instantly", "1–2 business days". */
  readonly estimatedDelivery: string;
  /** ISO-8601 date the money is expected to land. */
  readonly arrivesBy: string;
  readonly payoutMethod: string;
  readonly expiresAt: string;
};

export type TransferQuoteRequest = {
  readonly recipientId: string;
  readonly sourceAccountId: string;
  readonly sendAmount: Money;
};

export type TransferStatus = 'processing' | 'completed' | 'failed';

/** The record of one send, independent of the ledger entries behind it. */
export type Transfer = {
  readonly id: string;
  readonly recipient: Recipient;
  readonly sourceAccountId: string;
  readonly sendAmount: Money;
  readonly receiveAmount: Money;
  readonly fee: Money;
  readonly totalDebit: Money;
  readonly fxRate?: number;
  readonly status: TransferStatus;
  readonly createdAt: string;
  readonly arrivesBy: string;
  readonly estimatedDelivery: string;
  readonly payoutMethod: string;
  readonly reference: string;
  /** The ledger entry on the source account. Absent when the transfer failed. */
  readonly transactionId?: string;
  /** Populated when `status` is `failed`. */
  readonly failureReason?: string;
  /** Machine-readable failure, shown on the failure screen. */
  readonly errorCode?: string;
};

export type TransferRequest = {
  readonly quoteId: string;
  readonly reference?: string;
  /**
   * Sandbox trigger, in the spirit of a provider's test credentials: forces
   * the outcome so failure and pending paths can be demonstrated. Real
   * adapters ignore it.
   */
  readonly demoOutcome?: 'success' | 'failure';
};

export type TransferResult = {
  readonly transfer: Transfer;
  /** The debit on the source account. Absent when the transfer failed. */
  readonly transaction?: Transaction;
};

export type TransferService = {
  listRecipients(): Promise<readonly Recipient[]>;
  /** Resolves a TPay username or phone number to a payable recipient. */
  findRecipient(query: string): Promise<Recipient | null>;
  /** Creates (and optionally saves) a recipient from the details entered. */
  createRecipient(draft: RecipientDraft): Promise<Recipient>;
  /** Every payout route TPay can deliver on today. */
  listCorridors(): Promise<readonly Corridor[]>;
  /** Rejects when the corridor is unsupported or the account is short. */
  quoteTransfer(request: TransferQuoteRequest): Promise<TransferQuote>;
  createTransfer(request: TransferRequest): Promise<TransferResult>;
  getTransfer(transferId: string): Promise<Transfer>;
  listTransfers(): Promise<readonly Transfer[]>;
};
