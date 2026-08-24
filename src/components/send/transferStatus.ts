import type { StatusPillTone } from '@/components/ui';
import type { TransferStatus } from '@/services';

/** How each stage of a transfer's life reads to the user. */
const LABELS: Record<TransferStatus, string> = {
  created: 'Submitted',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

const TONES: Record<TransferStatus, StatusPillTone> = {
  created: 'pending',
  processing: 'pending',
  completed: 'success',
  failed: 'failed',
};

export function transferStatusLabel(status: TransferStatus): string {
  return LABELS[status];
}

export function transferStatusTone(status: TransferStatus): StatusPillTone {
  return TONES[status];
}

/** True while the payout network still owes TPay an answer. */
export function isTransferSettled(status: TransferStatus): boolean {
  return status === 'completed' || status === 'failed';
}
