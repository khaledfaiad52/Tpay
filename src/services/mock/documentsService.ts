import { NotFoundError } from '@/services/contracts';
import type { DocumentQuery, DocumentsService } from '@/services/contracts';
import type { EmployeeDocument } from '@/types';
import { mockDocuments } from './data/fixtures';
import { respond } from './latency';

/**
 * Applies a query to a list. Exported so it can be unit tested directly.
 *
 * Documents that belong to a bundle are left out: the bundle stands for them,
 * and listing both makes the screen repeat itself.
 */
export function filterDocuments(
  source: readonly EmployeeDocument[],
  query: DocumentQuery = {},
): readonly EmployeeDocument[] {
  return source
    .filter((document) => !document.parentId)
    .filter((document) => (query.category ? document.category === query.category : true))
    .slice()
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export class DocumentUnavailableError extends Error {
  readonly documentId: string;

  constructor(documentId: string, reason: string) {
    super(reason);
    this.name = 'DocumentUnavailableError';
    this.documentId = documentId;
  }
}

export const mockDocumentsService: DocumentsService = {
  listDocuments: (query = {}) =>
    respond('documentsService.listDocuments', filterDocuments(mockDocuments, query)),

  getDocument: (documentId) => {
    const document = mockDocuments.find((candidate) => candidate.id === documentId);
    if (!document) return Promise.reject(new NotFoundError('Document', documentId));
    return respond('documentsService.getDocument', document);
  },

  openDocument: (documentId) => {
    const document = mockDocuments.find((candidate) => candidate.id === documentId);
    if (!document) return Promise.reject(new NotFoundError('Document', documentId));
    if (document.status === 'unavailable') {
      return Promise.reject(
        new DocumentUnavailableError(
          documentId,
          document.unavailableReason ?? 'This document is not ready yet.',
        ),
      );
    }

    // TPay has no document store yet, so nothing resolves to a real file. The
    // shareable summary is what the app can honestly offer today.
    return respond('documentsService.openDocument', {
      documentId,
      fileName: `${document.title.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.pdf`,
      shareText: [
        `TPay document · ${document.title}`,
        document.subtitle,
        `Issued ${document.issuedAt}`,
      ].join('\n'),
    });
  },
};
