# TPay — mobile app

TPay is a financial platform connecting employers and their people: salary,
wallet, card, transfers, FX, employment and benefits in one product.
This repository holds the **employee mobile app**. The employer dashboard is a
future web surface and is not built here.

> TPay — powered by Talento.

The approved design in [`design-reference/`](./design-reference) is the source
of truth for the UI. Screens are implemented to match it, not reinterpreted.

---

## Status — Phase 6 complete

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Foundation, design system, navigation, Home, mock data architecture | **Done** |
| 2 | Wallet, accounts, account details, add money, exchange, transactions | **Done** |
| 3 | Send Money — recipient → amount → review → confirmation → success | **Done** |
| 4 | Salary, employer, benefits, documents, requests | **Done** |
| 5A | Identity verification, Profile, Security, Support, notifications | **Done** |
| 5B | TPay Card — cards, details, freeze, controls, limits, replacement | **Done** |
| 6 | Authentication, signup, OTP, onboarding, biometric unlock | **Done** |

Every screen in the approved design is built, and the app now has a front
door: it starts signed out, and nothing authenticated renders without a
session. The mock session adapter is **not** production security — see
[Authentication](#authentication-is-a-shape-not-a-guarantee).

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
| `npm run export:web:e2e` | Web build with the demo flags on, for the E2E flows |
| `npm run test:e2e:production` | Asserts no demo control ships without the flags |

Requires Node 22+ (the unit tests run TypeScript directly via type stripping).
The app targets iOS and Android; the web target is used for review and
automated checks.

### Tests

```bash
npm test                                   # unit tests

npm run export:web:e2e                     # then, in a second shell:
npx http-server dist -p 4173
npm run test:e2e

npm run export:web                         # a build with no demo flags:
npm run test:e2e:production                # proves no demo control ships
```

The flows need the demo seams (a reviewer's verdict, a card at a till), so
`export:web:e2e` builds with `EXPO_PUBLIC_ENABLE_KYC_DEMO` and
`EXPO_PUBLIC_ENABLE_CARD_DEMO` set. `test:e2e:production` is the other half of
that bargain: it runs against a build with the flags absent and asserts that
every demo control is gone while the screens themselves still work.

Unit tests live beside the code they cover (`*.test.ts`) and run on Node's
built-in runner — `test/alias-loader.mjs` teaches Node the `@/…` alias so tests
import exactly the way the app does. The end-to-end flows in `e2e/flows.mjs`
drive a real browser through the app and assert on what is visible; they cover
Home → Wallet → Account → Account details → Add money → Exchange →
Transactions → Transaction detail → Send Money (recipient, amount, review,
processing, success, failure and transfer detail) → Salary, payslips,
employment, documents, requests and benefits → Profile, username, Security,
trusted devices, notifications, Support and identity verification through
every state → Cards, card details, freeze, controls, limits, PIN, replacement
and activation → Welcome, login, logout, session expiry, password reset,
signup with OTP failures, onboarding into the existing KYC flow, and a
suspended account that can still sign in but cannot spend. Back navigation is
checked at each step, balances after every transfer and card payment, and
every authenticated route is asked for without a session to prove the guard
holds.

Note that a plain static file server cannot resolve dynamic routes
(`/accounts/acc_usd` is exported as `accounts/[id].html`), so open the app at
`/` and navigate, as the tests do.

### Environment

No secrets are needed to run the app — it ships with a mock service layer.
The demo credentials are fictional and live in `src/services/mock/sessionService.ts`:
sign in as `khaled.faiad@demo.acme.sa` with `demo-password`, and use `419204`
for any one-time code. None of that is a security mechanism.
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
    (auth)/         welcome, login, signup, verify, password reset
    onboarding/     the bridge from a new account into the existing KYC flow
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
    account/        verification status, steps, restrictions and demo callbacks
    card/           card faces, spend meter, delivery tracker, card presentation
    auth/           session provider, root guard, OTP field, step rail
    navigation/     tab bar, screen header, phase placeholder
  services/
    contracts/      provider-agnostic service interfaces
    mock/           the adapter set that backs the app today
    device/         platform capabilities (biometrics), not provider adapters
    registry.ts     resolves one adapter set for the whole app
  types/            domain model — Money, Transaction, Account, Card, …
  hooks/            useAsyncData and one data hook per screen area
  utils/            money and date formatting
```

### Provider abstraction

The app never imports a financial provider. It consumes seventeen services —
`user`, `wallet`, `account`, `transaction`, `transfer`, `fx`, `card`, `kyc`,
`salary`, `employment`, `benefits`, `documents`, `requests`, `security`,
`support`, `notifications`, `session` — declared as interfaces in
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

### Authentication is a shape, not a guarantee

`sessionService` has four states — `SIGNED_OUT`, `AUTHENTICATING`,
`AUTHENTICATED`, `SESSION_EXPIRED` — and one adapter behind them. **The mock
adapter is not security.** It compares a fictional password on the device,
accepts one fixed code, and mints a fictional token. It exists so the app can
be built and tested against the real shape of a session; a real identity
backend implements the same contract and nothing above it changes.

There is no SMS or email provider. The verification screen says so on the
screen rather than implying a message was sent.

### The root guard, not a branch per screen

`SessionProvider` holds the session; `AuthGuard` decides what may render:

```
launch → restoreSession()
  AUTHENTICATED    → Home (or /onboarding, if signup is unfinished)
  SESSION_EXPIRED  → /login?expired=1, with the reason on screen
  SIGNED_OUT       → /welcome
```

A screen is signed-out-reachable purely by living in the `(auth)` group, so
adding one adds nothing to the guard. No authenticated screen carries a
signed-out branch, and asking for `/wallet`, `/cards` or `/security` without a
session lands on Welcome — which is exactly what the E2E flows assert, one URL
at a time.

Logging out is a session transition, not a message: the session is cleared and
the guard moves the user to the login screen.

### Onboarding reuses the verification flow

Signup runs details → email code → phone code → account created, and the new
session is then held in `/onboarding` until it finishes. Onboarding explains
why — *verify your identity to activate your TPay Wallet and receive your
salary* — and hands straight over to the **existing** `/kyc` screens and
`kycService`. There is no second KYC implementation; the guard simply lets the
`kyc` and `support` routes through while onboarding is unfinished.

### One account state gates every movement of money

A freeze is not a flag each screen interprets for itself. `securityService`
owns the account state and `src/services/mock/accountGuard.ts` is the single
check every money-moving service calls:

```ts
requireActiveAccount();   // throws AccountFrozenError with the restriction
```

`quoteTransfer`, `createTransfer`, `quoteExchange`, `executeExchange`,
`authorizePurchase` and `unfreezeCard` all go through it, and each one checks
again at the point of commitment — a restriction applied while the user sat on
a review screen still stops the money. `AccountRestrictedError` carries the
restriction, so `RestrictionNotice` shows the same explanation and the same
route out of it on every screen.

The state folds together the two things that stop money, so no service has to
know about both:

| Cause | Code | What the user is offered |
| --- | --- | --- |
| The user froze the account | `account-frozen` | Unfreeze in Security |
| Verification declined | `verification-declined` | Contact TPay support |
| Verification suspended | `account-under-review` | Contact TPay support |

A declined or suspended verification **never locks anyone out**. Signing in,
reading the account, seeing the reason, checking verification status and
messaging support all keep working — only money movement and card spending
stop.

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

### Password policy is configuration, not code

`securityService.getPasswordPolicy()` publishes the rules (10 characters, a
letter and a number) as data, and both the change-password screen and the
adapter judge a password through the same `meetsRequirement` helper. Neither
restates the policy, so a password can never look acceptable in the UI and be
refused by the service. Changing the minimum is one edit in the adapter.

### Biometrics are claimed only when they exist

`BiometricAuthenticator` is a separate contract from `SecurityService`, because
it is answered by the platform rather than by TPay's backend — which is also
why it is deliberately **not** in the service registry. There is one
implementation, `deviceBiometricAuthenticator` in `src/services/device`, built
on `expo-local-authentication`, and every place that needs a face check goes
through it: unlocking the app, turning the Security switch on, and the seams
already in place for transfer confirmation and card-detail reveal.

It never claims a capability the device does not have. No hardware, nothing
enrolled, or no native module at all (the web build) and `getCapability()` says
so with a reason while `authenticate()` rejects. The login screen offers
biometric unlock only when the device can actually do it **and** the user
turned it on here; otherwise it falls back to the password without comment.
Turning the Security switch on runs the real check once, so the switch can only
be set by someone who has passed it.

Signing out forgets biometric unlock — being forgotten is the point of signing
out.

The transfer confirmation seam (`TransferConfirmation`) and
`CardAuthorization` already carry `method` and an optional attestation
`token`, so those flows are a service swap away, not a redesign.

### The card is not a second wallet

`TPay Wallet → one balance → TPay Card.` `Card` has no `balance` field, by
design, and `cardService.getSpending()` reports `availableBalance` straight
from the wallet. A card payment debits a wallet account and writes into the
one transaction ledger, tagged with `cardId` — there is no second ledger, so a
purchase appears in Wallet transactions and in the card's own view because it
is the same row.

Five states, and no more: `active`, `frozen`, `pending`, `expired`,
`cancelled`. An account with no card has no card object, which is a different
thing from a card that exists and cannot be used.

Freezing is enforced, not decorative. `authorizePurchase` refuses a frozen,
pending, expired or cancelled card before consulting any control, then checks
the controls (online, ATM, international), then the limits, then the shared
balance — and the account-level freeze outranks all of it. A refusal never
touches the balance and never writes a transaction.

### Card security is a seam, not a claim

`CardAuthorization` carries `method: 'tap' | 'pin' | 'biometric' | 'device' |
'3ds'` and an optional attestation token — the same shape as
`TransferConfirmation`. Every card action that would need a real check
(revealing the full number, activating a delivered card) already takes one,
and today records `tap` plainly. Nothing pretends a PIN pad, a face, a device
attestation or a 3-D Secure challenge has run: the PIN screen validates a PIN
and says outright that no issuer is connected to send it to.

The full card number is never stored. `revealCardDetails` generates it on
demand behind an authorization and stamps it with an expiry.

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
