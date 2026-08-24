import type { CurrencyCode } from './money';

/**
 * Verification lifecycle. The UI branches on these states; the provider that
 * produces them (Airwallex, Thunes, …) stays behind `kycService`.
 */
export type KycStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'ACTION_REQUIRED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

/** Where the user lives — needed for verification and for payouts. */
export type PostalAddress = {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly region?: string;
  readonly postalCode?: string;
  readonly country: string;
};

/** Choices that shape how the app presents itself. */
export type UserPreferences = {
  /** BCP-47 tag. */
  readonly language: string;
  readonly languageLabel: string;
  readonly defaultCurrency: CurrencyCode;
};

export type User = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  /** Unique handle for P2P — stored without the leading "@". */
  readonly username: string;
  readonly email: string;
  readonly phone: string;
  readonly initials: string;
  readonly country: string;
  readonly kycStatus: KycStatus;
  /** True once KYC clears and the wallet can hold funds. */
  readonly walletActivated: boolean;
  /** ISO-8601 date of birth. */
  readonly dateOfBirth?: string;
  readonly nationality?: string;
  readonly address?: PostalAddress;
  readonly preferences: UserPreferences;
};

/** Fields the user can change about themselves. */
export type UserProfileUpdate = {
  readonly email?: string;
  readonly phone?: string;
  readonly address?: PostalAddress;
  readonly preferences?: Partial<UserPreferences>;
};

/** "@khaled" — the only place the handle gets its prefix. */
export function formatUsername(username: string): string {
  return `@${username}`;
}
