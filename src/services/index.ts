import { appConfig } from './config';
import { resolveServices } from './registry';

/**
 * The app's single entry point to data.
 *
 * ```ts
 * const balance = await services.wallet.getBalance();
 * ```
 */
export const services = resolveServices(appConfig.provider);

export {
  appConfig,
  isProduction,
  type AppConfig,
  type DemoControls,
  type Environment,
} from './config';
export { resolveServices, type ProviderId, type ServiceRegistry } from './registry';
export * from './contracts';
export { totalBalanceOf, totalDebit } from './mock';
export {
  configureMockBehaviour,
  DocumentUnavailableError,
  isValidUsername,
  MockServiceError,
  normaliseUsername,
  resetCards,
  resetKyc,
  resetNotifications,
  resetRequests,
  resetSecurity,
  resetSession,
  resetStore,
  resetSupport,
  resetTransfers,
  resetUser,
  unavailableBiometricAuthenticator,
  unreadCount,
} from './mock';
