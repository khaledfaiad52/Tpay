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
};

function readProvider(): ProviderId {
  const value = process.env.EXPO_PUBLIC_TPAY_PROVIDER;
  // Only the mock adapter set exists today; anything else falls back to it
  // rather than crashing the app at start-up.
  return value === 'mock' ? 'mock' : 'mock';
}

export const appConfig: AppConfig = {
  provider: readProvider(),
  apiBaseUrl: process.env.EXPO_PUBLIC_TPAY_API_BASE_URL,
};
