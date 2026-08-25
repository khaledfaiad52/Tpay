import { DuplicateOperationError } from '@/services/contracts';
import type { IdempotencyKey, IdempotencyRecord } from '@/services/contracts';

/**
 * The mock adapters' idempotency store.
 *
 * One store for every money-moving operation, so the rule is written once. A
 * real backend replaces this with a table keyed by (user, key) and a TTL; the
 * behaviour the app depends on is identical.
 */
const records = new Map<string, IdempotencyRecord<unknown>>();

function slot(operation: string, key: IdempotencyKey): string {
  return `${operation}:${key}`;
}

/**
 * A stable fingerprint of the request, so a retry that quietly changes the
 * amount is caught rather than replayed.
 *
 * Key order is normalised: two objects with the same fields in a different
 * order are the same request.
 */
export function fingerprint(request: unknown): string {
  return JSON.stringify(request, (_key, value: unknown) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(entries);
    }
    return value;
  });
}

/**
 * Runs `work` at most once per key.
 *
 * - First call: does the work and remembers the result.
 * - Retry with the same key and the same request: returns the stored result
 *   without doing anything. The money moves once.
 * - Same key, different request: refused. That is a bug in the caller, and
 *   silently replaying the wrong result would hide it.
 */
export async function runOnce<T>(
  operation: string,
  key: IdempotencyKey | undefined,
  request: unknown,
  work: () => Promise<T>,
): Promise<T> {
  // An operation with no key cannot be made safe, so it is simply performed.
  // Contracts mark the key required; this keeps an un-keyed adapter working.
  if (!key) return work();

  const id = slot(operation, key);
  const print = fingerprint(request);
  const existing = records.get(id);

  if (existing) {
    if (existing.fingerprint !== print) {
      throw new DuplicateOperationError(
        key,
        'That request has already been used for something different. Start again.',
      );
    }
    return existing.result as T;
  }

  const result = await work();
  records.set(id, {
    key,
    operation,
    fingerprint: print,
    result,
    recordedAt: new Date().toISOString(),
  });
  return result;
}

/** Whether a key has already been spent on an operation. Tests and diagnostics. */
export function hasRecord(operation: string, key: IdempotencyKey): boolean {
  return records.has(slot(operation, key));
}

export function resetIdempotency(): void {
  records.clear();
}
