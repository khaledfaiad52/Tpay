import type { IconName } from '@/icons';
import type { IconTileTone } from '@/components/ui';
import { colors } from '@/theme';
import type { Transaction, TransactionStatus, TransactionType } from '@/types';

/**
 * One place that decides how a transaction looks, so a salary row is drawn
 * identically on Home, in Transactions and on the account screen.
 */
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

/** Pending movements are gold, incoming money is green, everything else neutral. */
export function transactionTone(transaction: Transaction): IconTileTone {
  if (transaction.status === 'pending') return 'gold';
  if (transaction.status === 'failed') return 'danger';
  if (transaction.direction === 'credit') return 'primary';
  return 'neutral';
}

export function transactionTypeLabel(transaction: Transaction): string {
  return TYPE_LABELS[transaction.type];
}

export function transactionStatusLabel(transaction: Transaction): string {
  return STATUS_LABELS[transaction.status];
}

export function transactionStatusColor(transaction: Transaction): string {
  if (transaction.status === 'pending') return colors.warning;
  if (transaction.status === 'failed') return colors.danger;
  return colors.inkMuted;
}

export function transactionAmountColor(transaction: Transaction): string {
  if (transaction.status === 'failed') return colors.inkFaint;
  return transaction.direction === 'credit' ? colors.success : colors.ink;
}
