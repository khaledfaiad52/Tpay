import type {
  BiometricCapability,
  LoginEvent,
  SecuritySettings,
  TrustedDevice,
} from '@/types';

export type PasswordChange = {
  readonly currentPassword: string;
  readonly newPassword: string;
};

/**
 * Why a password was refused, so the screen can point at the right field
 * rather than showing one generic message.
 */
export type PasswordProblem =
  | 'current-incorrect'
  | 'too-short'
  | 'too-simple'
  | 'same-as-current';

/**
 * Account protection.
 *
 * Biometrics are a device capability, not a TPay one — the service reports
 * what the device can actually do and records what the user asked for. Nothing
 * here claims an authentication that has not happened.
 */
export type SecurityService = {
  getSettings(): Promise<SecuritySettings>;
  setBiometricsEnabled(enabled: boolean): Promise<SecuritySettings>;
  setTwoFactorEnabled(enabled: boolean): Promise<SecuritySettings>;
  /** Rejects with a `PasswordRejectedError` naming the problem. */
  changePassword(change: PasswordChange): Promise<SecuritySettings>;
  listDevices(): Promise<readonly TrustedDevice[]>;
  /** Ends a session. The current device cannot sign itself out this way. */
  signOutDevice(deviceId: string): Promise<readonly TrustedDevice[]>;
  signOutAllOtherDevices(): Promise<readonly TrustedDevice[]>;
  listLoginActivity(): Promise<readonly LoginEvent[]>;
  /** Blocks every card and transfer at once. */
  setAccountFrozen(frozen: boolean): Promise<SecuritySettings>;
  /**
   * The single account-level gate every money-moving service consults.
   * Nothing else may decide on its own whether the account is usable.
   */
  getAccountState(): Promise<AccountState>;
  /** The rules a new password must satisfy. */
  getPasswordPolicy(): Promise<PasswordPolicy>;
};

/**
 * What the device can do about biometrics.
 *
 * Kept apart from `SecurityService` because it is answered by the platform,
 * not by TPay's backend. A native module implements this later; today it
 * reports honestly that the capability is not there.
 */
export type BiometricAuthenticator = {
  getCapability(): Promise<BiometricCapability>;
  /**
   * Prompts for a face or fingerprint. Resolves with an attestation the
   * transfer confirmation seam can carry, or rejects if the user cancels.
   */
  authenticate(reason: string): Promise<{ readonly token: string }>;
};

/**
 * Whether the account may move money at all.
 *
 * One state, read by every service that moves money, so a freeze cannot be
 * honoured in one place and forgotten in another. A provider-backed adapter
 * fills this from whatever its own risk system reports.
 */
export type AccountState = {
  readonly frozen: boolean;
  /** Present exactly when something is blocked, and says what to do about it. */
  readonly restriction?: AccountRestriction;
};

export type AccountRestriction = {
  /** Machine-readable cause, for screens that branch on it. */
  readonly code: 'account-frozen';
  readonly title: string;
  readonly explanation: string;
  readonly action: AccountRestrictionAction;
};

export type AccountRestrictionAction =
  | { readonly kind: 'unfreeze-account'; readonly label: string }
  | { readonly kind: 'contact-support'; readonly label: string };

/**
 * What a new password has to satisfy.
 *
 * Configuration, not code: the rules are data so the screen can show them and
 * the adapter can enforce them without either one restating the policy.
 */
export type PasswordPolicy = {
  readonly minLength: number;
  readonly requiresLetter: boolean;
  readonly requiresNumber: boolean;
  /** The lines the screen ticks off as the user types, in order. */
  readonly requirements: readonly PasswordRequirement[];
};

export type PasswordRequirementId = 'min-length' | 'letter-and-number';

export type PasswordRequirement = {
  readonly id: PasswordRequirementId;
  readonly label: string;
};

/**
 * Judges one requirement. Shared by the screen and the adapter so a password
 * can never look acceptable in the UI and be refused by the service.
 */
export function meetsRequirement(
  id: PasswordRequirementId,
  value: string,
  policy: PasswordPolicy,
): boolean {
  switch (id) {
    case 'min-length':
      return value.length >= policy.minLength;
    case 'letter-and-number':
      return (
        (!policy.requiresLetter || /[a-zA-Z]/.test(value)) &&
        (!policy.requiresNumber || /[0-9]/.test(value))
      );
  }
}
