import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AccountFrozenError,
  services,
  totalDebit,
  type AccountRestriction,
  type ExchangeQuote,
} from '@/services';
import { fromMajor, toMajor, type Account, type Money } from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

async function loadAccounts(): Promise<readonly Account[]> {
  return services.account.listAccounts();
}

export type ExchangeState = {
  accounts: AsyncResult<readonly Account[]>;
  source: Account | undefined;
  target: Account | undefined;
  /** The raw text in the amount field, in major units. */
  amountText: string;
  sendAmount: Money | undefined;
  quote: ExchangeQuote | undefined;
  /** Seconds until the current quote expires; 0 once it has. */
  secondsRemaining: number;
  isQuoting: boolean;
  /** True only when there is a live, affordable quote to book. */
  canConfirm: boolean;
  isSubmitting: boolean;
  /** Set when the amount is unusable or the exchange was rejected. */
  error: string | undefined;
  /** Set when the account itself is frozen, which blocks the whole screen. */
  restriction: AccountRestriction | undefined;
  setAmountText: (value: string) => void;
  /** Tidies the amount field once the user leaves it. */
  blurAmount: () => void;
  setSourceAccountId: (accountId: string) => void;
  setTargetAccountId: (accountId: string) => void;
  swap: () => void;
  confirm: () => Promise<Money | undefined>;
};

/** Parses the amount field. Returns undefined for anything unusable. */
export function parseAmount(text: string, currency: Account['currency']): Money | undefined {
  const normalised = text.replace(/,/g, '').trim();
  if (!normalised) return undefined;
  const value = Number(normalised);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return fromMajor(value, currency);
}

/** "1,000.00" — grouped and padded, but without a currency marker. */
export function formatAmountForEditing(amount: Money): string {
  return toMajor(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Identifies one set of exchange inputs, so a stale quote is never applied. */
function quoteKey(source: Account, target: Account, sendAmount: Money): string {
  return `${source.id}|${target.id}|${sendAmount.minorUnits}`;
}

/**
 * Drives the Exchange screen: which accounts, how much, the live quote, its
 * countdown, and booking it.
 */
export function useExchange(): ExchangeState {
  const accounts = useAsyncData(loadAccounts);
  const [sourceAccountId, setSourceAccountId] = useState<string>();
  const [targetAccountId, setTargetAccountId] = useState<string>();
  const [amountText, setAmountText] = useState('1000');
  const [quoteEntry, setQuoteEntry] = useState<{ key: string; quote: ExchangeQuote }>();
  const [failure, setFailure] = useState<string>();
  const [restriction, setRestriction] = useState<AccountRestriction>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ticks once a second so the rate countdown stays live.
  const [now, setNow] = useState(() => Date.now());

  const list = accounts.data;

  // Default to converting out of the primary wallet into the next account.
  const source = useMemo(
    () =>
      list?.find((account) => account.id === sourceAccountId) ??
      list?.find((account) => account.isPrimary) ??
      list?.[0],
    [list, sourceAccountId],
  );
  const target = useMemo(
    () =>
      list?.find((account) => account.id === targetAccountId) ??
      list?.find((account) => account.id !== source?.id),
    [list, targetAccountId, source?.id],
  );

  const sendAmount = useMemo(
    () => (source ? parseAmount(amountText, source.currency) : undefined),
    [amountText, source],
  );

  /** Present whenever the inputs are complete enough to price. */
  const pendingKey =
    source && target && sendAmount ? quoteKey(source, target, sendAmount) : undefined;

  useEffect(() => {
    if (!pendingKey || !source || !target || !sendAmount) return;

    let cancelled = false;
    services.fx
      .quoteExchange({
        sourceAccountId: source.id,
        targetAccountId: target.id,
        sendAmount,
      })
      .then(
        (quote) => {
          if (!cancelled) setQuoteEntry({ key: pendingKey, quote });
        },
        (cause: unknown) => {
          if (cancelled) return;
          if (cause instanceof AccountFrozenError) {
            setRestriction(cause.restriction);
            setFailure(cause.message);
            return;
          }
          setFailure("We couldn't get a rate just now. Try again.");
        },
      );

    return () => {
      cancelled = true;
    };
  }, [pendingKey, source, target, sendAmount]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // A quote only counts while it still describes what is on screen.
  const quote =
    quoteEntry && pendingKey && quoteEntry.key === pendingKey ? quoteEntry.quote : undefined;
  const secondsRemaining = quote
    ? Math.max(0, Math.round((Date.parse(quote.expiresAt) - now) / 1000))
    : 0;

  // The spread is charged on top of the amount, so affordability is judged
  // against the quote rather than guessed from the amount alone.
  const insufficient = Boolean(
    quote && source && totalDebit(quote).minorUnits > source.balance.minorUnits,
  );

  const swap = useCallback(() => {
    if (!source || !target) return;
    setSourceAccountId(target.id);
    setTargetAccountId(source.id);
    setFailure(undefined);
  }, [source, target]);

  const confirm = useCallback(async (): Promise<Money | undefined> => {
    if (!quote || insufficient) return undefined;
    setIsSubmitting(true);
    setFailure(undefined);
    try {
      const result = await services.fx.executeExchange(quote.id);
      setQuoteEntry(undefined);
      setAmountText('');
      return result.targetAmount;
    } catch (cause) {
      if (cause instanceof AccountFrozenError) setRestriction(cause.restriction);
      setFailure(cause instanceof Error ? cause.message : 'That exchange did not go through.');
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  }, [quote, insufficient]);

  const changeAmount = useCallback((value: string) => {
    setAmountText(value);
    setFailure(undefined);
  }, []);

  const blurAmount = useCallback(() => {
    if (!sendAmount) return;
    setAmountText(formatAmountForEditing(sendAmount));
  }, [sendAmount]);

  return {
    accounts,
    source,
    target,
    amountText,
    sendAmount,
    quote,
    secondsRemaining,
    isQuoting: Boolean(pendingKey) && !quote && !failure,
    canConfirm: Boolean(quote) && !insufficient && secondsRemaining > 0,
    isSubmitting,
    error: insufficient ? 'That is more than this account holds.' : failure,
    restriction,
    setAmountText: changeAmount,
    blurAmount,
    setSourceAccountId,
    setTargetAccountId,
    swap,
    confirm,
  };
}
