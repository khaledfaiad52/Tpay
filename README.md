# TPay — mobile app

TPay is a financial platform connecting employers and their people: salary,
wallet, card, transfers, FX, employment and benefits in one product.
This repository holds the **employee mobile app**. The employer dashboard is a
future web surface and is not built here.

> TPay — powered by Talento.

The approved design in [`design-reference/`](./design-reference) is the source
of truth for the UI. Screens are implemented to match it, not reinterpreted.

---

## Status — Phase 5A complete

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Foundation, design system, navigation, Home, mock data architecture | **Done** |
| 2 | Wallet, accounts, account details, add money, exchange, transactions | **Done** |
| 3 | Send Money — recipient → amount → review → confirmation → success | **Done** |
| 4 | Salary, employer, benefits, documents, requests | **Done** |
| 5A | Identity verification, Profile, Security, Support, notifications | **Done** |
| 5B | TPay Card — details, freeze, card activity | Not started |
| 6 | Polish, testing, error/loading/empty states across the app | Not started |

TPay Card is the one screen still standing as a routed placeholder, so
navigation and back navigation work end to end today.

---

## Running the app

```bash
npm install
npm start          # Expo dev server — press i / a, or scan the QR code
```

| Command | What it does |
| --- | --- |
| `npm run ios` | Open in the iOS simulator (macOS) |
| `npm run android` | Open in an Android emulator |
| `npm run web` | Run in a browser |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the React Compiler rules |
| `npm test` | Unit tests (`node --test`, no test framework dependency) |
| `npm run test:e2e` | End-to-end flows against a web build (see below) |
| `npm run export:web` | Static web build into `dist/` |

Requires Node 22+ (the unit tests run TypeScript directly via type stripping).
The app targets iOS and Android; the web target is used for review and
automated checks.

### Tests

```bash
npm test                                   # unit tests

npm run export:web                         # then, in a second shell:
npx http-server dist -p 4173
npm run test:e2e
```

Unit tests live beside the code they cover (`*.test.ts`) and run on Node's
built-in runner — `test/alias-loader.mjs` teaches Node the `@/…` alias so tests
import exactly the way the app does. The end-to-end flows in `e2e/flows.mjs`
drive a real browser through the app and assert on what is visible; they cover
Home → Wallet → Account → Account details → Add money → Exchange →
Transactions → Transaction detail → Send Money (recipient, amount, review,
processing, success, failure and transfer detail) → Salary, payslips,
employment, documents, requests and benefits → Profile, username, Security,
trusted devices, notifications, Support and identity verification through
every state, with back navigation at each step and balance assertions after
every transfer.

Note that a plain static file server cannot resolve dynamic routes
(`/accounts/acc_usd` is exported as `accounts/[id].html`), so open the app at
`/` and navigate, as the tests do.

### Environment

No secrets are needed to run the app — it ships with a mock service layer.
Copy [`.env.example`](./.env.example) to `.env.local` to change the adapter set
or to demo loading and error states.

Provider API keys, webhook secrets and database credentials belong on the TPay
backend and must never reach this bundle. `.env.example` says where each one
is expected to live.

---

## Architecture

```
src/
  app/              expo-router routes — file structure is the navigation graph
    (tabs)/         Home · Wallet · Send · Benefits · Profile
  theme/            colours, type ramp, spacing, radii, shadows
  icons/            24×24 stroked icon set (no emoji, no icon fonts)
  components/
    ui/             Screen, Card, ListRow, Badge, Button, Text, states…
    money/          transaction and account presentation, receipts, filters
    home/           the Home screen's sections
    wallet/         wallet, deposit and exchange sections
    send/           the Send Money flow's state, steps and outcomes
    work/           salary, document and request presentation
    account/        verification status, steps and demo callbacks
    navigation/     tab bar, screen header, phase placeholder
  services/
    contracts/      provider-agnostic service interfaces
    mock/           the adapter set that backs the app today
    registry.ts     resolves one adapter set for the whole app
  types/            domain model — Money, Transaction, Account, Card, …
  hooks/            useAsyncData and one data hook per screen area
  utils/            money and date formatting
```

### Provider abstraction

The app never imports a financial provider. It consumes sixteen services —
`user`, `wallet`, `account`, `transaction`, `transfer`, `fx`, `card`, `kyc`,
`salary`, `employment`, `benefits`, `documents`, `requests`, `security`,
`support`, `notifications` — declared as interfaces in
`src/services/contracts` and resolved through `src/services/registry.ts`:

```ts
import { services } from '@/services';

const { total, accounts } = await services.wallet.getBalance();
```

Adopting Airwallex, Thunes, TerraPay, Nium or a TPay-owned backend means
implementing those interfaces and registering the adapter set. No screen
changes.

**Provider names never reach the user.** The product says *TPay Wallet* and
*TPay Account*; the regulated institution behind them is an implementation
detail.

### Data, not fixtures in components

Mock data lives in `src/services/mock/data/fixtures.ts` and is reachable only
through a service. Components receive typed domain objects. Demo data is
fictional and masked (`DEMO •••• 4821`) — no real account numbers.

`src/services/mock/data/store.ts` holds the session's mutable state, seeded
from those fixtures. It is what makes the app behave like a real one: booking
an exchange debits one account, credits another and records both sides, so the
Wallet and Transactions screens show the result. A real backend replaces the
store wholesale.

### Money

Money is always `{ minorUnits, currency }` — never a float, never a
pre-formatted string. Formatting happens once, in `src/utils/format.ts`, and
reaches the screen through `<AmountText />`.

### One balance

The TPay Wallet and the TPay Card share a single balance. `Card` carries no
balance field, by design.

The headline balance is **derived, never stored**: it is the USD-equivalent
sum of every currency account, converted through the FX layer
(`totalBalanceOf`). Move an account and the total follows, because there is no
second number to keep in step.

### What money costs

Two rules, applied everywhere:

- **The recipient receives exactly what the user entered.** A send of $1,000
  arrives as $1,000 (or its converted value); nothing is deducted from it.
- **The fee is charged on top.** `totalDebit` is `sendAmount + fee`, and it is
  on the review screen before the user confirms — nobody is surprised by the
  final figure.

Any TPay wallet currency can fund a send. Which corridors TPay can actually
deliver on lives behind `transferService.listCorridors()`, so provider limits
never leak into a screen.

### Transfers settle on a callback, not a timer

A transfer runs `created → processing → completed | failed`. Nothing advances
it on a timer: it leaves `processing` only when the payout network reports
back through `transferService.handleTransferCallback()`, which normalises the
provider's own vocabulary into TPay's statuses — the same shape `kycService`
uses. A failure after the account was debited returns the money.

Until a real provider is connected, the transfer detail screen delivers that
callback by hand so both outcomes can be exercised.

### Verification governs what can be sent

`transferService.listTransferLimits()` publishes the ceilings that apply. A
limit names the conditions it holds under — KYC status, country, currency,
corridor, payout method — so a real limit set can be expressed without
reshaping the model. The values are configurable mock ones, gathered in
`CEILING_USD` at the top of `src/services/mock/transferService.ts`; nothing
here is a real provider's number.

Verification level is the dimension that moves today. `quoteTransfer` reads
the live status from `kycService`, so a limit cannot be bypassed by a stale
copy on the user record:

| Verification status | Per-transfer ceiling | What the user is offered |
| --- | --- | --- |
| `NOT_STARTED` | $500 | Complete identity verification |
| `IN_PROGRESS` | $1,000 | Complete identity verification |
| `ACTION_REQUIRED` | $500 | Complete identity verification |
| `SUBMITTED` | $2,500 | Nothing — the review is running |
| `VERIFIED` | $25,000 | Nothing |
| `REJECTED` / `SUSPENDED` | Sending paused | Contact TPay support |

`transferService.getSendingLimit()` returns the ceiling in force, so Send and
the verification screen can state it *before* the user hits it. When one is
breached, `TransferLimitExceededError` carries the whole limit — the amount,
the explanation and the single action that lifts it — so the screen explains
rather than just refusing.

### Verification, all seven states

`kycService` walks personal information → identity document → review, and
normalises a provider's outcomes through `handleKycCallback()` exactly as
transfers do. Every state — `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`,
`ACTION_REQUIRED`, `VERIFIED`, `REJECTED`, `SUSPENDED` — has one presentation,
in `src/components/account/kycPresentation.ts`, so a status can never be shown
with the wrong voice. Proof of address is asked for only when a reviewer
actually wants it.

The verification screen carries a clearly-labelled **demo** row that applies a
reviewer outcome. It goes through `handleKycCallback()` — the seam a real
webhook lands on — rather than reaching into the store, and drops out with the
mock adapter.

### Biometrics are claimed only when they exist

`BiometricAuthenticator` is a separate contract from `SecurityService`,
because it is answered by the platform rather than by TPay's backend. There is
no native module yet, so the shipped implementation reports
`available: false` with a reason, and `authenticate()` rejects. Nothing in the
app pretends a face was checked. Turning the switch on is recorded as a stored
preference and the screen says plainly that the device cannot honour it yet.

The transfer confirmation seam (`TransferConfirmation`) already carries
`method` and an optional attestation `token`, so connecting a native module is
a service swap, not a flow change.

### One support surface

Employer → Message, Benefit → Get support, Employment → Support and the help
centre all open the same `supportService`. A conversation carries the topic it
started from, so support opens with context instead of asking the user where
they came from. Mock conversations only — there is no live-chat backend, and
the agent is always *TPay support*, never the employer of record.

---

## Design fidelity

- Colours, type sizes, weights, tracking, radii and spacing are transcribed
  from the design canvas into `src/theme`. Components read tokens; nothing
  hard-codes a hex value.
- Icons are ported path-for-path from the design into `src/icons/paths.ts`.
- Typography is Manrope, with IBM Plex Mono for account identifiers.
- Loading, empty and error states are first-class components, matching the
  states drawn in the design.
