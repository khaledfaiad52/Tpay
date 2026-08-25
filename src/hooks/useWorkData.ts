import { useCallback } from 'react';

import { services } from '@/services';
import type {
  Benefit,
  BenefitsSummary,
  EmployeeDocument,
  EmployeeRequest,
  Employment,
  Payslip,
  SalaryRecord,
  UpcomingSalary,
} from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

export type SalaryData = {
  readonly next: UpcomingSalary | null;
  readonly history: readonly SalaryRecord[];
};

async function loadSalary(): Promise<SalaryData> {
  const [next, history] = await Promise.all([
    services.salary.getNextSalary(),
    services.salary.listSalaryHistory(),
  ]);
  return { next, history };
}

export function useSalaryData(): AsyncResult<SalaryData> {
  return useAsyncData(loadSalary);
}

export function useSalaryRecord(salaryId: string): AsyncResult<SalaryRecord> {
  const load = useCallback(() => services.salary.getSalaryRecord(salaryId), [salaryId]);
  return useAsyncData(load);
}

async function loadPayslips(): Promise<readonly Payslip[]> {
  return services.salary.listPayslips();
}

export function usePayslips(): AsyncResult<readonly Payslip[]> {
  return useAsyncData(loadPayslips);
}

export type EmploymentData = {
  readonly employment: Employment | null;
  readonly nextSalary: UpcomingSalary | null;
  /** How many requests are still with HR, for the employer screen's tile. */
  readonly openRequestCount: number;
};

async function loadEmployment(): Promise<EmploymentData> {
  const [employment, nextSalary, requests] = await Promise.all([
    services.employment.getEmployment(),
    services.salary.getNextSalary(),
    services.requests.listRequests(),
  ]);
  return {
    employment,
    nextSalary,
    openRequestCount: requests.filter((request) => request.status !== 'completed').length,
  };
}

export function useEmploymentData(): AsyncResult<EmploymentData> {
  return useAsyncData(loadEmployment);
}

export type BenefitsData = {
  readonly benefits: readonly Benefit[];
  readonly summary: BenefitsSummary;
  readonly employerName: string;
};

async function loadBenefits(): Promise<BenefitsData> {
  const [benefits, summary, employment] = await Promise.all([
    services.benefits.listBenefits(),
    services.benefits.getSummary(),
    services.employment.getEmployment(),
  ]);
  return {
    benefits,
    summary,
    employerName: employment?.employer.name ?? 'your employer',
  };
}

export function useBenefitsData(): AsyncResult<BenefitsData> {
  return useAsyncData(loadBenefits);
}

export function useBenefit(benefitId: string): AsyncResult<Benefit> {
  const load = useCallback(() => services.benefits.getBenefit(benefitId), [benefitId]);
  return useAsyncData(load);
}

export function useDocuments(): AsyncResult<readonly EmployeeDocument[]> {
  const load = useCallback(() => services.documents.listDocuments(), []);
  return useAsyncData(load);
}

export type RequestsData = {
  readonly open: readonly EmployeeRequest[];
  readonly completed: readonly EmployeeRequest[];
};

async function loadRequests(): Promise<RequestsData> {
  const requests = await services.requests.listRequests();
  return {
    open: requests.filter((request) => request.status !== 'completed'),
    completed: requests.filter((request) => request.status === 'completed'),
  };
}

export function useRequestsData(): AsyncResult<RequestsData> {
  return useAsyncData(loadRequests);
}
