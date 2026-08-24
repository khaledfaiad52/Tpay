/**
 * Idempotency for every operation that moves money.
 *
 * The problem this solves is not theoretical. A transfer request that times
 * out has an unknown outcome: the money may or may not have left. The only
 * safe response is to retry the *same* request, and the only way a retry can
 * be safe is if the far side recognises it and returns the original result
 * instead of doing the work again.
 *
 * So every money-moving request carries a key the caller generates once and
 * reuses for every retry of that same intent. A new intent gets a new key.
 */

/**
 * A caller-generated key identifying one intent to move money.
 *
 * Generated when the user commits — not per attempt. Two taps of Confirm are
 * two intents; one tap retried three times is one.
 */
export type IdempotencyKey = string;

/** Every request that moves money carries one. */
export type IdempotentRequest = {
  /**
   * Reuse this exact value for every retry of the same intent. Omitting it
   * makes the operation unsafe to retry; adapters may reject the request.
   */
  readonly idempotencyKey: IdempotencyKey;
};

/**
 * What an adapter did with a request it had seen before.
 *
 * `replayed` is the flag a caller uses to distinguish "your retry worked" from
 * "this happened twice" — a screen should never celebrate a replay as a new
 * transfer.
 */
export type IdempotentOutcome<T> = {
  readonly result: T;
  /** True when this is the stored result of an earlier identical request. */
  readonly replayed: boolean;
};

/**
 * The record an adapter keeps so a retry can be answered from memory.
 *
 * A real adapter stores this server-side, keyed by (user, key), with a TTL.
 * The mock keeps it in the session store; the shape is the same either way.
 */
export type IdempotencyRecord<T> = {
  readonly key: IdempotencyKey;
  /** Which operation the key was used for, so a key cannot be reused across two. */
  readonly operation: string;
  /**
   * Hash of the request body. A retry that changes the amount is a different
   * intent wearing the same key, and must be refused rather than replayed.
   */
  readonly fingerprint: string;
  readonly result: T;
  readonly recordedAt: string;
};

/** Monotonic within a session, so two keys minted in the same millisecond differ. */
let sequence = 0;

/**
 * Mints a key for one intent to move money.
 *
 * Call this once, where the user commits — not inside a retry loop, and not
 * per render. Hermes has no `crypto.randomUUID`, so the key is composed from
 * the clock, a session counter and randomness; it only has to be unique per
 * user, which this comfortably is.
 */
export function newIdempotencyKey(prefix = 'op'): IdempotencyKey {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}_${random}`;
}
