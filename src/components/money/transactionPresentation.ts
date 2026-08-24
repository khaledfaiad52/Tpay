/**
 * How a transaction is coloured. Kept beside `transactionLabels` so a salary
 * row is drawn identically on Home, in Transactions and on an account screen.
 */
import type { IconTileTone } from '@/components/ui';
import { colors } from '@/theme';
import type { Transaction } from '@/types';

/** Pending movements are gold, incoming money is green, everything else neutral. */
export function transactionTone(transaction: Transaction): IconTileTone {
  if (transaction.status === 'pending') return 'gold';
  if (transaction.status === 'failed') return 'danger';
  if (transaction.direction === 'credit') return 'primary';
  return 'neutral';
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
