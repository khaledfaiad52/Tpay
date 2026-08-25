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
 * The two tokens a session runs on.
 *
 * The access token is short-lived and sent with every call. The refresh token
 * is long-lived, used only to mint a new access token, and is the only one
 * written to the device keychain. Both are opaque to the app.
 */
export type SessionTokens = {
  readonly accessToken: string;
  /** ISO-8601. Short — minutes, not days. */
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  /** ISO-8601. When this passes, the user must sign in again. */
  readonly refreshTokenExpiresAt: string;
};

/**
 * A signed-in session.
 *
 * Tokens are opaque to the app: they are what a real backend would return and
 * what the adapter sends back on every call. A session never carries a
 * credential — no password, no one-time code.
 */
export type Session = {
  readonly id: string;
  readonly userId: string;
  readonly tokens: SessionTokens;
  readonly issuedAt: string;
  readonly method: SessionMethod;
  /** The user asked to stay signed in on this device. */
  readonly deviceRemembered: boolean;
  /** The user turned biometric unlock on for this device. */
  readonly biometricUnlockEnabled: boolean;
  /** Stable per install. Decides whether 2FA challenges this login. */
  readonly deviceId: string;
};

/**
 * The only thing written to the device keychain.
 *
 * Deliberately minimal: the refresh token, who it belongs to, and the two
 * device preferences that must survive a restart. No access token (it is
 * short-lived and re-minted on launch), no password, no one-time code, no card
 * number, no verification document.
 */
export type PersistedSession = {
  readonly sessionId: string;
  readonly userId: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
  readonly deviceId: string;
  readonly deviceRemembered: boolean;
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
