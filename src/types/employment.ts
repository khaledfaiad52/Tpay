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
  /** "Riyadh, Saudi Arabia" — where the employee is based. */
  readonly location?: string;
  readonly industry?: string;
};

/**
 * The Talento person behind the employment relationship.
 *
 * Talento is the employer of record; TPay is the product the employee uses.
 * This is the one place the two meet, so the branding stays contextual.
 */
export type AccountManager = {
  readonly name: string;
  readonly initials: string;
  readonly role: string;
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
  /** "Monthly · last working day". */
  readonly payScheduleLabel: string;
  /** The entity that legally employs the person, when it is not the employer. */
  readonly legalEmployer?: string;
  readonly department?: string;
  readonly accountManager?: AccountManager;
  /** ISO-8601 date the contract was signed. */
  readonly contractSignedAt?: string;
};
