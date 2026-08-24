/**
 * Verifies that a build without the demo flags renders no demo control.
 *
 * The flows in `flows.mjs` run against a build with
 * EXPO_PUBLIC_ENABLE_KYC_DEMO and EXPO_PUBLIC_ENABLE_CARD_DEMO set, because
 * they need those seams to exercise reviewer outcomes and card payments. This
 * script is the other half of that bargain: with the flags absent, nothing
 * demo-only may reach the screen.
 *
 * Usage:
 *   npm run export:web && npx http-server dist -p 4173
 *   node e2e/production.mjs
 */
import pkg from 'playwright';

const { chromium } = pkg;
const BASE_URL = process.env.TPAY_E2E_URL ?? 'http://localhost:4173';
const BOOT_MS = 2500;
const STEP_MS = 800;

const NOT_HIDDEN = ':not([aria-hidden="true"] *)';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
const page = await context.newPage();

const results = [];
const record = (name, ok) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
};

const byTestId = (testId) =>
  page.locator(`[data-testid="${testId}"]${NOT_HIDDEN}`).filter({ visible: true }).first();
const tapId = async (id) => {
  await byTestId(id).click({ timeout: 8000 });
  await page.waitForTimeout(STEP_MS);
};
const tapText = async (label) => {
  await page.getByText(label).and(page.locator(NOT_HIDDEN)).filter({ visible: true }).first()
    .click({ timeout: 8000 });
  await page.waitForTimeout(STEP_MS);
};

/** Passes when the element is NOT on screen. */
const absent = async (name, testId) => {
  try {
    await byTestId(testId).waitFor({ state: 'visible', timeout: 1500 });
    record(name, false);
  } catch {
    record(name, true);
  }
};

const present = async (name, testId) => {
  try {
    await byTestId(testId).waitFor({ state: 'visible', timeout: 6000 });
    record(name, true);
  } catch {
    record(name, false);
  }
};

try {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(BOOT_MS);

  // The verification screen still works; only its demo row is gone.
  await tapId('tab-profile');
  await tapId('profile-kyc');
  await present('Verification still renders its status', 'kyc-status');
  await present('Verification still states the limit', 'kyc-limit');
  await absent('No KYC demo control ships', 'kyc-demo-approved');
  await absent('No KYC restart control ships', 'kyc-demo-created');

  // The card screen still works; only its demo terminal is gone.
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(BOOT_MS);
  await tapText('Manage');
  await tapId('card-face-card_primary');
  await present('The card screen still renders', 'card-face');
  await present('The card still shows the shared balance', 'card-balance');
  await present('The card still offers its settings', 'card-settings');
  await absent('No card demo terminal ships', 'card-demo-in-store');
  await absent('No online demo payment ships', 'card-demo-online');
} catch (error) {
  console.error(`\nAborted at ${page.url()}: ${error.message}`);
  record('production build check completed', false);
} finally {
  await browser.close();
}

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} production-build checks passed`);
process.exit(passed === results.length ? 0 : 1);
