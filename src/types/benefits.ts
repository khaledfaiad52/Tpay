import type { IconName } from '@/icons';
import type { Money } from './money';

export type BenefitCategory =
  | 'health-insurance'
  | 'medical-insurance'
  | 'social-insurance'
  | 'discounts'
  | 'wellness'
  | 'financial-services'
  | 'other';

/**
 * Whether the employee actually has this benefit. `not-eligible` is not a
 * failure — it is a benefit waiting on a condition, and the UI says so rather
 * than hiding it.
 */
export type BenefitStatus = 'active' | 'pending' | 'not-eligible' | 'inactive';

/** A recurring budget the employee can draw on. */
export type BenefitAllowance = {
  readonly remaining: Money;
  readonly total: Money;
  /** "this quarter", "this year". */
  readonly periodLabel: string;
};

/** One line on a coverage card. */
export type BenefitCoverageRow = {
  readonly label: string;
  readonly value: string;
  /** Drawn in the positive tone — "Included". */
  readonly highlight?: boolean;
};

/** The membership details behind an insurance benefit. */
export type BenefitCoverage = {
  readonly memberName: string;
  readonly memberId: string;
  /** ISO-8601 date. */
  readonly validUntil: string;
  readonly startsOn: string;
  readonly rows: readonly BenefitCoverageRow[];
  /** Policy paperwork, if there is any. */
  readonly documentId?: string;
};

export type Benefit = {
  readonly id: string;
  readonly category: BenefitCategory;
  readonly name: string;
  /** Provider or scheme name shown under the title. */
  readonly provider: string;
  readonly status: BenefitStatus;
  readonly icon: IconName;
  readonly summary: string;
  /** Overrides the status word on the row — "Ready" rather than "Active". */
  readonly statusLabel?: string;
  /** The one benefit the Benefits screen leads with. */
  readonly featured?: boolean;
  readonly allowance?: BenefitAllowance;
  readonly coverage?: BenefitCoverage;
  /** Why it is not available yet, when `status` is `not-eligible`. */
  readonly unavailableReason?: string;
};

/** Compact roll-up rendered on the Home screen. */
export type BenefitsSummary = {
  readonly activeCount: number;
  /** Lower-cased category words for the Home caption: "medical, wellness…". */
  readonly highlights: readonly string[];
};
