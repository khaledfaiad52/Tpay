import type { ProviderId } from './registry';

/**
 * Runtime configuration. Values come from Expo's public env vars so no secret
 * is ever compiled into the bundle — see `.env.example`.
 */
/**
 * Which deployment this build is.
 *
 * `development` runs on mock adapters and may show demo controls.
 * `staging` points at a real backend in a sandbox, with real provider
 * sandboxes behind it. `production` is real money; demo controls are refused
 * outright rather than merely defaulting off.
 */
export type Environment = 'development' | 'staging' | 'production';

export type AppConfig = {
  readonly environment: Environment;
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

function readEnvironment(): Environment {
  const value = process.env.EXPO_PUBLIC_TPAY_ENV;
  if (value === 'production' || value === 'staging') return value;
  // Anything unset or unrecognised is development. A build that means to be
  // production has to say so.
  return 'development';
}

function readProvider(): ProviderId {
  const value = process.env.EXPO_PUBLIC_TPAY_PROVIDER;
  // Only the mock adapter set exists today; anything else falls back to it
  // rather than crashing the app at start-up.
  return value === 'mock' ? 'mock' : 'mock';
}

const environment = readEnvironment();

/**
 * Demo controls are impossible in production, not merely off by default.
 *
 * A flag left set in a production build would otherwise ship a way to fake a
 * verification outcome or a card payment. The environment wins over the flag.
 */
function demoFlag(value: string | undefined): boolean {
  return environment !== 'production' && readFlag(value);
}

export const appConfig: AppConfig = {
  environment,
  provider: readProvider(),
  apiBaseUrl: process.env.EXPO_PUBLIC_TPAY_API_BASE_URL,
  demo: {
    kyc: demoFlag(process.env.EXPO_PUBLIC_ENABLE_KYC_DEMO),
    card: demoFlag(process.env.EXPO_PUBLIC_ENABLE_CARD_DEMO),
    session: demoFlag(process.env.EXPO_PUBLIC_ENABLE_SESSION_DEMO),
  },
};

/** True when this build talks to real money. */
export function isProduction(): boolean {
  return appConfig.environment === 'production';
}
