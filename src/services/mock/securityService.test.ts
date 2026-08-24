import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { NotFoundError, PasswordRejectedError } from '@/services/contracts';
import { configureMockBehaviour } from './latency';
import {
  mockSecurityService,
  passwordProblem,
  resetSecurity,
  unavailableBiometricAuthenticator,
} from './securityService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetSecurity();
});

const service = mockSecurityService;
const CURRENT = 'demo-password';

describe('passwordProblem', () => {
  it('accepts a strong new password', () => {
    assert.equal(
      passwordProblem({ currentPassword: CURRENT, newPassword: 'riyadh2026spring' }),
      undefined,
    );
  });

  it('names the wrong current password rather than blaming the new one', () => {
    const problem = passwordProblem({ currentPassword: 'nope', newPassword: 'riyadh2026spring' });
    assert.equal(problem?.problem, 'current-incorrect');
  });

  it('rejects a short password', () => {
    assert.equal(
      passwordProblem({ currentPassword: CURRENT, newPassword: 'ab1' })?.problem,
      'too-short',
    );
  });

  it('rejects letters with no digits', () => {
    assert.equal(
      passwordProblem({ currentPassword: CURRENT, newPassword: 'onlylettershere' })?.problem,
      'too-simple',
    );
  });
});

describe('securityService settings', () => {
  it('records that biometrics were asked for', async () => {
    const settings = await service.setBiometricsEnabled(true);
    assert.equal(settings.biometricsEnabled, true);
  });

  it('turns two-factor off and back on', async () => {
    assert.equal((await service.setTwoFactorEnabled(false)).twoFactorEnabled, false);
    assert.equal((await service.setTwoFactorEnabled(true)).twoFactorEnabled, true);
  });

  it('never exposes the whole two-factor destination', async () => {
    const settings = await service.getSettings();
    assert.match(settings.twoFactorDestination, /•/);
  });

  it('changes the password and stamps the date', async () => {
    const settings = await service.changePassword({
      currentPassword: CURRENT,
      newPassword: 'riyadh2026spring',
    });
    assert.equal(settings.passwordUpdatedAt, new Date().toISOString().slice(0, 10));
  });

  it('rejects a bad password change with the problem attached', async () => {
    await assert.rejects(
      () => service.changePassword({ currentPassword: 'nope', newPassword: 'riyadh2026spring' }),
      (error: unknown) => {
        assert.ok(error instanceof PasswordRejectedError);
        assert.equal(error.problem, 'current-incorrect');
        return true;
      },
    );
  });

  it('freezes and unfreezes the account', async () => {
    assert.equal((await service.setAccountFrozen(true)).accountFrozen, true);
    assert.equal((await service.setAccountFrozen(false)).accountFrozen, false);
  });
});

describe('securityService devices', () => {
  it('marks exactly one device as the current one', async () => {
    const devices = await service.listDevices();
    assert.equal(devices.filter((device) => device.isCurrent).length, 1);
  });

  it('signs another device out', async () => {
    const before = await service.listDevices();
    const other = before.find((device) => !device.isCurrent)!;
    const after = await service.signOutDevice(other.id);
    assert.equal(after.length, before.length - 1);
  });

  it('refuses to sign the current device out from here', async () => {
    const devices = await service.listDevices();
    const current = devices.find((device) => device.isCurrent)!;
    await assert.rejects(() => service.signOutDevice(current.id));
  });

  it('rejects an unknown device', async () => {
    await assert.rejects(() => service.signOutDevice('dev_nope'), NotFoundError);
  });

  it('leaves only this device after signing everything else out', async () => {
    const devices = await service.signOutAllOtherDevices();
    assert.equal(devices.length, 1);
    assert.equal(devices[0].isCurrent, true);
  });

  it('keeps a blocked login attempt in the activity list', async () => {
    const activity = await service.listLoginActivity();
    assert.ok(activity.some((event) => event.outcome === 'blocked'));
  });
});

describe('biometric authenticator', () => {
  it('reports honestly that the capability is not there', async () => {
    const capability = await unavailableBiometricAuthenticator.getCapability();
    assert.equal(capability.available, false);
    assert.equal(capability.enrolled, false);
    assert.ok(capability.unavailableReason);
  });

  it('refuses to authenticate rather than pretending it did', async () => {
    await assert.rejects(() => unavailableBiometricAuthenticator.authenticate('Confirm transfer'));
  });
});
