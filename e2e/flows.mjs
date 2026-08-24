/**
 * End-to-end flows, run against a static web export of the app.
 *
 * The app is a React Native app; the web target exists so these flows can be
 * driven headlessly in CI. Each check taps what a person would tap and asserts
 * on what is actually visible.
 */
export const BASE_URL = process.env.TPAY_E2E_URL ?? 'http://localhost:4173';

/** Waits for the app shell to hydrate before the first interaction. */
const BOOT_MS = 2500;
const STEP_MS = 800;

/** Excludes anything inside a screen the navigator has hidden. */
const NOT_HIDDEN = ':not([aria-hidden="true"] *)';

export async function runFlows(page, log) {
  const results = [];

  /**
   * Inactive tab screens stay mounted and keep their layout — the navigator
   * marks them `aria-hidden` instead of removing them. Every query is scoped
   * to the screen the user is actually looking at, or a stale match on a
   * background screen would be clicked instead.
   */
  const onScreen = () => page.locator(NOT_HIDDEN);
  const visibleText = (needle) =>
    page.getByText(needle).and(onScreen()).filter({ visible: true }).first();
  const byTestId = (testId) =>
    page.locator(`[data-testid="${testId}"]${NOT_HIDDEN}`).filter({ visible: true }).first();

  const record = (name, ok) => {
    const url = page.url().replace(BASE_URL, '');
    results.push({ name, ok, url });
    log(`${ok ? 'PASS' : 'FAIL'}  ${name}  [${url}]`);
    return ok;
  };

  const check = async (name, needle) => {
    try {
      await visibleText(needle).waitFor({ state: 'visible', timeout: 6000 });
      return record(name, true);
    } catch {
      return record(name, false);
    }
  };

  /** Asserts on an element identified by testID rather than by its copy. */
  const checkId = async (name, testId) => {
    try {
      await byTestId(testId).waitFor({ state: 'visible', timeout: 6000 });
      return record(name, true);
    } catch {
      return record(name, false);
    }
  };

  const tapText = async (label) => {
    await visibleText(label).click({ timeout: 8000 });
    await page.waitForTimeout(STEP_MS);
  };
  const tapId = async (id) => {
    await byTestId(id).click({ timeout: 8000 });
    await page.waitForTimeout(STEP_MS);
  };

  /** Taps without waiting, for asserting on a state the app moves through. */
  const tapIdNow = async (id) => {
    await byTestId(id).click({ timeout: 8000 });
  };

  const checkUrl = async (name, fragment) => {
    try {
      await page.waitForURL((url) => url.pathname.includes(fragment), { timeout: 6000 });
      return record(name, true);
    } catch {
      return record(name, false);
    }
  };
  const back = async () => {
    const button = byTestId('screen-header-back');
    if (await button.count()) await button.click();
    else await page.goBack();
    await page.waitForTimeout(STEP_MS);
  };
  const goHome = async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(BOOT_MS);
  };

  await goHome();
  await check('Home renders the balance', 'TPAY BALANCE');

  // ---- Phase 1 regression: the five tabs and Home's deep links -------------
  for (const [id, label, expected] of [
    ['tab-wallet', 'Wallet', 'TPay Wallet'],
    ['tab-send', 'Send', 'Send money'],
    ['tab-benefits', 'Benefits', 'benefits active through'],
    ['tab-profile', 'Profile', 'Profile is not built yet'],
    ['tab-index', 'Home', 'TPAY BALANCE'],
  ]) {
    await tapId(id);
    await check(`tab → ${label}`, expected);
  }

  for (const [testId, label, expected] of [
    ['home-view-all', 'Transactions', 'transactions-search'],
    ['home-employer', 'My employer', 'Acme Technologies'],
    ['home-benefits', 'Benefits', 'benefits active through'],
  ]) {
    await tapId(testId);
    if (expected.includes(' ')) await check(`Home → ${label}`, expected);
    else await checkId(`Home → ${label}`, expected);
    await back();
    await check(`back from ${label}`, 'TPAY BALANCE');
  }

  for (const [label, expected] of [
    ['Manage', 'TPay Card is not built yet'],
    ['Need something from HR?', 'Employment letter · bank use'],
    ['Next salary · Acme Technologies', 'Payroll cycle open'],
  ]) {
    await tapText(label);
    await check(`Home → ${label}`, expected);
    await back();
    await check(`back from ${label}`, 'TPAY BALANCE');
  }

  // ---- Phase 2: the money journey the brief asks to verify ----------------
  await tapId('tab-wallet');
  await check('Home → Wallet', 'TPAY BALANCE · USD EQUIVALENT');
  await check('Wallet lists every currency account', 'Egyptian Pound');
  await check('Wallet offers an additional currency', 'Open a GBP wallet');

  await tapId('wallet-account-details');
  await check('Wallet → Account details', 'Share these details to receive salary');
  await check('Account details show an IBAN', 'IBAN');
  await tapId('copy-iban');
  await check('Copying a field confirms', 'Copied to clipboard');
  await back();
  await check('back to Wallet', 'TPAY BALANCE · USD EQUIVALENT');

  await tapId('account-row-acc_usd');
  await check('Wallet → USD account', 'Available balance');
  await check('Account shows its own activity', 'USD activity');

  await tapId('account-details-link');
  await check('Account → Account details', 'Share these details to receive salary');
  await back();
  await check('back to the account', 'Available balance');

  await tapId('account-deposit');
  await check('Account → Add money', 'How to deposit');
  await check('Add money offers a bank transfer', 'Bank transfer');
  await check('Add money names TPay as the beneficiary', 'Add TPay as a new beneficiary');
  await back();

  await tapId('account-exchange');
  await check('Account → Exchange', 'Rate expires in');
  await check('Exchange quotes a live rate', 'TPay uses the live mid-market rate');
  await back();
  await check('back to the account', 'Available balance');

  await tapId('account-view-all');
  await checkId('Account → Transactions', 'transactions-search');
  await check('Transactions group by month', 'AUGUST 2026');

  await tapId('filter-salary');
  await check('Filtering to Salary keeps the salary row', 'August salary');
  await tapId('filter-card');
  await check('Filtering to Card keeps a card payment', 'Netflix');
  await tapId('filter-all');

  await tapText('Ahmed Mansour');
  await check('Transactions → Transaction detail', 'Transfer to Ahmed Mansour');
  await check('Receipt shows the exchange rate', '1 USD = 3.6725 AED');
  await check('Receipt shows the reference', 'TPY-8842-KF19');
  await back();
  await checkId('back to Transactions', 'transactions-search');

  // Failed transfers read as failed, not as money that left the account.
  await tapText('Sara Mahmoud');
  await check('A failed transfer explains itself', 'The recipient bank rejected the transfer');
  await back();

  // ---- Search and its empty state ----------------------------------------
  await byTestId('transactions-search').fill('netflix');
  await page.waitForTimeout(1200);
  await check('Search narrows the list', 'Netflix');
  await byTestId('transactions-search').fill('zzzz');
  await page.waitForTimeout(1200);
  await check('Search shows an empty state', 'Nothing matches that');

  // ---- Exchange actually moves money -------------------------------------
  await goHome();
  await tapId('tab-wallet');
  await tapId('wallet-exchange');
  await check('Wallet → Exchange', 'Rate expires in');

  await byTestId('exchange-from').fill('100');
  await page.waitForTimeout(1500);
  await check('Exchange prices the conversion', 'SAR 374.75');
  await check('Exchange shows what leaves the account', 'Total from your account');
  await tapId('exchange-confirm');
  await page.waitForTimeout(1500);
  await check('Confirming an exchange confirms in words', 'Exchanged —');
  await check('Exchange returns to the Wallet', 'TPAY BALANCE · USD EQUIVALENT');
  await check('The SAR balance grew', 'SAR 15,574.75');
  await check('The USD balance paid the amount plus the spread', '$8,149.75');

  // ---- Back navigation out of a deep route -------------------------------
  await goHome();
  await tapId('home-view-all');
  await checkId('Home → Transactions', 'transactions-search');
  await tapText('Netflix');
  await check('Transactions → Transaction detail', 'Card payment · Netflix');
  await back();
  await back();
  await check('back reaches Home', 'TPAY BALANCE');

  await runWorkFlows({
    check,
    checkId,
    tapText,
    tapId,
    back,
    goHome,
    byTestId,
    page,
  });

  await runSendFlows({
    check,
    checkId,
    checkUrl,
    tapText,
    tapId,
    tapIdNow,
    back,
    goHome,
    byTestId,
    page,
  });

  return results;
}

/**
 * Phase 4 — Employment and employee services.
 *
 * Salary, employment, benefits, documents and requests, reached the way a
 * person reaches them: from Home, from the employer screen, and from the
 * Benefits tab.
 */
async function runWorkFlows({ check, checkId, tapText, tapId, back, goHome, byTestId, page }) {
  await goHome();
  const home = async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await byTestId('tab-index').count()) break;
      await back();
    }
    await tapId('tab-index');
  };

  // ---- Salary --------------------------------------------------------------
  await tapText('Next salary · Acme Technologies');
  await check('Home → Salary', 'NEXT SALARY');
  await check('Salary shows the payroll cycle', 'Payroll cycle open');
  await check('Salary counts down to payday', 'days to go');
  await check('Salary lists what has been paid', 'Salary history');
  await check('Salary history shows each period', 'June 2026');
  await check('A bonus month says so', 'includes $500 bonus');

  await tapId('salary-breakdown');
  await check('Salary → breakdown', 'NET RECEIVED');
  await check('The breakdown starts from gross', 'Gross salary');
  await check('It itemises income tax', 'Income tax');
  await check('It itemises social insurance', 'Social insurance (GOSI)');
  await check('It itemises medical insurance', 'Medical insurance');
  await check('It ends at what reached the wallet', 'Net received');
  await check('Gross less deductions is the net', '$4,500.00');

  await tapId('salary-view-payslip');
  await check('Breakdown → Payslips', 'Verified by TPay');
  await check('The latest payslip leads', 'July 2026');
  await check('Earlier payslips follow', 'EARLIER');
  await tapId('payslip-view');
  await check('Payslips → a payslip breakdown', 'NET RECEIVED');
  await back();
  await back();
  await back();
  await check('back reaches Salary', 'NEXT SALARY');

  await tapId('salary-payslips');
  await check('Salary → Payslips directly', 'Verified by TPay');
  await back();

  // ---- Employment ----------------------------------------------------------
  await home();
  await tapId('home-employer');
  await check('Home → My employer', 'Active employee');
  await check('The employer screen names the role', 'Senior Product Designer');
  await check('It shows when employment started', 'Employed since');
  await check('Talento appears as the account manager, not the brand', 'Talento account manager');

  await tapId('employment-details');
  await check('Employer → Employment details', 'EMPLOYMENT');
  await check('It names the legal employer', 'Talento EOR KSA');
  await check('It shows the contract status', 'Signed · active');
  await check('It groups compensation separately', 'COMPENSATION');
  await check('It states the pay schedule', 'Monthly · last working day');
  await back();
  await check('back reaches the employer', 'Active employee');

  // ---- Documents -----------------------------------------------------------
  await tapId('employer-documents');
  await check('Employer → Documents', 'Employment contract');
  await check('Documents show an identification permit', 'Iqama · residence permit');
  await check('Documents can be filtered', 'Payroll');
  await tapId('filter-payroll');
  await check('Filtering to payroll keeps payslips', 'Payslips 2026');
  await tapId('filter-tax');
  await check('A document still being prepared says so', 'Not ready');
  await tapId('filter-all');
  await back();

  // ---- Requests ------------------------------------------------------------
  await tapId('employer-requests');
  await check('Employer → Requests', 'Employment letter · bank use');
  await check('A request shows where it has got to', 'Processing');
  await check('A request needing you is called out', 'Action needed');
  await check('It says what it needs', 'We need the receipt');
  await check('Completed requests are listed apart', 'COMPLETED');

  await tapId('request-action-REQ-4102');
  await page.waitForTimeout(1400);
  await check('Supplying what HR asked for confirms', 'back with HR');

  await tapId('requests-new');
  await check('Requests → New request', 'What do you need?');
  await check('It offers an employment letter', 'For banks & embassies');
  await byTestId('request-addressed-to').fill('Emirates NBD — account opening');
  await tapId('request-submit');
  await page.waitForTimeout(1600);
  await check('Submitting a request confirms with a reference', 'Request submitted — REQ-');
  await check('The new request is listed', 'Employment letter · Emirates NBD');

  // ---- Benefits ------------------------------------------------------------
  await home();
  await tapId('tab-benefits');
  await check('Benefits names the employer providing them', 'benefits active through');
  await check('Medical insurance leads', 'Medical insurance');
  await check('Social insurance is listed', 'Social insurance · GOSI');
  await check('Financial services are listed', 'Financial services');
  await check('A wellness allowance is listed', 'Wellness allowance');
  await check('An ineligible benefit says so', 'Not eligible');

  await tapId('benefit-ben_medical');
  await check('Benefits → Medical insurance', 'MEMBER ID');
  await check('It shows the coverage limit', 'SAR 500,000 / year');
  await check('It shows who is covered', 'You + 2 dependents');
  await check('It offers the policy document', 'Policy document');
  await back();

  await tapId('benefit-ben_discounts');
  await check('An ineligible benefit explains why', 'Not available yet');
  await check('It says when it unlocks', '12 months of service');
  await back();

  await tapId('benefit-ben_wellness');
  await check('An allowance shows what is left', 'Remaining this quarter');
  await back();
  await check('back reaches Benefits', 'benefits active through');
}

/**
 * Phase 3 — Send Money.
 *
 * Walks the whole flow the way a person does: pick how to address the
 * recipient, enter their details, choose which wallet pays, enter an amount,
 * read the review, confirm, and land on success or failure. Balances are
 * checked afterwards, because the point of a transfer is that money moved.
 */
async function runSendFlows({
  check,
  checkUrl,
  tapText,
  tapId,
  tapIdNow,
  back,
  goHome,
  byTestId,
  page,
}) {
  // Reloading the page resets the mock store, so these flows reload once at
  // the start and then navigate only through the app — otherwise a balance
  // assertion would be checking a wallet that was silently reset.
  await goHome();
  /**
   * Returns to Home without reloading. Pushed routes such as Transactions
   * sit above the tab bar, so unwind to the tabs before switching.
   */
  const home = async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await byTestId('tab-index').count()) break;
      await back();
    }
    await tapId('tab-index');
  };

  // ---- A bank transfer that crosses currencies -----------------------------
  await tapId('tab-send');
  await check('Send hub lists the ways to pay', 'Bank account');
  await check('Send hub shows what is available', 'From your TPay balance');
  await check('Send hub shows recent recipients', 'RECENT RECIPIENTS');

  await tapId('send-method-bank-account');
  await check('Send → Recipient', 'Step 1 of 3');
  await byTestId('recipient-name').fill('Nour Adel');
  await byTestId('recipient-handle').fill('EG38 0019 0005 0000 0002 2600 1');
  await tapId('recipient-country');
  await tapId('recipient-country');
  await check('Country picker cycles to Egypt', 'Egypt');
  await tapId('recipient-continue');

  await check('Recipient → Amount', 'Step 2 of 3');
  await check('Amount names the recipient', 'to Nour Adel');
  await byTestId('send-amount').fill('1000');
  await page.waitForTimeout(1600);
  await check('Amount shows what the recipient receives', 'Nour receives ≈ EGP');
  await check('Amount shows which wallet pays', 'Pay from US Dollar account');
  await check('Amount locks a rate', 'Rate · 1 USD = 48.6000 EGP');

  await tapId('send-review');
  await check('Amount → Review', 'Step 3 of 3');
  await check('Review shows the amount sent', 'You send');
  await check('Review shows the fee', 'Transfer fee');
  await check('Review shows the total debited', 'Total debited');
  await check('Review shows what the recipient receives', 'Recipient receives');
  await check('Review shows the FX rate', 'Exchange rate');
  await check('Review shows the delivery estimate', '1–2 business days');
  await check('Review states the total, fee included', '$1,002.50');

  await tapIdNow('send-confirm');
  await checkUrl('Review → Processing', '/send/processing');
  await page.waitForTimeout(2500);
  await check('Processing → Success', 'Money sent');
  await check('Success reports the total debited', '$1,002.50');
  await check('A bank payout is still processing', 'Processing');

  await tapId('send-done');
  await check('Done returns Home', 'TPAY BALANCE');

  await tapId('tab-wallet');
  await check('The USD wallet paid the amount plus the fee', '$7,247.50');

  // ---- The transfer reaches the ledger ------------------------------------
  await home();
  await tapId('home-view-all');
  await check('The transfer appears in Transactions', 'Nour Adel');
  await tapText('Nour Adel');
  await check('Its receipt shows the recipient bank', 'Banque Misr');
  await check('Its receipt shows what was converted', 'Recipient receives');
  await back();

  // ---- A failed transfer must not move money ------------------------------
  await home();
  await tapId('tab-send');
  await tapId('recent-recipient-rcp_sara');
  await check('A recent recipient skips straight to the amount', 'Step 2 of 3');
  await byTestId('send-amount').fill('100');
  await page.waitForTimeout(1600);
  await tapId('send-review');
  await tapId('send-simulate-failure');
  await page.waitForTimeout(2200);
  await check('A rejected transfer says so', 'Transfer failed');
  await check('It names the error', 'RECIPIENT_REJECTED');
  await check('It reassures about the balance', 'Your balance is unchanged');

  await tapId('send-failed-home');
  await check('Failure returns Home', 'TPAY BALANCE');
  await tapId('tab-wallet');
  await check('The balance really did not move', '$7,247.50');

  // ---- Sending from a non-USD wallet --------------------------------------
  await home();
  await tapId('tab-send');
  await tapId('recent-recipient-rcp_mostafa');
  await check('Mobile wallet recipient opens the amount step', 'Step 2 of 3');
  await tapId('send-source-account');
  await check('The source picker lists every wallet', 'Saudi Riyal');
  await tapText('Saudi Riyal');
  await check('The wallet paying is now SAR', 'Pay from Saudi Riyal account');
  await byTestId('send-amount').fill('500');
  await page.waitForTimeout(1600);
  await check('SAR → EGP is priced', 'Mostafa receives ≈ EGP');
  await tapId('send-review');
  await check('The review is in the source currency', 'SAR 500');
  await check('A mobile wallet arrives in minutes', 'Arrives in minutes');
  await tapId('send-confirm');
  await page.waitForTimeout(2200);
  await check('The SAR transfer succeeds', 'Money sent');

  await tapId('send-done');
  await tapId('tab-wallet');
  await check('The SAR wallet paid for it', 'SAR 14,694.38');

  // ---- An instant TPay-to-TPay send ---------------------------------------
  await home();
  await tapId('tab-send');
  await tapId('recent-recipient-rcp_ahmed');
  await byTestId('send-amount').fill('50');
  await page.waitForTimeout(1600);
  await tapId('send-review');
  await check('Sending to a TPay user arrives instantly', 'Arrives instantly');
  await check('There is no fee to another TPay user', 'Transfer fee');
  await check('So the total debited is just the amount', '$50.00');
  await tapId('send-confirm');
  await page.waitForTimeout(2200);
  await check('The instant transfer completes', 'Money sent');
  await check('It is completed, not processing', 'Completed');

  // ---- Transfer detail ----------------------------------------------------
  await tapText('View transfer');
  await check('Success → Transfer detail', 'To Ahmed Mansour');
  await check('The detail shows the payout route', 'TPay balance');
  await check('The detail shows the reference', 'Reference');
  await back();
  await check('Back returns to the success screen', 'Money sent');
}
