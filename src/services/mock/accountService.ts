import { NotFoundError } from '@/services/contracts';
import type { AccountService } from '@/services/contracts';
import { mockAccountDetails } from './data/fixtures';
import { findAccount, getAccounts } from './data/store';
import { respond } from './latency';

export const mockAccountService: AccountService = {
  listAccounts: () => respond('accountService.listAccounts', getAccounts()),

  getAccount: (accountId) => {
    const account = findAccount(accountId);
    if (!account) return Promise.reject(new NotFoundError('Account', accountId));
    return respond('accountService.getAccount', account);
  },

  getAccountDetails: (accountId) => {
    const details = mockAccountDetails[accountId];
    if (!details) return Promise.reject(new NotFoundError('Account details', accountId));
    return respond('accountService.getAccountDetails', details);
  },
};
