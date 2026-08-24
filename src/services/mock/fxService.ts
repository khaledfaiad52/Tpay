import type {
  ExchangeQuote,
  ExchangeQuoteRequest,
  ExchangeResult,
  FxService,
} from '@/services/contracts';
import { minorUnitFactor, type CurrencyCode, type Money, type Transaction } from '@/types';
import { adjustBalance, adjustTotalBalance, findAccount, recordTransactions } from './data/store';
import { respond } from './latency';

/** Indicative demo rates against USD. Replaced by a provider adapter later. */
const USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  SAR: 3.7475,
  AED: 3.6725,
  EGP: 48.6,
  GBP: 0.784,
  EUR: 0.921,
};

/** TPay's spread, as shown on the Exchange screen. */
const FEE_RATE = 0.0025;

/** How long a booked quote stays valid, matching the design's countdown. */
const QUOTE_TTL_MS = 30_000;

export function rateBetween(from: CurrencyCode, to: CurrencyCode): number {
  return USD_RATES[to] / USD_RATES[from];
}

/**
 * Converts an amount at a given rate, rounding once at the end so a quote and
 * its execution can never disagree.
 */
export function convert(amount: Money, to: CurrencyCode, rate: number): Money {
  const major = (amount.minorUnits / minorUnitFactor(amount.currency)) * rate;
  return { minorUnits: Math.round(major * minorUnitFactor(to)), currency: to };
}

export class QuoteExpiredError extends Error {
  constructor() {
    super('This rate has expired. Refresh to get a new one.');
    this.name = 'QuoteExpiredError';
  }
}

export class InsufficientFundsError extends Error {
  constructor() {
    super('There is not enough in that account for this exchange.');
    this.name = 'InsufficientFundsError';
  }
}

/** Quotes issued this session, so `executeExchange` can settle against them. */
const exchangeQuotes = new Map<string, ExchangeQuote>();

/**
 * The user receives the full amount they entered, converted at the rate; the
 * spread is charged on top, so the source account is debited
 * `sendAmount + fee`. This is the arithmetic the approved Exchange screen
 * shows ($1,000 at 3.7475 arrives as SAR 3,747.50, with a $2.50 fee beside it).
 */
export function buildExchangeQuote(request: ExchangeQuoteRequest, now = Date.now()): ExchangeQuote {
  const source = findAccount(request.sourceAccountId);
  const target = findAccount(request.targetAccountId);
  if (!source || !target) throw new Error('Unknown account in exchange quote');

  const rate = rateBetween(source.currency, target.currency);
  const fee: Money = {
    minorUnits: Math.round(request.sendAmount.minorUnits * FEE_RATE),
    currency: source.currency,
  };

  return {
    id: `fxq_${now}_${source.id}_${target.id}`,
    from: source.currency,
    to: target.currency,
    rate,
    sourceAmount: request.sendAmount,
    targetAmount: convert(request.sendAmount, target.currency, rate),
    fee,
    feeRate: FEE_RATE,
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    sourceAccountId: source.id,
    targetAccountId: target.id,
  };
}

/** What actually leaves the source account: the amount plus the spread. */
export function totalDebit(quote: ExchangeQuote): Money {
  return {
    minorUnits: quote.sourceAmount.minorUnits + quote.fee.minorUnits,
    currency: quote.sourceAmount.currency,
  };
}

export const mockFxService: FxService = {
  getRate: (from, to) => respond('fxService.getRate', rateBetween(from, to)),

  quote: (sourceAmount, to) => {
    const rate = rateBetween(sourceAmount.currency, to);
    const fee: Money = {
      minorUnits: Math.round(sourceAmount.minorUnits * FEE_RATE),
      currency: sourceAmount.currency,
    };
    const net: Money = {
      minorUnits: sourceAmount.minorUnits - fee.minorUnits,
      currency: sourceAmount.currency,
    };

    return respond('fxService.quote', {
      id: `fxq_${Date.now()}`,
      from: sourceAmount.currency,
      to,
      rate,
      sourceAmount,
      targetAmount: convert(net, to, rate),
      fee,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    });
  },

  quoteExchange: (request) => {
    const quote = buildExchangeQuote(request);
    exchangeQuotes.set(quote.id, quote);
    return respond('fxService.quoteExchange', quote);
  },

  executeExchange: (quoteId) => {
    const quote = exchangeQuotes.get(quoteId);
    if (!quote) return Promise.reject(new Error('Unknown exchange quote'));
    if (Date.parse(quote.expiresAt) < Date.now()) return Promise.reject(new QuoteExpiredError());

    const debit = totalDebit(quote);
    const source = findAccount(quote.sourceAccountId);
    if (!source || source.balance.minorUnits < debit.minorUnits) {
      return Promise.reject(new InsufficientFundsError());
    }

    const occurredAt = new Date().toISOString();
    const exchangeId = `fxe_${Date.now()}`;
    const reference = `TPY-FX-${String(Date.now()).slice(-4)}`;
    const label = `${quote.from} → ${quote.to} exchange`;

    const sourceTransaction: Transaction = {
      id: `txn_${exchangeId}_out`,
      type: 'fx',
      direction: 'debit',
      description: label,
      amount: debit,
      occurredAt,
      status: 'completed',
      accountId: quote.sourceAccountId,
      reference,
      fee: quote.fee,
      fxRate: { from: quote.from, to: quote.to, rate: quote.rate },
      counterAmount: quote.targetAmount,
    };

    const targetTransaction: Transaction = {
      id: `txn_${exchangeId}_in`,
      type: 'fx',
      direction: 'credit',
      description: label,
      amount: quote.targetAmount,
      occurredAt,
      status: 'completed',
      accountId: quote.targetAccountId,
      reference,
      fxRate: { from: quote.from, to: quote.to, rate: quote.rate },
      counterAmount: quote.sourceAmount,
    };

    adjustBalance(quote.sourceAccountId, { ...debit, minorUnits: -debit.minorUnits });
    adjustBalance(quote.targetAccountId, quote.targetAmount);
    // An exchange is value-neutral apart from the spread, so the one balance
    // moves by the fee only.
    adjustTotalBalance(-convert(quote.fee, 'USD', rateBetween(quote.from, 'USD')).minorUnits);
    recordTransactions([sourceTransaction, targetTransaction]);
    exchangeQuotes.delete(quoteId);

    return respond('fxService.executeExchange', {
      exchangeId,
      sourceTransaction,
      targetTransaction,
      targetAmount: quote.targetAmount,
    } satisfies ExchangeResult);
  },
};
