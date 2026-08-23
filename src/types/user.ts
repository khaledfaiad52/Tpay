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
};

/** "@khaled" — the only place the handle gets its prefix. */
export function formatUsername(username: string): string {
  return `@${username}`;
}
