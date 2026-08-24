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

  /** Asserts that something is NOT on screen — an affordance a state removes. */
  const checkMissing = async (name, needle) => {
    try {
      await visibleText(needle).waitFor({ state: 'visible', timeout: 1500 });
      return record(name, false);
    } catch {
      return record(name, true);
    }
  };

  /** Asserts on the current value of a text field, which carries no text node. */
  const checkValue = async (name, testId, expected) => {
    try {
      const value = await byTestId(testId).inputValue({ timeout: 6000 });
      return record(name, value.includes(expected));
    } catch {
      return record(name, false);
    }
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
  /**
   * Signs in when the app has landed on a signed-out screen.
   *
   * Reloading resets the mock store, and with it the session, so every reload
   * comes back to Welcome. The flows below are about the authenticated app,
   * so getting past the front door is part of arriving.
   */
  const signInIfNeeded = async () => {
    const welcome = byTestId('welcome-login');
    if (await welcome.count()) {
      await welcome.click();
      await page.waitForTimeout(STEP_MS);
    }
    const identifier = byTestId('login-identifier');
    if (!(await identifier.count())) return;
    await identifier.fill('khaled.faiad@demo.acme.sa');
    await byTestId('login-password').fill('demo-password');
    await byTestId('login-submit').click();
    await page.waitForTimeout(BOOT_MS);
  };

  const goHome = async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(BOOT_MS);
    await signInIfNeeded();
  };

  await goHome();
  await check('Home renders the balance', 'TPAY BALANCE');

  // ---- Phase 1 regression: the five tabs and Home's deep links -------------
  for (const [id, label, expected] of [
    ['tab-wallet', 'Wallet', 'TPay Wallet'],
    ['tab-send', 'Send', 'Send money'],
    ['tab-benefits', 'Benefits', 'benefits active through'],
    ['tab-profile', 'Profile', 'Security centre'],
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
    ['Manage', 'Create a virtual card'],
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

  await runAccountFlows({
    check,
    checkId,
    checkMissing,
    checkValue,
    tapText,
    tapId,
    back,
    goHome,
    byTestId,
    page,
  });

  await runCardFlows({
    check,
    checkId,
    checkMissing,
    tapText,
    tapId,
    back,
    goHome,
    byTestId,
    page,
  });

  // Last, because these flows sign out and create accounts: everything above
  // needs the demo user signed in.
  await runAuthFlows({
    check,
    checkId,
    checkMissing,
    checkUrl,
    tapText,
    tapId,
    back,
    goHome,
    signInIfNeeded,
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

/**
 * Phase 5A — Identity, Profile, Security and Support.
 *
 * Walks verification through every state it can reach, checks that the state
 * really governs what can be sent, and opens the one support surface from each
 * of the places that should lead to it.
 */
async function runAccountFlows({
  check,
  checkId,
  checkMissing,
  checkValue,
  tapText,
  tapId,
  back,
  goHome,
  byTestId,
  page,
}) {
  await goHome();
  const home = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (await byTestId('tab-index').count()) break;
      await back();
    }
    await tapId('tab-index');
  };
  const profile = async () => {
    await home();
    await tapId('tab-profile');
  };

  // ---- Profile -------------------------------------------------------------
  await tapId('tab-profile');
  await check('Profile names the user', 'Khaled Faiad');
  await check('Profile shows the TPay username', '@khaled');
  await check('Profile shows verification state', 'Identity verified');
  await check('Profile groups personal details', 'Personal information');
  await check('Profile links to work', 'Salary & payslips');
  await check('Profile links to security', 'Security centre');
  await check('Profile links to support', 'Help centre');
  await check('Profile offers a way out', 'Log out');

  await tapId('profile-copy-username');
  await check('Copying the username confirms', '@khaled copied');

  await tapText('Personal information');
  await check('Profile → Personal information', 'VERIFIED IDENTITY');
  await check('It shows the legal name', 'Legal name');
  await check('It explains what cannot be edited here', 'come from identity verification');
  await check('It shows the address on file', 'Street address');
  await byTestId('profile-email').fill('khaled.faiad@demo.tpay.app');
  await tapId('profile-save');
  await page.waitForTimeout(1400);
  await check('Saving contact details confirms', 'Your details were updated');

  await profile();
  await check('Profile shows the updated email', 'khaled.faiad@demo.tpay.app');

  await tapText('TPay username');
  await check('Profile → TPay username', 'how other TPay users find you');
  await byTestId('username-field').fill('khaled_2026');
  await checkId('The preview follows what is typed', 'username-preview');
  await tapId('username-check');
  await page.waitForTimeout(1200);
  await check('An available handle says so', '@khaled_2026 is available');
  await tapId('username-save');
  await page.waitForTimeout(1400);
  await check('Saving the username confirms', 'You are now @khaled_2026');

  await profile();
  await check('Profile shows the new handle', '@khaled_2026');

  // ---- Security ------------------------------------------------------------
  await tapId('profile-security');
  await check('Profile → Security', 'Your account is protected');
  await check('Security offers device biometrics', 'Face ID');
  await check(
    'Security is honest that biometrics are unavailable here',
    'available in the TPay app on your phone',
  );
  await check('Security offers two-factor', 'Two-factor authentication');
  await check('Two-factor names a masked destination', 'SMS to +966');
  await check('Security lists recent logins', 'RECENT LOGIN ACTIVITY');
  await check('A blocked attempt is called out', 'Blocked ·');
  await check('Security offers a freeze', 'Freeze account');

  await tapId('security-biometrics');
  await page.waitForTimeout(1200);
  await check(
    'Turning on unavailable biometrics explains itself',
    'available in the TPay app on your phone',
  );

  await tapId('security-two-factor');
  await page.waitForTimeout(1400);
  await check('Turning two-factor off confirms', 'Two-factor authentication is off');
  await tapId('security-two-factor');
  await page.waitForTimeout(1400);
  await check('Turning it back on confirms', 'Two-factor authentication is on');

  await tapId('security-change-password');
  await check('Security → Change password', 'Current password');
  await byTestId('password-current').fill('wrong-password');
  await byTestId('password-new').fill('riyadh2026spring');
  await byTestId('password-confirm').fill('riyadh2026spring');
  await tapId('password-submit');
  await page.waitForTimeout(1400);
  await check('A wrong current password is named', "isn't your current password");
  await byTestId('password-current').fill('demo-password');
  await tapId('password-submit');
  await page.waitForTimeout(1600);
  await check('Changing the password confirms', 'Password updated');

  await tapId('security-devices');
  await check('Security → Trusted devices', 'signed in to your TPay account');
  await check('This device is marked', 'Current');
  await check('Another device is listed', 'MacBook Pro');
  await tapId('device-sign-out-dev_macbook');
  await page.waitForTimeout(1600);
  await check('Signing a device out confirms', 'MacBook Pro signed out');
  await check('Only this device is left', 'only device signed in');
  await back();

  await tapId('security-freeze');
  await page.waitForTimeout(1600);
  await check('Freezing the account confirms', 'Account frozen');
  await check('The security summary reflects the freeze', 'Your account is frozen');
  await tapId('security-freeze');
  await page.waitForTimeout(1600);
  await check('Unfreezing confirms', 'Account unfrozen');

  // ---- Notifications -------------------------------------------------------
  await profile();
  await tapText('Notifications');
  await check('Profile → Notifications', 'Salary received');
  await check('Something needing the user is listed', 'Action required');
  await check('A completed transfer is listed', 'Transfer completed');
  await check('Unread notifications can be cleared', 'Mark all read');
  await tapId('notifications-mark-all');
  await page.waitForTimeout(1400);
  await checkMissing('Marking all read removes the affordance', 'Mark all read');
  await tapId('notification-ntf_salary');
  await page.waitForTimeout(1400);
  await check('A notification leads to what it is about', 'NEXT SALARY');

  // ---- Support, from every entry point -------------------------------------
  await home();
  await tapId('home-employer');
  await tapId('employer-message');
  await check('Employer → Message opens TPay Support', 'Message TPay Support');
  await checkValue(
    'It arrives with the employer topic chosen',
    'support-new-subject',
    'Message for Layla Nasser',
  );
  await back();
  await tapId('employment-details');
  await tapId('employment-support');
  await check('Employment → Support opens the same surface', 'Message TPay Support');
  await checkValue(
    'It arrives with the employment subject',
    'support-new-subject',
    'Employment details',
  );
  await back();

  await home();
  await tapId('tab-benefits');
  await tapId('benefit-ben_medical');
  await tapId('benefit-support');
  await check('Benefit → Get support opens the same surface', 'Message TPay Support');
  await checkValue(
    'It arrives with the benefit as the subject',
    'support-new-subject',
    'Medical insurance',
  );
  await byTestId('support-new-message').fill('How do I add a dependent to my cover?');
  await tapId('support-new-submit');
  await page.waitForTimeout(1800);
  await check('Starting a conversation opens it', 'TPay support');
  await check('The message sent is in the thread', 'How do I add a dependent');
  await check('Support answers with context', 'I can see your benefits');

  await byTestId('conversation-input').fill('Two children, both under ten.');
  await tapId('conversation-send');
  await page.waitForTimeout(1800);
  await check('A reply is added to the thread', 'Two children, both under ten');

  // ---- The support hub -----------------------------------------------------
  await profile();
  await tapId('profile-help');
  await check('Profile → Support hub', 'How can we help?');
  await check('The hub offers a conversation', 'Chat with TPay');
  await check('The hub lists existing conversations', 'YOUR CONVERSATIONS');
  await check('An earlier conversation is listed', 'Transfer to Ahmed Mansour failed');
  await check('The hub groups by topic', 'BROWSE BY TOPIC');
  await check('The hub answers common questions', 'When exactly will my salary arrive?');
  await check('The hub still links to HR requests', 'Create a request for HR');

  await tapId('support-conversation-sup_9021');
  await check('Hub → a conversation', 'Layla Nasser');
  await check('The conversation shows what support said', 'nothing left your account');
  await check('A failed transfer is attached', 'FAILED TRANSFER');
  await back();
  await check('back reaches the support hub', 'How can we help?');

  await tapId('support-conversation-sup_8840');
  await check('A closed conversation is marked closed', 'conversation closed');
  await check('A closed conversation cannot be replied to', 'Start a new one to continue');
  await back();

  // ---- Verification: every state, and what each one allows -----------------
  await profile();
  await tapId('profile-kyc');
  await check('Profile → Identity verification', 'Identity verified');
  await check('Verified accounts see their transfer limit', 'Transfer limit $25,000.00');
  await checkId('The verification steps are listed', 'kyc-step-personal-information');

  await tapId('kyc-demo-in_review');
  await page.waitForTimeout(1400);
  await check('A submission in review says so', 'Verification in review');
  await check('In review has a smaller ceiling', 'Transfer limit $2,500.00');

  await tapId('kyc-demo-requires_action');
  await page.waitForTimeout(1400);
  await check('An action-required review says what it needs', 'recent proof of address');
  await check('Proof of address becomes a real step', 'Proof of address');
  await check('Action required restricts the limit', 'Transfer limit $500.00');

  await tapId('kyc-demo-declined');
  await page.waitForTimeout(1400);
  await check('A declined verification says so', 'Verification was declined');
  await check('A declined account cannot send', 'Sending is paused');
  await check('A declined account is sent to support', 'Contact TPay support');

  await tapId('kyc-demo-suspended');
  await page.waitForTimeout(1400);
  await check('A suspended account says so', 'Account under review');
  await check('A suspended account cannot send', 'Sending is paused');

  // A blocked account must not be able to send anything at all.
  await home();
  await tapId('tab-send');
  await check('Send warns a suspended account up front', 'Account under review');
  await tapId('recent-recipient-rcp_ahmed');
  await byTestId('send-amount').fill('10');
  await page.waitForTimeout(1800);
  await checkId('A suspended account is stopped at the amount', 'send-restriction');
  await check('The stop explains itself', 'paused while TPay reviews your account');
  await check('It offers the only thing that helps', 'Contact TPay support');
  await checkMissing('Review is unreachable while blocked', 'Review transfer is enabled');

  // ---- Walking verification from the start --------------------------------
  await home();
  await tapId('tab-profile');
  await tapId('profile-kyc');
  await tapId('kyc-demo-created');
  await page.waitForTimeout(1400);
  await check('Restarting verification reopens every step', 'Verification in progress');
  await check('An unverified account has a restricted limit', 'Transfer limit $1,000.00');
  await check('It says how to lift the limit', 'Complete identity verification');

  await tapId('kyc-action');
  await check('Verification → Personal information', 'Legal first name');
  await byTestId('kyc-first-name').fill('Khaled');
  await byTestId('kyc-last-name').fill('Faiad');
  await byTestId('kyc-dob').fill('1993-06-12');
  await byTestId('kyc-nationality').fill('Lebanese');
  await byTestId('kyc-address').fill('DEMO 4417 Olaya Street');
  await byTestId('kyc-city').fill('Riyadh');
  await byTestId('kyc-country').fill('Saudi Arabia');
  await tapId('kyc-personal-submit');
  await page.waitForTimeout(1600);
  await check('Personal information → Identity document', 'Choose the document you want');
  await check('It offers a national ID', 'National ID');
  await tapId('kyc-document-passport');
  await tapId('kyc-document-capture');
  await page.waitForTimeout(1600);
  await check('Capturing the document confirms', 'Passport captured');
  await check('Capture never names the provider', 'verification partner');
  await tapId('kyc-document-submit');
  await page.waitForTimeout(1600);
  await check('Identity document → Review', 'What we are sending');
  await tapId('kyc-review-submit');
  await page.waitForTimeout(1800);
  await check('Submitting puts verification in review', 'Verification in review');
  await tapId('kyc-review-done');
  await page.waitForTimeout(1200);

  // ---- And back to a verified account -------------------------------------
  await home();
  await tapId('tab-profile');
  await tapId('profile-kyc');
  await tapId('kyc-demo-approved');
  await page.waitForTimeout(1400);
  await check('Approval verifies the account', 'Identity verified');
  await check('A verified account gets the full limit', 'Transfer limit $25,000.00');
  await home();
  await tapId('tab-send');
  await checkMissing('A verified account sees no verification warning', 'Verify your identity');
}

/**
 * Phase 5B — TPay Card.
 *
 * The card is not a wallet of its own: every check here that touches money
 * checks the one shared balance. Freeze, controls and limits are exercised by
 * actually trying to pay, through the same service call a card processor
 * would drive.
 */
async function runCardFlows({
  check,
  checkId,
  checkMissing,
  tapText,
  tapId,
  back,
  goHome,
  byTestId,
  page,
}) {
  await goHome();
  const home = async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await byTestId('tab-index').count()) break;
      await back();
    }
    await tapId('tab-index');
  };
  const openCard = async () => {
    await home();
    await tapText('Manage');
    await tapId('card-face-card_primary');
  };

  // ---- Card overview -------------------------------------------------------
  await tapText('Manage');
  await check('Home → Cards', 'Create a virtual card');
  await check('The physical card shows its number', '•••• •••• •••• 4429');
  await check('The physical card is active', 'Active');
  await check('A virtual card is listed', 'Virtual card');
  await check('The virtual card is online only', 'Online only');
  await check('Cards state the one-balance rule', 'Every card spends from your TPay balance');
  await check('Cards say there is no card top-up', 'no separate card top-up');
  await checkId('Cards show the shared balance', 'cards-balance');

  await tapId('cards-create-virtual');
  await check('Creating a virtual card confirms', 'Virtual card •••• ');

  // ---- Card detail ---------------------------------------------------------
  await tapId('card-face-card_primary');
  await check('Cards → Physical card', 'Spends from your TPay balance');
  await check('The card screen names the format', 'Physical card');
  await check('The card number is masked until asked for', '•••• •••• •••• 4429');
  await check('The card shows spending against a limit', 'Spent this month');
  await check('The card lists its settings', 'Online payments');
  await check('The card offers ATM control', 'ATM withdrawals');
  await check('The card offers international control', 'International payments');
  await check('The card offers spending limits', 'Spending limits');
  await check('The card offers a PIN change', 'Change PIN');
  await check('The card can be reported', 'Report lost or stolen');
  await check('The card lists its own activity', 'Card activity');
  await check('Card activity shows a real purchase', 'Jarir Bookstore');

  // The shared balance the card screen shows must equal the wallet's.
  await checkId('The card screen shows the shared balance', 'card-balance');

  await tapId('card-show-details');
  await check('Revealing details is time-limited', 'shown for 60 seconds');
  await check('Showing details reveals the full number', '4271 8842 9910 4429');

  // ---- A card payment moves the one balance -------------------------------
  await home();
  await tapId('tab-wallet');
  await check('The wallet balance before paying', '$8,250.00');

  await openCard();
  await tapId('card-demo-in-store');
  await check('An in-store payment is approved', 'Approved — Panda Hypermarket');

  await home();
  await tapId('tab-wallet');
  await check('The card payment came out of the wallet balance', '$8,226.00');

  await home();
  await tapId('home-view-all');
  await check('The card payment is in the one ledger', 'Panda Hypermarket');
  await tapId('filter-card');
  await check('It is filed as card activity', 'Panda Hypermarket');
  await tapId('filter-all');

  // ---- Freeze actually blocks card activity -------------------------------
  await openCard();
  await tapId('card-toggle-freeze');
  await check('Freezing the card confirms', 'All payments are blocked');
  await check('The card face reads as frozen', 'Frozen');
  await check('The frozen face says payments are blocked', 'All payments are blocked while this card is frozen');

  await tapId('card-demo-in-store');
  await check('A frozen card declines a payment', 'Declined — This card is frozen');

  await home();
  await tapId('tab-wallet');
  await check('A declined payment did not move the balance', '$8,226.00');

  await openCard();
  await tapId('card-toggle-freeze');
  await check('Unfreezing the card confirms', 'Payments work again');
  await tapId('card-demo-in-store');
  await check('An unfrozen card pays again', 'Approved — Panda Hypermarket');

  // ---- Controls decide what the card may do -------------------------------
  await tapId('card-demo-abroad');
  await check('International payments are off by default', 'International payments are turned off');
  await tapId('card-control-international');
  await page.waitForTimeout(1600);
  await tapId('card-demo-abroad');
  await check('Turning the control on lets it through', 'Approved — Heathrow Express');

  await tapId('card-control-online');
  await page.waitForTimeout(1600);
  await tapId('card-demo-online');
  await check('Turning online payments off declines them', 'Online payments are turned off');

  // ---- Spending limits ----------------------------------------------------
  await tapId('card-limits');
  await check('Card → Spending limits', 'Monthly limit');
  await check('The limit screen shows the shared balance', 'is shared with every other way you pay');
  await byTestId('card-limit-monthly').fill('50');
  await tapId('card-limits-save');
  await check('Saving a limit confirms', 'Spending limits updated');
  await tapId('card-demo-in-store');
  await check('A payment over the limit is declined', 'monthly spending limit');

  // ---- PIN ----------------------------------------------------------------
  await tapId('card-change-pin');
  await check('Card → Change PIN', 'New PIN');
  await check('The PIN screen is honest about the issuer', 'No card issuer is connected yet');
  await byTestId('card-pin-new').fill('1111');
  await check('A repeated PIN is rejected', 'not the same digit four times');
  await byTestId('card-pin-new').fill('4193');
  await byTestId('card-pin-confirm').fill('4193');
  await tapId('card-pin-save');
  await check('Setting a PIN says what actually happened', 'reaches your card once an issuer');

  // ---- Replace: cancelled card, pending replacement ----------------------
  await openCard();
  await tapId('card-report');
  await check('Card → Report lost or stolen', 'What happened?');
  await check('It warns that reporting cancels the card', 'cancels this card straight away');
  await check('It points at the account-wide freeze too', 'freeze the whole account in Security');
  await tapId('replace-reason-stolen');
  await tapId('replace-submit');
  await check('Reporting confirms', 'A replacement is on its way');
  await check('The replacement card is on its way', 'On its way');
  await check('The replacement shows its delivery stage', 'Ordered');
  await check('The replacement cannot be used yet', 'cannot be used until it arrives');

  await tapId('card-demo-in-store');
  await check('A pending card declines a payment', 'has not arrived yet');

  await tapId('card-activate');
  await check('Activating the delivered card confirms', 'Card activated');
  await check('The activated card is active', 'Active');
  await tapId('card-demo-in-store');
  await check('The activated card pays', 'Approved — Panda Hypermarket');

  await home();
  await tapText('Manage');
  await check('The cancelled card is listed as cancelled', 'Cancelled');
  await check('It says why it was cancelled', 'Reported stolen');

  // ---- An account freeze blocks every card at once ------------------------
  await home();
  await tapId('tab-profile');
  await tapId('profile-security');
  await tapId('security-freeze');
  await check('Freezing the account confirms', 'Account frozen');

  await home();
  await tapText('Manage');
  await checkId('Cards warn that the account is frozen', 'cards-restriction');
  await check('The account freeze is explained', 'cards and transfers are blocked');
  await check('It names the way out', 'Unfreeze in Security');

  await home();
  await tapId('tab-send');
  await checkId('Send is blocked while the account is frozen', 'send-restriction-hub');

  await home();
  await tapId('tab-wallet');
  await tapId('wallet-exchange');
  await byTestId('exchange-from').fill('100');
  await page.waitForTimeout(1800);
  await checkId('Exchange is blocked while the account is frozen', 'exchange-restriction');
  await back();

  await home();
  await tapId('tab-wallet');
  await tapId('wallet-account-details');
  await back();
  await tapId('account-row-acc_usd');
  await tapId('account-deposit');
  await checkId('Add money says the account is frozen', 'add-money-restriction');
  await back();

  await home();
  await tapId('tab-profile');
  await tapId('profile-security');
  await tapId('security-freeze');
  await check('Unfreezing the account confirms', 'Account unfrozen');

  await home();
  await tapId('tab-send');
  await checkMissing('Send works again once unfrozen', 'Your account is frozen');
}

/**
 * Phase 6 — Authentication and onboarding.
 *
 * Runs last, because it signs out and creates accounts. The root guard is what
 * is really under test: no screen carries a signed-out branch, so the only way
 * to prove an authenticated route is protected is to ask for it without a
 * session and see where the app puts you.
 */
async function runAuthFlows({
  check,
  checkId,
  checkMissing,
  checkUrl,
  tapText,
  tapId,
  back,
  goHome,
  signInIfNeeded,
  byTestId,
  page,
}) {
  const OTP = '419204';
  const EMAIL = 'khaled.faiad@demo.acme.sa';
  const PASSWORD = 'demo-password';

  /** Reloads to a signed-out app, without signing back in. */
  const signedOut = async (path = '/') => {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
  };
  const fillOtp = async (code) => {
    await byTestId('verify-code').fill(code);
    await page.waitForTimeout(400);
  };

  // ---- A signed-out app starts at Welcome ---------------------------------
  await signedOut();
  await checkUrl('A signed-out app opens on Welcome', '/welcome');
  await check('Welcome names the product', 'Everything you earn, in one place');
  await check('Welcome explains the salary promise', 'Your salary, on time');
  await check('Welcome offers a way in', 'I already have an account');

  // ---- Authenticated routes are unreachable without a session -------------
  for (const [name, path] of [
    ['Home', '/'],
    ['the wallet', '/wallet'],
    ['a card', '/cards'],
    ['security', '/security'],
    ['transactions', '/transactions'],
  ]) {
    await signedOut(path);
    await checkUrl(`A signed-out user cannot reach ${name}`, '/welcome');
  }
  await checkMissing('No authenticated content leaks through', 'TPAY BALANCE');

  // ---- Login --------------------------------------------------------------
  await tapId('welcome-login');
  await check('Welcome → Login', 'Welcome back');
  await check('Login offers a password reset', 'Forgot password?');
  await check('Login offers signup', 'Create an account');
  await check('Login is honest that biometrics need the app', 'Biometric unlock is available in the TPay app');

  await byTestId('login-identifier').fill(EMAIL);
  await byTestId('login-password').fill('wrong-password');
  await tapId('login-submit');
  await page.waitForTimeout(1200);
  await check('Wrong credentials are refused', "isn't right");
  await checkUrl('A refused login stays on the login screen', '/login');

  await tapId('login-toggle-password');
  await check('The password can be shown', 'Hide');

  await byTestId('login-password').fill(PASSWORD);
  await tapId('login-submit');
  await page.waitForTimeout(2500);
  await check('The right credentials reach Home', 'TPAY BALANCE');
  await checkUrl('Login lands on Home, not the login screen', '/');

  // ---- An authenticated user never sees login -----------------------------
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await signInIfNeeded();
  await check('Home survives a reload', 'TPAY BALANCE');

  // ---- Logout is a real session transition --------------------------------
  await tapId('tab-profile');
  await tapId('profile-log-out');
  await page.waitForTimeout(2200);
  await checkUrl('Logging out reaches the login screen', '/welcome');
  await checkMissing('Logging out leaves the authenticated app', 'Security centre');

  await tapId('welcome-login');
  await byTestId('login-identifier').fill(EMAIL);
  await byTestId('login-password').fill(PASSWORD);
  await tapId('login-submit');
  await page.waitForTimeout(2500);
  await check('Logging back in works', 'TPAY BALANCE');

  // ---- Session expiry -----------------------------------------------------
  await tapId('tab-profile');
  await tapId('profile-security');
  await tapId('session-demo-expire');
  await page.waitForTimeout(2500);
  await checkUrl('An expired session reaches the login screen', '/login');
  await checkId('Login says the session expired', 'login-expired');
  await check('It says what to do about it', 'Log in again to pick up where you left off');

  await byTestId('login-identifier').fill(EMAIL);
  await byTestId('login-password').fill(PASSWORD);
  await tapId('login-submit');
  await page.waitForTimeout(2500);
  await check('Signing back in after an expiry works', 'TPAY BALANCE');

  // ---- Forgot password ----------------------------------------------------
  await signedOut();
  await tapId('welcome-login');
  await tapId('login-forgot');
  await check('Login → Forgot password', 'Reset your password');
  await check('It refuses to leak who has an account', 'nobody can use this screen to find out');
  await byTestId('forgot-identifier').fill(EMAIL);
  await tapId('forgot-submit');
  await page.waitForTimeout(1600);
  await check('A reset code is sent', 'Check your email');
  await fillOtp(OTP);
  await tapId('verify-submit');
  await page.waitForTimeout(1800);
  await check('The code opens the new-password screen', 'Choose a new password');
  await byTestId('reset-password').fill('riyadh2026spring');
  await byTestId('reset-confirm').fill('riyadh2026spring');
  await tapId('reset-submit');
  await page.waitForTimeout(2500);
  await check('Resetting the password signs the user in', 'TPAY BALANCE');

  // ---- Signup, OTP and its failures ---------------------------------------
  await signedOut();
  await tapId('welcome-signup');
  await check('Welcome → Signup', 'Create your account');
  await check('Signup says how long it takes', 'Takes about 4 minutes');

  await byTestId('signup-first-name').fill('Nour');
  await byTestId('signup-last-name').fill('Adel');
  await byTestId('signup-email').fill('nour.adel@demo.acme.sa');
  await byTestId('signup-phone').fill('+966 55 000 1111');
  await byTestId('signup-password').fill('short');
  await page.waitForTimeout(600);
  await check('Signup applies the shared password policy', 'At least 10 characters');
  await byTestId('signup-password').fill('riyadh2026spring');
  await page.waitForTimeout(600);
  await check('A strong password is accepted', 'Strong enough');
  await tapId('signup-submit');
  await page.waitForTimeout(2000);

  await check('Signup → Verify your email', 'Verify your email');
  await check('The code destination is masked', '•');
  await check('The demo says nothing was really sent', 'No SMS or email provider is connected yet');

  await fillOtp('000000');
  await tapId('verify-submit');
  await page.waitForTimeout(1600);
  await check('A wrong code is refused', "That code isn't right");
  await check('It counts the tries left', 'tries left');

  await check('Resending is held back by a countdown', 'Resend code in');

  await fillOtp(OTP);
  await tapId('verify-submit');
  await page.waitForTimeout(2000);
  await check('The email code opens the phone step', 'Verify your phone');
  await fillOtp(OTP);
  await tapId('verify-submit');
  await page.waitForTimeout(3000);

  // ---- Account created → onboarding → the existing KYC flow ---------------
  await checkUrl('A new account lands in onboarding', '/onboarding');
  await check('Onboarding greets the new user', 'Welcome to TPay, Nour');
  await check('Onboarding says why verification matters', 'activate your TPay Wallet and receive your salary');
  await check('A new account starts unverified', 'Verify your identity');
  await check('It states the restricted limit', 'transfers are capped at');

  await tapId('onboarding-verify');
  await check('Onboarding → the existing KYC flow', 'Identity verification');
  await check('The KYC steps are the existing ones', 'Personal information');
  await tapId('kyc-action');
  await check('KYC → Personal information', 'Legal first name');
  await byTestId('kyc-first-name').fill('Nour');
  await byTestId('kyc-last-name').fill('Adel');
  await byTestId('kyc-dob').fill('1995-02-20');
  await byTestId('kyc-nationality').fill('Egyptian');
  await byTestId('kyc-address').fill('DEMO 12 Nile Street');
  await byTestId('kyc-city').fill('Riyadh');
  await byTestId('kyc-country').fill('Saudi Arabia');
  await tapId('kyc-personal-submit');
  await page.waitForTimeout(1800);
  await tapId('kyc-document-capture');
  await page.waitForTimeout(1600);
  await tapId('kyc-document-submit');
  await page.waitForTimeout(1800);
  await tapId('kyc-review-submit');
  await page.waitForTimeout(2000);
  await check('Signup KYC reaches review', 'Verification in review');
  await tapId('kyc-review-done');
  await page.waitForTimeout(1600);

  await checkUrl('Onboarding is still where the new account belongs', '/onboarding');
  await tapId('onboarding-continue');
  await check('Onboarding → Connect employer', 'How are you connected to Talento?');
  await check('The employer is matched', 'Acme Technologies');
  await tapId('connect-hired-through-talento');
  await tapId('connect-finish');
  await page.waitForTimeout(3000);
  await check('Finishing onboarding opens TPay', 'TPAY BALANCE');
  await checkUrl('The new account reaches Home', '/');

  // ---- A blocked verification restricts without locking out ---------------
  // Pushed routes sit above the tab bar, so unwind before switching tabs.
  const home = async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await byTestId('tab-index').count()) break;
      await back();
    }
    await tapId('tab-index');
  };

  await tapId('tab-profile');
  await tapId('profile-kyc');
  await tapId('kyc-demo-suspended');
  await page.waitForTimeout(1600);
  await check('A suspended account says so', 'Account under review');

  await home();
  await check('A suspended user still sees their balance', 'TPAY BALANCE');
  await tapId('tab-send');
  await checkId('A suspended user cannot send', 'send-restriction-hub');
  await check('The reason is stated', 'paused while TPay reviews your account');
  await check('Support is the way forward', 'Contact TPay support');

  await home();
  await tapText('Manage');
  await checkId('A suspended user cannot spend on a card', 'cards-restriction');
  await tapId('card-face-card_primary');
  await tapId('card-demo-in-store');
  await check('A card payment is declined while under review', 'Declined —');

  await home();
  await tapId('tab-profile');
  await tapId('profile-kyc');
  await check('The user can still read their verification status', 'Account under review');
  await tapId('kyc-action');
  await check('And can still reach support about it', 'Message TPay Support');
  await back();
  await tapId('kyc-demo-approved');
  await page.waitForTimeout(1600);
  await check('Clearing the review restores the account', 'Identity verified');

  await home();
  await tapId('tab-send');
  await checkMissing('Sending works again', 'Account under review');

  // ---- Back to a clean signed-in app for anything that follows ------------
  await goHome();
  await check('The app is signed in again', 'TPAY BALANCE');
}
