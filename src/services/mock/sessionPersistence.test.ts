import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { SessionStorage } from '@/services/contracts';
import type { PersistedSession } from '@/types';
import { configureMockBehaviour } from './latency';
import { mockSecurityService, resetSecurity } from './securityService';
import { demoOtpCode, demoPassword, mockSessionService, resetSession } from './sessionService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

const service = mockSessionService;
const IDENTIFIER = 'khaled.faiad@demo.acme.sa';

/** Stands in for the device keychain, and lets a test read what was written. */
function testStorage(): SessionStorage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
    persists: true,
  };
}

let storage: ReturnType<typeof testStorage>;

beforeEach(() => {
  resetSession();
  resetSecurity();
  storage = testStorage();
  service.useStorage(storage);
});

/** Signs in fully, answering the two-factor challenge the demo account has on. */
async function signIn(rememberDevice = true) {
  const outcome = await service.signIn({
    identifier: IDENTIFIER,
    password: demoPassword,
    rememberDevice,
  });
  if (outcome.kind === 'session') return outcome.state;
  return service.verifySignInChallenge(outcome.challenge.id, demoOtpCode);
}

function stored(): PersistedSession | undefined {
  const raw = storage.map.get('tpay.session.v1');
  return raw ? (JSON.parse(raw) as PersistedSession) : undefined;
}

describe('what is written to the keychain', () => {
  it('persists a session on sign-in', async () => {
    await signIn();
    assert.ok(stored());
  });

  it('never writes a password', async () => {
    await signIn();
    assert.equal(JSON.stringify(stored()).includes(demoPassword), false);
  });

  it('never writes a one-time code', async () => {
    await signIn();
    assert.equal(JSON.stringify(stored()).includes(demoOtpCode), false);
  });

  it('never writes the access token', async () => {
    const state = await signIn();
    const record = JSON.stringify(stored());
    assert.equal(record.includes(state.session!.tokens.accessToken), false);
  });

  it('writes only the fields needed to resume', async () => {
    await signIn();
    assert.deepEqual(Object.keys(stored()!).sort(), [
      'biometricUnlockEnabled',
      'deviceId',
      'deviceRemembered',
      'refreshToken',
      'refreshTokenExpiresAt',
      'sessionId',
      'userId',
    ]);
  });

  it('keeps the refresh token, which is what resuming needs', async () => {
    const state = await signIn();
    assert.equal(stored()?.refreshToken, state.session!.tokens.refreshToken);
  });
});

describe('restoring a session', () => {
  it('comes back authenticated on the next launch', async () => {
    await signIn();
    // A new launch: the in-memory session is gone, the keychain is not.
    resetSession();
    service.useStorage(storage);
    assert.equal((await service.restoreSession()).status, 'AUTHENTICATED');
  });

  it('mints a fresh access token rather than reusing a stored one', async () => {
    const first = await signIn();
    resetSession();
    service.useStorage(storage);
    const restored = await service.restoreSession();
    assert.notEqual(
      restored.session!.tokens.accessToken,
      first.session!.tokens.accessToken,
    );
  });

  it('reports SESSION_EXPIRED when the refresh token has run out', async () => {
    await signIn();
    await service.expireSession();
    resetSession();
    service.useStorage(storage);
    const restored = await service.restoreSession();
    assert.equal(restored.status, 'SESSION_EXPIRED');
    assert.equal(restored.reason, 'expired');
  });

  it('clears the keychain once the refresh token is spent', async () => {
    await signIn();
    await service.expireSession();
    resetSession();
    service.useStorage(storage);
    await service.restoreSession();
    assert.equal(stored(), undefined);
  });

  it('treats an unreadable record as no session at all', async () => {
    storage.map.set('tpay.session.v1', 'not json');
    assert.equal((await service.restoreSession()).status, 'SIGNED_OUT');
  });

  it('starts signed out on a device that has never been used', async () => {
    assert.equal((await service.restoreSession()).status, 'SIGNED_OUT');
  });
});

describe('signing out clears the keychain', () => {
  it('removes the persisted session', async () => {
    await signIn();
    await service.signOut();
    assert.equal(stored(), undefined);
  });

  it('leaves nothing to restore afterwards', async () => {
    await signIn();
    await service.signOut();
    resetSession();
    service.useStorage(storage);
    assert.equal((await service.restoreSession()).status, 'SIGNED_OUT');
  });

  it('forgets biometric unlock, because that is what signing out means', async () => {
    await signIn();
    await service.setBiometricUnlockEnabled(true);
    await service.signOut();
    assert.equal(await service.isBiometricUnlockAvailable(), false);
  });
});

describe('refreshing a session', () => {
  it('issues a new access token', async () => {
    const first = await signIn();
    const refreshed = await service.refreshSession();
    assert.equal(refreshed.status, 'AUTHENTICATED');
    assert.notEqual(
      refreshed.session!.tokens.accessToken,
      first.session!.tokens.accessToken,
    );
  });

  it('rotates the refresh token, so a stolen one is good once', async () => {
    const first = await signIn();
    const refreshed = await service.refreshSession();
    assert.notEqual(
      refreshed.session!.tokens.refreshToken,
      first.session!.tokens.refreshToken,
    );
    assert.equal(stored()?.refreshToken, refreshed.session!.tokens.refreshToken);
  });

  it('keeps the same session identity across a refresh', async () => {
    const first = await signIn();
    const refreshed = await service.refreshSession();
    assert.equal(refreshed.session!.id, first.session!.id);
  });

  it('expires rather than refreshing once the refresh token is spent', async () => {
    await signIn();
    await service.expireSession();
    assert.equal((await service.refreshSession()).status, 'SESSION_EXPIRED');
  });

  it('reports signed out when there is nothing to refresh', async () => {
    assert.equal((await service.refreshSession()).status, 'SIGNED_OUT');
  });
});

describe('two-factor and trusted devices', () => {
  it('challenges a device the account has not been seen on', async () => {
    const outcome = await service.signIn({ identifier: IDENTIFIER, password: demoPassword });
    assert.equal(outcome.kind, 'otp-required');
  });

  it('does not challenge a device that has signed in before', async () => {
    await signIn();
    const again = await service.signIn({ identifier: IDENTIFIER, password: demoPassword });
    assert.equal(again.kind, 'session');
  });

  it('does not challenge on a later launch of a remembered device', async () => {
    await signIn();
    resetSession();
    service.useStorage(storage);
    await service.restoreSession();
    await service.signOut();

    // Signed out, but this device has been seen: it is still trusted.
    const outcome = await service.signIn({ identifier: IDENTIFIER, password: demoPassword });
    assert.equal(outcome.kind, 'session');
  });

  it('does not challenge at all when two-factor is off', async () => {
    await mockSecurityService.setTwoFactorEnabled(false);
    const outcome = await service.signIn({ identifier: IDENTIFIER, password: demoPassword });
    assert.equal(outcome.kind, 'session');
  });

  it('refuses a wrong code and issues no session', async () => {
    const outcome = await service.signIn({ identifier: IDENTIFIER, password: demoPassword });
    assert.equal(outcome.kind, 'otp-required');
    if (outcome.kind !== 'otp-required') return;
    await assert.rejects(() => service.verifySignInChallenge(outcome.challenge.id, '000000'));
    assert.equal((await service.getSessionState()).status, 'SIGNED_OUT');
  });

  it('sends the code to a masked destination, never a full number', async () => {
    const outcome = await service.signIn({ identifier: IDENTIFIER, password: demoPassword });
    if (outcome.kind !== 'otp-required') return assert.fail('expected a challenge');
    assert.match(outcome.challenge.destination, /•/);
  });
});
