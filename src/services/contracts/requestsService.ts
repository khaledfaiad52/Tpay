import type { EmployeeRequest, RequestDraft, RequestStage, RequestStatus } from '@/types';

export type RequestsService = {
  listRequests(): Promise<readonly EmployeeRequest[]>;
  getRequest(requestId: string): Promise<EmployeeRequest>;
  createRequest(draft: RequestDraft): Promise<EmployeeRequest>;
  /**
   * Satisfies an outstanding `action-required` request — the employee has
   * supplied what HR asked for.
   */
  resolveAction(requestId: string, note?: string): Promise<EmployeeRequest>;
  /** The stages a request of this status has passed through. */
  getStages(status: RequestStatus): readonly RequestStage[];
};
