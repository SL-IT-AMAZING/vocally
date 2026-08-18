# Phase 2 — Server-side Kakao Pay API

## Scope and acceptance criteria

All Kakao Pay requests originate from Supabase Edge Functions. Input is validated at HTTP boundaries; provider secrets and raw credential values never enter client responses or logs. Provider failure enters a recoverable/observable order state. The activation scenarios are: no bearer token -> 401; invalid plan -> 400; user/order mismatch -> 403/404; duplicate approval -> no second provider charge; provider timeout/unknown approval -> reconciliation via order query.

## Change map

| Path                                                                               | Change | Detail                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev_poc/poc-4-edge-function/supabase/functions/_shared/kakaopay.ts`               | NEW    | server config, plan/price constants, stable pseudonymous partner ID helper, typed provider request with timeout, and date calculation.                                                                                    |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-ready/index.ts`           | NEW    | authenticated creation of an order and `payment/ready`; return only redirect URL/order metadata.                                                                                                                          |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-approve/index.ts`         | NEW    | authenticated owner-checked callback approval; conditionally claims order, validates returned amount/order values, persists TID/SID, grants entitlement only on success.                                                  |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-recurring/index.ts`       | NEW    | cron-authenticated due-subscription renewal using SID; atomically claims a billing period before provider call, reconciles an ambiguous previous attempt, then updates retry/next-billing state.                          |
| `dev_poc/poc-4-edge-function/supabase/functions/subscription-cancel/index.ts`      | NEW    | owner cancellation router: selects the active provider record, immediately deactivates Kakao SID or marks Toss cancellation, preserves entitlement through the current period, then calls recompute only at finalization. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-cancel-payment/index.ts`  | NEW    | privileged/refund operation for a paid order; validates refundable total/tax before provider cancellation.                                                                                                                |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-reconcile/index.ts`       | NEW    | protected recovery endpoint that queries known TIDs and corrects local state after ambiguous provider errors.                                                                                                             |
| `dev_poc/poc-4-edge-function/supabase/functions/toss-recurring/index.ts`           | MODIFY | replace direct `members.plan=free` downgrade with server-side entitlement recomputation so a Kakao subscription remains valid.                                                                                            |
| `dev_poc/poc-4-edge-function/supabase/functions/toss-cancel-subscription/index.ts` | MODIFY | delegate/deprecate into the same server-only cancellation and entitlement finalization policy used by `subscription-cancel`; retained for backward-compatible desktop clients.                                            |
| `dev_poc/poc-4-edge-function/supabase/config.toml`                                 | MODIFY | declare every Kakao/user/cron/admin function with explicit JWT behavior; no endpoint is left to an implicit default.                                                                                                      |
| `dev_poc/poc-4-edge-function/supabase/functions/_shared/auth.ts`                   | MODIFY | add narrowly scoped `requireCronSecret` and `requireAdminSecret`; ordinary user authorization remains `getUser`.                                                                                                          |
| `README.md`                                                                        | MODIFY | document server env names, required recurring cron, Kakao merchant prerequisite, cash-receipt behavior, and rollback process.                                                                                             |

## Operational/secret contract

Required Edge secrets: `KAKAOPAY_SECRET_KEY`, `KAKAOPAY_CID_SUBSCRIPTION`, `KAKAOPAY_SITE_URL`, `KAKAOPAY_CRON_SECRET`, and `KAKAOPAY_ADMIN_SECRET`; optional `KAKAOPAY_CID_SECRET`. The test CID is not a production configuration. All production values are set in Supabase secret storage, not in source or Vercel. `kakaopay-cancel-payment` and `kakaopay-reconcile` require the admin secret and reject ordinary user JWTs; the client never exposes them.

## Function auth/config inventory

The exact `dev_poc/poc-4-edge-function/supabase/config.toml` additions are: `[functions.kakaopay-ready] verify_jwt = false`, `[functions.kakaopay-approve] verify_jwt = false`, `[functions.kakaopay-recurring] verify_jwt = false`, `[functions.subscription-cancel] verify_jwt = false`, `[functions.kakaopay-cancel-payment] verify_jwt = false`, and `[functions.kakaopay-reconcile] verify_jwt = false`. `false` permits CORS/cron/admin transport at the gateway; each handler authenticates its own boundary: `getUser` for ready/approve/subscription-cancel, `x-cron-secret` for recurring, and `x-kakaopay-admin-secret` for refund/reconcile. No function accepts an unauthenticated business action.

## Renewal, cancellation, and recovery policy

Initial approval and recurring billing use three attempts at 24-hour intervals. An ambiguous provider network result is `reconciliation_required`, not failure; next retry first calls `/payment/order` for the stored TID/order record. A user cancellation immediately calls SID inactive, records cancellation request, and blocks new renewal claims; Pro remains until `current_period_end`. Refund uses server-derived remaining cancellable amount and immediately recomputes entitlement. Provider status mapping is defined in `001_kakaopay_api_research.md`; unknown status never grants/downgrades entitlement.

Rollback: remove the Kakao Pay method from the web build first, then stop the renewal scheduler; existing SIDs remain intact and can be manually deactivated using the protected function. This avoids disrupting Toss subscribers.
