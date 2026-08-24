import type { Money } from '@/types';

/**
 * The seam every asynchronous financial operation reports back through.
 *
 * TPay's money movement is not request/response. A transfer is accepted and
 * then settles minutes later; a verification is submitted and reviewed; a card
 * is authorised at a till TPay never sees. Each of those is a provider telling
 * TPay something after the fact, and each arrives as one of these.
 *
 * The rule this enforces is that a provider's vocabulary stops here. An
 * adapter receives its own payload shape, maps it into this envelope, and the
 * domain services translate `providerStatus` into TPay states. No screen, and
 * nothing in `src/app`, ever sees a provider's status string or its name.
 *
 *   provider webhook → adapter → ProviderEventEnvelope → domain service → TPay state
 *
 * The envelope is deliberately transport-agnostic. Today the app delivers
 * these by hand from the demo controls; in production a server receives the
 * webhook, verifies its signature, and forwards the normalised envelope.
 */
export type ProviderDomain =
  /** Identity verification outcomes. */
  | 'kyc'
  /** Payout progress: accepted, settled, returned. */
  | 'transfer'
  /** Conversions that settle asynchronously rather than at quote time. */
  | 'fx'
  /** A card authorisation or clearing from the processor. */
  | 'card-transaction'
  /** A card being produced, delivered, activated or killed by the issuer. */
  | 'card-lifecycle'
  /** The provider changing what the account may do — a compliance hold. */
  | 'account-status';

export type ProviderEventEnvelope = {
  /**
   * The provider's own id for this event.
   *
   * Required, because every network redelivers. This is the key that makes
   * handling idempotent: the same id must never be applied twice.
   */
  readonly eventId: string;
  readonly domain: ProviderDomain;
  /** The provider's word for what happened — "settled", "declined", "posted". */
  readonly providerStatus: string;
  /** ISO-8601 timestamp from the provider, not from this device. */
  readonly occurredAt: string;
  /** TPay's id for the thing the event is about, when the provider echoes it. */
  readonly subjectId?: string;
  /** TPay's reference, for providers that only echo that. */
  readonly reference?: string;
  /** Human-readable explanation, for a failure or a rejection. */
  readonly reason?: string;
  /** The provider's own error code, for support and reconciliation only. */
  readonly errorCode?: string;
  /** Present on card authorisations and settlements. */
  readonly amount?: Money;
  /** Anything else the provider sent, kept opaque and never interpreted. */
  readonly metadata?: Readonly<Record<string, string>>;
};

/** Why an event changed nothing, when it did not. */
export type ProviderEventSkipReason =
  /** Already applied — a redelivery. */
  | 'duplicate'
  /** Nothing in TPay matches the subject the provider named. */
  | 'unknown-subject'
  /** The status is not one this adapter knows how to translate. */
  | 'unrecognised-status'
  /** The domain has no handler yet. */
  | 'unsupported-domain';

export type ProviderEventOutcome = {
  readonly eventId: string;
  readonly domain: ProviderDomain;
  /** True when the event moved TPay state. */
  readonly applied: boolean;
  readonly skipped?: ProviderEventSkipReason;
};

/**
 * One entry point for every provider event.
 *
 * A real deployment puts a server in front of this: it verifies the webhook
 * signature, deduplicates at the edge, and forwards the envelope. The
 * signature check must never happen in the app — the secret that verifies it
 * cannot live in a mobile bundle.
 */
export type ProviderEventService = {
  handleEvent(envelope: ProviderEventEnvelope): Promise<ProviderEventOutcome>;
  /** Domains this adapter set can currently normalise. */
  supportedDomains(): Promise<readonly ProviderDomain[]>;
};
