import type { WalletBalance } from '@/types';

/**
 * The "one balance" view: the USD-equivalent total plus every currency
 * account behind it. The card, transfers and salary all settle against this.
 */
export type WalletService = {
  getBalance(): Promise<WalletBalance>;
};
