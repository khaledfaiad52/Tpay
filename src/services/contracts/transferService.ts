import type { CurrencyCode, Money, Transaction } from '@/types';

/** How the recipient is addressed. One Send Money product covers all of them. */
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
  readonly currency?: CurrencyCode;
  readonly initials: string;
};

/** Everything the review screen must show before the user confirms. */
export type TransferQuote = {
  readonly id: string;
  readonly recipient: Recipient;
  readonly sourceAccountId: string;
  readonly sendAmount: Money;
  readonly receiveAmount: Money;
  readonly fee: Money;
  /** Absent for same-currency transfers. */
  readonly fxRate?: number;
  /** "Arrives in minutes", "1–2 business days". */
  readonly estimatedDelivery: string;
  readonly expiresAt: string;
};

export type TransferRequest = {
  readonly quoteId: string;
  readonly reference?: string;
};

export type TransferResult = {
  readonly transferId: string;
  readonly status: 'completed' | 'processing' | 'failed';
  readonly transaction: Transaction;
  /** Populated when `status` is `failed`. */
  readonly failureReason?: string;
};

export type TransferService = {
  listRecipients(): Promise<readonly Recipient[]>;
  /** Resolves a TPay username or phone number to a payable recipient. */
  findRecipient(query: string): Promise<Recipient | null>;
  quoteTransfer(input: {
    recipientId: string;
    sourceAccountId: string;
    sendAmount: Money;
  }): Promise<TransferQuote>;
  createTransfer(request: TransferRequest): Promise<TransferResult>;
};
