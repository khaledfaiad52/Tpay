import type {
  AccountService,
  BenefitsService,
  CardService,
  EmploymentService,
  FxService,
  KycService,
  SalaryService,
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
};

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
  },
};

export function resolveServices(provider: ProviderId): ServiceRegistry {
  return REGISTRIES[provider];
}
