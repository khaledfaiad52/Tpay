import {
  InsufficientFundsError,
  NotFoundError,
  ProviderUnavailableError,
  QuoteExpiredError,
  TransferLimitExceededError,
  UnsupportedCorridorError,
  type Corridor,
  type Recipient,
  type RecipientDraft,
  type RecipientKind,
  type Transfer,
  type TransferCallbackPayload,
  type TransferLimit,
  type TransferLimitAction,
  type TransferLimitScope,
  type TransferQuote,
  type TransferQuoteRequest,
  type TransferService,
} from '@/services/contracts';
import {
  fromMajor,
  negate,
  type CurrencyCode,
  type KycStatus,
  type Money,
  type Transaction,
} from '@/types';
import { accountRestrictionError, requireActiveAccount } from './accountGuard';
import { runOnce } from './idempotency';
import { currentKycStatus } from './kycService';
import {
  adjustBalance,
  findAccount,
  recordTransactions,
  updateTransaction,
} from './data/store';
import { convert, rateBetween } from './fxService';
import { respond } from './latency';

/**
 * Monotonic within the session.
 *
 * Ids were derived from `Date.now()`, which collides when two things happen
 * in the same millisecond. A real backend hands out ids; until then a counter
 * removes the collision without pretending to be a real id scheme.
 */
let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}${sequence.toString(36)}`;
}

/**
 * Provider events already applied, by the provider's own event id.
 *
 * Payout networks redeliver: the same webhook can arrive twice. Recording the
 * id means a redelivery is recognised and ignored rather than applied again.
 */
const appliedEvents = new Set<string>();

/** Saved recipients, seeded with the people the design shows. */
const SEED_RECIPIENTS: readonly Recipient[] = [
  {
    id: 'rcp_ahmed',
    kind: 'tpay-user',
    name: 'Ahmed Mansour',
    handle: '@ahmed',
    country: 'United Arab Emirates',
    currency: 'AED',
    initials: 'AH',
    institution: 'TPay balance',
    saved: true,
  },
  {
    id: 'rcp_sara',
    kind: 'bank-account',
    name: 'Sara Mahmoud',
    handle: 'DEMO •••• 5667',
    country: 'Egypt',
    currency: 'EGP',
    initials: 'SM',
    institution: 'Banque Misr',
    saved: true,
  },
  {
    id: 'rcp_mostafa',
    kind: 'mobile-wallet',
    name: 'Mostafa Kamel',
    handle: '+20 1• ••• ••31',
    country: 'Egypt',
    currency: 'EGP',
    initials: 'MK',
    institution: 'Vodafone Cash',
    saved: true,
  },
  {
    id: 'rcp_layla',
    kind: 'username',
    name: 'Layla Haddad',
    handle: '@layla',
    country: 'Saudi Arabia',
    currency: 'SAR',
    initials: 'LH',
    institution: 'TPay balance',
    saved: true,
  },
  {
    id: 'rcp_omar',
    kind: 'international',
    name: 'Omar Nasser',
    handle: 'DEMO •••• 6620',
    country: 'United Kingdom',
    currency: 'GBP',
    initials: 'ON',
    institution: 'Barclays',
    saved: true,
  },
];

/**
 * Payout routes TPay can deliver on. A real adapter builds this from the
 * provider's corridor list; the shape the app sees never changes.
 */
const CORRIDORS: readonly Corridor[] = [
  ...(['USD', 'SAR', 'AED', 'EGP', 'EUR', 'GBP'] as const).flatMap<Corridor>((currency) => [
    {
      kind: 'tpay-user',
      currency,
      estimatedDelivery: 'Arrives instantly',
      payoutMethod: 'TPay balance',
    },
    {
      kind: 'username',
      currency,
      estimatedDelivery: 'Arrives instantly',
      payoutMethod: 'TPay balance',
    },
    {
      kind: 'phone',
      currency,
      estimatedDelivery: 'Arrives instantly',
      payoutMethod: 'TPay balance',
    },
    {
      kind: 'bank-account',
      currency,
      estimatedDelivery: '1–2 business days',
      payoutMethod: 'Bank deposit',
    },
    {
      kind: 'international',
      currency,
      estimatedDelivery: '1–2 business days',
      payoutMethod: 'Bank deposit',
    },
  ]),
  // Mobile wallets exist only where TPay has an operator relationship.
  {
    kind: 'mobile-wallet',
    currency: 'EGP',
    country: 'Egypt',
    estimatedDelivery: 'Arrives in minutes',
    payoutMethod: 'Mobile wallet',
  },
  {
    kind: 'mobile-wallet',
    currency: 'SAR',
    country: 'Saudi Arabia',
    estimatedDelivery: 'Arrives in minutes',
    payoutMethod: 'Mobile wallet',
  },
  {
    kind: 'mobile-wallet',
    currency: 'AED',
    country: 'United Arab Emirates',
    estimatedDelivery: 'Arrives in minutes',
    payoutMethod: 'Mobile wallet',
  },
];

/**
 * Transfer fees, quoted in USD and converted into the source currency, so the
 * price of sending does not depend on which wallet it leaves from.
 */
const FEE_USD_BY_KIND: Record<RecipientKind, number> = {
  'tpay-user': 0,
  username: 0,
  phone: 0,
  'bank-account': 2.5,
  international: 2.5,
  'mobile-wallet': 1.5,
};

/** How long a quote stays bookable. */
const QUOTE_TTL_MS = 10 * 60 * 1000;

/**
 * Configurable mock ceilings, in USD major units, kept together so a risk
 * change is one edit. A provider-backed adapter replaces the table below
 * wholesale — nothing here is a real provider's number.
 */
const CEILING_USD = {
  /** Nothing verified yet. */
  unverified: 500,
  /** Verification started but not finished. */
  inProgress: 1_000,
  /** Verification came back needing something from the user. */
  actionRequired: 500,
  /** Waiting on review — the user has done their part. */
  submitted: 2_500,
  /** Fully verified. */
  verified: 25_000,
  /** Account under review or declined: sending is closed, not narrowed. */
  blocked: 0,
  mobileWallet: 5_000,
  egyptCorridor: 10_000,
} as const;

const VERIFY_IDENTITY: TransferLimitAction = {
  kind: 'verify-identity',
  label: 'Complete identity verification',
};

const CONTACT_SUPPORT: TransferLimitAction = {
  kind: 'contact-support',
  label: 'Contact TPay support',
};

/**
 * Configurable mock limits.
 *
 * Real ceilings come from a provider, a regulator and TPay's own risk rules at
 * once, so each entry names the conditions it applies under. Verification
 * level is the dimension that moves today: an unverified account sends a
 * little, a verified account sends a lot, and a suspended one sends nothing.
 */
const LIMITS: readonly TransferLimit[] = [
  {
    id: 'lim_kyc_blocked',
    label: 'account review',
    scope: { kycStatus: ['SUSPENDED', 'REJECTED'] },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.blocked, 'USD'),
    explanation: 'Sending is paused while TPay reviews your account.',
    action: CONTACT_SUPPORT,
  },
  {
    id: 'lim_kyc_unverified',
    label: 'unverified sending limit',
    scope: { kycStatus: 'NOT_STARTED' },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.unverified, 'USD'),
    explanation: 'Your current verification level has a transfer limit.',
    action: VERIFY_IDENTITY,
  },
  {
    id: 'lim_kyc_in_progress',
    label: 'unverified sending limit',
    scope: { kycStatus: 'IN_PROGRESS' },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.inProgress, 'USD'),
    explanation: 'Your current verification level has a transfer limit.',
    action: VERIFY_IDENTITY,
  },
  {
    id: 'lim_kyc_action_required',
    label: 'unverified sending limit',
    scope: { kycStatus: 'ACTION_REQUIRED' },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.actionRequired, 'USD'),
    explanation: 'Verification needs something more from you before limits lift.',
    action: VERIFY_IDENTITY,
  },
  {
    id: 'lim_kyc_submitted',
    label: 'in-review sending limit',
    scope: { kycStatus: 'SUBMITTED' },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.submitted, 'USD'),
    explanation: 'Your documents are in review. Limits lift once you are verified.',
  },
  {
    id: 'lim_verified_txn',
    label: 'per-transfer limit',
    scope: { kycStatus: 'VERIFIED' },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.verified, 'USD'),
  },
  {
    id: 'lim_wallet_txn',
    label: 'mobile wallet limit',
    scope: { kind: 'mobile-wallet' },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.mobileWallet, 'USD'),
  },
  {
    id: 'lim_egp_corridor',
    label: 'Egypt corridor limit',
    scope: { corridor: { from: 'USD', to: 'EGP' } },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.egyptCorridor, 'USD'),
  },
];

/**
 * What a payout network's own vocabulary means to TPay. Every adapter owns a
 * table like this, so the app only ever sees a `TransferStatus`.
 */
const PROVIDER_STATUS_MAP: Record<string, Transfer['status']> = {
  accepted: 'created',
  submitted: 'processing',
  in_transit: 'processing',
  sent: 'processing',
  settled: 'completed',
  paid: 'completed',
  returned: 'failed',
  rejected: 'failed',
  cancelled: 'failed',
};

/** Recipients the user chose to keep — what the Send hub lists. */
let recipients: Recipient[] = [...SEED_RECIPIENTS];
/**
 * Every recipient created this session, saved or not. A one-off recipient
 * still has to be payable, so lookups go through here rather than the
 * saved list.
 */
let knownRecipients = new Map<string, Recipient>(
  SEED_RECIPIENTS.map((recipient) => [recipient.id, recipient]),
);
let transfers: Transfer[] = [];
const quotes = new Map<string, TransferQuote>();

/** True when a limit's conditions all match the transfer being priced. */
export function limitApplies(
  scope: TransferLimitScope,
  context: {
    kycStatus: KycStatus;
    country?: string;
    currency: CurrencyCode;
    payoutCurrency: CurrencyCode;
    kind: RecipientKind;
  },
): boolean {
  if (scope.kycStatus) {
    const allowed = Array.isArray(scope.kycStatus) ? scope.kycStatus : [scope.kycStatus];
    if (!allowed.includes(context.kycStatus)) return false;
  }
  if (scope.country && scope.country !== context.country) return false;
  if (scope.currency && scope.currency !== context.currency) return false;
  if (scope.kind && scope.kind !== context.kind) return false;
  if (
    scope.corridor &&
    (scope.corridor.from !== context.currency || scope.corridor.to !== context.payoutCurrency)
  ) {
    return false;
  }
  return true;
}

/**
 * The tightest limit the transfer breaches, or nothing. Amounts are compared
 * in the limit's own currency, so a SAR transfer is judged against a USD
 * ceiling at the current rate.
 */
export function breachedLimit(
  sendAmount: Money,
  context: Parameters<typeof limitApplies>[1],
  limits: readonly TransferLimit[] = LIMITS,
): TransferLimit | undefined {
  return limits
    .filter((limit) => limitApplies(limit.scope, context))
    .find((limit) => {
      const inLimitCurrency = convert(
        sendAmount,
        limit.max.currency,
        rateBetween(sendAmount.currency, limit.max.currency),
      );
      return inLimitCurrency.minorUnits > limit.max.minorUnits;
    });
}

/**
 * The verification-level ceiling in force. Every status has one, so a screen
 * can always say what the user may send without waiting for a rejection.
 */
export function sendingLimitFor(
  status: KycStatus,
  limits: readonly TransferLimit[] = LIMITS,
): TransferLimit {
  const match = limits.find(
    (limit) => limit.scope.kycStatus !== undefined && limitApplies(limit.scope, {
      kycStatus: status,
      currency: 'USD',
      payoutCurrency: 'USD',
      kind: 'tpay-user',
    }),
  );
  if (match) return match;
  // A status with no entry of its own sends under the unverified ceiling.
  return {
    id: 'lim_kyc_default',
    label: 'unverified sending limit',
    scope: { kycStatus: status },
    period: 'per-transaction',
    max: fromMajor(CEILING_USD.unverified, 'USD'),
    explanation: 'Your current verification level has a transfer limit.',
    action: VERIFY_IDENTITY,
  };
}

export function findCorridor(
  kind: RecipientKind,
  currency: CurrencyCode,
): Corridor | undefined {
  return CORRIDORS.find(
    (corridor) => corridor.kind === kind && corridor.currency === currency,
  );
}

/**
 * Prices a transfer.
 *
 * The recipient receives exactly what the user entered, converted at the
 * corridor rate; the fee is charged on top of it.
 */
export function buildTransferQuote(
  request: TransferQuoteRequest,
  recipient: Recipient,
  now = Date.now(),
): TransferQuote {
  // A restricted account cannot even be quoted — the user is told why before
  // entering an amount they will not be allowed to send.
  requireActiveAccount();

  const source = findAccount(request.sourceAccountId);
  if (!source) throw new NotFoundError('Account', request.sourceAccountId);

  const targetCurrency = recipient.currency ?? source.currency;
  const corridor = findCorridor(recipient.kind, targetCurrency);
  if (!corridor) throw new UnsupportedCorridorError(recipient.kind, targetCurrency);

  const sameCurrency = targetCurrency === source.currency;
  const rate = sameCurrency ? undefined : rateBetween(source.currency, targetCurrency);

  const receiveAmount: Money = sameCurrency
    ? request.sendAmount
    : convert(request.sendAmount, targetCurrency, rate!);

  const breached = breachedLimit(request.sendAmount, {
    kycStatus: currentKycStatus(),
    country: recipient.country,
    currency: source.currency,
    payoutCurrency: targetCurrency,
    kind: recipient.kind,
  });
  if (breached) throw new TransferLimitExceededError(breached);

  const fee = convert(
    fromMajor(FEE_USD_BY_KIND[recipient.kind], 'USD'),
    source.currency,
    rateBetween('USD', source.currency),
  );

  return {
    id: `trq_${now}_${recipient.id}`,
    recipient,
    sourceAccountId: source.id,
    sendAmount: request.sendAmount,
    receiveAmount,
    fee,
    totalDebit: {
      minorUnits: request.sendAmount.minorUnits + fee.minorUnits,
      currency: source.currency,
    },
    fxRate: rate,
    estimatedDelivery: corridor.estimatedDelivery,
    arrivesBy: arrivalDate(corridor, now),
    payoutMethod: corridor.payoutMethod,
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  };
}

/** Instant corridors land today; bank payouts land two days out. */
function arrivalDate(corridor: Corridor, now: number): string {
  const days = corridor.payoutMethod === 'Bank deposit' ? 2 : 0;
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const mockTransferService: TransferService = {
  listRecipients: () => respond('transferService.listRecipients', recipients),

  findRecipient: (query) => {
    const needle = query.trim().toLowerCase().replace(/^@/, '');
    const match =
      recipients.find(
        (recipient) => recipient.handle.toLowerCase().replace(/^@/, '') === needle,
      ) ??
      recipients.find((recipient) => recipient.name.toLowerCase().includes(needle)) ??
      null;
    return respond('transferService.findRecipient', match);
  },

  createRecipient: (draft: RecipientDraft) => {
    const recipient: Recipient = {
      id: `rcp_${Date.now()}`,
      kind: draft.kind,
      name: draft.name,
      handle: draft.handle,
      country: draft.country,
      currency: draft.currency,
      institution: draft.institution,
      initials: initialsOf(draft.name),
      saved: draft.save ?? false,
    };
    knownRecipients.set(recipient.id, recipient);
    if (recipient.saved) recipients = [recipient, ...recipients];
    return respond('transferService.createRecipient', recipient);
  },

  listCorridors: () => respond('transferService.listCorridors', CORRIDORS),

  quoteTransfer: (request) => {
    const recipient = knownRecipients.get(request.recipientId);
    if (!recipient) return Promise.reject(new NotFoundError('Recipient', request.recipientId));

    let quote: TransferQuote;
    try {
      quote = buildTransferQuote(request, recipient);
    } catch (cause) {
      return Promise.reject(cause);
    }

    quotes.set(quote.id, quote);
    return respond('transferService.quoteTransfer', quote);
  },

  createTransfer: (request) => {
    const { idempotencyKey, quoteId, reference, demoOutcome } = request;

    // Every retry of the same intent returns the first result. A transfer
    // that timed out and is retried settles once, not twice.
    return runOnce('transfer.create', idempotencyKey, request, () => {
      // Checked again at the point of booking: a restriction applied while the
      // user was on the review screen must still stop the money.
      const restricted = accountRestrictionError();
      if (restricted) return Promise.reject(restricted);

      const quote = quotes.get(quoteId);
      if (!quote) return Promise.reject(new NotFoundError('Transfer quote', quoteId));
      if (Date.parse(quote.expiresAt) < Date.now()) {
        return Promise.reject(
          new QuoteExpiredError('That rate has expired. Go back and refresh the amount.'),
        );
      }

      const source = findAccount(quote.sourceAccountId);
      if (!source) return Promise.reject(new NotFoundError('Account', quote.sourceAccountId));

      const createdAt = new Date().toISOString();
      const transferId = nextId('trf');
      const transferReference = reference ?? `TPY-${String(Date.now()).slice(-4)}-KF44`;

      const base = {
        id: transferId,
        recipient: quote.recipient,
        sourceAccountId: quote.sourceAccountId,
        sendAmount: quote.sendAmount,
        receiveAmount: quote.receiveAmount,
        fee: quote.fee,
        totalDebit: quote.totalDebit,
        fxRate: quote.fxRate,
        createdAt,
        arrivesBy: quote.arrivesBy,
        estimatedDelivery: quote.estimatedDelivery,
        payoutMethod: quote.payoutMethod,
        reference: transferReference,
      } as const;

      // A failed transfer must leave the balance untouched.
      if (demoOutcome === 'failure') {
        const failed: Transfer = {
          ...base,
          status: 'failed',
          failureReason: `We couldn't complete this transfer. ${
            quote.recipient.institution ?? 'The receiving bank'
          } rejected the recipient details. Nothing has left your account.`,
          errorCode: 'RECIPIENT_REJECTED',
        };
        transfers = [failed, ...transfers];
        quotes.delete(quoteId);
        return respond('transferService.createTransfer', { transfer: failed });
      }

      if (source.balance.minorUnits < quote.totalDebit.minorUnits) {
        return Promise.reject(
          new InsufficientFundsError('There is not enough in that account for this transfer.'),
        );
      }

      // Instant corridors settle immediately; bank payouts stay pending until
      // the receiving side confirms.
      const settlesInstantly = quote.payoutMethod === 'TPay balance';

      const transaction: Transaction = {
        id: `txn_${transferId}`,
        type: 'transfer',
        direction: 'debit',
        description: quote.recipient.name,
        amount: quote.totalDebit,
        occurredAt: createdAt,
        status: settlesInstantly ? 'completed' : 'pending',
        accountId: quote.sourceAccountId,
        reference: transferReference,
        counterpartyBank: quote.recipient.institution,
        fee: quote.fee,
        fxRate: quote.fxRate
          ? { from: quote.sendAmount.currency, to: quote.receiveAmount.currency, rate: quote.fxRate }
          : undefined,
        counterAmount: quote.fxRate ? quote.receiveAmount : undefined,
      };

      const transfer: Transfer = {
        ...base,
        status: settlesInstantly ? 'completed' : 'processing',
        transactionId: transaction.id,
      };

      adjustBalance(quote.sourceAccountId, negate(quote.totalDebit));
      recordTransactions([transaction]);
      transfers = [transfer, ...transfers];
      quotes.delete(quoteId);

      return respond('transferService.createTransfer', { transfer, transaction });
    });
  },

  getTransfer: (transferId) => {
    const transfer = transfers.find((candidate) => candidate.id === transferId);
    if (!transfer) return Promise.reject(new NotFoundError('Transfer', transferId));
    return respond('transferService.getTransfer', transfer);
  },

  listTransfers: () => respond('transferService.listTransfers', transfers),

  listTransferLimits: () => respond('transferService.listTransferLimits', LIMITS),

  getSendingLimit: () =>
    respond('transferService.getSendingLimit', sendingLimitFor(currentKycStatus())),

  handleTransferCallback: (payload: TransferCallbackPayload) => {
    const transfer = transfers.find(
      (candidate) =>
        (payload.transferId && candidate.id === payload.transferId) ||
        (payload.reference && candidate.reference === payload.reference),
    );
    if (!transfer) {
      return Promise.reject(
        new NotFoundError('Transfer', payload.transferId ?? payload.reference ?? 'unknown'),
      );
    }

    // A redelivered event must not be applied twice — a returned transfer
    // credited twice would invent money.
    if (payload.eventId && appliedEvents.has(payload.eventId)) {
      return respond('transferService.handleTransferCallback', transfer);
    }

    const status = PROVIDER_STATUS_MAP[payload.providerStatus];
    if (!status) {
      return Promise.reject(
        new ProviderUnavailableError(
          'That payout update could not be read. Nothing has changed.',
          'transfer.callback',
        ),
      );
    }
    // A settled transfer is final; a later callback cannot reopen it.
    if (transfer.status === 'completed' || transfer.status === 'failed') {
      if (payload.eventId) appliedEvents.add(payload.eventId);
      return respond('transferService.handleTransferCallback', transfer);
    }

    const settled: Transfer = {
      ...transfer,
      status,
      failureReason: status === 'failed' ? (payload.reason ?? transfer.failureReason) : undefined,
      errorCode: status === 'failed' ? (payload.errorCode ?? 'PAYOUT_RETURNED') : undefined,
    };

    if (transfer.transactionId) {
      if (status === 'completed') {
        updateTransaction(transfer.transactionId, { status: 'completed' });
      } else if (status === 'failed') {
        // The money already left; a return puts it back.
        updateTransaction(transfer.transactionId, {
          status: 'failed',
          failureReason: settled.failureReason,
        });
        adjustBalance(transfer.sourceAccountId, transfer.totalDebit);
      }
    }

    transfers = transfers.map((candidate) =>
      candidate.id === settled.id ? settled : candidate,
    );
    if (payload.eventId) appliedEvents.add(payload.eventId);
    return respond('transferService.handleTransferCallback', settled);
  },
};

/** Restores seeded recipients and clears this session's transfers. Tests only. */
export function resetTransfers(): void {
  recipients = [...SEED_RECIPIENTS];
  knownRecipients = new Map(SEED_RECIPIENTS.map((recipient) => [recipient.id, recipient]));
  transfers = [];
  quotes.clear();
  appliedEvents.clear();
  sequence = 0;
}
