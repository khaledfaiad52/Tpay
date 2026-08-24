import type { ProviderId } from './registry';

/**
 * Runtime configuration. Values come from Expo's public env vars so no secret
 * is ever compiled into the bundle — see `.env.example`.
 */
export type AppConfig = {
  /** Which service adapter set backs the app. */
  readonly provider: ProviderId;
  /** Base URL of the TPay backend, once one exists. */
  readonly apiBaseUrl: string | undefined;
  /**
   * Development and test affordances that must never ship in a production
   * build. Each one is opt-in: absent or anything other than "true" is off.
   */
  readonly demo: DemoControls;
};

/**
 * Controls that stand in for something only a real backend can do — a
 * reviewer's verdict, a card being swiped at a till. They drive the real
 * service seams rather than reaching into state, so enabling one exercises
 * the production path.
 */
export type DemoControls = {
  /** Apply a verification outcome from the identity screen. */
  readonly kyc: boolean;
  /** Authorise a card purchase from the card screen. */
  readonly card: boolean;
  /** Expire the session from the Security screen. */
  readonly session: boolean;
};

/** Only the exact string "true" enables a demo control. */
function readFlag(value: string | undefined): boolean {
  return value === 'true';
}

function readProvider(): ProviderId {
  const value = process.env.EXPO_PUBLIC_TPAY_PROVIDER;
  // Only the mock adapter set exists today; anything else falls back to it
  // rather than crashing the app at start-up.
  return value === 'mock' ? 'mock' : 'mock';
}

export const appConfig: AppConfig = {
  provider: readProvider(),
  apiBaseUrl: process.env.EXPO_PUBLIC_TPAY_API_BASE_URL,
  demo: {
    kyc: readFlag(process.env.EXPO_PUBLIC_ENABLE_KYC_DEMO),
    card: readFlag(process.env.EXPO_PUBLIC_ENABLE_CARD_DEMO),
    session: readFlag(process.env.EXPO_PUBLIC_ENABLE_SESSION_DEMO),
  },
};
