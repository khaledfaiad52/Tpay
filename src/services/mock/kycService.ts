import type { KycService, KycState } from '@/services/contracts';
import type { KycStatus } from '@/types';
import { mockUser } from './data/fixtures';
import { respond } from './latency';

/**
 * Maps whatever a provider calls its outcomes onto TPay's own KYC states.
 * Every future adapter owns a table like this, so the app only ever sees
 * `KycStatus`.
 */
const PROVIDER_STATUS_MAP: Record<string, KycStatus> = {
  created: 'IN_PROGRESS',
  pending: 'SUBMITTED',
  in_review: 'SUBMITTED',
  requires_action: 'ACTION_REQUIRED',
  approved: 'VERIFIED',
  declined: 'REJECTED',
  suspended: 'SUSPENDED',
};

let state: KycState = {
  status: mockUser.kycStatus,
  updatedAt: new Date().toISOString(),
};

export const mockKycService: KycService = {
  createKycSession: () => {
    state = { status: 'IN_PROGRESS', updatedAt: new Date().toISOString() };
    return respond('kycService.createKycSession', {
      sessionId: `kyc_${Date.now()}`,
      redirectUrl: 'https://demo.tpay.app/kyc/session',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  },

  getKycStatus: () => respond('kycService.getKycStatus', state),

  handleKycCallback: ({ providerStatus, reason }) => {
    state = {
      status: PROVIDER_STATUS_MAP[providerStatus] ?? 'IN_PROGRESS',
      reason,
      updatedAt: new Date().toISOString(),
    };
    return respond('kycService.handleKycCallback', state);
  },
};
