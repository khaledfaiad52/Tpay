import type { Employment } from '@/types';

export type EmploymentService = {
  /** `null` for a user with no linked employer. */
  getEmployment(): Promise<Employment | null>;
};
