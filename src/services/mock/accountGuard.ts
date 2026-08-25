import { AccountRestrictedError } from '@/services/contracts';
import type { AccountState } from '@/services/contracts';
import { currentKycStatus } from './kycService';
import { currentSecuritySettings } from './securityService';

/**
 * Whether the account may move money, and why not when it may not.
 *
 * One function answers for the whole app. It folds together the two things
 * that stop money — a freeze the user applied, and a verification TPay
 * declined or suspended — so no service has to know about both, and none of
 * them can honour one rule and forget the other.
 *
 * A blocked verification never locks the user out of TPay: they can still sign
 * in, read their account, see the reason and message support. Only movement
 * stops.
 */
export function currentAccountState(): AccountState {
  const { accountFrozen } = currentSecuritySettings();

  if (accountFrozen) {
    return {
      frozen: true,
      restricted: true,
      restriction: {
        code: 'account-frozen',
        title: 'Your account is frozen',
        explanation:
          'You froze this account, so cards and transfers are blocked. Unfreeze it in Security to start moving money again.',
        action: { kind: 'unfreeze-account', label: 'Unfreeze in Security' },
      },
    };
  }

  const kyc = currentKycStatus();

  if (kyc === 'REJECTED') {
    return {
      frozen: false,
      restricted: true,
      restriction: {
        code: 'verification-declined',
        title: 'Verification was declined',
        explanation:
          'Transfers and card payments are paused because we could not verify your identity. TPay Support can tell you what to send instead.',
        action: { kind: 'contact-support', label: 'Contact TPay support' },
      },
    };
  }

  if (kyc === 'SUSPENDED') {
    return {
      frozen: false,
      restricted: true,
      restriction: {
        code: 'account-under-review',
        title: 'Account under review',
        explanation:
          'Transfers and card payments are paused while TPay reviews your account. You can still see everything here.',
        action: { kind: 'contact-support', label: 'Contact TPay support' },
      },
    };
  }

  return { frozen: false, restricted: false };
}

/**
 * The gate every money-moving service calls rather than reading the rules
 * itself. A provider-backed adapter set calls its own equivalent here and
 * nothing above changes.
 */
export function requireActiveAccount(): void {
  const state = currentAccountState();
  if (state.restricted && state.restriction) throw new AccountRestrictedError(state.restriction);
}

/**
 * The same check as a value rather than a throw, for the promise-returning
 * service methods that must reject instead of throwing synchronously.
 */
export function accountRestrictionError(): AccountRestrictedError | undefined {
  const state = currentAccountState();
  return state.restricted && state.restriction
    ? new AccountRestrictedError(state.restriction)
    : undefined;
}

/** True when money may move right now. For screens that ask before offering. */
export function accountCanTransact(): boolean {
  return !currentAccountState().restricted;
}
