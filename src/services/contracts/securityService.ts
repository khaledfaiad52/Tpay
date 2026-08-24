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
