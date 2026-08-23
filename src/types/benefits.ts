import type { IconName } from '@/icons';

export type BenefitCategory =
  | 'health-insurance'
  | 'medical-insurance'
  | 'social-insurance'
  | 'discounts'
  | 'wellness'
  | 'financial-services'
  | 'other';

export type BenefitStatus = 'active' | 'pending' | 'inactive';

export type Benefit = {
  readonly id: string;
  readonly category: BenefitCategory;
  readonly name: string;
  /** Provider or scheme name shown under the title. */
  readonly provider: string;
  readonly status: BenefitStatus;
  readonly icon: IconName;
  readonly summary: string;
};

/** Compact roll-up rendered on the Home screen. */
export type BenefitsSummary = {
  readonly activeCount: number;
  /** Lower-cased category words for the Home caption: "medical, wellness…". */
  readonly highlights: readonly string[];
};
