import type { Benefit, BenefitsSummary } from '@/types';

export type BenefitsService = {
  listBenefits(): Promise<readonly Benefit[]>;
  /** Roll-up for the Home screen tile. */
  getSummary(): Promise<BenefitsSummary>;
};
