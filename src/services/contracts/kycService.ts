import type { KycStatus } from '@/types';

/**
 * Provider-agnostic verification. The eventual provider (Airwallex, Thunes,
 * or another regulated partner) implements this behind a session URL/token —
 * the app never imports a provider SDK directly.
 */
export type KycSession = {
  readonly sessionId: string;
  /** Hosted flow the app opens in a web view. */
  readonly redirectUrl: string;
  readonly expiresAt: string;
};

export type KycState = {
  readonly status: KycStatus;
  /** Shown when `status` is ACTION_REQUIRED or REJECTED. */
  readonly reason?: string;
  readonly updatedAt: string;
  /** Outstanding documents the user must supply. */
  readonly requiredDocuments?: readonly string[];
};

export type KycCallbackPayload = {
  readonly sessionId: string;
  readonly providerStatus: string;
  readonly reason?: string;
};

/** One thing verification needs from the user, and whether it is done. */
export type KycStep = {
  readonly id: KycStepId;
  readonly title: string;
  readonly description: string;
  readonly status: KycStepStatus;
};

export type KycStepId = 'personal-information' | 'identity-document' | 'proof-of-address';

export type KycStepStatus = 'todo' | 'in-progress' | 'done' | 'not-required';

/** What the personal-information step collects. */
export type KycPersonalDetails = {
  readonly firstName: string;
  readonly lastName: string;
  /** ISO-8601 date. */
  readonly dateOfBirth: string;
  readonly nationality: string;
  readonly addressLine1: string;
  readonly city: string;
  readonly country: string;
};

/** What the identity-document step records. Files never reach the app. */
export type KycDocumentSubmission = {
  readonly documentType: 'passport' | 'national-id' | 'residence-permit';
  /** What the user chose to call it, for the confirmation line. */
  readonly documentLabel: string;
};

export type KycService = {
  createKycSession(): Promise<KycSession>;
  getKycStatus(): Promise<KycState>;
  /** The steps still outstanding, in the order they should be done. */
  listSteps(): Promise<readonly KycStep[]>;
  submitPersonalDetails(details: KycPersonalDetails): Promise<KycState>;
  submitIdentityDocument(submission: KycDocumentSubmission): Promise<KycState>;
  /** Hands everything to the provider for review. */
  submitForReview(): Promise<KycState>;
  /** Normalises a provider webhook/redirect into TPay's own KYC states. */
  handleKycCallback(payload: KycCallbackPayload): Promise<KycState>;
};
