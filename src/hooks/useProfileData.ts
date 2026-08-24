import { services, unavailableBiometricAuthenticator, unreadCount } from '@/services';
import type {
  AccountState,
  KycState,
  KycStep,
  PasswordPolicy,
  TransferLimit,
} from '@/services';
import type {
  AppNotification,
  BiometricCapability,
  LoginEvent,
  SecuritySettings,
  TrustedDevice,
  User,
} from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

export type ProfileData = {
  readonly user: User;
  readonly kyc: KycState;
  /** How many requests still need the user or HR, for the Requests row. */
  readonly openRequestCount: number;
  readonly unreadNotificationCount: number;
};

async function loadProfile(): Promise<ProfileData> {
  const [user, kyc, requests, notifications] = await Promise.all([
    services.user.getCurrentUser(),
    services.kyc.getKycStatus(),
    services.requests.listRequests(),
    services.notifications.listNotifications(),
  ]);
  return {
    user,
    kyc,
    openRequestCount: requests.filter((request) => request.status !== 'completed').length,
    unreadNotificationCount: unreadCount(notifications),
  };
}

export function useProfileData(): AsyncResult<ProfileData> {
  return useAsyncData(loadProfile);
}

export type KycData = {
  readonly state: KycState;
  readonly steps: readonly KycStep[];
  /** The ceiling the user is sending under at this verification level. */
  readonly limit: TransferLimit;
};

async function loadKyc(): Promise<KycData> {
  const [state, steps, limit] = await Promise.all([
    services.kyc.getKycStatus(),
    services.kyc.listSteps(),
    services.transfer.getSendingLimit(),
  ]);
  return { state, steps, limit };
}

export function useKycData(): AsyncResult<KycData> {
  return useAsyncData(loadKyc);
}

export type SecurityData = {
  readonly settings: SecuritySettings;
  readonly devices: readonly TrustedDevice[];
  readonly activity: readonly LoginEvent[];
  /** What this device can actually do — never assumed. */
  readonly biometrics: BiometricCapability;
  readonly kyc: KycState;
  /** Whether money may move at all right now. */
  readonly accountState: AccountState;
};

async function loadSecurity(): Promise<SecurityData> {
  const [settings, devices, activity, biometrics, kyc, accountState] = await Promise.all([
    services.security.getSettings(),
    services.security.listDevices(),
    services.security.listLoginActivity(),
    unavailableBiometricAuthenticator.getCapability(),
    services.kyc.getKycStatus(),
    services.security.getAccountState(),
  ]);
  return { settings, devices, activity, biometrics, kyc, accountState };
}

export function useSecurityData(): AsyncResult<SecurityData> {
  return useAsyncData(loadSecurity);
}

async function loadPasswordPolicy(): Promise<PasswordPolicy> {
  return services.security.getPasswordPolicy();
}

/** The password rules, from the service — never restated in the screen. */
export function usePasswordPolicy(): AsyncResult<PasswordPolicy> {
  return useAsyncData(loadPasswordPolicy);
}

async function loadNotifications(): Promise<readonly AppNotification[]> {
  return services.notifications.listNotifications();
}

export function useNotificationsData(): AsyncResult<readonly AppNotification[]> {
  return useAsyncData(loadNotifications);
}
