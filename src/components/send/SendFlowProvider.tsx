import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { parseAmount } from '@/hooks/useExchange';
import {
  AccountRestrictedError,
  services,
  TransferLimitExceededError,
  type AccountRestriction,
  type Recipient,
  type RecipientDraft,
  type RecipientKind,
  type TransferLimit,
  type TransferQuote,
  type TransferResult,
} from '@/services';
import type { Account, Money } from '@/types';

export type SendFlowStatus = 'editing' | 'submitting' | 'done';

export type SendFlowState = {
  /** Which entry point the user chose on the Send hub. */
  kind: RecipientKind | undefined;
  recipient: Recipient | undefined;
  sourceAccount: Account | undefined;
  /** Raw text in the amount field, in the source account's major units. */
  amountText: string;
  sendAmount: Money | undefined;
  quote: TransferQuote | undefined;
  quoteError: string | undefined;
  /**
   * The ceiling the amount just broke, when that is why the quote failed.
   * Carrying the whole limit lets the screen name the amount and the way past
   * it rather than showing a bare error.
   */
  limitBreach: TransferLimit | undefined;
  /** Set when the account itself is frozen, which outranks any limit. */
  restriction: AccountRestriction | undefined;
  isQuoting: boolean;
  status: SendFlowStatus;
  result: TransferResult | undefined;
  submitError: string | undefined;

  start: (kind: RecipientKind) => void;
  chooseRecipient: (recipient: Recipient) => void;
  createRecipient: (draft: RecipientDraft) => Promise<Recipient>;
  chooseSourceAccount: (account: Account) => void;
  setAmountText: (value: string) => void;
  /** Prices the current selection. Safe to call repeatedly. */
  refreshQuote: () => Promise<void>;
  /** Books the transfer. `demoFailure` exercises the failure path. */
  submit: (options?: { demoFailure?: boolean }) => Promise<void>;
  /** Clears everything, for a fresh send. */
  reset: () => void;
};

const SendFlowContext = createContext<SendFlowState | undefined>(undefined);

/**
 * Holds the Send Money draft across its steps.
 *
 * The flow spans several routes, so the recipient, source account, amount and
 * quote live here rather than being threaded through route params — and the
 * transfer is booked from exactly one place, so it can never be sent twice.
 */
export function SendFlowProvider({ children }: { children: React.ReactNode }) {
  const [kind, setKind] = useState<RecipientKind>();
  const [recipient, setRecipient] = useState<Recipient>();
  const [sourceAccount, setSourceAccount] = useState<Account>();
  const [amountText, setAmountText] = useState('');
  const [quote, setQuote] = useState<TransferQuote>();
  const [quoteError, setQuoteError] = useState<string>();
  const [limitBreach, setLimitBreach] = useState<TransferLimit>();
  const [restriction, setRestriction] = useState<AccountRestriction>();
  const [isQuoting, setIsQuoting] = useState(false);
  const [status, setStatus] = useState<SendFlowStatus>('editing');
  const [result, setResult] = useState<TransferResult>();
  const [submitError, setSubmitError] = useState<string>();

  const sendAmount = useMemo(
    () => (sourceAccount ? parseAmount(amountText, sourceAccount.currency) : undefined),
    [amountText, sourceAccount],
  );

  const start = useCallback((next: RecipientKind) => {
    setKind(next);
    setRecipient(undefined);
    setQuote(undefined);
    setQuoteError(undefined);
    setLimitBreach(undefined);
    setRestriction(undefined);
    setAmountText('');
    setResult(undefined);
    setSubmitError(undefined);
    setStatus('editing');
  }, []);

  const chooseRecipient = useCallback((next: Recipient) => {
    setRecipient(next);
    setKind(next.kind);
    setQuote(undefined);
    setQuoteError(undefined);
  }, []);

  const createRecipient = useCallback(async (draft: RecipientDraft) => {
    const created = await services.transfer.createRecipient(draft);
    setRecipient(created);
    setKind(created.kind);
    setQuote(undefined);
    setQuoteError(undefined);
    return created;
  }, []);

  const chooseSourceAccount = useCallback((account: Account) => {
    setSourceAccount(account);
    setQuote(undefined);
    setQuoteError(undefined);
    setLimitBreach(undefined);
    setRestriction(undefined);
  }, []);

  const changeAmount = useCallback((value: string) => {
    setAmountText(value);
    setQuote(undefined);
    setQuoteError(undefined);
    setLimitBreach(undefined);
    setRestriction(undefined);
  }, []);

  const refreshQuote = useCallback(async () => {
    if (!recipient || !sourceAccount || !sendAmount) return;
    setIsQuoting(true);
    setQuoteError(undefined);
    setLimitBreach(undefined);
    setRestriction(undefined);
    try {
      const next = await services.transfer.quoteTransfer({
        recipientId: recipient.id,
        sourceAccountId: sourceAccount.id,
        sendAmount,
      });
      setQuote(next);
    } catch (cause) {
      setQuote(undefined);
      if (cause instanceof TransferLimitExceededError) setLimitBreach(cause.limit);
      if (cause instanceof AccountRestrictedError) setRestriction(cause.restriction);
      setQuoteError(
        cause instanceof Error ? cause.message : "We couldn't price that transfer.",
      );
    } finally {
      setIsQuoting(false);
    }
  }, [recipient, sourceAccount, sendAmount]);

  const submit = useCallback(
    async (options?: { demoFailure?: boolean }) => {
      if (!quote) return;
      setStatus('submitting');
      setSubmitError(undefined);
      try {
        const next = await services.transfer.createTransfer({
          quoteId: quote.id,
          demoOutcome: options?.demoFailure ? 'failure' : undefined,
        });
        setResult(next);
      } catch (cause) {
        if (cause instanceof AccountRestrictedError) setRestriction(cause.restriction);
        setSubmitError(
          cause instanceof Error ? cause.message : 'That transfer did not go through.',
        );
      } finally {
        setStatus('done');
      }
    },
    [quote],
  );

  const reset = useCallback(() => {
    setKind(undefined);
    setRecipient(undefined);
    setAmountText('');
    setQuote(undefined);
    setQuoteError(undefined);
    setLimitBreach(undefined);
    setRestriction(undefined);
    setResult(undefined);
    setSubmitError(undefined);
    setStatus('editing');
  }, []);

  const value = useMemo<SendFlowState>(
    () => ({
      kind,
      recipient,
      sourceAccount,
      amountText,
      sendAmount,
      quote,
      quoteError,
      limitBreach,
      restriction,
      isQuoting,
      status,
      result,
      submitError,
      start,
      chooseRecipient,
      createRecipient,
      chooseSourceAccount,
      setAmountText: changeAmount,
      refreshQuote,
      submit,
      reset,
    }),
    [
      kind,
      recipient,
      sourceAccount,
      amountText,
      sendAmount,
      quote,
      quoteError,
      limitBreach,
      restriction,
      isQuoting,
      status,
      result,
      submitError,
      start,
      chooseRecipient,
      createRecipient,
      chooseSourceAccount,
      changeAmount,
      refreshQuote,
      submit,
      reset,
    ],
  );

  return <SendFlowContext.Provider value={value}>{children}</SendFlowContext.Provider>;
}

export function useSendFlow(): SendFlowState {
  const context = useContext(SendFlowContext);
  if (!context) throw new Error('useSendFlow must be used inside a SendFlowProvider');
  return context;
}
