import { PhasePlaceholder } from '@/components/navigation';

export default function WalletScreen() {
  return (
    <PhasePlaceholder
      title="TPay Wallet"
      phase="Phase 2"
      summary="Total balance, your USD wallet, every currency account, TPay account details for receiving money, add money and exchange."
      showBack={false}
    />
  );
}
