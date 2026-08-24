import { meetsRequirement, NotFoundError, PasswordRejectedError } from '@/services/contracts';
import type {
  AccountState,
  BiometricAuthenticator,
  PasswordChange,
  PasswordPolicy,
  SecurityService,
} from '@/services/contracts';
import type { BiometricCapability, LoginEvent, SecuritySettings, TrustedDevice } from '@/types';
import { mockDevices, mockLoginActivity, mockSecuritySettings } from './data/fixtures';
import { respond } from './latency';

/**
 * TPay's password policy, as configuration rather than code.
 *
 * The screen renders these requirements and `passwordProblem` enforces them,
 * both through `meetsRequirement`, so a password can never look acceptable in
 * the UI and be refused by the service.
 */
const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 10,
  requiresLetter: true,
  requiresNumber: true,
  requirements: [
    { id: 'min-length', label: 'At least 10 characters' },
    { id: 'letter-and-number', label: 'A letter and a number' },
  ],
};

/** Stands in for the password the demo account already has. */
const CURRENT_PASSWORD = 'demo-password';

let settings: SecuritySettings = mockSecuritySettings;
let devices: TrustedDevice[] = [...mockDevices];
let activity: LoginEvent[] = [...mockLoginActivity];

/**
 * Judges a new password. Returns the problem, or nothing when it is fine.
 * Exported so the rules can be tested without going through the service.
 */
export function passwordProblem(
  change: PasswordChange,
  policy: PasswordPolicy = PASSWORD_POLICY,
): PasswordRejectedError | undefined {
  if (change.currentPassword !== CURRENT_PASSWORD) {
    return new PasswordRejectedError('current-incorrect', "That isn't your current password.");
  }
  if (!meetsRequirement('min-length', change.newPassword, policy)) {
    return new PasswordRejectedError('too-short', `Use at least ${policy.minLength} characters.`);
  }
  if (!meetsRequirement('letter-and-number', change.newPassword, policy)) {
    return new PasswordRejectedError('too-simple', 'Mix letters and numbers.');
  }
  if (change.newPassword === change.currentPassword) {
    return new PasswordRejectedError('same-as-current', 'Choose a password you have not used here.');
  }
  return undefined;
}

/**
 * The account-level gate, derived from the one freeze flag.
 *
 * Exported so the services that move money can read it synchronously; they
 * must not keep a copy or decide for themselves.
 */
export function currentAccountState(): AccountState {
  if (!settings.accountFrozen) return { frozen: false };
  return {
    frozen: true,
    restriction: {
      code: 'account-frozen',
      title: 'Your account is frozen',
      explanation:
        'You froze this account, so cards and transfers are blocked. Unfreeze it in Security to start moving money again.',
      action: { kind: 'unfreeze-account', label: 'Unfreeze in Security' },
    },
  };
}

export const mockSecurityService: SecurityService = {
  getSettings: () => respond('securityService.getSettings', settings),

  setBiometricsEnabled: (enabled) => {
    settings = { ...settings, biometricsEnabled: enabled };
    return respond('securityService.setBiometricsEnabled', settings);
  },

  setTwoFactorEnabled: (enabled) => {
    settings = { ...settings, twoFactorEnabled: enabled };
    return respond('securityService.setTwoFactorEnabled', settings);
  },

  changePassword: (change) => {
    const problem = passwordProblem(change);
    if (problem) return Promise.reject(problem);
    settings = { ...settings, passwordUpdatedAt: new Date().toISOString().slice(0, 10) };
    return respond('securityService.changePassword', settings);
  },

  listDevices: () => respond('securityService.listDevices', devices),

  signOutDevice: (deviceId) => {
    const device = devices.find((candidate) => candidate.id === deviceId);
    if (!device) return Promise.reject(new NotFoundError('Device', deviceId));
    if (device.isCurrent) {
      return Promise.reject(new Error('Use Log out to end the session on this device.'));
    }
    devices = devices.filter((candidate) => candidate.id !== deviceId);
    return respond('securityService.signOutDevice', devices);
  },

  signOutAllOtherDevices: () => {
    devices = devices.filter((candidate) => candidate.isCurrent);
    return respond('securityService.signOutAllOtherDevices', devices);
  },

  listLoginActivity: () => respond('securityService.listLoginActivity', activity),

  setAccountFrozen: (frozen) => {
    settings = { ...settings, accountFrozen: frozen };
    return respond('securityService.setAccountFrozen', settings);
  },

  getAccountState: () => respond('securityService.getAccountState', currentAccountState()),

  getPasswordPolicy: () => respond('securityService.getPasswordPolicy', PASSWORD_POLICY),
};

/**
 * Biometrics on this platform.
 *
 * There is no native module yet, so this reports honestly that the capability
 * is unavailable rather than pretending a face was checked. A real
 * implementation replaces this object; nothing that consumes it changes.
 */
export const unavailableBiometricAuthenticator: BiometricAuthenticator = {
  getCapability: () =>
    respond('biometrics.getCapability', {
      available: false,
      label: 'Face ID',
      enrolled: false,
      unavailableReason:
        'Device biometrics are not connected yet. Your password and two-factor code still protect this account.',
    } satisfies BiometricCapability),

  authenticate: () =>
    Promise.reject(
      new Error('Device biometrics are not connected yet.'),
    ),
};

export function resetSecurity(): void {
  settings = mockSecuritySettings;
  devices = [...mockDevices];
  activity = [...mockLoginActivity];
}
