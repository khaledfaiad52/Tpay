import type { EmploymentService } from '@/services/contracts';
import { mockEmployment } from './data/fixtures';
import { respond } from './latency';

export const mockEmploymentService: EmploymentService = {
  getEmployment: () => respond('employmentService.getEmployment', mockEmployment),
};
