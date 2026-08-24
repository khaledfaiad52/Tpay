import type { WalletService } from '@/services/contracts';
import { getAccounts, getTotalBalance } from './data/store';
import { respond } from './latency';

export const mockWalletService: WalletService = {
  getBalance: () =>
    respond('walletService.getBalance', {
      total: getTotalBalance(),
      accounts: getAccounts(),
    }),
};
