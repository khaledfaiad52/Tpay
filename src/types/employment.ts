import type { Money } from './money';

export type EmploymentStatus = 'active' | 'onboarding' | 'on-leave' | 'offboarding' | 'ended';

export type EmploymentType = 'full-time' | 'part-time' | 'contractor';

export type ContractStatus = 'signed' | 'pending-signature' | 'expired';

export type Employer = {
  readonly id: string;
  readonly name: string;
  /** Two-letter initials used for the employer avatar. */
  readonly initials: string;
  readonly country: string;
  readonly industry?: string;
};

export type Employment = {
  readonly id: string;
  readonly employer: Employer;
  readonly jobTitle: string;
  readonly status: EmploymentStatus;
  readonly type: EmploymentType;
  /** ISO-8601 date. */
  readonly startDate: string;
  readonly country: string;
  readonly contractStatus: ContractStatus;
  readonly grossSalary: Money;
  readonly payFrequency: 'monthly' | 'bi-weekly' | 'weekly';
};
