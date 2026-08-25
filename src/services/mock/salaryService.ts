import { NotFoundError } from '@/services/contracts';
import type { SalaryService } from '@/services/contracts';
import { mockNextSalary, mockPayslips, mockSalaryHistory } from './data/fixtures';
import { respond } from './latency';

export const mockSalaryService: SalaryService = {
  getNextSalary: () => respond('salaryService.getNextSalary', mockNextSalary),

  listSalaryHistory: () => respond('salaryService.listSalaryHistory', mockSalaryHistory),

  getSalaryRecord: (salaryId) => {
    const record = mockSalaryHistory.find((candidate) => candidate.id === salaryId);
    if (!record) return Promise.reject(new NotFoundError('Salary record', salaryId));
    return respond('salaryService.getSalaryRecord', record);
  },

  listPayslips: () => respond('salaryService.listPayslips', mockPayslips),

  getPayslip: (payslipId) => {
    const payslip = mockPayslips.find((candidate) => candidate.id === payslipId);
    if (!payslip) return Promise.reject(new NotFoundError('Payslip', payslipId));
    return respond('salaryService.getPayslip', payslip);
  },
};
