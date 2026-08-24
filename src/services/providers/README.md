# Provider adapters

This directory is where provider-backed adapter sets live. It is empty by
design: no provider is integrated yet, and the shape below is what one has to
fit when it is.

## The layering

```
  TPay domain            src/types           Money, Transfer, Card, KycStatus…
        ↓                                    TPay's own vocabulary. No provider
                                             word ever appears here.
  Service contracts      src/services/contracts
        ↓                                    What the app is allowed to ask for.
                                             Screens depend on this and nothing
                                             below it.
  Provider adapters      src/services/mock   ← today
        ↓                src/services/providers/<name>   ← later
                                             Translates one provider's API into
                                             the contracts above. The ONLY place
                                             a provider's name, status string or
                                             error code may appear.
  External APIs                              Reached from the TPay backend, not
                                             from the device.
```

`src/services/registry.ts` picks one adapter set for the whole app. Adopting a
provider means adding a set here and a key there. No screen changes.

## Rules an adapter must keep

1. **Never leak the provider.** Not its name, not its status strings, not its
   error codes. Each adapter owns a mapping table — `PROVIDER_STATUS_MAP` in
   `mock/transferService.ts` and `mock/kycService.ts` are the pattern — and the
   app only ever sees TPay states.

2. **Map errors onto the domain model.** Every failure becomes one of the
   errors in `contracts/errors.ts`, with its stable `code`. A provider's own
   code may travel as a diagnostic field for support; it must never be what a
   screen branches on.

3. **Honour idempotency.** Every money-moving call takes an
   `idempotencyKey`. Pass it to the provider's own idempotency header where
   one exists; where none exists, the adapter keeps the record itself. A
   retry must return the original result, never move money twice.

4. **Normalise inbound events.** Provider webhooks arrive as
   `ProviderEventEnvelope` (`contracts/providerEvents.ts`) and are routed to
   the domain service that owns those states. Every envelope carries the
   provider's `eventId`, because every network redelivers.

5. **Hold no secrets.** A mobile bundle is readable by anyone who installs the
   app. An adapter that needs an API key does not belong on the device: it
   belongs behind the TPay backend, and the device-side adapter talks to that.
   The same goes for webhook signature verification — the secret that verifies
   a signature cannot live here.

## Where each provider would plug in

| Concern | Contract | Inbound events |
| --- | --- | --- |
| Payouts and corridors | `TransferService`, `FxService` | `transfer`, `fx` |
| Identity verification | `KycService` | `kyc` |
| Card issuing and processing | `CardService` | `card-transaction`, `card-lifecycle` |
| Account standing / compliance holds | `SecurityService` (account state) | `account-status` |
| Identity and sessions | `SessionService` | — |

Candidate money-movement providers (Thunes, TerraPay, Airwallex, Nium) differ
in corridors, settlement timing and status vocabulary. All of that is absorbed
by the adapter: `listCorridors()` is how the app learns what is possible, and
`handleTransferCallback()` is how it learns what happened.
