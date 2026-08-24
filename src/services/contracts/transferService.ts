import type { CurrencyCode, KycStatus, Money, Transaction } from '@/types';
import type { IdempotentRequest } from './idempotency';

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

/**
 * Recipients come from somewhere: what the user typed, what TPay has saved,
 * and — once the app asks for the permission — the device address book. A
 * contacts source becomes another way to produce a `RecipientDraft`; nothing
 * below this line needs to change when it lands.
 */
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

/**
 * A transfer's lifecycle: `created` the moment TPay accepts it, `processing`
 * once it is with the payout network, then `completed` or `failed` when that
 * network reports back. Only a provider callback moves it past `processing` —
 * nothing settles on a timer.
 */
export type TransferStatus = 'created' | 'processing' | 'completed' | 'failed';

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

/**
 * How the user proved it was them.
 *
 * `BiometricAuthenticator` fills this in with a device attestation once a
 * native module can supply one. Today every transfer is confirmed by tapping
 * Confirm, and the field records that plainly rather than leaving it unsaid.
 */
export type TransferConfirmation = {
  readonly method: 'tap' | 'biometric' | 'passcode';
  /** Attestation from the device, once there is one to pass. */
  readonly token?: string;
};

export type TransferRequest = IdempotentRequest & {
  readonly quoteId: string;
  readonly reference?: string;
  readonly confirmation?: TransferConfirmation;
  /**
   * Sandbox trigger, in the spirit of a provider's test credentials: forces
   * the outcome so failure and pending paths can be demonstrated. Real
   * adapters ignore it.
   */
  readonly demoOutcome?: 'success' | 'failure';
};

/**
 * What a payout network tells TPay after the fact.
 *
 * Adapters normalise their own vocabulary into `TransferStatus` here, exactly
 * as `kycService` does for verification — the app never sees a provider's
 * status string.
 */
export type TransferCallbackPayload = {
  /**
   * The provider's own id for this event. Networks redeliver, so the same
   * event can arrive more than once; an adapter that records this can ignore
   * a repeat instead of applying it twice.
   */
  readonly eventId?: string;
  /** TPay's own transfer id, or the reference the provider echoes back. */
  readonly transferId?: string;
  readonly reference?: string;
  /** The provider's word for what happened: "settled", "returned", … */
  readonly providerStatus: string;
  /** Human-readable explanation, for a failure. */
  readonly reason?: string;
  readonly errorCode?: string;
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
  /**
   * Books the transfer. Safe to retry with the same `idempotencyKey`: a
   * repeat returns the original result rather than sending twice.
   */
  createTransfer(request: TransferRequest): Promise<TransferResult>;
  getTransfer(transferId: string): Promise<Transfer>;
  listTransfers(): Promise<readonly Transfer[]>;
  /**
   * Settles or fails a transfer on word from the payout network. A failure
   * after the account was debited returns the money.
   */
  handleTransferCallback(payload: TransferCallbackPayload): Promise<Transfer>;
  /** The limits that apply to this user today. */
  listTransferLimits(): Promise<readonly TransferLimit[]>;
  /**
   * The per-transaction ceiling the user is sending under right now, given
   * their verification level. A screen shows this before the user hits it.
   */
  getSendingLimit(): Promise<TransferLimit>;
};

/**
 * A ceiling on what can be sent. Real limits come from a provider, a
 * regulator and TPay's own risk rules at once, so a limit names the
 * conditions it applies under rather than assuming one dimension.
 */
export type TransferLimitScope = {
  /** Applies only at these verification levels. */
  readonly kycStatus?: KycStatus | readonly KycStatus[];
  /** Recipient country. */
  readonly country?: string;
  /** Source currency. */
  readonly currency?: CurrencyCode;
  /** A specific corridor, source → payout. */
  readonly corridor?: { readonly from: CurrencyCode; readonly to: CurrencyCode };
  /** How the recipient is paid. */
  readonly kind?: RecipientKind;
};

export type TransferLimitPeriod = 'per-transaction' | 'daily' | 'monthly';

export type TransferLimit = {
  readonly id: string;
  readonly label: string;
  readonly scope: TransferLimitScope;
  readonly period: TransferLimitPeriod;
  /** Always in the limit's own currency; compared after conversion. */
  readonly max: Money;
  /** Why this ceiling applies right now, in the user's words. */
  readonly explanation?: string;
  /** What lifts it, when anything does. */
  readonly action?: TransferLimitAction;
};

/**
 * The one thing the user can do about a limit. Screens turn this into a
 * button, so a new remedy is a new variant here rather than a new screen.
 */
export type TransferLimitAction =
  | { readonly kind: 'verify-identity'; readonly label: string }
  | { readonly kind: 'contact-support'; readonly label: string };
