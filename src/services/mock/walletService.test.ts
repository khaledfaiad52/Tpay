import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { fromMajor, type Account } from '@/types';
import { adjustBalance, getAccounts, resetStore } from './data/store';
import { rateBetween } from './fxService';
import { configureMockBehaviour } from './latency';
import { mockWalletService, totalBalanceOf } from './walletService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetStore();
});

function account(id: string, currency: Account['currency'], major: number): Account {
  return {
    id,
    currency,
    name: `${currency} account`,
    shortName: currency,
    kind: 'local',
    balance: fromMajor(major, currency),
    maskedNumber: '0000',
    isPrimary: currency === 'USD',
  };
}

describe('totalBalanceOf', () => {
  it('is exactly the sum of the accounts behind it', () => {
    const accounts = [account('a', 'USD', 100), account('b', 'USD', 25.5)];
    assert.deepEqual(totalBalanceOf(accounts), fromMajor(125.5, 'USD'));
  });

  it('converts every non-USD account through the FX layer', () => {
    const accounts = [account('a', 'USD', 100), account('b', 'SAR', 3747.5)];
    const expected = 10000 + Math.round((374750 / 100) * rateBetween('SAR', 'USD') * 100);
    assert.equal(totalBalanceOf(accounts).minorUnits, expected);
  });

  it('is zero for an empty wallet, not undefined', () => {
    assert.deepEqual(totalBalanceOf([]), { minorUnits: 0, currency: 'USD' });
  });

  it('reports in USD whatever the accounts hold', () => {
    assert.equal(totalBalanceOf([account('b', 'EGP', 75000)]).currency, 'USD');
  });
});

describe('walletService.getBalance', () => {
  it('reports a total consistent with the accounts it returns', async () => {
    const { total, accounts } = await mockWalletService.getBalance();
    assert.deepEqual(total, totalBalanceOf(accounts));
  });

  it('tracks the accounts when a balance moves', async () => {
    const before = (await mockWalletService.getBalance()).total.minorUnits;
    adjustBalance('acc_usd', fromMajor(-250, 'USD'));

    const after = (await mockWalletService.getBalance()).total.minorUnits;
    assert.equal(after, before - 25000);
    assert.deepEqual((await mockWalletService.getBalance()).total, totalBalanceOf(getAccounts()));
  });
});
