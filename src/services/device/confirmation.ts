import { BiometricUnavailableError } from '@/services/contracts';
import type { BiometricCapability } from '@/types';
import { deviceBiometricAuthenticator } from './biometrics';

/**
 * How an action was authorised.
 *
 * Deliberately the same shape as `TransferConfirmation` and
 * `CardAuthorization`, so one resolver serves both and neither has its own
 * idea of what a confirmation is.
 */
export type Confirmation = {
  readonly method: 'tap' | 'biometric';
  /** Present only when a device check actually ran. */
  readonly token?: string;
};

/**
 * Resolves how to confirm an action.
 *
 * Biometric confirmation is optional and never forced. There are exactly
 * three outcomes:
 *
 * - The user has not turned it on, or the device cannot do it → the existing
 *   tap confirmation, recorded honestly as `tap`.
 * - The device can, the user has, and the check passes → `biometric`, with
 *   the attestation the platform produced.
 * - The check runs and the user cancels → this throws. Cancelling is the user
 *   declining to authorise; quietly downgrading to `tap` would turn a refusal
 *   into an approval.
 *
 * There are no transaction thresholds here: every action of a given kind is
 * treated the same way.
 */
export async function resolveConfirmation(
  reason: string,
  biometricsEnabled: boolean,
): Promise<Confirmation> {
  if (!biometricsEnabled) return { method: 'tap' };

  let capability: BiometricCapability;
  try {
    capability = await deviceBiometricAuthenticator.getCapability();
  } catch {
    return { method: 'tap' };
  }

  // Enabled as a preference but unusable on this device: fall back rather
  // than blocking the user out of their own money.
  if (!capability.available) return { method: 'tap' };

  const { token } = await deviceBiometricAuthenticator.authenticate(reason);
  return { method: 'biometric', token };
}

/** True when a failure was the user declining rather than a missing capability. */
export function wasDeclined(error: unknown): boolean {
  return error instanceof BiometricUnavailableError;
}
