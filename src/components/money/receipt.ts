import type { Account, AccountDetails, Transaction } from '@/types';
import { formatLongDate, formatMoney, formatSignedMoney } from '@/utils';
import { transactionStatusLabel } from './transactionLabels';

/** "Transfer to Ahmed Mansour", "Salary from Acme Technologies payroll". */
export function heroSubject(transaction: Transaction): string {
  switch (transaction.type) {
    case 'transfer':
      return `Transfer to ${transaction.description}`;
    case 'salary':
      return transaction.counterpartyBank
        ? `Salary from ${transaction.counterpartyBank}`
        : 'Salary payment';
    case 'card':
      return `Card payment · ${transaction.description}`;
    case 'fx':
      return transaction.counterAmount
        ? `Converted to ${formatMoney(transaction.counterAmount)}`
        : transaction.description;
    case 'deposit':
    case 'fee':
    default:
      return transaction.description;
  }
}

export type ReceiptRow = {
  readonly label: string;
  readonly value: string;
  readonly monospaced?: boolean;
};

/**
 * Builds the receipt rows a given transaction actually has — a card payment
 * has no exchange rate, a same-currency transfer has no recipient amount.
 */
export function detailRows(
  transaction: Transaction,
  account?: Pick<Account, 'currency' | 'maskedNumber'>,
): readonly ReceiptRow[] {
  const rows: ReceiptRow[] = [
    { label: 'Date & time', value: formatDateTime(transaction.occurredAt) },
  ];

  if (account) {
    rows.push({
      label: transaction.direction === 'debit' ? 'From' : 'To',
      value: `${account.currency} account ••${account.maskedNumber}`,
    });
  }
  if (transaction.counterpartyBank) {
    rows.push({
      label: transaction.type === 'salary' ? 'Paid by' : 'Recipient bank',
      value: transaction.counterpartyBank,
    });
  }
  if (transaction.fxRate) {
    rows.push({
      label: 'Exchange rate',
      value: `1 ${transaction.fxRate.from} = ${transaction.fxRate.rate.toFixed(4)} ${transaction.fxRate.to}`,
    });
  }
  if (transaction.counterAmount) {
    rows.push({ label: 'Recipient receives', value: formatMoney(transaction.counterAmount) });
  }

  rows.push({ label: 'Fee', value: transaction.fee ? formatMoney(transaction.fee) : 'No fee' });

  if (transaction.reference) {
    rows.push({ label: 'Reference', value: transaction.reference, monospaced: true });
  }
  return rows;
}

/** "18 August 2026, 14:22". */
export function formatDateTime(iso: string): string {
  const time = new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${formatLongDate(iso)}, ${time}`;
}

/** Plain-text receipt, for sharing or copying. */
export function formatReceipt(
  transaction: Transaction,
  account?: Pick<Account, 'currency' | 'maskedNumber'>,
): string {
  return [
    `TPay receipt · ${transactionStatusLabel(transaction)}`,
    heroSubject(transaction),
    formatSignedMoney(transaction.amount, transaction.direction),
    ...detailRows(transaction, account).map((row) => `${row.label}: ${row.value}`),
  ].join('\n');
}

/** One shareable block of account coordinates, for "Copy all". */
export function formatAccountDetails(details: AccountDetails): string {
  return [
    ...details.fields.map((field) => `${field.label}: ${field.value}`),
    `Bank: ${details.bankName}`,
    details.bankAddress,
  ].join('\n');
}

/** "00:28" — the rate countdown format. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
