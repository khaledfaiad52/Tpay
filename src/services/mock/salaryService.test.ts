import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '@/services/contracts';
import { toMajor } from '@/types';
import { configureMockBehaviour } from './latency';
import { mockSalaryService } from './salaryService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

const service = mockSalaryService;

describe('salaryService', () => {
  it('reports the next pay run with the cycle behind it', async () => {
    const next = await service.getNextSalary();
    assert.ok(next);
    assert.equal(next.payDate, '2026-08-31');
    assert.ok(next.cycleStartDate < next.payDate, 'the cycle opens before payday');
  });

  it('lists the pay runs already paid', async () => {
    const history = await service.listSalaryHistory();
    assert.equal(history.length, 4);
    assert.equal(history[0].period, 'July 2026');
  });

  it('reconciles every pay run: gross − deductions = net', async () => {
    for (const record of await service.listSalaryHistory()) {
      const deducted = record.deductions.reduce(
        (total, item) => total + item.amount.minorUnits,
        0,
      );
      assert.equal(
        record.gross.minorUnits - deducted,
        record.net.minorUnits,
        `${record.period} does not reconcile`,
      );
    }
  });

  it('adds a bonus to the gross rather than the net', async () => {
    const june = (await service.listSalaryHistory()).find(
      (record) => record.period === 'June 2026',
    );
    assert.ok(june);
    assert.equal(toMajor(june.gross), 6400);
    assert.ok(june.additions.some((item) => item.category === 'bonus'));
  });

  it('reads one pay run back by id', async () => {
    const record = await service.getSalaryRecord('sal_2026_07');
    assert.equal(record.period, 'July 2026');
  });

  it('rejects an unknown pay run', async () => {
    await assert.rejects(
      () => service.getSalaryRecord('sal_nope'),
      (error: Error) => error instanceof NotFoundError,
    );
  });

  it('issues one payslip per pay run', async () => {
    const [payslips, history] = await Promise.all([
      service.listPayslips(),
      service.listSalaryHistory(),
    ]);
    assert.equal(payslips.length, history.length);
    assert.ok(payslips.every((payslip) => payslip.verified));
  });

  it('links a payslip back to the pay run it came from', async () => {
    const payslip = await service.getPayslip('pay_2026_07');
    const record = await service.getSalaryRecord(payslip.salaryId);
    assert.deepEqual(payslip.net, record.net);
  });
});
