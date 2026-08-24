/**
 * How a transaction is named and iconed. Pure data — no theme, no React — so
 * receipt text and other non-visual code can use the same words the UI shows.
 */
import type { IconName } from '@/icons';
import type { Transaction, TransactionStatus, TransactionType } from '@/types';

const ICONS: Record<TransactionType, IconName> = {
  salary: 'banknote',
  transfer: 'arrow-up-right',
  card: 'credit-card',
  deposit: 'plus',
  fx: 'exchange',
  fee: 'percent',
};

const TYPE_LABELS: Record<TransactionType, string> = {
  salary: 'Salary',
  transfer: 'Transfer',
  card: 'Card',
  deposit: 'Deposit',
  fx: 'Exchange',
  fee: 'Fee',
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
};

export function transactionIcon(transaction: Transaction): IconName {
  return ICONS[transaction.type];
}

export function transactionTypeLabel(transaction: Transaction): string {
  return TYPE_LABELS[transaction.type];
}

export function transactionStatusLabel(transaction: Transaction): string {
  return STATUS_LABELS[transaction.status];
}
