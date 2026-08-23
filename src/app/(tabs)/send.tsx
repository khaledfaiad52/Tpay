import { PhasePlaceholder } from '@/components/navigation';

export default function SendScreen() {
  return (
    <PhasePlaceholder
      title="Send money"
      phase="Phase 3"
      summary="One Send Money flow for TPay users, usernames, phone numbers, bank accounts, international recipients and mobile wallets — recipient, amount, review, confirmation and success."
      showBack={false}
    />
  );
}
