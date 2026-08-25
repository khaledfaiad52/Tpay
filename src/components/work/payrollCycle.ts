/**
 * How far through the payroll cycle today is.
 *
 * The Salary screen shows a rail filling toward payday. Both figures come from
 * the cycle's own dates rather than a stored percentage, so they stay true
 * whenever the screen is opened.
 */
export type PayrollCycleProgress = {
  /** 0–1, clamped. */
  readonly fraction: number;
  readonly daysRemaining: number;
  /** "8 days to go", "Paid today". */
  readonly remainingLabel: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function payrollCycleProgress(
  cycleStartDate: string,
  payDate: string,
  now: Date = new Date(),
): PayrollCycleProgress {
  const start = Date.parse(`${cycleStartDate}T00:00:00`);
  const end = Date.parse(`${payDate}T00:00:00`);
  const today = now.getTime();

  const span = Math.max(end - start, MS_PER_DAY);
  const fraction = Math.min(Math.max((today - start) / span, 0), 1);
  const daysRemaining = Math.max(Math.ceil((end - today) / MS_PER_DAY), 0);

  return { fraction, daysRemaining, remainingLabel: remainingLabelFor(daysRemaining) };
}

function remainingLabelFor(days: number): string {
  if (days === 0) return 'Paid today';
  if (days === 1) return '1 day to go';
  return `${days} days to go`;
}
