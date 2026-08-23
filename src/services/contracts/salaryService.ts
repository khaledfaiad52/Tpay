import type { SalaryRecord, UpcomingSalary } from '@/types';

export type SalaryService = {
  /** `null` when no payroll run is scheduled — Home hides the card. */
  getNextSalary(): Promise<UpcomingSalary | null>;
  listSalaryHistory(): Promise<readonly SalaryRecord[]>;
  getSalaryRecord(salaryId: string): Promise<SalaryRecord>;
};
