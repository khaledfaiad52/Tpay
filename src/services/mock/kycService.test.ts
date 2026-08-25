import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { configureMockBehaviour } from './latency';
import {
  currentKycStatus,
  mockKycService,
  resetKyc,
  setKycStatus,
  stepsFor,
  submittedKycDetails,
} from './kycService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetKyc();
});

const service = mockKycService;

const DETAILS = {
  firstName: 'Khaled',
  lastName: 'Faiad',
  dateOfBirth: '1993-06-12',
  nationality: 'Lebanese',
  addressLine1: 'DEMO 4417 Olaya Street',
  city: 'Riyadh',
  country: 'Saudi Arabia',
};

describe('kycService steps', () => {
  it('starts a fresh account with everything to do', () => {
    setKycStatus('NOT_STARTED');
    const steps = stepsFor(
      { 'personal-information': false, 'identity-document': false, 'proof-of-address': false },
      'NOT_STARTED',
    );
    assert.deepEqual(
      steps.map((step) => step.status),
      ['todo', 'todo', 'not-required'],
    );
  });

  it('asks for proof of address only when the reviewer wants it', () => {
    const steps = stepsFor(
      { 'personal-information': true, 'identity-document': true, 'proof-of-address': false },
      'ACTION_REQUIRED',
    );
    assert.equal(steps[2].status, 'todo');
  });
});

describe('kycService flow', () => {
  it('moves a not-started account into progress when a session opens', async () => {
    setKycStatus('NOT_STARTED');
    await service.createKycSession();
    assert.equal(currentKycStatus(), 'IN_PROGRESS');
  });

  it('never leaks a provider name in the hosted session', async () => {
    const session = await service.createKycSession();
    assert.match(session.redirectUrl, /tpay/);
    assert.doesNotMatch(session.redirectUrl, /airwallex|thunes|nium|terrapay/i);
  });

  it('records personal details and marks that step done', async () => {
    setKycStatus('NOT_STARTED');
    await service.submitPersonalDetails(DETAILS);
    const steps = await service.listSteps();
    assert.equal(steps[0].status, 'done');
    assert.equal(submittedKycDetails().details?.firstName, 'Khaled');
  });

  it('refuses a document before the personal details exist', async () => {
    setKycStatus('NOT_STARTED');
    await assert.rejects(() =>
      service.submitIdentityDocument({ documentType: 'passport', documentLabel: 'Passport' }),
    );
  });

  it('refuses to submit while a step is outstanding', async () => {
    setKycStatus('NOT_STARTED');
    await service.submitPersonalDetails(DETAILS);
    await assert.rejects(() => service.submitForReview());
  });

  it('reaches SUBMITTED once every step is done', async () => {
    setKycStatus('NOT_STARTED');
    await service.submitPersonalDetails(DETAILS);
    await service.submitIdentityDocument({
      documentType: 'national-id',
      documentLabel: 'National ID',
    });
    const state = await service.submitForReview();
    assert.equal(state.status, 'SUBMITTED');
  });
});

describe('kycService provider callbacks', () => {
  const CASES: readonly [string, string][] = [
    ['created', 'IN_PROGRESS'],
    ['pending', 'SUBMITTED'],
    ['in_review', 'SUBMITTED'],
    ['requires_action', 'ACTION_REQUIRED'],
    ['approved', 'VERIFIED'],
    ['declined', 'REJECTED'],
    ['suspended', 'SUSPENDED'],
  ];

  for (const [providerStatus, expected] of CASES) {
    it(`normalises "${providerStatus}" to ${expected}`, async () => {
      const state = await service.handleKycCallback({ sessionId: 'kyc_1', providerStatus });
      assert.equal(state.status, expected);
    });
  }

  it('rejects a status it does not recognise rather than guessing', async () => {
    await assert.rejects(() =>
      service.handleKycCallback({ sessionId: 'kyc_1', providerStatus: 'weird' }),
    );
  });

  it('carries the reviewer reason through so the screen can show it', async () => {
    const state = await service.handleKycCallback({
      sessionId: 'kyc_1',
      providerStatus: 'requires_action',
      reason: 'The address on your document does not match your profile.',
    });
    assert.equal(state.reason, 'The address on your document does not match your profile.');
  });

  it('reopens proof of address when the reviewer asks for more', async () => {
    await service.handleKycCallback({ sessionId: 'kyc_1', providerStatus: 'requires_action' });
    const steps = await service.listSteps();
    assert.equal(steps[2].status, 'todo');
  });
});
