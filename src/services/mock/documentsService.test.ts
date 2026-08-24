import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '@/services/contracts';
import type { EmployeeDocument } from '@/types';
import { DocumentUnavailableError, filterDocuments, mockDocumentsService } from './documentsService';
import { configureMockBehaviour } from './latency';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

function document(overrides: Partial<EmployeeDocument> & Pick<EmployeeDocument, 'id'>): EmployeeDocument {
  return {
    title: 'A document',
    subtitle: 'Issued today',
    category: 'employment',
    status: 'issued',
    format: 'pdf',
    issuedAt: '2026-01-01',
    ...overrides,
  };
}

describe('filterDocuments', () => {
  const source = [
    document({ id: 'a', category: 'employment', issuedAt: '2024-03-14' }),
    document({ id: 'b', category: 'payroll', issuedAt: '2026-08-01' }),
    document({ id: 'c', category: 'insurance', issuedAt: '2026-01-01' }),
  ];

  it('sorts newest first', () => {
    assert.deepEqual(
      filterDocuments(source).map((item) => item.id),
      ['b', 'c', 'a'],
    );
  });

  it('narrows to one category', () => {
    assert.deepEqual(
      filterDocuments(source, { category: 'payroll' }).map((item) => item.id),
      ['b'],
    );
  });

  it('returns everything for an empty query', () => {
    assert.equal(filterDocuments(source, {}).length, 3);
  });

  it('returns nothing for a category with no documents', () => {
    assert.deepEqual(filterDocuments(source, { category: 'tax' }), []);
  });

  it('leaves out documents that belong to a bundle', () => {
    const withChild = [
      ...source,
      document({ id: 'child', category: 'payroll', parentId: 'b' }),
    ];
    assert.equal(
      filterDocuments(withChild).some((item) => item.id === 'child'),
      false,
    );
  });

  it('does not mutate the source list', () => {
    const order = source.map((item) => item.id);
    filterDocuments(source);
    assert.deepEqual(
      source.map((item) => item.id),
      order,
    );
  });
});

describe('documentsService', () => {
  it('lists the seeded documents', async () => {
    const documents = await mockDocumentsService.listDocuments();
    assert.ok(documents.length > 0);
    assert.ok(documents.some((item) => item.title === 'Employment contract'));
  });

  it('shows the payslip bundle rather than every payslip in it', async () => {
    const documents = await mockDocumentsService.listDocuments();
    assert.ok(documents.some((item) => item.id === 'doc_payslips_2026'));
    assert.equal(
      documents.some((item) => item.parentId === 'doc_payslips_2026'),
      false,
    );
  });

  it('still opens a payslip inside the bundle directly', async () => {
    const opened = await mockDocumentsService.openDocument('doc_pay_2026_07');
    assert.match(opened.shareText, /Payslip/);
  });

  it('opens a document into something shareable', async () => {
    const opened = await mockDocumentsService.openDocument('doc_contract');
    assert.equal(opened.documentId, 'doc_contract');
    assert.match(opened.fileName, /\.pdf$/);
    assert.match(opened.shareText, /Employment contract/);
    // No document store yet, so there is deliberately nothing to open.
    assert.equal(opened.url, undefined);
  });

  it('refuses to open a document that is not ready', async () => {
    await assert.rejects(
      () => mockDocumentsService.openDocument('doc_zakat_2025'),
      (error: Error) => error instanceof DocumentUnavailableError,
    );
  });

  it('explains why an unavailable document cannot be opened', async () => {
    await mockDocumentsService.openDocument('doc_zakat_2025').catch((error: Error) => {
      assert.match(error.message, /still being prepared/);
    });
  });

  it('rejects an unknown document', async () => {
    await assert.rejects(
      () => mockDocumentsService.getDocument('doc_nope'),
      (error: Error) => error instanceof NotFoundError,
    );
  });
});
