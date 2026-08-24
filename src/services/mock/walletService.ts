import type { WalletService } from '@/services/contracts';
import type { Account, Money } from '@/types';
import { getAccounts } from './data/store';
import { convert, rateBetween } from './fxService';
import { respond } from './latency';

/** The one balance is always reported in the primary wallet's currency. */
const REPORTING_CURRENCY = 'USD';

/**
 * The USD-equivalent of every account combined.
 *
 * This is derived, never stored: the headline balance is exactly the sum of
 * the accounts behind it, converted through the FX layer. Each account is
 * rounded to cents on conversion so the total reconciles against the figures
 * the user can see on each row.
 */
export function totalBalanceOf(accounts: readonly Account[]): Money {
  const minorUnits = accounts.reduce((total, account) => {
    if (account.balance.currency === REPORTING_CURRENCY) {
      return total + account.balance.minorUnits;
    }
    const rate = rateBetween(account.balance.currency, REPORTING_CURRENCY);
    return total + convert(account.balance, REPORTING_CURRENCY, rate).minorUnits;
  }, 0);

  return { minorUnits, currency: REPORTING_CURRENCY };
}

export const mockWalletService: WalletService = {
  getBalance: () => {
    const accounts = getAccounts();
    return respond('walletService.getBalance', {
      total: totalBalanceOf(accounts),
      accounts,
    });
  },
};
