import { useCallback } from 'react';

import { services, type Recipient } from '@/services';
import type { Account, Money } from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

export type SendHubData = {
  readonly accounts: readonly Account[];
  /** The wallet the flow defaults to paying from. */
  readonly primary: Account;
  readonly recipients: readonly Recipient[];
};

async function loadSendHub(): Promise<SendHubData> {
  const [accounts, recipients] = await Promise.all([
    services.account.listAccounts(),
    services.transfer.listRecipients(),
  ]);
  return {
    accounts,
    primary: accounts.find((account) => account.isPrimary) ?? accounts[0],
    recipients,
  };
}

export function useSendHubData(): AsyncResult<SendHubData> {
  return useAsyncData(loadSendHub);
}

export type TransferDetailData = {
  readonly transfer: Awaited<ReturnType<typeof services.transfer.getTransfer>>;
  readonly sourceAccount: Account | undefined;
};

export function useTransferDetail(transferId: string): AsyncResult<TransferDetailData> {
  const load = useCallback(async (): Promise<TransferDetailData> => {
    const transfer = await services.transfer.getTransfer(transferId);
    const sourceAccount = await services.account
      .getAccount(transfer.sourceAccountId)
      .catch(() => undefined);
    return { transfer, sourceAccount };
  }, [transferId]);

  return useAsyncData(load);
}

/** Quick amounts offered under the amount field, in the source currency. */
export function presetAmountsFor(currency: Account['currency']): readonly Money[] {
  const majors = currency === 'EGP' ? [500, 2500, 5000] : [100, 500, 1000];
  return majors.map((major) => ({
    minorUnits: major * 100,
    currency,
  }));
}
