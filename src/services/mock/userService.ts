import type { UserService } from '@/services/contracts';
import type { User } from '@/types';
import { mockUser } from './data/fixtures';
import { currentKycStatus } from './kycService';
import { respond } from './latency';

/** Handles already taken in the demo directory. */
const TAKEN_USERNAMES = new Set(['tpay', 'admin', 'support', 'acme']);

let user: User = mockUser;

/** Normalises a handle: lower case, no leading @, no spaces. */
export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '');
}

/** A handle other people can actually type. */
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(normaliseUsername(username));
}

export const mockUserService: UserService = {
  // Verification state lives with the KYC service, so the profile always
  // reflects the real status rather than a copy that can drift.
  getCurrentUser: () =>
    respond('userService.getCurrentUser', { ...user, kycStatus: currentKycStatus() }),

  isUsernameAvailable: (username) => {
    const handle = normaliseUsername(username);
    const available =
      isValidUsername(handle) && !TAKEN_USERNAMES.has(handle) && handle !== user.username;
    return respond('userService.isUsernameAvailable', available);
  },

  updateProfile: (update) => {
    user = {
      ...user,
      email: update.email ?? user.email,
      phone: update.phone ?? user.phone,
      address: update.address ?? user.address,
      preferences: { ...user.preferences, ...update.preferences },
    };
    return respond('userService.updateProfile', { ...user, kycStatus: currentKycStatus() });
  },

  setUsername: (username) => {
    const handle = normaliseUsername(username);
    if (!isValidUsername(handle)) {
      return Promise.reject(
        new Error('Usernames are 3–20 characters, using letters, numbers or underscores.'),
      );
    }
    if (TAKEN_USERNAMES.has(handle)) {
      return Promise.reject(new Error('That username is taken.'));
    }
    user = { ...user, username: handle };
    return respond('userService.setUsername', { ...user, kycStatus: currentKycStatus() });
  },

  signOut: () => respond('userService.signOut', undefined),
};

export function resetUser(): void {
  user = mockUser;
}
