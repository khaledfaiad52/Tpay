import type {
  Corridor,
  Recipient,
  RecipientDraft,
  RecipientKind,
  Transfer,
  TransferQuote,
  TransferQuoteRequest,
  TransferService,
} from '@/services/contracts';
import {
  InsufficientFundsError,
  NotFoundError,
  QuoteExpiredError,
  UnsupportedCorridorError,
} from '@/services/contracts';
import { fromMajor, type CurrencyCode, type Money, type Transaction } from '@/types';
import { adjustBalance, findAccount, recordTransactions } from './data/store';
import { convert, rateBetween } from './fxService';
import { respond } from './latency';

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

  createTransfer: ({ quoteId, reference, demoOutcome }) => {
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
    const transferId = `trf_${Date.now()}`;
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

    adjustBalance(quote.sourceAccountId, {
      ...quote.totalDebit,
      minorUnits: -quote.totalDebit.minorUnits,
    });
    recordTransactions([transaction]);
    transfers = [transfer, ...transfers];
    quotes.delete(quoteId);

    return respond('transferService.createTransfer', { transfer, transaction });
  },

  getTransfer: (transferId) => {
    const transfer = transfers.find((candidate) => candidate.id === transferId);
    if (!transfer) return Promise.reject(new NotFoundError('Transfer', transferId));
    return respond('transferService.getTransfer', transfer);
  },

  listTransfers: () => respond('transferService.listTransfers', transfers),
};

/** Restores seeded recipients and clears this session's transfers. Tests only. */
export function resetTransfers(): void {
  recipients = [...SEED_RECIPIENTS];
  knownRecipients = new Map(SEED_RECIPIENTS.map((recipient) => [recipient.id, recipient]));
  transfers = [];
  quotes.clear();
}
