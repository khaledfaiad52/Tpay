import { AccountFrozenError } from '@/services/contracts';
import { currentAccountState } from './securityService';

/**
 * The one place that decides whether the account may move money.
 *
 * Every service that debits, credits or prices a movement calls this rather
 * than reading the freeze flag itself, so the rule cannot be honoured in one
 * service and forgotten in another. A provider-backed adapter set calls its
 * own equivalent here and nothing above changes.
 */
export function requireActiveAccount(): void {
  const state = currentAccountState();
  if (state.frozen && state.restriction) throw new AccountFrozenError(state.restriction);
}

/**
 * The same check, as a value rather than a throw, for the promise-returning
 * service methods that must reject instead of throwing synchronously.
 */
export function accountFreezeError(): AccountFrozenError | undefined {
  const state = currentAccountState();
  return state.frozen && state.restriction
    ? new AccountFrozenError(state.restriction)
    : undefined;
}

/** True when money may move right now. For screens that ask before offering. */
export function accountCanTransact(): boolean {
  return !currentAccountState().frozen;
}
