import {
  InvalidCredentialsError,
  NotFoundError,
  OtpExpiredError,
  OtpInvalidError,
  TooManyAttemptsError,
  type Credentials,
  type SessionService,
  type SignupDraft,
} from '@/services/contracts';
import type {
  EmployerConnection,
  OtpChallenge,
  OtpPurpose,
  Session,
  SessionState,
  SignupStage,
  SignupState,
} from '@/types';
import { mockUser } from './data/fixtures';
import { respond } from './latency';
import { passwordProblem } from './securityService';
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

/** How long a session lasts before the app has to ask again. */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** How long a code lasts, and how long before another may be sent. */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 45 * 1000;
const OTP_MAX_ATTEMPTS = 3;

/** How many failed sign-ins before the account is held. */
const SIGN_IN_MAX_ATTEMPTS = 5;
const SIGN_IN_LOCKOUT_MS = 5 * 60 * 1000;

const SIGNED_OUT: SessionState = { status: 'SIGNED_OUT', reason: 'never-signed-in' };

let state: SessionState = SIGNED_OUT;
/** What a real adapter would keep in secure storage on the device. */
let storedSession: Session | undefined;
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
  const now = Date.now();
  const session: Session = {
    id: `ses_${nextId}`,
    userId: mockUser.id,
    // Opaque and fictional. A real adapter never mints this on the device.
    token: `demo-session-token-${nextId}`,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    method,
    deviceRemembered: rememberDevice,
    biometricUnlockEnabled: storedSession?.biometricUnlockEnabled ?? false,
  };
  storedSession = session;
  state = { status: 'AUTHENTICATED', session, reason: 'never-signed-in' };
  failedSignIns = 0;
  lockedUntil = undefined;
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
  restoreSession: () => {
    if (!storedSession) {
      state = SIGNED_OUT;
      return respond('sessionService.restoreSession', state);
    }
    if (Date.parse(storedSession.expiresAt) <= Date.now()) {
      storedSession = undefined;
      state = { status: 'SESSION_EXPIRED', reason: 'expired' };
      return respond('sessionService.restoreSession', state);
    }
    state = { status: 'AUTHENTICATED', session: storedSession, reason: 'never-signed-in' };
    return respond('sessionService.restoreSession', state);
  },

  getSessionState: () => respond('sessionService.getSessionState', state),

  signIn: ({ identifier, password, rememberDevice = false }: Credentials) => {
    const locked = lockoutError();
    if (locked) return Promise.reject(locked);

    if (!knownIdentifier(identifier) || password !== DEMO_PASSWORD) {
      failedSignIns += 1;
      if (failedSignIns >= SIGN_IN_MAX_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + SIGN_IN_LOCKOUT_MS).toISOString();
        return Promise.reject(new TooManyAttemptsError(lockedUntil));
      }
      return Promise.reject(new InvalidCredentialsError());
    }

    return respond('sessionService.signIn', issueSession('password', rememberDevice));
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

  signOut: () => {
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

  setBiometricUnlockEnabled: (enabled) => {
    if (!storedSession) return Promise.reject(new NotFoundError('Session', 'current'));
    storedSession = { ...storedSession, biometricUnlockEnabled: enabled };
    state = { status: 'AUTHENTICATED', session: storedSession, reason: 'never-signed-in' };
    return respond('sessionService.setBiometricUnlockEnabled', state);
  },

  isBiometricUnlockAvailable: () =>
    respond(
      'sessionService.isBiometricUnlockAvailable',
      storedSession?.biometricUnlockEnabled ?? false,
    ),

  expireSession: () => {
    // The device keeps whatever it stored; what changes is that the token is
    // no longer good, which is exactly what a real expiry looks like.
    if (storedSession) {
      storedSession = { ...storedSession, expiresAt: new Date(Date.now() - 1000).toISOString() };
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
}
