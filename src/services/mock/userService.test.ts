import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { resetKyc, setKycStatus } from './kycService';
import { configureMockBehaviour } from './latency';
import {
  isValidUsername,
  mockUserService,
  normaliseUsername,
  resetUser,
} from './userService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetUser();
  resetKyc();
});

const service = mockUserService;

describe('normaliseUsername', () => {
  it('drops the @, the case and the spaces', () => {
    assert.equal(normaliseUsername('  @Khaled Faiad '), 'khaledfaiad');
  });
});

describe('isValidUsername', () => {
  it('accepts letters, numbers and underscores', () => {
    assert.equal(isValidUsername('khaled_02'), true);
  });

  it('rejects anything too short', () => {
    assert.equal(isValidUsername('kf'), false);
  });

  it('rejects punctuation people cannot type reliably', () => {
    assert.equal(isValidUsername('khaled.faiad'), false);
  });
});

describe('userService', () => {
  it('never uses a real-looking account number in demo data', async () => {
    const user = await service.getCurrentUser();
    assert.match(user.phone, /•/);
  });

  it('reads verification state from the KYC service, so it cannot drift', async () => {
    setKycStatus('ACTION_REQUIRED');
    assert.equal((await service.getCurrentUser()).kycStatus, 'ACTION_REQUIRED');
    setKycStatus('VERIFIED');
    assert.equal((await service.getCurrentUser()).kycStatus, 'VERIFIED');
  });

  it('updates contact details and keeps everything else', async () => {
    const before = await service.getCurrentUser();
    const after = await service.updateProfile({ email: 'khaled@demo.tpay.app' });
    assert.equal(after.email, 'khaled@demo.tpay.app');
    assert.equal(after.username, before.username);
    assert.equal(after.phone, before.phone);
  });

  it('merges preferences rather than replacing them', async () => {
    const after = await service.updateProfile({ preferences: { defaultCurrency: 'SAR' } });
    assert.equal(after.preferences.defaultCurrency, 'SAR');
    assert.equal(after.preferences.languageLabel, 'English');
  });

  it('changes the username', async () => {
    const after = await service.setUsername('@Khaled_2026');
    assert.equal(after.username, 'khaled_2026');
  });

  it('refuses a malformed username', async () => {
    await assert.rejects(() => service.setUsername('k'));
  });

  it('refuses a reserved username', async () => {
    await assert.rejects(() => service.setUsername('support'));
  });

  it('reports availability without changing anything', async () => {
    assert.equal(await service.isUsernameAvailable('brand_new_handle'), true);
    assert.equal(await service.isUsernameAvailable('admin'), false);
    // The handle you already have is not "available" to claim again.
    assert.equal(await service.isUsernameAvailable('khaled'), false);
  });
});
