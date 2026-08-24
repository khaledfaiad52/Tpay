import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where the session token lives between app launches.
 *
 * The device keychain (iOS) or EncryptedSharedPreferences (Android) via
 * `expo-secure-store`. Only the session lives here, and only the minimum of
 * it — see `PERSISTED_SESSION_FIELDS` in `sessionService`.
 *
 * **Never** stored: passwords, one-time codes, full card numbers, KYC
 * documents. Those either never reach the device or are held in memory for
 * the moment they are needed and then dropped.
 *
 * The web build has no keychain. Rather than silently falling back to
 * `localStorage` — which is readable by any script on the origin and would be
 * a worse place for a token than memory — web keeps the session in memory
 * only, and the user signs in again on reload. That is an honest limitation,
 * not a bug.
 */
export type SecureStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** False when nothing is actually persisted, so callers can say so. */
  readonly persists: boolean;
};

/** Web and any platform without a keychain: memory for the session's lifetime. */
function memoryStorage(): SecureStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(store.get(key) ?? null),
    setItem: (key, value) => {
      store.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      store.delete(key);
      return Promise.resolve();
    },
    persists: false,
  };
}

function keychainStorage(): SecureStorage {
  return {
    getItem: async (key) => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        // A keychain that will not answer is treated as empty. Signing the
        // user in again is always safer than guessing at a session.
        return null;
      }
    },
    setItem: async (key, value) => {
      await SecureStore.setItemAsync(key, value, {
        // The token is only useful while the device is unlocked anyway, and
        // this keeps it out of an unlocked-device backup.
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    },
    removeItem: async (key) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Already gone is the outcome we wanted.
      }
    },
    persists: true,
  };
}

export const secureStorage: SecureStorage =
  Platform.OS === 'web' ? memoryStorage() : keychainStorage();

/** An isolated store, for tests that must not share state. */
export function createMemorySecureStorage(): SecureStorage {
  return memoryStorage();
}
