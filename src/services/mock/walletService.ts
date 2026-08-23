import type { WalletService } from '@/services/contracts';
import { mockAccounts, mockTotalBalance } from './data/fixtures';
import { respond } from './latency';

export const mockWalletService: WalletService = {
  getBalance: () =>
    respond('walletService.getBalance', {
      total: mockTotalBalance,
      accounts: mockAccounts,
    }),
};
