import {
  InvalidCredentialsError,
  NotFoundError,
  OtpExpiredError,
  OtpInvalidError,
  TooManyAttemptsError,
  type Credentials,
  type SessionService,
  type SessionStorage,
  type SignupDraft,
} from '@/services/contracts';
import type {
  EmployerConnection,
  OtpChallenge,
  OtpPurpose,
  PersistedSession,
  Session,
  SessionState,
  SessionTokens,
  SignupStage,
  SignupState,
} from '@/types';
import { mockUser } from './data/fixtures';
import { respond } from './latency';
import { currentSecuritySettings, passwordProblem } from './securityService';
import { setKycStatus } from './kycService';

/**
 * Demo credentials. These are fictional and exist so the app can be run and
 * tested; they are not a security mechanism and never reach a real system.
 *
 * A real adapter sends the password to an identity backend and never compares
 * anything on the device.
 */
const DEMO_IDENTIFIERS = ['khaled.faiad@demo.acme.sa', '+966551234402', 'khaled'] as const;
const DEMO_PASSWORD = 'demo-password';

/** The only code the mock accepts, so the flows are reproducible. */
const DEMO_OTP = '419204';

/**
 * Token lifetimes.
 *
 * The access token is short so a leaked one is worth little; the refresh
 * token is long so the user is not asked to sign in every half hour. A real
 * backend owns these numbers — they are here so the app can exercise the
 * lifecycle.
 */
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Where the persisted session is filed in the keychain. */
const STORAGE_KEY = 'tpay.session.v1';

/** How long a code lasts, and how long before another may be sent. */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const OTP_MAX_ATTEMPTS = 3;

/** How many failed sign-ins before the account is held. */
const SIGN_IN_MAX_ATTEMPTS = 5;
const SIGN_IN_LOCKOUT_MS = 5 * 60 * 1000;

const SIGNED_OUT: SessionState = { status: 'SIGNED_OUT', reason: 'never-signed-in' };

let state: SessionState = SIGNED_OUT;
let storedSession: Session | undefined;
/**
 * Where the session survives a restart. Memory until the app supplies the
 * device keychain, so the adapter never imports a platform module.
 */
let storage: SessionStorage = memoryStorage();
/**
 * Devices 2FA already trusts. A trusted device signs in with a password
 * alone; an unrecognised one is challenged for a code.
 */
let trustedDevices = new Set<string>();
/** This install's device id. A real app derives one and keeps it. */
let deviceId = 'dev_demo_install';
/** A sign-in waiting on its two-factor code. */
let pendingSignIn: { challengeId: string; rememberDevice: boolean } | undefined;
let signup: SignupState | undefined;
let challenges = new Map<string, OtpChallenge>();
let failedSignIns = 0;
let lockedUntil: string | undefined;
let nextId = 1000;

/** The stages a new account passes, in order. */
const SIGNUP_STAGES: readonly SignupStage[] = [
  'details',
  'verify-email',
  'verify-phone',
  'identity',
  'connect-employer',
  'done',
];

/** Storage that lasts as long as the process. Replaced at start-up. */
function memoryStorage(): SessionStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
    persists: false,
  };
}

/**
 * Writes the minimum needed to resume a session.
 *
 * Only the refresh token and the two device preferences. Never a password,
 * never a one-time code, never an access token — that is re-minted on launch.
 */
async function persist(session: Session): Promise<void> {
  const record: PersistedSession = {
    sessionId: session.id,
    userId: session.userId,
    refreshToken: session.tokens.refreshToken,
    refreshTokenExpiresAt: session.tokens.refreshTokenExpiresAt,
    deviceId: session.deviceId,
    deviceRemembered: session.deviceRemembered,
    biometricUnlockEnabled: session.biometricUnlockEnabled,
  };
  await storage.setItem(STORAGE_KEY, JSON.stringify(record));
}

async function readPersisted(): Promise<PersistedSession | undefined> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    // Unreadable is treated as absent: signing in again beats guessing.
    return undefined;
  }
}

async function clearPersisted(): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}

function mintTokens(): SessionTokens {
  nextId += 1;
  const now = Date.now();
  return {
    // Opaque and fictional. A real adapter never mints these on the device.
    accessToken: `demo-access-${nextId}`,
    accessTokenExpiresAt: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
    refreshToken: `demo-refresh-${nextId}`,
    refreshTokenExpiresAt: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
  };
}

function normalise(identifier: string): string {
  return identifier.trim().toLowerCase().replace(/[\s()-]/g, '').replace(/^@/, '');
}

function knownIdentifier(identifier: string): boolean {
  return DEMO_IDENTIFIERS.some((known) => normalise(known) === normalise(identifier));
}

/** Masks an email or phone the way every other TPay surface masks them. */
export function maskDestination(destination: string): string {
  if (destination.includes('@')) {
    const [name, domain] = destination.split('@');
    return `${name.slice(0, 1)}•••@${domain}`;
  }
  const digits = destination.replace(/\D/g, '');
  return `${destination.slice(0, 4)} •• ••• ${digits.slice(-4)}`;
}

function issueSession(method: Session['method'], rememberDevice: boolean): SessionState {
  nextId += 1;
  const session: Session = {
    id: `ses_${nextId}`,
    userId: mockUser.id,
    tokens: mintTokens(),
    issuedAt: new Date().toISOString(),
    method,
    deviceRemembered: rememberDevice,
    biometricUnlockEnabled: storedSession?.biometricUnlockEnabled ?? false,
    deviceId,
  };
  storedSession = session;
  state = { status: 'AUTHENTICATED', session, reason: 'never-signed-in' };
  failedSignIns = 0;
  lockedUntil = undefined;
  // Signing in successfully is what makes a device trusted for 2FA.
  trustedDevices.add(deviceId);
  void persist(session);
  return state;
}

function lockoutError(): TooManyAttemptsError | undefined {
  if (!lockedUntil) return undefined;
  if (Date.parse(lockedUntil) <= Date.now()) {
    lockedUntil = undefined;
    failedSignIns = 0;
    return undefined;
  }
  return new TooManyAttemptsError(lockedUntil, 'Too many attempts. Try again in a few minutes.');
}

function createChallenge(purpose: OtpPurpose, destination: string): OtpChallenge {
  nextId += 1;
  const now = Date.now();
  const challenge: OtpChallenge = {
    id: `otp_${nextId}`,
    purpose,
    destination: maskDestination(destination),
    length: DEMO_OTP.length,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString(),
    attemptsRemaining: OTP_MAX_ATTEMPTS,
  };
  challenges.set(challenge.id, challenge);
  return challenge;
}

/**
 * Checks a code and returns the challenge in its new state.
 *
 * Exported so the rules can be tested without walking a whole flow.
 */
export function judgeOtp(challenge: OtpChallenge, code: string): OtpChallenge {
  if (Date.parse(challenge.expiresAt) < Date.now()) throw new OtpExpiredError();
  if (challenge.attemptsRemaining <= 0) {
    throw new TooManyAttemptsError(new Date(Date.now() + SIGN_IN_LOCKOUT_MS).toISOString());
  }
  if (code !== DEMO_OTP) {
    const remaining = challenge.attemptsRemaining - 1;
    const next = { ...challenge, attemptsRemaining: remaining };
    challenges.set(next.id, next);
    if (remaining <= 0) {
      throw new TooManyAttemptsError(new Date(Date.now() + SIGN_IN_LOCKOUT_MS).toISOString());
    }
    throw new OtpInvalidError(remaining);
  }
  return challenge;
}

function requireChallenge(challengeId: string): OtpChallenge {
  const challenge = challenges.get(challengeId);
  if (!challenge) throw new NotFoundError('Verification code', challengeId);
  return challenge;
}

/** The stage after the one given. */
function nextStage(stage: SignupStage): SignupStage {
  const index = SIGNUP_STAGES.indexOf(stage);
  return SIGNUP_STAGES[Math.min(index + 1, SIGNUP_STAGES.length - 1)]!;
}

export const mockSessionService: SessionService = {
  useStorage: (next) => {
    storage = next;
  },

  restoreSession: async () => {
    const persisted = await readPersisted();
    if (!persisted) {
      storedSession = undefined;
      state = SIGNED_OUT;
      return respond('sessionService.restoreSession', state);
    }

    deviceId = persisted.deviceId;
    // A device that was signed in before is a device 2FA already trusts.
    trustedDevices.add(persisted.deviceId);

    if (Date.parse(persisted.refreshTokenExpiresAt) <= Date.now()) {
      // The long token itself has run out: nothing can be refreshed.
      await clearPersisted();
      storedSession = undefined;
      state = { status: 'SESSION_EXPIRED', reason: 'expired' };
      return respond('sessionService.restoreSession', state);
    }

    // The access token is never persisted, so launching always mints a fresh
    // one from the refresh token — exactly what a real client does.
    nextId += 1;
    const session: Session = {
      id: persisted.sessionId,
      userId: persisted.userId,
      tokens: {
        ...mintTokens(),
        refreshToken: persisted.refreshToken,
        refreshTokenExpiresAt: persisted.refreshTokenExpiresAt,
      },
      issuedAt: new Date().toISOString(),
      method: 'password',
      deviceRemembered: persisted.deviceRemembered,
      biometricUnlockEnabled: persisted.biometricUnlockEnabled,
      deviceId: persisted.deviceId,
    };
    storedSession = session;
    state = { status: 'AUTHENTICATED', session, reason: 'never-signed-in' };
    return respond('sessionService.restoreSession', state);
  },

  refreshSession: async () => {
    const persisted = await readPersisted();
    const current = storedSession;
    if (!current || !persisted) {
      state = SIGNED_OUT;
      return respond('sessionService.refreshSession', state);
    }

    if (Date.parse(persisted.refreshTokenExpiresAt) <= Date.now()) {
      await clearPersisted();
      storedSession = undefined;
      state = { status: 'SESSION_EXPIRED', reason: 'expired' };
      return respond('sessionService.refreshSession', state);
    }

    // The refresh token is rotated on every use: a stolen one is good for at
    // most a single exchange, and reuse of an old one is detectable.
    const refreshed: Session = { ...current, tokens: mintTokens() };
    storedSession = refreshed;
    await persist(refreshed);
    state = { status: 'AUTHENTICATED', session: refreshed, reason: 'never-signed-in' };
    return respond('sessionService.refreshSession', state);
  },

  getSessionState: () => respond('sessionService.getSessionState', state),

  signIn: async ({ identifier, password, rememberDevice = false }: Credentials) => {
    const locked = lockoutError();
    if (locked) throw locked;

    if (!knownIdentifier(identifier) || password !== DEMO_PASSWORD) {
      failedSignIns += 1;
      if (failedSignIns >= SIGN_IN_MAX_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + SIGN_IN_LOCKOUT_MS).toISOString();
        throw new TooManyAttemptsError(lockedUntil);
      }
      throw new InvalidCredentialsError();
    }

    // The credentials are right. With two-factor on, whether that is enough
    // depends on the device: one the account has signed in from before is
    // trusted, an unrecognised one is challenged.
    const { twoFactorEnabled } = currentSecuritySettings();
    const persisted = await readPersisted();
    const known = trustedDevices.has(deviceId) || persisted?.deviceId === deviceId;

    if (twoFactorEnabled && !known) {
      const challenge = createChallenge('login', mockUser.phone);
      pendingSignIn = { challengeId: challenge.id, rememberDevice };
      return respond('sessionService.signIn', {
        kind: 'otp-required' as const,
        challenge,
      });
    }

    return respond('sessionService.signIn', {
      kind: 'session' as const,
      state: issueSession('password', rememberDevice),
    });
  },

  verifySignInChallenge: (challengeId, code) => {
    if (!pendingSignIn || pendingSignIn.challengeId !== challengeId) {
      return Promise.reject(new NotFoundError('Verification code', challengeId));
    }
    try {
      judgeOtp(requireChallenge(challengeId), code);
    } catch (cause) {
      return Promise.reject(cause);
    }
    const { rememberDevice } = pendingSignIn;
    challenges.delete(challengeId);
    pendingSignIn = undefined;
    // Passing the challenge is what makes this device trusted from now on.
    return respond('sessionService.verifySignInChallenge', issueSession('otp', rememberDevice));
  },

  signInWithBiometrics: (attestation) => {
    if (!storedSession?.biometricUnlockEnabled) {
      return Promise.reject(
        new InvalidCredentialsError('Biometric unlock is not set up on this device.'),
      );
    }
    if (!attestation) {
      return Promise.reject(new InvalidCredentialsError('That check did not complete.'));
    }
    return respond(
      'sessionService.signInWithBiometrics',
      issueSession('biometric', storedSession.deviceRemembered),
    );
  },

  signOut: async () => {
    // Signing out is a request to be forgotten: the keychain record goes, and
    // with it the refresh token and the biometric-unlock preference.
    await clearPersisted();
    storedSession = undefined;
    signup = undefined;
    state = { status: 'SIGNED_OUT', reason: 'signed-out' };
    return respond('sessionService.signOut', state);
  },

  requestOtp: (purpose, destination) => {
    const target =
      destination ?? (purpose === 'signup-email' ? mockUser.email : mockUser.phone);
    return respond('sessionService.requestOtp', createChallenge(purpose, target));
  },

  verifyOtp: (challengeId, code) => {
    try {
      const challenge = requireChallenge(challengeId);
      return respond('sessionService.verifyOtp', judgeOtp(challenge, code));
    } catch (cause) {
      return Promise.reject(cause);
    }
  },

  resendOtp: (challengeId) => {
    try {
      const challenge = requireChallenge(challengeId);
      if (Date.parse(challenge.resendAvailableAt) > Date.now()) {
        return Promise.reject(
          new TooManyAttemptsError(
            challenge.resendAvailableAt,
            'Wait for the countdown before sending another code.',
          ),
        );
      }
      const next: OtpChallenge = {
        ...challenge,
        expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        resendAvailableAt: new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString(),
        attemptsRemaining: OTP_MAX_ATTEMPTS,
      };
      challenges.set(next.id, next);
      if (signup?.challenge?.id === next.id) signup = { ...signup, challenge: next };
      return respond('sessionService.resendOtp', next);
    } catch (cause) {
      return Promise.reject(cause);
    }
  },

  startSignup: (draft: SignupDraft) => {
    const problem = passwordProblem({
      currentPassword: DEMO_PASSWORD,
      newPassword: draft.password,
    });
    // Only the new-password rules apply here; there is no current password yet.
    if (problem && problem.problem !== 'current-incorrect') return Promise.reject(problem);

    const challenge = createChallenge('signup-email', draft.email);
    signup = {
      stage: 'verify-email',
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      challenge,
    };
    return respond('sessionService.startSignup', signup);
  },

  getSignupState: () => respond('sessionService.getSignupState', signup ?? null),

  advanceSignup: (challengeId, code) => {
    if (!signup) return Promise.reject(new NotFoundError('Signup', 'current'));
    try {
      const challenge = requireChallenge(challengeId);
      judgeOtp(challenge, code);
      challenges.delete(challengeId);

      const stage = nextStage(signup.stage);
      // The phone code is sent as soon as the email one clears.
      const next =
        stage === 'verify-phone'
          ? { ...signup, stage, challenge: createChallenge('signup-phone', signup.phone) }
          : { ...signup, stage, challenge: undefined };
      signup = next;
      return respond('sessionService.advanceSignup', next);
    } catch (cause) {
      return Promise.reject(cause);
    }
  },

  completeSignup: () => {
    if (!signup) return Promise.reject(new NotFoundError('Signup', 'current'));
    // A brand-new account has not been verified yet; the existing KYC flow is
    // what changes that, and the app routes into it from here.
    setKycStatus('NOT_STARTED');
    return respond('sessionService.completeSignup', issueSession('signup', true));
  },

  connectEmployer: (connection: EmployerConnection) => {
    if (!signup) return Promise.reject(new NotFoundError('Signup', 'current'));
    signup = { ...signup, stage: 'done' };
    // A real adapter would send the answer on to the employer directory.
    void connection;
    return respond('sessionService.connectEmployer', signup);
  },

  requestPasswordReset: (identifier) => {
    if (!knownIdentifier(identifier)) {
      // Never reveal whether an account exists. The screen shows the same
      // "code sent" either way.
      return respond('sessionService.requestPasswordReset', createChallenge('password-reset', identifier));
    }
    return respond(
      'sessionService.requestPasswordReset',
      createChallenge('password-reset', mockUser.email),
    );
  },

  resetPassword: (challengeId, code, newPassword) => {
    try {
      const challenge = requireChallenge(challengeId);
      judgeOtp(challenge, code);
      const problem = passwordProblem({
        currentPassword: DEMO_PASSWORD,
        newPassword,
      });
      if (problem && problem.problem !== 'current-incorrect') {
        return Promise.reject(problem);
      }
      challenges.delete(challengeId);
      return respond('sessionService.resetPassword', issueSession('otp', false));
    } catch (cause) {
      return Promise.reject(cause);
    }
  },

  setBiometricUnlockEnabled: async (enabled) => {
    if (!storedSession) return Promise.reject(new NotFoundError('Session', 'current'));
    storedSession = { ...storedSession, biometricUnlockEnabled: enabled };
    await persist(storedSession);
    state = { status: 'AUTHENTICATED', session: storedSession, reason: 'never-signed-in' };
    return respond('sessionService.setBiometricUnlockEnabled', state);
  },

  isBiometricUnlockAvailable: async () => {
    // Readable while signed out, because that is exactly when it is asked:
    // the login screen needs to know before there is a session in memory.
    const persisted = await readPersisted();
    return respond(
      'sessionService.isBiometricUnlockAvailable',
      persisted?.biometricUnlockEnabled ?? storedSession?.biometricUnlockEnabled ?? false,
    );
  },

  expireSession: async () => {
    // Expires the refresh token too, so this is a real end-of-session rather
    // than something a refresh could quietly undo.
    const persisted = await readPersisted();
    if (persisted) {
      await storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...persisted,
          refreshTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
        } satisfies PersistedSession),
      );
    }
    state = { status: 'SESSION_EXPIRED', reason: 'expired' };
    return respond('sessionService.expireSession', state);
  },
};

/** Whether biometric unlock has been turned on for this device. */
export function biometricUnlockEnabled(): boolean {
  return storedSession?.biometricUnlockEnabled ?? false;
}

/** The one code the mock accepts. Demo and test use only. */
export const demoOtpCode = DEMO_OTP;
/** The one password the mock accepts. Demo and test use only. */
export const demoPassword = DEMO_PASSWORD;

export function resetSession(): void {
  state = SIGNED_OUT;
  storedSession = undefined;
  signup = undefined;
  challenges = new Map();
  failedSignIns = 0;
  lockedUntil = undefined;
  nextId = 1000;
  pendingSignIn = undefined;
  storage = memoryStorage();
  trustedDevices = new Set();
  deviceId = 'dev_demo_install';
}
