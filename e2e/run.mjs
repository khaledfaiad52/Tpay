/**
 * Runs the end-to-end flows against a static web export.
 *
 * Usage:
 *   npm run export:web && npx http-server dist -p 4173   # in one shell
 *   npm run test:e2e                                      # in another
 *
 * Point it elsewhere with TPAY_E2E_URL.
 */
import { chromium } from 'playwright';

import { runFlows } from './flows.mjs';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  // The app copies account details and receipts to the clipboard.
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();

const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(`PAGEERROR: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push(message.text());
});

let results = [];
let crashed;

try {
  results = await runFlows(page, (line) => console.log(line));
} catch (error) {
  crashed = error;
} finally {
  await browser.close();
}

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);

if (runtimeErrors.length > 0) {
  console.log('\nRuntime errors:');
  for (const error of runtimeErrors.slice(0, 10)) console.log(`  ${error}`);
}

if (crashed) {
  console.error(`\nRun aborted: ${crashed.message}`);
  process.exit(1);
}

const failed = results.length - passed;
process.exit(failed === 0 && runtimeErrors.length === 0 ? 0 : 1);
