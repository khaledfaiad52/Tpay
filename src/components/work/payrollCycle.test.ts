import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { payrollCycleProgress } from './payrollCycle';

const CYCLE_START = '2026-08-01';
const PAY_DATE = '2026-08-31';

describe('payrollCycleProgress', () => {
  it('reports how far through the cycle today is', () => {
    const progress = payrollCycleProgress(
      CYCLE_START,
      PAY_DATE,
      new Date('2026-08-23T12:00:00'),
    );
    assert.ok(progress.fraction > 0.7 && progress.fraction < 0.78, `${progress.fraction}`);
    assert.equal(progress.daysRemaining, 8);
    assert.equal(progress.remainingLabel, '8 days to go');
  });

  it('is empty on the day the cycle opens', () => {
    const progress = payrollCycleProgress(CYCLE_START, PAY_DATE, new Date('2026-08-01T00:00:00'));
    assert.equal(progress.fraction, 0);
    assert.equal(progress.daysRemaining, 30);
  });

  it('is full on payday', () => {
    const progress = payrollCycleProgress(CYCLE_START, PAY_DATE, new Date('2026-08-31T09:00:00'));
    assert.equal(progress.fraction, 1);
    assert.equal(progress.daysRemaining, 0);
    assert.equal(progress.remainingLabel, 'Paid today');
  });

  it('does not overshoot once payday has passed', () => {
    const progress = payrollCycleProgress(CYCLE_START, PAY_DATE, new Date('2026-09-04T09:00:00'));
    assert.equal(progress.fraction, 1);
    assert.equal(progress.daysRemaining, 0);
  });

  it('says "1 day to go" rather than "1 days"', () => {
    const progress = payrollCycleProgress(CYCLE_START, PAY_DATE, new Date('2026-08-30T09:00:00'));
    assert.equal(progress.remainingLabel, '1 day to go');
  });

  it('survives a cycle that starts and ends the same day', () => {
    const progress = payrollCycleProgress('2026-08-31', '2026-08-31', new Date('2026-08-31T12:00:00'));
    assert.ok(progress.fraction >= 0 && progress.fraction <= 1);
    assert.equal(progress.daysRemaining, 0);
  });
});
