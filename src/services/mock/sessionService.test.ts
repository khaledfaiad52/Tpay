import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  InvalidCredentialsError,
  NotFoundError,
  OtpExpiredError,
  OtpInvalidError,
  PasswordRejectedError,
  TooManyAttemptsError,
} from '@/services/contracts';
import { currentKycStatus, resetKyc } from './kycService';
import { configureMockBehaviour } from './latency';
import { resetSecurity } from './securityService';
import {
  demoOtpCode,
  demoPassword,
  judgeOtp,
  maskDestination,
  mockSessionService,
  resetSession,
} from './sessionService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetSession();
  resetSecurity();
  resetKyc();
});

const service = mockSessionService;
const IDENTIFIER = 'khaled.faiad@demo.acme.sa';

/**
 * Signs in all the way through.
 *
 * The demo account has two-factor on, so a device the account has not been
 * seen on is challenged first. This helper answers the challenge, which is
 * what a person does; the challenge itself is asserted in its own suite.
 */
const signIn = async (overrides: Partial<{ identifier: string; password: string }> = {}) => {
  const outcome = await service.signIn({
    identifier: IDENTIFIER,
    password: demoPassword,
    ...overrides,
  });
  if (outcome.kind === 'session') return outcome.state;
  return service.verifySignInChallenge(outcome.challenge.id, demoOtpCode);
};

const DRAFT = {
  firstName: 'Nour',
  lastName: 'Adel',
  email: 'nour.adel@demo.acme.sa',
  phone: '+966550001111',
  password: 'riyadh2026spring',
};

describe('signed out', () => {
  it('starts signed out with nothing to restore', async () => {
    const state = await service.restoreSession();
    assert.equal(state.status, 'SIGNED_OUT');
    assert.equal(state.session, undefined);
    assert.equal(state.reason, 'never-signed-in');
  });

  it('offers no biometric unlock before anyone has signed in', async () => {
    assert.equal(await service.isBiometricUnlockAvailable(), false);
  });

  it('refuses biometric sign-in when unlock was never set up', async () => {
    await assert.rejects(() => service.signInWithBiometrics('token'), InvalidCredentialsError);
  });
});

describe('signing in', () => {
  it('issues a session for the demo credentials', async () => {
    const state = await signIn();
    assert.equal(state.status, 'AUTHENTICATED');
    // Reached through the two-factor challenge, so the method reflects that.
    assert.ok(state.session?.method === 'password' || state.session?.method === 'otp');
    assert.ok(state.session?.tokens.accessToken.length);
    assert.ok(Date.parse(state.session!.tokens.accessTokenExpiresAt) > Date.now());
    assert.ok(Date.parse(state.session!.tokens.refreshTokenExpiresAt) > Date.now());
  });

  it('accepts a phone number as the identifier', async () => {
    assert.equal((await signIn({ identifier: '+966 55 123 4402' })).status, 'AUTHENTICATED');
  });

  it('rejects a wrong password', async () => {
    await assert.rejects(() => signIn({ password: 'nope' }), InvalidCredentialsError);
  });

  it('rejects an unknown identifier', async () => {
    await assert.rejects(() => signIn({ identifier: 'nobody@example.com' }), InvalidCredentialsError);
  });

  it('never puts a credential on the session', async () => {
    const state = await signIn();
    const serialised = JSON.stringify(state);
    assert.equal(serialised.includes(demoPassword), false);
    assert.equal(serialised.includes(demoOtpCode), false);
  });

  it('holds the account after too many wrong attempts', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await assert.rejects(() => signIn({ password: 'nope' }), InvalidCredentialsError);
    }
    await assert.rejects(() => signIn({ password: 'nope' }), TooManyAttemptsError);
    // Even the right password is refused while the hold is on.
    await assert.rejects(signIn, TooManyAttemptsError);
  });

  it('records whether the device should be remembered', async () => {
    const outcome = await service.signIn({
      identifier: IDENTIFIER,
      password: demoPassword,
      rememberDevice: true,
    });
    const state =
      outcome.kind === 'session'
        ? outcome.state
        : await service.verifySignInChallenge(outcome.challenge.id, demoOtpCode);
    assert.equal(state.session?.deviceRemembered, true);
  });
});

describe('restoring and expiring a session', () => {
  it('restores a live session on launch', async () => {
    await signIn();
    assert.equal((await service.restoreSession()).status, 'AUTHENTICATED');
  });

  it('reports SESSION_EXPIRED once the token has run out', async () => {
    await signIn();
    await service.expireSession();
    const restored = await service.restoreSession();
    assert.equal(restored.status, 'SESSION_EXPIRED');
    assert.equal(restored.reason, 'expired');
    assert.equal(restored.session, undefined);
  });

  it('signs back in cleanly after an expiry', async () => {
    await signIn();
    await service.expireSession();
    assert.equal((await signIn()).status, 'AUTHENTICATED');
  });
});

describe('signing out', () => {
  it('clears the session and says why', async () => {
    await signIn();
    const state = await service.signOut();
    assert.equal(state.status, 'SIGNED_OUT');
    assert.equal(state.reason, 'signed-out');
    assert.equal(state.session, undefined);
  });

  it('leaves nothing to restore', async () => {
    await signIn();
    await service.signOut();
    assert.equal((await service.restoreSession()).status, 'SIGNED_OUT');
  });

  it('forgets biometric unlock, because being forgotten is the point', async () => {
    await signIn();
    await service.setBiometricUnlockEnabled(true);
    await service.signOut();
    assert.equal(await service.isBiometricUnlockAvailable(), false);
  });
});

describe('biometric unlock', () => {
  it('is off until it is turned on', async () => {
    await signIn();
    assert.equal(await service.isBiometricUnlockAvailable(), false);
  });

  it('unlocks an expired session with a device attestation', async () => {
    await signIn();
    await service.setBiometricUnlockEnabled(true);
    await service.expireSession();
    const state = await service.signInWithBiometrics('device-face-id-1');
    assert.equal(state.status, 'AUTHENTICATED');
    assert.equal(state.session?.method, 'biometric');
  });

  it('refuses an empty attestation rather than trusting it', async () => {
    await signIn();
    await service.setBiometricUnlockEnabled(true);
    await assert.rejects(() => service.signInWithBiometrics(''), InvalidCredentialsError);
  });

  it('can be turned back off', async () => {
    await signIn();
    await service.setBiometricUnlockEnabled(true);
    await service.setBiometricUnlockEnabled(false);
    assert.equal(await service.isBiometricUnlockAvailable(), false);
  });
});

describe('one-time codes', () => {
  it('masks the destination it was sent to', async () => {
    const challenge = await service.requestOtp('login', 'khaled.faiad@demo.acme.sa');
    assert.match(challenge.destination, /•/);
    assert.equal(challenge.destination.includes('khaled.faiad'), false);
  });

  it('masks a phone number to its last four digits', () => {
    assert.match(maskDestination('+966551234402'), /4402$/);
    assert.match(maskDestination('+966551234402'), /•/);
  });

  it('accepts the right code', async () => {
    const challenge = await service.requestOtp('login');
    assert.ok(await service.verifyOtp(challenge.id, demoOtpCode));
  });

  it('counts down the tries left on a wrong code', async () => {
    const challenge = await service.requestOtp('login');
    await assert.rejects(
      () => service.verifyOtp(challenge.id, '000000'),
      (error: unknown) => {
        assert.ok(error instanceof OtpInvalidError);
        assert.equal(error.attemptsRemaining, 2);
        return true;
      },
    );
  });

  it('holds the code after too many wrong tries', async () => {
    const challenge = await service.requestOtp('login');
    await assert.rejects(() => service.verifyOtp(challenge.id, '000000'), OtpInvalidError);
    await assert.rejects(() => service.verifyOtp(challenge.id, '000000'), OtpInvalidError);
    await assert.rejects(() => service.verifyOtp(challenge.id, '000000'), TooManyAttemptsError);
  });

  it('refuses an expired code even when it is correct', () => {
    const stale = {
      id: 'otp_stale',
      purpose: 'login' as const,
      destination: 'k•••@demo.acme.sa',
      length: 6,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      resendAvailableAt: new Date(Date.now() - 1000).toISOString(),
      attemptsRemaining: 3,
    };
    assert.throws(() => judgeOtp(stale, demoOtpCode), OtpExpiredError);
  });

  it('refuses to resend inside the cooldown', async () => {
    const challenge = await service.requestOtp('login');
    await assert.rejects(() => service.resendOtp(challenge.id), TooManyAttemptsError);
  });

  it('rejects a code that was never issued', async () => {
    await assert.rejects(() => service.verifyOtp('otp_nope', demoOtpCode), NotFoundError);
  });
});

describe('signing up', () => {
  it('sends an email code first', async () => {
    const state = await service.startSignup(DRAFT);
    assert.equal(state.stage, 'verify-email');
    assert.equal(state.challenge?.purpose, 'signup-email');
  });

  it('applies the shared password policy, not its own rules', async () => {
    await assert.rejects(
      () => service.startSignup({ ...DRAFT, password: 'short1' }),
      PasswordRejectedError,
    );
    await assert.rejects(
      () => service.startSignup({ ...DRAFT, password: 'onlylettershere' }),
      (error: unknown) => {
        assert.ok(error instanceof PasswordRejectedError);
        assert.equal(error.problem, 'too-simple');
        return true;
      },
    );
  });

  it('moves to the phone code once the email one clears', async () => {
    const started = await service.startSignup(DRAFT);
    const next = await service.advanceSignup(started.challenge!.id, demoOtpCode);
    assert.equal(next.stage, 'verify-phone');
    assert.equal(next.challenge?.purpose, 'signup-phone');
  });

  it('refuses a wrong code and stays on the stage', async () => {
    const started = await service.startSignup(DRAFT);
    await assert.rejects(
      () => service.advanceSignup(started.challenge!.id, '000000'),
      OtpInvalidError,
    );
    assert.equal((await service.getSignupState())?.stage, 'verify-email');
  });

  it('reaches the identity stage after both codes', async () => {
    const started = await service.startSignup(DRAFT);
    const afterEmail = await service.advanceSignup(started.challenge!.id, demoOtpCode);
    const afterPhone = await service.advanceSignup(afterEmail.challenge!.id, demoOtpCode);
    assert.equal(afterPhone.stage, 'identity');
  });

  it('creates the account and signs the new user in', async () => {
    const started = await service.startSignup(DRAFT);
    const afterEmail = await service.advanceSignup(started.challenge!.id, demoOtpCode);
    await service.advanceSignup(afterEmail.challenge!.id, demoOtpCode);
    const session = await service.completeSignup();
    assert.equal(session.status, 'AUTHENTICATED');
    assert.equal(session.session?.method, 'signup');
  });

  it('leaves a new account unverified, so the existing KYC flow has work to do', async () => {
    const started = await service.startSignup(DRAFT);
    const afterEmail = await service.advanceSignup(started.challenge!.id, demoOtpCode);
    await service.advanceSignup(afterEmail.challenge!.id, demoOtpCode);
    await service.completeSignup();
    assert.equal(currentKycStatus(), 'NOT_STARTED');
  });

  it('finishes onboarding once the employer connection is recorded', async () => {
    const started = await service.startSignup(DRAFT);
    const afterEmail = await service.advanceSignup(started.challenge!.id, demoOtpCode);
    await service.advanceSignup(afterEmail.challenge!.id, demoOtpCode);
    await service.completeSignup();
    assert.equal((await service.connectEmployer('employer-uses-talento')).stage, 'done');
  });

  it('refuses to complete a signup that was never started', async () => {
    await assert.rejects(() => service.completeSignup(), NotFoundError);
  });
});

describe('resetting a password', () => {
  it('sends a code without saying whether the account exists', async () => {
    const known = await service.requestPasswordReset(IDENTIFIER);
    const unknown = await service.requestPasswordReset('nobody@example.com');
    assert.equal(known.purpose, 'password-reset');
    assert.equal(unknown.purpose, 'password-reset');
  });

  it('signs the user in on a successful reset', async () => {
    const challenge = await service.requestPasswordReset(IDENTIFIER);
    const state = await service.resetPassword(challenge.id, demoOtpCode, 'riyadh2026spring');
    assert.equal(state.status, 'AUTHENTICATED');
    assert.equal(state.session?.method, 'otp');
  });

  it('applies the shared password policy', async () => {
    const challenge = await service.requestPasswordReset(IDENTIFIER);
    await assert.rejects(
      () => service.resetPassword(challenge.id, demoOtpCode, 'weak'),
      PasswordRejectedError,
    );
  });

  it('refuses a wrong code', async () => {
    const challenge = await service.requestPasswordReset(IDENTIFIER);
    await assert.rejects(
      () => service.resetPassword(challenge.id, '000000', 'riyadh2026spring'),
      OtpInvalidError,
    );
  });
});
