import type { Recipient, TransferQuote, TransferService } from '@/services/contracts';
import { fromMajor, type Money } from '@/types';
import { NotFoundError, respond } from './latency';
import { mockFxService } from './fxService';

const RECIPIENTS: readonly Recipient[] = [
  {
    id: 'rcp_ahmed',
    kind: 'tpay-user',
    name: 'Ahmed Mansour',
    handle: '@ahmed',
    country: 'Saudi Arabia',
    currency: 'USD',
    initials: 'AM',
  },
  {
    id: 'rcp_layla',
    kind: 'username',
    name: 'Layla Haddad',
    handle: '@layla',
    country: 'United Arab Emirates',
    currency: 'AED',
    initials: 'LH',
  },
  {
    id: 'rcp_omar',
    kind: 'phone',
    name: 'Omar Nasser',
    handle: '+20 1• ••• ••44',
    country: 'Egypt',
    currency: 'EGP',
    initials: 'ON',
  },
  {
    id: 'rcp_sara',
    kind: 'bank-account',
    name: 'Sara Khalil',
    handle: 'DEMO •••• 6620',
    country: 'United Kingdom',
    currency: 'GBP',
    initials: 'SK',
  },
];

/** Quotes issued this session, so `createTransfer` can settle against them. */
const quotes = new Map<string, TransferQuote>();

/** Flat demo pricing; a provider adapter returns real pricing later. */
const FEE_BY_KIND: Record<Recipient['kind'], number> = {
  'tpay-user': 0,
  username: 0,
  phone: 0,
  'bank-account': 1.5,
  international: 3.5,
  'mobile-wallet': 2,
};

const DELIVERY_BY_KIND: Record<Recipient['kind'], string> = {
  'tpay-user': 'Arrives instantly',
  username: 'Arrives instantly',
  phone: 'Arrives instantly',
  'bank-account': '1–2 business days',
  international: '1–2 business days',
  'mobile-wallet': 'Arrives in minutes',
};

export const mockTransferService: TransferService = {
  listRecipients: () => respond('transferService.listRecipients', RECIPIENTS),

  findRecipient: (query) => {
    const needle = query.trim().toLowerCase().replace(/^@/, '');
    const match =
      RECIPIENTS.find((recipient) => recipient.handle.toLowerCase().replace(/^@/, '') === needle) ??
      RECIPIENTS.find((recipient) => recipient.name.toLowerCase().includes(needle)) ??
      null;
    return respond('transferService.findRecipient', match);
  },

  quoteTransfer: async ({ recipientId, sourceAccountId, sendAmount }) => {
    const recipient = RECIPIENTS.find((candidate) => candidate.id === recipientId);
    if (!recipient) throw new NotFoundError('Recipient', recipientId);

    const targetCurrency = recipient.currency ?? sendAmount.currency;
    const fee: Money = fromMajor(FEE_BY_KIND[recipient.kind], sendAmount.currency);
    const netAmount: Money = {
      minorUnits: sendAmount.minorUnits - fee.minorUnits,
      currency: sendAmount.currency,
    };

    const sameCurrency = targetCurrency === sendAmount.currency;
    const fxRate = sameCurrency ? undefined : await mockFxService.getRate(sendAmount.currency, targetCurrency);
    const receiveAmount: Money = sameCurrency
      ? netAmount
      : (await mockFxService.quote(netAmount, targetCurrency)).targetAmount;

    const quote: TransferQuote = {
      id: `trq_${Date.now()}`,
      recipient,
      sourceAccountId,
      sendAmount,
      receiveAmount,
      fee,
      fxRate,
      estimatedDelivery: DELIVERY_BY_KIND[recipient.kind],
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    };
    quotes.set(quote.id, quote);
    return respond('transferService.quoteTransfer', quote);
  },

  createTransfer: ({ quoteId, reference }) => {
    const quote = quotes.get(quoteId);
    if (!quote) return Promise.reject(new NotFoundError('Transfer quote', quoteId));

    const transferId = `trf_${Date.now()}`;
    return respond('transferService.createTransfer', {
      transferId,
      status: 'completed' as const,
      transaction: {
        id: `txn_${transferId}`,
        type: 'transfer' as const,
        direction: 'debit' as const,
        description: quote.recipient.name,
        amount: quote.sendAmount,
        occurredAt: new Date().toISOString(),
        status: 'completed' as const,
        accountId: quote.sourceAccountId,
        reference,
      },
    });
  },
};
