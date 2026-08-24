import { NotFoundError } from '@/services/contracts';
import type { RequestsService } from '@/services/contracts';
import type { EmployeeRequest, RequestDraft, RequestStage, RequestStatus, RequestType } from '@/types';
import { mockRequests } from './data/fixtures';
import { respond } from './latency';

/** The four stages every request passes through, in order. */
const STAGE_LABELS = ['Submitted', 'Processing', 'Approval', 'Ready'] as const;

/** How far along each status is: the index of the stage it currently sits on. */
const STAGE_INDEX: Record<RequestStatus, number> = {
  submitted: 0,
  processing: 1,
  // Action required interrupts approval — the employee is the blocker.
  'action-required': 2,
  completed: 3,
};

/** The words HR uses for each kind of request, so a draft names itself. */
const TITLES: Record<RequestType, string> = {
  'employment-letter': 'Employment letter',
  payslip: 'Payslip copy',
  'payroll-question': 'Payroll question',
  'insurance-support': 'Insurance support',
  'bank-account-support': 'Bank account support',
  reimbursement: 'Expense reimbursement',
  'hr-support': 'HR support',
  other: 'Other request',
};

let requests: EmployeeRequest[] = [...mockRequests];
let nextReference = 4200;

export function stagesFor(status: RequestStatus): readonly RequestStage[] {
  const current = STAGE_INDEX[status];
  return STAGE_LABELS.map((label, index) => ({
    label,
    reached: index <= current,
    current: index === current,
  }));
}

/** "Expense reimbursement · $310" — a request that names itself. */
export function titleFor(draft: RequestDraft): string {
  const base = TITLES[draft.type];
  if (draft.amount) {
    return `${base} · ${draft.amount.currency} ${draft.amount.minorUnits / 100}`;
  }
  if (draft.addressedTo) return `${base} · ${draft.addressedTo}`;
  return base;
}

export const mockRequestsService: RequestsService = {
  listRequests: () =>
    respond(
      'requestsService.listRequests',
      [...requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    ),

  getRequest: (requestId) => {
    const request = requests.find((candidate) => candidate.id === requestId);
    if (!request) return Promise.reject(new NotFoundError('Request', requestId));
    return respond('requestsService.getRequest', request);
  },

  createRequest: (draft) => {
    nextReference += 1;
    const request: EmployeeRequest = {
      id: `req_${nextReference}`,
      reference: `REQ-${nextReference}`,
      type: draft.type,
      title: titleFor(draft),
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      addressedTo: draft.addressedTo,
      note: draft.note,
      amount: draft.amount,
    };
    requests = [request, ...requests];
    return respond('requestsService.createRequest', request);
  },

  resolveAction: (requestId, note) => {
    const request = requests.find((candidate) => candidate.id === requestId);
    if (!request) return Promise.reject(new NotFoundError('Request', requestId));
    if (request.status !== 'action-required') {
      return Promise.reject(new Error('That request is not waiting on you.'));
    }

    // Supplying what HR asked for puts the request back in their hands.
    const updated: EmployeeRequest = {
      ...request,
      status: 'processing',
      actionNeeded: undefined,
      note: note ?? request.note,
    };
    requests = requests.map((candidate) => (candidate.id === requestId ? updated : candidate));
    return respond('requestsService.resolveAction', updated);
  },

  getStages: stagesFor,
};

/** Restores the seeded requests. Tests only. */
export function resetRequests(): void {
  requests = [...mockRequests];
  nextReference = 4200;
}
