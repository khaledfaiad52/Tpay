import type {
  AccountService,
  BenefitsService,
  CardService,
  DocumentsService,
  EmploymentService,
  FxService,
  KycService,
  NotificationsService,
  RequestsService,
  SalaryService,
  SecurityService,
  SessionService,
  SupportService,
  TransactionService,
  TransferService,
  UserService,
  WalletService,
} from './contracts';
import * as mock from './mock';

/**
 * Every service the app consumes, resolved in one place.
 *
 * Components never import an adapter directly — they import `services` from
 * `@/services`. Swapping the mock layer for Airwallex, Thunes, TerraPay, Nium
 * or a TPay-owned backend means implementing the contracts in
 * `src/services/contracts` and registering the adapter here; not one screen
 * changes.
 */
export type ServiceRegistry = {
  readonly user: UserService;
  readonly wallet: WalletService;
  readonly account: AccountService;
  readonly transaction: TransactionService;
  readonly transfer: TransferService;
  readonly fx: FxService;
  readonly card: CardService;
  readonly kyc: KycService;
  readonly salary: SalaryService;
  readonly employment: EmploymentService;
  readonly benefits: BenefitsService;
  readonly documents: DocumentsService;
  readonly requests: RequestsService;
  readonly security: SecurityService;
  readonly support: SupportService;
  readonly notifications: NotificationsService;
  readonly session: SessionService;
};

/**
 * Device biometrics are deliberately not in this registry. They are answered
 * by the platform rather than by a provider, so there is one implementation
 * for every adapter set — `deviceBiometricAuthenticator` in
 * `src/services/device`. Screens import it directly; nothing prompts for a
 * face on its own.
 */

/** Adapters shipped today. Provider-backed sets get their own key here. */
export type ProviderId = 'mock';

const REGISTRIES: Record<ProviderId, ServiceRegistry> = {
  mock: {
    user: mock.mockUserService,
    wallet: mock.mockWalletService,
    account: mock.mockAccountService,
    transaction: mock.mockTransactionService,
    transfer: mock.mockTransferService,
    fx: mock.mockFxService,
    card: mock.mockCardService,
    kyc: mock.mockKycService,
    salary: mock.mockSalaryService,
    employment: mock.mockEmploymentService,
    benefits: mock.mockBenefitsService,
    documents: mock.mockDocumentsService,
    requests: mock.mockRequestsService,
    security: mock.mockSecurityService,
    support: mock.mockSupportService,
    notifications: mock.mockNotificationsService,
    session: mock.mockSessionService,
  },
};

export function resolveServices(provider: ProviderId): ServiceRegistry {
  return REGISTRIES[provider];
}
