/**
 * Demo data for the mock service adapters.
 *
 * Fictional throughout — no real people, no real bank coordinates. Account
 * numbers are masked tails only, prefixed DEMO wherever a full string is
 * needed. Nothing in this file may be imported by a component: the UI reads
 * data through the services in `src/services`.
 */
import { fromMajor } from '@/types';
import { formatMoney } from '@/utils';
import type {
  Account,
  AccountDetails,
  Benefit,
  Card,
  EmployeeDocument,
  EmployeeRequest,
  Employment,
  Payslip,
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
    shortName: 'US Dollar',
    kind: 'salary',
    balance: fromMajor(8250, 'USD'),
    maskedNumber: '4821',
    isPrimary: true,
  },
  {
    id: 'acc_sar',
    currency: 'SAR',
    name: 'Saudi Riyal account',
    shortName: 'Saudi Riyal',
    kind: 'local',
    balance: fromMajor(15200, 'SAR'),
    maskedNumber: '1093',
    isPrimary: false,
  },
  {
    id: 'acc_aed',
    currency: 'AED',
    name: 'UAE Dirham account',
    shortName: 'UAE Dirham',
    kind: 'benefit',
    balance: fromMajor(4500, 'AED'),
    maskedNumber: '7734',
    isPrimary: false,
  },
  {
    id: 'acc_egp',
    currency: 'EGP',
    name: 'Egyptian Pound account',
    shortName: 'Egyptian Pound',
    kind: 'local',
    balance: fromMajor(75000, 'EGP'),
    maskedNumber: '2260',
    isPrimary: false,
  },
  {
    id: 'acc_eur',
    currency: 'EUR',
    name: 'Euro account',
    shortName: 'Euro',
    kind: 'multi-currency',
    balance: fromMajor(1250, 'EUR'),
    maskedNumber: '5518',
    isPrimary: false,
  },
];

/**
 * Shareable receiving coordinates, one set per currency account.
 * Every value is masked or clearly marked DEMO — these are not real bank
 * coordinates and must never be replaced with real ones in this repository.
 */
export const mockAccountDetails: Record<string, AccountDetails> = {
  acc_usd: {
    accountId: 'acc_usd',
    holderName: 'Khaled Faiad',
    bankName: 'TPay Account · partner bank',
    bankAddress: 'Dubai, United Arab Emirates',
    fields: [
      { label: 'Account holder', value: 'Khaled Faiad' },
      { label: 'IBAN', value: 'DEMO AE07 0331 2345 6789 0123 456', monospaced: true },
      { label: 'Account number', value: 'DEMO •••• 4821', monospaced: true },
      { label: 'SWIFT / BIC', value: 'DEMOAEAD', monospaced: true },
      { label: 'Routing number (ACH)', value: 'DEMO •••• 3150', monospaced: true },
    ],
  },
  acc_sar: {
    accountId: 'acc_sar',
    holderName: 'Khaled Faiad',
    bankName: 'TPay Account · partner bank',
    bankAddress: 'Riyadh, Saudi Arabia',
    fields: [
      { label: 'Account holder', value: 'Khaled Faiad' },
      { label: 'IBAN', value: 'DEMO SA03 8000 0000 6080 1093 4210', monospaced: true },
      { label: 'Account number', value: 'DEMO •••• 1093', monospaced: true },
      { label: 'SWIFT / BIC', value: 'DEMOSARI', monospaced: true },
    ],
  },
  acc_aed: {
    accountId: 'acc_aed',
    holderName: 'Khaled Faiad',
    bankName: 'TPay Account · partner bank',
    bankAddress: 'Dubai, United Arab Emirates',
    fields: [
      { label: 'Account holder', value: 'Khaled Faiad' },
      { label: 'IBAN', value: 'DEMO AE45 0331 9988 7734 0011 220', monospaced: true },
      { label: 'Account number', value: 'DEMO •••• 7734', monospaced: true },
      { label: 'SWIFT / BIC', value: 'DEMOAEAD', monospaced: true },
    ],
  },
  acc_egp: {
    accountId: 'acc_egp',
    holderName: 'Khaled Faiad',
    bankName: 'TPay Account · partner bank',
    bankAddress: 'Cairo, Egypt',
    fields: [
      { label: 'Account holder', value: 'Khaled Faiad' },
      { label: 'IBAN', value: 'DEMO EG38 0019 0005 0000 0002 2600 1', monospaced: true },
      { label: 'Account number', value: 'DEMO •••• 2260', monospaced: true },
      { label: 'SWIFT / BIC', value: 'DEMOEGCX', monospaced: true },
    ],
  },
  acc_eur: {
    accountId: 'acc_eur',
    holderName: 'Khaled Faiad',
    bankName: 'TPay Account · partner bank',
    bankAddress: 'Dublin, Ireland',
    fields: [
      { label: 'Account holder', value: 'Khaled Faiad' },
      { label: 'IBAN', value: 'DEMO IE29 AIBK 9311 5212 3455 18', monospaced: true },
      { label: 'Account number', value: 'DEMO •••• 5518', monospaced: true },
      { label: 'SWIFT / BIC', value: 'DEMOIE2D', monospaced: true },
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
    counterpartyBank: 'Acme Technologies payroll',
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
    reference: 'TPY-8842-KF19',
    counterpartyBank: 'Emirates NBD',
    fee: fromMajor(2.5, 'USD'),
    fxRate: { from: 'USD', to: 'AED', rate: 3.6725 },
    counterAmount: fromMajor(3121.63, 'AED'),
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
    fee: fromMajor(2.5, 'USD'),
    fxRate: { from: 'USD', to: 'SAR', rate: 3.7475 },
    counterAmount: fromMajor(3738.13, 'SAR'),
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
    id: 'txn_1008',
    type: 'transfer',
    direction: 'debit',
    description: 'Sara Mahmoud',
    amount: fromMajor(300, 'USD'),
    occurredAt: '2026-08-11T09:47:00.000Z',
    status: 'failed',
    accountId: 'acc_usd',
    reference: 'TPY-TRF-7710',
    counterpartyBank: 'Banque Misr',
    failureReason: 'The recipient bank rejected the transfer. No money left your account.',
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
    reference: 'TPY-FEE-1180',
  },
  {
    id: 'txn_2001',
    type: 'fx',
    direction: 'credit',
    description: 'USD → SAR exchange',
    amount: fromMajor(3738.13, 'SAR'),
    occurredAt: '2026-08-14T11:40:00.000Z',
    status: 'completed',
    accountId: 'acc_sar',
    reference: 'TPY-FX-3388',
    fxRate: { from: 'USD', to: 'SAR', rate: 3.7475 },
  },
  {
    id: 'txn_2002',
    type: 'card',
    direction: 'debit',
    description: 'Jarir Bookstore',
    amount: fromMajor(410, 'SAR'),
    occurredAt: '2026-08-12T17:20:00.000Z',
    status: 'completed',
    accountId: 'acc_sar',
  },
];

export const mockEmployment: Employment = {
  id: 'emp_acme_khaled',
  employer: {
    id: 'org_acme',
    name: 'Acme Technologies',
    initials: 'AT',
    country: 'Saudi Arabia',
    location: 'Riyadh, Saudi Arabia',
    industry: 'Software',
  },
  jobTitle: 'Senior Product Designer',
  status: 'active',
  type: 'full-time',
  startDate: '2024-03-14',
  country: 'Saudi Arabia',
  contractStatus: 'signed',
  contractSignedAt: '2024-03-14',
  grossSalary: fromMajor(5900, 'USD'),
  payFrequency: 'monthly',
  payScheduleLabel: 'Monthly · last working day',
  // Talento is the employer of record; Acme is who the employee works for.
  legalEmployer: 'Talento EOR KSA',
  department: 'Design',
  accountManager: {
    name: 'Layla Nasser',
    initials: 'LN',
    role: 'Your Talento account manager',
  },
};

export const mockNextSalary: UpcomingSalary = {
  id: 'sal_2026_08',
  employerName: 'Acme Technologies',
  netAmount: fromMajor(4500, 'USD'),
  payDate: '2026-08-31',
  cycleStartDate: '2026-08-01',
  status: 'scheduled',
};

/**
 * Standard monthly deductions. Broken out so each pay run reads the same way
 * and a bonus month differs only where it should.
 */
function standardDeductions(): SalaryRecord['deductions'] {
  return [
    { label: 'Income tax', amount: fromMajor(650, 'USD'), category: 'tax' },
    { label: 'Social insurance (GOSI)', amount: fromMajor(472, 'USD'), category: 'social-insurance' },
    { label: 'Medical insurance', amount: fromMajor(185, 'USD'), category: 'benefit' },
    { label: 'Other deductions', amount: fromMajor(93, 'USD'), category: 'deduction' },
  ];
}

export const mockSalaryHistory: readonly SalaryRecord[] = [
  {
    id: 'sal_2026_07',
    period: 'July 2026',
    paidAt: '2026-07-31',
    gross: fromMajor(5900, 'USD'),
    net: fromMajor(4500, 'USD'),
    additions: [{ label: 'Base salary', amount: fromMajor(5900, 'USD'), category: 'allowance' }],
    deductions: standardDeductions(),
    payslipId: 'pay_2026_07',
    paidToAccountId: 'acc_usd',
    transactionId: 'txn_1001',
  },
  {
    id: 'sal_2026_06',
    period: 'June 2026',
    paidAt: '2026-06-30',
    gross: fromMajor(6400, 'USD'),
    net: fromMajor(5000, 'USD'),
    additions: [
      { label: 'Base salary', amount: fromMajor(5900, 'USD'), category: 'allowance' },
      { label: 'Performance bonus', amount: fromMajor(500, 'USD'), category: 'bonus' },
    ],
    deductions: standardDeductions(),
    payslipId: 'pay_2026_06',
    paidToAccountId: 'acc_usd',
    note: 'includes $500 bonus',
  },
  {
    id: 'sal_2026_05',
    period: 'May 2026',
    paidAt: '2026-05-31',
    gross: fromMajor(5900, 'USD'),
    net: fromMajor(4500, 'USD'),
    additions: [{ label: 'Base salary', amount: fromMajor(5900, 'USD'), category: 'allowance' }],
    deductions: standardDeductions(),
    payslipId: 'pay_2026_05',
    paidToAccountId: 'acc_usd',
  },
  {
    id: 'sal_2026_04',
    period: 'April 2026',
    paidAt: '2026-05-02',
    gross: fromMajor(5900, 'USD'),
    net: fromMajor(4500, 'USD'),
    additions: [{ label: 'Base salary', amount: fromMajor(5900, 'USD'), category: 'allowance' }],
    deductions: standardDeductions(),
    payslipId: 'pay_2026_04',
    paidToAccountId: 'acc_usd',
    note: '2 days late',
  },
];

export const mockPayslips: readonly Payslip[] = mockSalaryHistory.map((record) => ({
  id: record.payslipId!,
  salaryId: record.id,
  period: record.period,
  net: record.net,
  issuedAt: record.paidAt,
  verified: true,
  documentId: `doc_${record.payslipId}`,
}));

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
    icon: 'shield-check',
    summary: 'Bupa Arabia Class A · you and 2 dependents are covered until 31 Dec 2026.',
    featured: true,
    coverage: {
      memberName: 'Khaled Faiad',
      memberId: 'BA-9920-4471',
      validUntil: '2026-12-31',
      startsOn: '2026-01-01',
      rows: [
        { label: 'Provider', value: 'Bupa Arabia' },
        { label: 'Coverage', value: 'SAR 500,000 / year' },
        { label: 'Covered', value: 'You + 2 dependents' },
        { label: 'Start date', value: '1 Jan 2026' },
        { label: 'Dental & optical', value: 'Included', highlight: true },
      ],
      documentId: 'doc_policy_2026',
    },
  },
  {
    id: 'ben_uae_account',
    category: 'financial-services',
    name: 'UAE bank account',
    provider: 'TPay',
    status: 'active',
    icon: 'landmark',
    summary: 'Your AED account is ready to use.',
    statusLabel: 'Ready',
  },
  {
    id: 'ben_social',
    category: 'social-insurance',
    name: 'Social insurance · GOSI',
    provider: 'GOSI',
    status: 'active',
    icon: 'globe',
    summary: 'Contributions up to date, filed monthly by Acme Technologies.',
  },
  {
    id: 'ben_financial',
    category: 'financial-services',
    name: 'Financial services',
    provider: 'TPay',
    status: 'active',
    icon: 'wallet',
    summary: 'TPay account, card and free FX on salary.',
  },
  {
    id: 'ben_wellness',
    category: 'wellness',
    name: 'Wellness allowance',
    provider: 'Acme Technologies',
    status: 'active',
    icon: 'heart-pulse',
    summary: '$120 of $150 remaining this quarter.',
    allowance: {
      remaining: fromMajor(120, 'USD'),
      total: fromMajor(150, 'USD'),
      periodLabel: 'this quarter',
    },
  },
  {
    id: 'ben_discounts',
    category: 'discounts',
    name: 'Employee discounts',
    provider: 'Acme partners',
    status: 'not-eligible',
    icon: 'percent',
    summary: 'Unlocks after 12 months of service.',
    unavailableReason: 'You become eligible on 14 March 2025, after 12 months of service.',
  },
  {
    id: 'ben_health',
    category: 'health-insurance',
    name: 'Health screening',
    provider: 'Acme group scheme',
    status: 'active',
    icon: 'heart-pulse',
    summary: 'Annual check-ups and specialist referrals included.',
  },
];

/**
 * Employment, payroll and insurance paperwork.
 *
 * These are records of documents, not the documents themselves — TPay has no
 * document store yet, so nothing here points at a real file.
 */
export const mockDocuments: readonly EmployeeDocument[] = [
  {
    id: 'doc_contract',
    title: 'Employment contract',
    subtitle: 'Signed 14 Mar 2024',
    category: 'employment',
    status: 'signed',
    format: 'pdf',
    issuedAt: '2024-03-14',
    fileSizeKb: 284,
  },
  {
    id: 'doc_iqama',
    title: 'Iqama · residence permit',
    subtitle: 'Expires 12 Feb 2027',
    category: 'identification',
    status: 'valid',
    format: 'pdf',
    issuedAt: '2024-02-12',
    expiresAt: '2027-02-12',
    fileSizeKb: 96,
  },
  {
    id: 'doc_medical_card',
    title: 'Medical insurance card',
    subtitle: 'Bupa Arabia · 2026',
    category: 'insurance',
    status: 'active',
    format: 'pdf',
    issuedAt: '2026-01-01',
    expiresAt: '2026-12-31',
    fileSizeKb: 142,
  },
  {
    id: 'doc_salary_certificate',
    title: 'Salary certificate',
    subtitle: 'Issued 4 Aug 2026',
    category: 'employment',
    status: 'issued',
    format: 'pdf',
    issuedAt: '2026-08-04',
    fileSizeKb: 88,
  },
  {
    id: 'doc_payslips_2026',
    title: 'Payslips 2026',
    subtitle: `${mockPayslips.length} documents`,
    category: 'payroll',
    status: 'active',
    format: 'bundle',
    issuedAt: '2026-08-01',
    itemCount: mockPayslips.length,
    opensRoute: 'payslips',
  },
  {
    id: 'doc_policy_2026',
    title: 'Policy document 2026',
    subtitle: 'Network hospitals & claim rules',
    category: 'benefits',
    status: 'active',
    format: 'pdf',
    issuedAt: '2026-01-01',
    fileSizeKb: 1240,
  },
  {
    id: 'doc_zakat_2025',
    title: 'Tax certificate 2025',
    subtitle: 'Being prepared by payroll',
    category: 'tax',
    status: 'unavailable',
    format: 'pdf',
    issuedAt: '2026-01-31',
    unavailableReason: 'Your 2025 tax certificate is still being prepared. It usually lands in February.',
  },
  ...mockPayslips.map<EmployeeDocument>((payslip) => ({
    id: payslip.documentId,
    title: `Payslip · ${payslip.period}`,
    subtitle: `Net ${formatMoney(payslip.net)}`,
    category: 'payroll',
    status: 'issued',
    format: 'pdf',
    issuedAt: payslip.issuedAt,
    fileSizeKb: 64,
    parentId: 'doc_payslips_2026',
  })),
];

/** Requests the employee has open with HR, newest first. */
export const mockRequests: readonly EmployeeRequest[] = [
  {
    id: 'req_4187',
    reference: 'REQ-4187',
    type: 'employment-letter',
    title: 'Employment letter · bank use',
    status: 'processing',
    submittedAt: '2026-08-17T10:12:00.000Z',
    addressedTo: 'Emirates NBD — account opening',
  },
  {
    id: 'req_4102',
    reference: 'REQ-4102',
    type: 'reimbursement',
    title: 'Expense reimbursement · $310',
    status: 'action-required',
    submittedAt: '2026-08-02T08:40:00.000Z',
    amount: fromMajor(310, 'USD'),
    actionNeeded: 'We need the receipt for your 12 Aug client dinner to process this claim.',
  },
  {
    id: 'req_4061',
    reference: 'REQ-4061',
    type: 'employment-letter',
    title: 'Employment letter',
    status: 'completed',
    submittedAt: '2026-08-01T09:00:00.000Z',
    completedAt: '2026-08-06T14:30:00.000Z',
    resultDocumentId: 'doc_salary_certificate',
  },
  {
    id: 'req_3990',
    reference: 'REQ-3990',
    type: 'reimbursement',
    title: 'Expense reimbursement · $240',
    status: 'completed',
    submittedAt: '2026-07-20T11:15:00.000Z',
    completedAt: '2026-07-28T10:00:00.000Z',
    amount: fromMajor(240, 'USD'),
    note: 'Paid 28 Jul',
  },
];
