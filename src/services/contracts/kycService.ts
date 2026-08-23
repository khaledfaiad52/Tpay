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

export type KycService = {
  createKycSession(): Promise<KycSession>;
  getKycStatus(): Promise<KycState>;
  /** Normalises a provider webhook/redirect into TPay's own KYC states. */
  handleKycCallback(payload: KycCallbackPayload): Promise<KycState>;
};
