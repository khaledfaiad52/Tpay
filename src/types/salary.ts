import type { Money } from './money';

export type SalaryStatus = 'scheduled' | 'processing' | 'paid' | 'delayed';

/** The upcoming payroll run shown on Home and Salary. */
export type UpcomingSalary = {
  readonly id: string;
  readonly employerName: string;
  readonly netAmount: Money;
  /** ISO-8601 date the payroll is expected to land. */
  readonly payDate: string;
  readonly status: SalaryStatus;
};

/** A completed pay period, with the full breakdown behind it. */
export type SalaryRecord = {
  readonly id: string;
  /** "August 2026" */
  readonly period: string;
  readonly paidAt: string;
  readonly gross: Money;
  readonly net: Money;
  readonly deductions: readonly SalaryLineItem[];
  readonly additions: readonly SalaryLineItem[];
  readonly payslipId?: string;
};

export type SalaryLineItem = {
  readonly label: string;
  readonly amount: Money;
  readonly category: 'tax' | 'social-insurance' | 'benefit' | 'deduction' | 'allowance' | 'bonus';
};
