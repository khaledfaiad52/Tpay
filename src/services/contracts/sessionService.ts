import type {
  EmployerConnection,
  OtpChallenge,
  OtpPurpose,
  SessionState,
  SignupState,
} from '@/types';

/**
 * Where a session survives between launches.
 *
 * A port, not an implementation: the adapter depends on this interface so it
 * stays free of platform modules, and the app supplies the device keychain at
 * start-up. See `src/services/device/secureStorage.ts`.
 */
export type SessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** False when nothing is really persisted (the web build). */
  readonly persists: boolean;
};

export type Credentials = {
  /** Email or phone — the user types whichever they remember. */
  readonly identifier: string;
  readonly password: string;
  /** Keep the session on this device after the app closes. */
  readonly rememberDevice?: boolean;
};

/**
 * What signing in produced.
 *
 * Correct credentials do not always mean a session. With two-factor on, an
 * unrecognised device gets a challenge instead — so `signIn` answers with one
 * of these rather than assuming it is done.
 */
export type SignInOutcome =
  | { readonly kind: 'session'; readonly state: SessionState }
  | { readonly kind: 'otp-required'; readonly challenge: OtpChallenge };

export type SignupDraft = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
};

/**
 * Authentication and the session it produces.
 *
 * Provider-agnostic: a real identity backend implements this and nothing above
 * changes. The mock adapter is not security — it exists so the app can be
 * built and tested against the real shape of a session.
 */
export type SessionService = {
  /**
   * What the app should do on launch. Resolves to AUTHENTICATED when a stored
   * session is still valid, SESSION_EXPIRED when one has run out, and
   * SIGNED_OUT otherwise.
   */
  restoreSession(): Promise<SessionState>;
  /** The current state without touching storage. */
  getSessionState(): Promise<SessionState>;
  /**
   * Exchanges the refresh token for a new access token, rotating the refresh
   * token as it goes.
   *
   * Resolves to SESSION_EXPIRED when the refresh token has itself run out —
   * that is the point at which the user must sign in again.
   */
  refreshSession(): Promise<SessionState>;
  /**
   * Rejects with `InvalidCredentialsError` or `TooManyAttemptsError`.
   *
   * Resolves to `otp-required` when two-factor is on and this device is not
   * one the account has signed in from before. A device the user already
   * trusts is not challenged again.
   */
  signIn(credentials: Credentials): Promise<SignInOutcome>;
  /** Completes a two-factor sign-in with the code from `signIn`. */
  verifySignInChallenge(challengeId: string, code: string): Promise<SessionState>;
  /**
   * Exchanges a device attestation for a session. The attestation comes from
   * `BiometricAuthenticator`; this service never prompts for a face itself.
   */
  signInWithBiometrics(attestation: string): Promise<SessionState>;
  /** Ends the session on this device. Always resolves to SIGNED_OUT. */
  signOut(): Promise<SessionState>;

  /** Sends a code. `destination` is only needed when signing up. */
  requestOtp(purpose: OtpPurpose, destination?: string): Promise<OtpChallenge>;
  /** Rejects with `OtpInvalidError`, `OtpExpiredError` or `TooManyAttemptsError`. */
  verifyOtp(challengeId: string, code: string): Promise<OtpChallenge>;
  /** Rejects while the previous send is still within its cooldown. */
  resendOtp(challengeId: string): Promise<OtpChallenge>;

  /** Validates the details and sends the first verification code. */
  startSignup(draft: SignupDraft): Promise<SignupState>;
  getSignupState(): Promise<SignupState | null>;
  /** Moves a verified signup on to its next stage. */
  advanceSignup(challengeId: string, code: string): Promise<SignupState>;
  /** Creates the account and signs the new user in. */
  completeSignup(): Promise<SessionState>;
  /** Records how the user is connected to the employer of record. */
  connectEmployer(connection: EmployerConnection): Promise<SignupState>;

  requestPasswordReset(identifier: string): Promise<OtpChallenge>;
  /** Rejects with the same OTP errors, or `PasswordRejectedError`. */
  resetPassword(challengeId: string, code: string, newPassword: string): Promise<SessionState>;

  /** Turns biometric unlock on or off for this device. */
  setBiometricUnlockEnabled(enabled: boolean): Promise<SessionState>;
  /**
   * Whether this device has a session that biometrics could unlock. False
   * after an explicit sign-out — that is the user asking to be forgotten.
   */
  isBiometricUnlockAvailable(): Promise<boolean>;

  /**
   * Where the session is kept between launches. Called once at start-up.
   * Without it the adapter keeps the session in memory only.
   */
  useStorage(storage: SessionStorage): void;

  /**
   * Ends the session as though its token had run out. Exists because a real
   * backend expires sessions and the app has to handle it; used by tests and
   * the demo control.
   */
  expireSession(): Promise<SessionState>;
};
