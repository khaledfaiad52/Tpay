import type {
  KycDocumentSubmission,
  KycPersonalDetails,
  KycService,
  KycState,
  KycStep,
  KycStepId,
} from '@/services/contracts';
import { ProviderUnavailableError } from '@/services/contracts';
import type { KycStatus } from '@/types';
import { mockUser } from './data/fixtures';
import { respond } from './latency';

/**
 * Maps whatever a provider calls its outcomes onto TPay's own KYC states.
 * Every future adapter owns a table like this, so the app only ever sees
 * `KycStatus` — never a provider's vocabulary, and never its name.
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

/** The steps verification asks for, in the order they should be done. */
const STEP_DEFINITIONS: readonly { id: KycStepId; title: string; description: string }[] = [
  {
    id: 'personal-information',
    title: 'Personal information',
    description: 'Your legal name, date of birth and address',
  },
  {
    id: 'identity-document',
    title: 'Passport or national ID',
    description: 'A photo of the document, front and back',
  },
  {
    id: 'proof-of-address',
    title: 'Proof of address',
    description: "Only if we can't verify your address automatically",
  },
];

type Progress = Record<KycStepId, boolean>;

let state: KycState = {
  status: mockUser.kycStatus,
  updatedAt: new Date().toISOString(),
};
let progress: Progress = initialProgress(mockUser.kycStatus);
/** Verification events already applied, so a redelivery is a no-op. */
let appliedEvents = new Set<string>();
let details: KycPersonalDetails | undefined;
let document: KycDocumentSubmission | undefined;

/** A verified user has already done every step. */
function initialProgress(status: KycStatus): Progress {
  const done = status === 'VERIFIED' || status === 'SUBMITTED';
  return {
    'personal-information': done,
    'identity-document': done,
    'proof-of-address': done,
  };
}

/**
 * Proof of address is asked for only when the provider could not confirm the
 * address on its own, which is why it is `not-required` by default.
 */
export function stepsFor(current: Progress, status: KycStatus): readonly KycStep[] {
  return STEP_DEFINITIONS.map((definition) => {
    if (definition.id === 'proof-of-address' && status !== 'ACTION_REQUIRED') {
      return { ...definition, status: 'not-required' as const };
    }
    return {
      ...definition,
      status: current[definition.id] ? ('done' as const) : ('todo' as const),
    };
  });
}

function advance(next: KycStatus, reason?: string): KycState {
  state = { status: next, reason, updatedAt: new Date().toISOString() };
  return state;
}

export const mockKycService: KycService = {
  createKycSession: () => {
    if (state.status === 'NOT_STARTED') advance('IN_PROGRESS');
    return respond('kycService.createKycSession', {
      sessionId: `kyc_${Date.now()}`,
      // A hosted provider flow would live here. The app opens it in a web
      // view and never learns which provider it is.
      redirectUrl: 'https://verify.tpay.app/session',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  },

  getKycStatus: () => respond('kycService.getKycStatus', state),

  listSteps: () => respond('kycService.listSteps', stepsFor(progress, state.status)),

  submitPersonalDetails: (submitted) => {
    details = submitted;
    progress = { ...progress, 'personal-information': true };
    return respond('kycService.submitPersonalDetails', advance('IN_PROGRESS'));
  },

  submitIdentityDocument: (submitted) => {
    if (!progress['personal-information']) {
      return Promise.reject(new Error('Add your personal information first.'));
    }
    document = submitted;
    progress = { ...progress, 'identity-document': true };
    return respond('kycService.submitIdentityDocument', advance('IN_PROGRESS'));
  },

  submitForReview: () => {
    if (!progress['personal-information'] || !progress['identity-document']) {
      return Promise.reject(new Error('Finish every step before submitting.'));
    }
    return respond('kycService.submitForReview', advance('SUBMITTED'));
  },

  handleKycCallback: ({ eventId, providerStatus, reason }) => {
    if (eventId && appliedEvents.has(eventId)) {
      return respond('kycService.handleKycCallback', state);
    }

    const next = PROVIDER_STATUS_MAP[providerStatus];
    if (!next) {
      return Promise.reject(
        new ProviderUnavailableError(
          'That verification update could not be read. Nothing has changed.',
          'kyc.callback',
        ),
      );
    }
    if (eventId) appliedEvents.add(eventId);
    if (next === 'IN_PROGRESS') {
      // A newly created session has nothing submitted against it yet.
      progress = initialProgress('IN_PROGRESS');
    } else if (next === 'ACTION_REQUIRED') {
      // The provider wants something more; the step it needs reopens.
      progress = { ...progress, 'proof-of-address': false };
    } else if (next === 'SUBMITTED' || next === 'VERIFIED') {
      progress = initialProgress(next);
    }
    return respond('kycService.handleKycCallback', advance(next, reason));
  },
};

/** The details captured so far, for the review screen. Tests and UI only. */
export function submittedKycDetails(): {
  details: KycPersonalDetails | undefined;
  document: KycDocumentSubmission | undefined;
} {
  return { details, document };
}

/** The current verification status, for services that gate on it. */
export function currentKycStatus(): KycStatus {
  return state.status;
}

/** Puts a specific status in place. Demo and test use only. */
export function setKycStatus(status: KycStatus, reason?: string): KycState {
  progress = initialProgress(status);
  return advance(status, reason);
}

export function resetKyc(): void {
  state = { status: mockUser.kycStatus, updatedAt: new Date().toISOString() };
  progress = initialProgress(mockUser.kycStatus);
  appliedEvents = new Set();
  details = undefined;
  document = undefined;
}
