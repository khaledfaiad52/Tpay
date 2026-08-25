import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { BiometricUnavailableError } from '@/services/contracts';
import type { BiometricAuthenticator } from '@/services/contracts';
import type { BiometricCapability } from '@/types';

/**
 * Device biometrics, answered by the platform rather than by TPay.
 *
 * This is the same `BiometricAuthenticator` contract the Security screen, the
 * transfer confirmation seam and the card-detail reveal already use — there is
 * one implementation and one prompt, not three.
 *
 * It never claims a capability the device does not have. On a platform with no
 * biometric hardware, no enrolled face or fingerprint, or no native module at
 * all (the web build), `getCapability()` says so and `authenticate()` rejects.
 */

/** What to call the check on this device. */
function labelFor(types: readonly LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'Iris unlock';
  return Platform.OS === 'ios' ? 'Face ID' : 'Biometric unlock';
}

const UNSUPPORTED: BiometricCapability = {
  available: false,
  label: 'Face ID',
  enrolled: false,
  unavailableReason:
    'This device cannot do biometric checks. Your password and two-factor code still protect this account.',
};

const NOT_ENROLLED = (label: string): BiometricCapability => ({
  available: false,
  label,
  enrolled: false,
  unavailableReason: `Set up ${label} in your device settings to use it here.`,
});

export const deviceBiometricAuthenticator: BiometricAuthenticator = {
  getCapability: async () => {
    // The web build has no native module, so asking is itself the answer.
    if (Platform.OS === 'web') {
      return {
        ...UNSUPPORTED,
        unavailableReason:
          'Biometric unlock is available in the TPay app on your phone. Your password and two-factor code protect this account here.',
      };
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return UNSUPPORTED;

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const label = labelFor(types);
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) return NOT_ENROLLED(label);

      return { available: true, label, enrolled: true };
    } catch {
      // A module that will not answer is a module that cannot be trusted to
      // authenticate. Report it unavailable rather than assuming.
      return UNSUPPORTED;
    }
  },

  authenticate: async (reason: string) => {
    const capability = await deviceBiometricAuthenticator.getCapability();
    if (!capability.available) {
      throw new BiometricUnavailableError(
        capability.unavailableReason ?? `${capability.label} is not available on this device.`,
      );
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Use password',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new BiometricUnavailableError(
        result.error === 'user_cancel' || result.error === 'system_cancel'
          ? 'That check was cancelled.'
          : `${capability.label} could not confirm it was you.`,
      );
    }

    // The platform does not hand back a signed attestation, so what is passed
    // on is a marker that the local check succeeded — not a credential, and
    // not proof to any server. A real backend issues its own challenge here.
    return { token: `device-${capability.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}` };
  },
};
