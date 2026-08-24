import type { DocumentCategory, EmployeeDocument } from '@/types';

export type DocumentQuery = {
  readonly category?: DocumentCategory;
};

/** What opening a document produced, so the UI can react without guessing. */
export type DocumentAccessResult = {
  readonly documentId: string;
  /**
   * Where the file can be read. Absent while TPay has no document store —
   * the UI then tells the user it is on its way rather than opening nothing.
   */
  readonly url?: string;
  readonly fileName: string;
  /** A plain-text stand-in the app can copy or share today. */
  readonly shareText: string;
};

export type DocumentsService = {
  listDocuments(query?: DocumentQuery): Promise<readonly EmployeeDocument[]>;
  getDocument(documentId: string): Promise<EmployeeDocument>;
  /** Rejects when the document is not available to open yet. */
  openDocument(documentId: string): Promise<DocumentAccessResult>;
};
