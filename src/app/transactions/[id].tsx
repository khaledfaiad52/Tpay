import { PhasePlaceholder } from '@/components/navigation';

export default function TransactionDetailScreen() {
  return (
    <PhasePlaceholder
      title="Transaction"
      phase="Phase 2"
      summary="The full record: amount, currency, status, date, source account, reference and receipt."
    />
  );
}
