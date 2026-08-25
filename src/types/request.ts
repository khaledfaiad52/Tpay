import type { Money } from './money';

/** What the employee is asking for. */
export type RequestType =
  | 'employment-letter'
  | 'payslip'
  | 'payroll-question'
  | 'insurance-support'
  | 'bank-account-support'
  | 'reimbursement'
  | 'hr-support'
  | 'other';

/**
 * Where a request has got to. `action-required` is the one that needs the
 * employee back, so it is the one the UI pulls forward.
 */
export type RequestStatus = 'submitted' | 'processing' | 'action-required' | 'completed';

/** One stage on the request's progress rail. */
export type RequestStage = {
  readonly label: string;
  readonly reached: boolean;
  readonly current: boolean;
};

export type EmployeeRequest = {
  readonly id: string;
  /** "REQ-4187" — the reference the employee quotes to HR. */
  readonly reference: string;
  readonly type: RequestType;
  /** "Employment letter · bank use". */
  readonly title: string;
  readonly status: RequestStatus;
  /** ISO-8601 timestamp. */
  readonly submittedAt: string;
  readonly completedAt?: string;
  /** Who or what the request is addressed to. */
  readonly addressedTo?: string;
  readonly note?: string;
  /** What the employee must do, when `status` is `action-required`. */
  readonly actionNeeded?: string;
  /** For a reimbursement. */
  readonly amount?: Money;
  /** Document produced once the request completes. */
  readonly resultDocumentId?: string;
};

/** What the employee fills in on the new-request screen. */
export type RequestDraft = {
  readonly type: RequestType;
  readonly addressedTo?: string;
  readonly note?: string;
  readonly amount?: Money;
};
