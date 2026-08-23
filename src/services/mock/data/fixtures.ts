/**
 * Demo data for the mock service adapters.
 *
 * Fictional throughout — no real people, no real bank coordinates. Account
 * numbers are masked tails only, prefixed DEMO wherever a full string is
 * needed. Nothing in this file may be imported by a component: the UI reads
 * data through the services in `src/services`.
 */
import { fromMajor } from '@/types';
import type {
  Account,
  AccountDetails,
  Benefit,
  Card,
  Employment,
  SalaryRecord,
  Transaction,
  UpcomingSalary,
  User,
} from '@/types';

export const mockUser: User = {
  id: 'usr_demo_khaled',
  firstName: 'Khaled',
  lastName: 'Faiad',
  username: 'khaled',
  email: 'khaled@demo.tpay.app',
  phone: '+966 5• ••• ••21',
  initials: 'KF',
  country: 'Saudi Arabia',
  kycStatus: 'VERIFIED',
  walletActivated: true,
};

export const mockAccounts: readonly Account[] = [
  {
    id: 'acc_usd',
    currency: 'USD',
    name: 'US Dollar account',
    kind: 'salary',
    balance: fromMajor(8250, 'USD'),
    maskedNumber: '4821',
    isPrimary: true,
  },
  {
    id: 'acc_sar',
    currency: 'SAR',
    name: 'Saudi Riyal account',
    kind: 'local',
    balance: fromMajor(15200, 'SAR'),
    maskedNumber: '1093',
    isPrimary: false,
  },
  {
    id: 'acc_aed',
    currency: 'AED',
    name: 'UAE Dirham account',
    kind: 'benefit',
    balance: fromMajor(4500, 'AED'),
    maskedNumber: '7734',
    isPrimary: false,
  },
  {
    id: 'acc_egp',
    currency: 'EGP',
    name: 'Egyptian Pound account',
    kind: 'local',
    balance: fromMajor(75000, 'EGP'),
    maskedNumber: '2260',
    isPrimary: false,
  },
  {
    id: 'acc_eur',
    currency: 'EUR',
    name: 'Euro account',
    kind: 'multi-currency',
    balance: fromMajor(1250, 'EUR'),
    maskedNumber: '5518',
    isPrimary: false,
  },
];

/** USD-equivalent of every account combined — the "one balance" figure. */
export const mockTotalBalance = fromMajor(12450, 'USD');

export const mockAccountDetails: Record<string, AccountDetails> = {
  acc_usd: {
    accountId: 'acc_usd',
    holderName: 'Khaled Faiad',
    bankName: 'TPay Account',
    fields: [
      { label: 'Account number', value: 'DEMO •••• 4821', monospaced: true },
      { label: 'Routing number (ACH)', value: 'DEMO •••• 0142', monospaced: true },
      { label: 'SWIFT / BIC', value: 'DEMOUS33', monospaced: true },
      { label: 'Account type', value: 'Checking' },
      { label: 'Bank address', value: '1 Demo Plaza, New York, NY 10004' },
    ],
  },
};

export const mockTransactions: readonly Transaction[] = [
  {
    id: 'txn_1001',
    type: 'salary',
    direction: 'credit',
    description: 'August salary',
    amount: fromMajor(4500, 'USD'),
    // Payroll lands before month end; keeps salary at the head of the
    // activity list, as the approved Home screen shows it.
    occurredAt: '2026-08-20T09:00:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
    reference: 'TPY-SAL-4471',
  },
  {
    id: 'txn_1002',
    type: 'transfer',
    direction: 'debit',
    description: 'Ahmed Mansour',
    amount: fromMajor(850, 'USD'),
    occurredAt: '2026-08-18T14:22:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
    reference: 'TPY-TRF-9012',
  },
  {
    id: 'txn_1003',
    type: 'card',
    direction: 'debit',
    description: 'Netflix',
    amount: fromMajor(15.99, 'USD'),
    occurredAt: '2026-08-16T19:05:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
  },
  {
    id: 'txn_1004',
    type: 'fx',
    direction: 'debit',
    description: 'USD → SAR exchange',
    amount: fromMajor(1000, 'USD'),
    occurredAt: '2026-08-14T11:40:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
    reference: 'TPY-FX-3388',
  },
  {
    id: 'txn_1005',
    type: 'card',
    direction: 'debit',
    description: 'Careem',
    amount: fromMajor(24.5, 'USD'),
    occurredAt: '2026-08-13T08:12:00.000Z',
    status: 'pending',
    accountId: 'acc_usd',
  },
  {
    id: 'txn_1006',
    type: 'deposit',
    direction: 'credit',
    description: 'Added from DEMO •••• 3391',
    amount: fromMajor(600, 'USD'),
    occurredAt: '2026-07-28T16:30:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
  },
  {
    id: 'txn_1007',
    type: 'fee',
    direction: 'debit',
    description: 'International transfer fee',
    amount: fromMajor(3.5, 'USD'),
    occurredAt: '2026-07-22T10:02:00.000Z',
    status: 'completed',
    accountId: 'acc_usd',
  },
];

export const mockEmployment: Employment = {
  id: 'emp_acme_khaled',
  employer: {
    id: 'org_acme',
    name: 'Acme Technologies',
    initials: 'AT',
    country: 'Saudi Arabia',
    industry: 'Software',
  },
  jobTitle: 'Senior Product Designer',
  status: 'active',
  type: 'full-time',
  startDate: '2024-03-04',
  country: 'Saudi Arabia',
  contractStatus: 'signed',
  grossSalary: fromMajor(5400, 'USD'),
  payFrequency: 'monthly',
};

export const mockNextSalary: UpcomingSalary = {
  id: 'sal_2026_08',
  employerName: 'Acme Technologies',
  netAmount: fromMajor(4500, 'USD'),
  payDate: '2026-08-31',
  status: 'scheduled',
};

export const mockSalaryHistory: readonly SalaryRecord[] = [
  {
    id: 'sal_2026_07',
    period: 'July 2026',
    paidAt: '2026-07-31',
    gross: fromMajor(5400, 'USD'),
    net: fromMajor(4500, 'USD'),
    additions: [{ label: 'Base salary', amount: fromMajor(5400, 'USD'), category: 'allowance' }],
    deductions: [
      { label: 'Income tax', amount: fromMajor(540, 'USD'), category: 'tax' },
      { label: 'Social insurance', amount: fromMajor(270, 'USD'), category: 'social-insurance' },
      { label: 'Medical insurance', amount: fromMajor(90, 'USD'), category: 'benefit' },
    ],
    payslipId: 'pay_2026_07',
  },
  {
    id: 'sal_2026_06',
    period: 'June 2026',
    paidAt: '2026-06-30',
    gross: fromMajor(5400, 'USD'),
    net: fromMajor(4500, 'USD'),
    additions: [{ label: 'Base salary', amount: fromMajor(5400, 'USD'), category: 'allowance' }],
    deductions: [
      { label: 'Income tax', amount: fromMajor(540, 'USD'), category: 'tax' },
      { label: 'Social insurance', amount: fromMajor(270, 'USD'), category: 'social-insurance' },
      { label: 'Medical insurance', amount: fromMajor(90, 'USD'), category: 'benefit' },
    ],
    payslipId: 'pay_2026_06',
  },
];

export const mockCard: Card = {
  id: 'card_primary',
  format: 'physical',
  status: 'active',
  last4: '4429',
  holderName: 'Khaled Faiad',
  expiry: '09/29',
  network: 'visa',
  monthToDateSpend: fromMajor(412.75, 'USD'),
};

export const mockBenefits: readonly Benefit[] = [
  {
    id: 'ben_medical',
    category: 'medical-insurance',
    name: 'Medical insurance',
    provider: 'Bupa Arabia · Class A',
    status: 'active',
    icon: 'heart-pulse',
    summary: 'You, your spouse and two dependants are covered.',
  },
  {
    id: 'ben_health',
    category: 'health-insurance',
    name: 'Health insurance',
    provider: 'Acme group scheme',
    status: 'active',
    icon: 'shield-check',
    summary: 'Annual check-ups and specialist referrals included.',
  },
  {
    id: 'ben_social',
    category: 'social-insurance',
    name: 'Social insurance',
    provider: 'GOSI',
    status: 'active',
    icon: 'landmark',
    summary: 'Contributions filed monthly by Acme Technologies.',
  },
  {
    id: 'ben_wellness',
    category: 'wellness',
    name: 'Wellness allowance',
    provider: '$60 per month',
    status: 'active',
    icon: 'heart-pulse',
    summary: 'Gym, therapy and mindfulness apps.',
  },
  {
    id: 'ben_discounts',
    category: 'discounts',
    name: 'Employee discounts',
    provider: '120+ partners',
    status: 'active',
    icon: 'percent',
    summary: 'Retail, travel and food offers for Acme employees.',
  },
  {
    id: 'ben_financial',
    category: 'financial-services',
    name: 'Financial services',
    provider: 'TPay partners',
    status: 'pending',
    icon: 'landmark',
    summary: 'Guided financial planning sessions.',
  },
];
