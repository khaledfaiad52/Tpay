import type { User, UserProfileUpdate } from '@/types';

/** Identity and profile. Backed by TPay's own API, not a money provider. */
export type UserService = {
  getCurrentUser(): Promise<User>;
  /** Availability check for the TPay username, used at signup and in Profile. */
  isUsernameAvailable(username: string): Promise<boolean>;
  updateProfile(update: UserProfileUpdate): Promise<User>;
  /** Changes the handle other TPay users send money to. */
  setUsername(username: string): Promise<User>;
  /** Ends the session on this device. */
  signOut(): Promise<void>;
};
