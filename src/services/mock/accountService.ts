import type { AccountService } from '@/services/contracts';
import { mockAccountDetails, mockAccounts } from './data/fixtures';
import { NotFoundError, respond } from './latency';

export const mockAccountService: AccountService = {
  listAccounts: () => respond('accountService.listAccounts', mockAccounts),

  getAccount: (accountId) => {
    const account = mockAccounts.find((candidate) => candidate.id === accountId);
    if (!account) return Promise.reject(new NotFoundError('Account', accountId));
    return respond('accountService.getAccount', account);
  },

  getAccountDetails: (accountId) => {
    const details = mockAccountDetails[accountId];
    if (!details) return Promise.reject(new NotFoundError('Account details', accountId));
    return respond('accountService.getAccountDetails', details);
  },
};
