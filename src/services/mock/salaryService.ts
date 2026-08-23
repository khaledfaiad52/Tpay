import type { SalaryService } from '@/services/contracts';
import { mockNextSalary, mockSalaryHistory } from './data/fixtures';
import { NotFoundError, respond } from './latency';

export const mockSalaryService: SalaryService = {
  getNextSalary: () => respond('salaryService.getNextSalary', mockNextSalary),

  listSalaryHistory: () => respond('salaryService.listSalaryHistory', mockSalaryHistory),

  getSalaryRecord: (salaryId) => {
    const record = mockSalaryHistory.find((candidate) => candidate.id === salaryId);
    if (!record) return Promise.reject(new NotFoundError('Salary record', salaryId));
    return respond('salaryService.getSalaryRecord', record);
  },
};
