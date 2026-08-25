import type { Money } from './money';

export type SalaryStatus = 'scheduled' | 'processing' | 'paid' | 'delayed';

/** The upcoming payroll run shown on Home and Salary. */
export type UpcomingSalary = {
  readonly id: string;
  readonly employerName: string;
  readonly netAmount: Money;
  /** ISO-8601 date the payroll is expected to land. */
  readonly payDate: string;
  /** ISO-8601 date the payroll cycle opened, for the progress rail. */
  readonly cycleStartDate: string;
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
  /** Account the salary landed in, for the breakdown's subtitle. */
  readonly paidToAccountId?: string;
  /** "includes $500 bonus", "2 days late" — context on the history row. */
  readonly note?: string;
  /** The wallet transaction this pay run created. */
  readonly transactionId?: string;
};

/** A payslip document for one pay period. */
export type Payslip = {
  readonly id: string;
  readonly salaryId: string;
  /** "July 2026" */
  readonly period: string;
  readonly net: Money;
  /** ISO-8601 date the payslip was issued. */
  readonly issuedAt: string;
  /** TPay checked this payslip against the payroll run behind it. */
  readonly verified: boolean;
  readonly documentId: string;
};

export type SalaryLineItem = {
  readonly label: string;
  readonly amount: Money;
  readonly category: 'tax' | 'social-insurance' | 'benefit' | 'deduction' | 'allowance' | 'bonus';
};
