# Kakao Pay recurring subscription

## Loop header

- Archetype: payment-provider integration with production activation gate.
- Trigger: add Kakao Pay as a second payment method for Vocally Pro monthly and yearly subscriptions.
- Goal: a signed-in user can choose Kakao Pay, authorize the first charge, receive Pro access only after server-side approval, and later be renewed, cancelled, reconciled, or refunded safely.
- Non-goals: replacing Toss Payments, changing Vocally pricing, storing any payment credential in the browser, or claiming production activation before Kakao Pay merchant approval.
- Verifiers: `npm run build --workspace apps/web` (reads `apps/web/src/**/*` through TypeScript/Vite); `npm run lint --workspace apps/web` (reads the web workspace, currently exits 0 with pre-existing generated-file warnings); targeted Supabase function type/deploy checks; a visible browser checkout flow; Kakao Pay mockup approval/cancel where developer credentials are available.
- Stop condition: production deployment is complete and all source, database, test, cancel, reconciliation, and browser checks pass; otherwise the remaining merchant credential or contract item is recorded as NEEDS_HUMAN.
- Memory artifact: this unit and its evidence records.
- Terminal outcomes: DONE, or NEEDS_HUMAN for the partner-center login, business-app conversion, merchant review, CID, and production secret.
- Escalation: after two distinct credential/configuration failures, stop retrying and request only the exact partner-center action.

## Scope

IN: Kakao Pay recurring checkout, first-charge approval, SID storage, scheduled renewal, cancellation/SID deactivation, order reconciliation, full refund endpoint, user-visible success/cancel/failure routes, database/RLS, environment documentation, deployment and QA.

OUT: any production key in git, browser-side Kakao Pay API calls, direct access to a user payment method, modifying the existing user-owned `.gitignore`, changing Toss behavior, and merchant application submission without a logged-in representative account.

## Architecture decision

Keep Kakao Pay as a provider-specific server-side module beside the existing Toss module, rather than prematurely abstracting both into a generic payment framework. The APIs and stored authority differ (Toss billing key vs. Kakao Pay CID/SID/TID); a small shared convention is sufficient today. The authoritative Kakao Pay function inventory is `kakaopay-ready`, `kakaopay-approve`, `kakaopay-recurring`, `kakaopay-cancel-payment`, `kakaopay-reconcile`, and the shared user-facing `subscription-cancel`; it is backed by `functions/_shared/kakaopay.ts`. This creates functional coupling only through explicit database records and server-only `recompute_member_plan`; no provider imports another provider.

Rejected: reusing `toss_payment_orders` and `toss_subscriptions`. It would mix incompatible identifiers and expose a provider-state migration risk. Rejected: handling approval in the browser. It would require exposing the Kakao Pay secret and would allow a forged approval request.

## Build order

1. `010_phase1_data_model.md`: first lock down the existing entitlement RLS, add provider-owned tables, and define atomic state transitions/entitlement arbitration.
2. `020_phase2_server_api.md`: implement Kakao Pay ready, approve, renewal, cancellation, refund, and reconciliation functions, plus safe existing-Toss downgrade integration.
3. `030_phase3_web_checkout.md`: add provider choice and callback pages to both the web site and desktop handoff without disturbing Toss checkout.
4. `040_phase4_release_qa.md`: configure secrets, deploy, execute mockup flow, conduct independent review, and retain evidence.

## Risk and approval ledger

| Risk                            | Control                                                                                       | Owner          | Evidence                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------- |
| Secret key disclosure           | server-only Edge Function secret; secret scan before push                                     | implementation | source scan and secret configuration confirmation |
| forged/cross-user approval      | bearer auth + order owner match + server-held TID/order values                                | implementation | negative API scenario                             |
| duplicate charge                | conditional `ready -> approving` claim, idempotent terminal state, reconciliation endpoint    | implementation | concurrent/duplicate approval test                |
| wrong access grant              | only `SUCCESS_PAYMENT` sets `members.plan=pro`                                                | implementation | success/failure scenario                          |
| unsafely lost renewal response  | persist provider request/order ID and reconcile using Kakao Pay order query                   | operations     | order-status test                                 |
| entitlement bypass              | revoke direct `members` insert/update policies and recompute Pro from active provider records | implementation | direct client update/insert tests                 |
| multi-provider downgrade        | central server-only entitlement recomputation checks Toss and Kakao Pay before setting free   | implementation | cross-provider cancellation matrix                |
| credential/contract unavailable | use documented mockup CID only with a valid dev secret; do not pretend production is active   | business owner | partner-center state                              |

## PABCD records

- P: official API research is in `001_kakaopay_api_research.md`; all implementation work-phase docs are present before code.
- A: independent review will be appended here before build work starts.
- B/C/D: implementation deltas, command output tails, visible QA evidence, and final release state are appended here.

## Audit amendments (2026-08-18)

The first independent audit failed because the pre-existing `members` RLS allowed a client to insert/update `plan`, renewal/cancellation/reconciliation invariants were incomplete, and desktop checkout/management had been omitted. The phase documents below were amended before a re-audit. The official schema facts are captured from the rendered Kakao Pay documentation in `001_kakaopay_api_research.md`; the remaining contract proof is a mockup request with a developer Secret key.
