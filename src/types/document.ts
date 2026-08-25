/** Where a document belongs, and how the Documents screen filters. */
export type DocumentCategory =
  | 'employment'
  | 'payroll'
  | 'benefits'
  | 'insurance'
  | 'identification'
  | 'tax'
  | 'other';

/**
 * What state a document is in. Employment contracts are signed, permits are
 * valid until they expire, policies are active — the label belongs to the
 * document, not to a generic status enum.
 */
export type DocumentStatus =
  | 'signed'
  | 'valid'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'issued'
  | 'unavailable';

export type DocumentFormat = 'pdf' | 'image' | 'bundle';

export type EmployeeDocument = {
  readonly id: string;
  readonly title: string;
  /** "Signed 14 Mar 2024", "Expires 12 Feb 2027". */
  readonly subtitle: string;
  readonly category: DocumentCategory;
  readonly status: DocumentStatus;
  readonly format: DocumentFormat;
  /** ISO-8601 date the document was issued. */
  readonly issuedAt: string;
  /** ISO-8601 date it stops being valid, when that applies. */
  readonly expiresAt?: string;
  /** How many files a bundle holds — payslips for a year, for instance. */
  readonly itemCount?: number;
  /** Where a bundle leads instead of downloading. */
  readonly opensRoute?: 'payslips';
  /**
   * The bundle this document belongs to. Children are reached through their
   * bundle rather than listed beside it, so the list stays readable.
   */
  readonly parentId?: string;
  /** Absent while the document is still being prepared. */
  readonly fileSizeKb?: number;
  /** Why it cannot be opened, when `status` is `unavailable`. */
  readonly unavailableReason?: string;
};
