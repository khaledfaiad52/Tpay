/**
 * Where the app is between signed out and signed in.
 *
 * One state drives the root guard, so no screen has to decide for itself
 * whether it may render.
 */
export type SessionStatus =
  | 'SIGNED_OUT'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'SESSION_EXPIRED';

/** How the user proved it was them for this session. */
export type SessionMethod = 'password' | 'biometric' | 'otp' | 'signup';

/**
 * A signed-in session.
 *
 * The token is opaque to the app: it is what a real backend would return and
 * what the adapter would send back on every call. It never carries a
 * credential.
 */
export type Session = {
  readonly id: string;
  readonly userId: string;
  /** Opaque bearer token. Mock adapters produce a fictional one. */
  readonly token: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly method: SessionMethod;
  /** The user asked to stay signed in on this device. */
  readonly deviceRemembered: boolean;
  /** The user turned biometric unlock on for this device. */
  readonly biometricUnlockEnabled: boolean;
};

/** Why the session ended, so the login screen can say something useful. */
export type SessionEndReason = 'signed-out' | 'expired' | 'never-signed-in';

export type SessionState = {
  readonly status: SessionStatus;
  /** Present only while `status` is AUTHENTICATED. */
  readonly session?: Session;
  readonly reason: SessionEndReason;
};

/** What a one-time code is being used for. */
export type OtpPurpose = 'signup-email' | 'signup-phone' | 'login' | 'password-reset';

/**
 * A one-time code in flight.
 *
 * The code itself never crosses this boundary — only what the user needs to
 * see: where it went, how long it lasts and how many tries are left.
 */
export type OtpChallenge = {
  readonly id: string;
  readonly purpose: OtpPurpose;
  /** Masked destination — "+966 55 ••• 4402", "k•••@demo.acme.sa". */
  readonly destination: string;
  readonly length: number;
  readonly expiresAt: string;
  /** Nothing may be resent before this. */
  readonly resendAvailableAt: string;
  readonly attemptsRemaining: number;
};

/** Where a new account has got to. */
export type SignupStage =
  | 'details'
  | 'verify-email'
  | 'verify-phone'
  | 'identity'
  | 'connect-employer'
  | 'done';

export type SignupState = {
  readonly stage: SignupStage;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  /** The challenge the current stage is waiting on, when it needs one. */
  readonly challenge?: OtpChallenge;
};

/** How the user says they are connected to the employer of record. */
export type EmployerConnection =
  | 'employer-uses-talento'
  | 'hired-through-talento'
  | 'joining-managed-team'
  | 'other';
