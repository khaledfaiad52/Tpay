import { PhasePlaceholder } from '@/components/navigation';

export default function ProfileScreen() {
  return (
    <PhasePlaceholder
      title="Profile"
      phase="Phase 5"
      summary="Personal information, your TPay username, security, KYC status, notifications, support and settings."
      showBack={false}
    />
  );
}
