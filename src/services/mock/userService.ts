import type { UserService } from '@/services/contracts';
import { mockUser } from './data/fixtures';
import { respond } from './latency';

/** Handles already taken in the demo directory. */
const TAKEN_USERNAMES = new Set(['khaled', 'tpay', 'admin', 'support', 'acme']);

export const mockUserService: UserService = {
  getCurrentUser: () => respond('userService.getCurrentUser', mockUser),
  isUsernameAvailable: (username) =>
    respond('userService.isUsernameAvailable', !TAKEN_USERNAMES.has(username.trim().toLowerCase())),
};
