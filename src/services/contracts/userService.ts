import type { User } from '@/types';

/** Identity and profile. Backed by TPay's own API, not a money provider. */
export type UserService = {
  getCurrentUser(): Promise<User>;
  /** Availability check for the TPay username, used at signup and in Profile. */
  isUsernameAvailable(username: string): Promise<boolean>;
};
