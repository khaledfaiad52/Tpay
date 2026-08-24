import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { NotFoundError } from '@/services/contracts';
import { fromMajor } from '@/types';
import { configureMockBehaviour } from './latency';
import { mockRequestsService, resetRequests, stagesFor, titleFor } from './requestsService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetRequests();
});

const service = mockRequestsService;

describe('stagesFor', () => {
  it('walks the same four stages whatever the status', () => {
    assert.deepEqual(
      stagesFor('submitted').map((stage) => stage.label),
      ['Submitted', 'Processing', 'Approval', 'Ready'],
    );
  });

  it('marks everything up to the current stage as reached', () => {
    const stages = stagesFor('processing');
    assert.deepEqual(
      stages.map((stage) => stage.reached),
      [true, true, false, false],
    );
    assert.equal(stages[1].current, true);
  });

  it('completes every stage once the request is done', () => {
    assert.ok(stagesFor('completed').every((stage) => stage.reached));
  });

  it('puts action-required past processing — the employee is the blocker', () => {
    const stages = stagesFor('action-required');
    assert.equal(stages[2].current, true);
  });
});

describe('titleFor', () => {
  it('names a plain request by its type', () => {
    assert.equal(titleFor({ type: 'payslip' }), 'Payslip copy');
  });

  it('includes the amount on a reimbursement', () => {
    assert.equal(
      titleFor({ type: 'reimbursement', amount: fromMajor(310, 'USD') }),
      // Formatted through the one money formatter, not divided by hand.
      'Expense reimbursement · $310.00',
    );
  });

  it('includes who a letter is addressed to', () => {
    assert.equal(
      titleFor({ type: 'employment-letter', addressedTo: 'Emirates NBD' }),
      'Employment letter · Emirates NBD',
    );
  });
});

describe('requestsService', () => {
  it('lists requests newest first', async () => {
    const requests = await service.listRequests();
    assert.equal(requests[0].reference, 'REQ-4187');
  });

  it('creates a request in the submitted state with a fresh reference', async () => {
    const before = (await service.listRequests()).length;
    const created = await service.createRequest({
      type: 'employment-letter',
      addressedTo: 'Emirates NBD — account opening',
    });

    assert.equal(created.status, 'submitted');
    assert.match(created.reference, /^REQ-\d+$/);
    assert.equal(created.addressedTo, 'Emirates NBD — account opening');
    assert.equal((await service.listRequests()).length, before + 1);
  });

  it('gives every new request its own reference', async () => {
    const first = await service.createRequest({ type: 'payslip' });
    const second = await service.createRequest({ type: 'payslip' });
    assert.notEqual(first.reference, second.reference);
  });

  it('reads a request back by id', async () => {
    const created = await service.createRequest({ type: 'hr-support' });
    assert.equal((await service.getRequest(created.id)).id, created.id);
  });

  it('rejects an unknown request', async () => {
    await assert.rejects(
      () => service.getRequest('req_nope'),
      (error: Error) => error instanceof NotFoundError,
    );
  });

  it('hands an action-required request back to HR once satisfied', async () => {
    const resolved = await service.resolveAction('req_4102', 'Receipt attached');

    assert.equal(resolved.status, 'processing');
    assert.equal(resolved.actionNeeded, undefined);
    assert.equal(resolved.note, 'Receipt attached');
    assert.equal((await service.getRequest('req_4102')).status, 'processing');
  });

  it('refuses to resolve a request that is not waiting on you', async () => {
    await assert.rejects(() => service.resolveAction('req_4187'));
  });
});
