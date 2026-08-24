import { NotFoundError, ProviderUnavailableError } from '@/services/contracts';
import type {
  ProviderDomain,
  ProviderEventEnvelope,
  ProviderEventOutcome,
  ProviderEventService,
} from '@/services/contracts';
import { mockCardService } from './cardService';
import { mockKycService } from './kycService';
import { respond } from './latency';
import { mockSecurityService } from './securityService';
import { mockTransferService } from './transferService';

/**
 * The one door provider events come through.
 *
 * A real deployment puts a server in front of this: it verifies the webhook
 * signature, then forwards the normalised envelope. This router only decides
 * which domain service should translate it — every mapping from a provider's
 * vocabulary into TPay states lives with the domain that owns those states,
 * not here.
 */

/** Which domains have a handler today. */
const SUPPORTED: readonly ProviderDomain[] = [
  'kyc',
  'transfer',
  'card-transaction',
  'card-lifecycle',
  'account-status',
];

/** Account-status words a provider might use to hold or release an account. */
const ACCOUNT_HOLD_STATUSES = new Set(['hold', 'frozen', 'restricted', 'suspended']);
const ACCOUNT_RELEASE_STATUSES = new Set(['released', 'active', 'cleared']);

/** Events already routed, so a redelivery is answered without re-dispatching. */
const routed = new Set<string>();

function skipped(
  envelope: ProviderEventEnvelope,
  reason: ProviderEventOutcome['skipped'],
): ProviderEventOutcome {
  return { eventId: envelope.eventId, domain: envelope.domain, applied: false, skipped: reason };
}

function applied(envelope: ProviderEventEnvelope): ProviderEventOutcome {
  return { eventId: envelope.eventId, domain: envelope.domain, applied: true };
}

export const mockProviderEventService: ProviderEventService = {
  supportedDomains: () => respond('providerEvents.supportedDomains', SUPPORTED),

  handleEvent: async (envelope) => {
    if (routed.has(envelope.eventId)) return skipped(envelope, 'duplicate');

    try {
      switch (envelope.domain) {
        case 'kyc':
          await mockKycService.handleKycCallback({
            eventId: envelope.eventId,
            sessionId: envelope.subjectId ?? 'unknown',
            providerStatus: envelope.providerStatus,
            reason: envelope.reason,
          });
          break;

        case 'transfer':
          await mockTransferService.handleTransferCallback({
            eventId: envelope.eventId,
            transferId: envelope.subjectId,
            reference: envelope.reference,
            providerStatus: envelope.providerStatus,
            reason: envelope.reason,
            errorCode: envelope.errorCode,
          });
          break;

        case 'card-lifecycle':
          if (!envelope.subjectId) return skipped(envelope, 'unknown-subject');
          await mockCardService.handleCardCallback({
            eventId: envelope.eventId,
            cardId: envelope.subjectId,
            providerStatus: envelope.providerStatus,
            reason: envelope.reason,
          });
          break;

        case 'card-transaction':
          if (!envelope.subjectId || !envelope.amount) {
            return skipped(envelope, 'unknown-subject');
          }
          await mockCardService.authorizePurchase({
            // The provider's event id IS the idempotency key here: a
            // redelivered authorisation must debit the wallet once.
            idempotencyKey: envelope.eventId,
            cardId: envelope.subjectId,
            amount: envelope.amount,
            merchant: envelope.metadata?.merchant ?? 'Card payment',
            online: envelope.metadata?.channel === 'online',
            atm: envelope.metadata?.channel === 'atm',
            international: envelope.metadata?.international === 'true',
          });
          break;

        case 'account-status': {
          if (ACCOUNT_HOLD_STATUSES.has(envelope.providerStatus)) {
            await mockSecurityService.setAccountFrozen(true);
          } else if (ACCOUNT_RELEASE_STATUSES.has(envelope.providerStatus)) {
            await mockSecurityService.setAccountFrozen(false);
          } else {
            return skipped(envelope, 'unrecognised-status');
          }
          break;
        }

        case 'fx':
          // Exchanges settle at booking today, so there is nothing to apply.
          // The domain stays listed so a provider that settles asynchronously
          // has somewhere to report to.
          return skipped(envelope, 'unsupported-domain');
      }
    } catch (cause) {
      if (cause instanceof NotFoundError) return skipped(envelope, 'unknown-subject');
      if (cause instanceof ProviderUnavailableError) {
        return skipped(envelope, 'unrecognised-status');
      }
      // A declined card authorisation is a real outcome, not a routing
      // failure: the event was handled, it simply did not move money.
      return skipped(envelope, 'unrecognised-status');
    }

    routed.add(envelope.eventId);
    return applied(envelope);
  },
};

export function resetProviderEvents(): void {
  routed.clear();
}
