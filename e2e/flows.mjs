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
    ['tab-send', 'Send', 'Send money is not built yet'],
    ['tab-benefits', 'Benefits', 'Benefits is not built yet'],
    ['tab-profile', 'Profile', 'Profile is not built yet'],
    ['tab-index', 'Home', 'TPAY BALANCE'],
  ]) {
    await tapId(id);
    await check(`tab → ${label}`, expected);
  }

  for (const [testId, label, expected] of [
    ['home-view-all', 'Transactions', 'transactions-search'],
    ['home-employer', 'My employer', 'My employer is not built yet'],
    ['home-benefits', 'Benefits', 'Benefits is not built yet'],
  ]) {
    await tapId(testId);
    if (expected.includes(' ')) await check(`Home → ${label}`, expected);
    else await checkId(`Home → ${label}`, expected);
    await back();
    await check(`back from ${label}`, 'TPAY BALANCE');
  }

  for (const [label, expected] of [
    ['Manage', 'TPay Card is not built yet'],
    ['Need something from HR?', 'Requests is not built yet'],
    ['Next salary · Acme Technologies', 'Salary is not built yet'],
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

  return results;
}
