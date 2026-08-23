# 020 — One-time Kakao Pay API

## Goal

Implement standard one-time `ready -> redirect -> approve` without creating an SID, calling a recurring endpoint, or relying on a subscription CID.

## Change map

| Path | Change |
| --- | --- |
| `dev_poc/poc-4-edge-function/supabase/functions/_shared/kakaopay.ts` | Add a separate general-payment configuration (`KAKAOPAY_CID_ONETIME`, optional matching CID secret, dedicated enable flag) and standard-CID request helpers. Preserve existing subscription configuration unchanged. |
| `dev_poc/poc-4-edge-function/supabase/migrations/20260821011000_add_kakaopay_one_time_state_rpc.sql` | Add service-role-only `SECURITY DEFINER` RPCs: per-user ready claim using a transaction lock, paid-order finalization that inserts exactly one entitlement and recomputes membership, and full-refund finalization that revokes the entitlement and recomputes membership. Revoke every public/browser role before granting only `service_role`. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-one-time-ready/index.ts` | Authenticate user, load authoritative product, call the protected active-access/order-claim database function, create at most one pending one-time order, map returned TID, and return only redirect URLs. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-one-time-approve/index.ts` | Claim the order atomically, verify TID/order/user/amount, mark it paid, create entitlement exactly once, and recompute membership. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-one-time-cancel/index.ts` | Server-only refund/cancel path gated by the existing admin authorization pattern; provider result is recorded before entitlement removal. |
| `dev_poc/poc-4-edge-function/supabase/config.toml` | Add explicit `verify_jwt = false` entries matching the existing Kakao functions; each handler, not gateway JWT verification, validates the bearer token or server-only admin secret and emits the shared CORS response. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay_one_time_payment_gate_test.ts` | Exercise disabled mode, invalid product, duplicate approval, provider mismatch, and refund entitlement removal. |
| `README.md` | Document the new secret names only; never add their values. |

## Provider boundary

Kakao’s online-payment flow stores the TID returned by `ready` and finishes only after `approve`; standard one-time and subscription CIDs are separate. The new functions use the general CID only after Kakao has approved the extra payment type and issued it. Before that, the runtime returns a truthful disabled response and never calls Kakao.

## Current-source revalidation

- Existing `kakaopay-ready`, `kakaopay-approve`, and `kakaopay-cancel-payment` use `kakaopay_payment_orders`, subscription CID, and SID-specific paths. The one-time functions must not import their order types or mutate their rows.
- Existing ready checks only persisted `members.plan`; the one-time ready path instead calls the protected one-time order-claim function defined for this phase so concurrent requests cannot create overlapping access.
- Existing approval claims `ready -> approving` before provider approval. The one-time approval retains that state transition in `kakaopay_one_time_orders`, validates the stored TID/order/user/amount, then inserts one entitlement guarded by `UNIQUE (source_order_id)`.
- Existing cancellation permits partial refund for subscriptions. The one-time cancel path rejects partial refund, confirms the provider's full cancellation first, then updates order and entitlement in a server-only transaction.
- The original entitlement index is intentionally not a concurrency control. The new ready-claim RPC takes a per-user transaction lock and rejects a current active entitlement or unfinished one-time order; finalize/revoke RPCs own the multi-row state transition so an Edge function cannot leave paid, refunded, and entitlement state half-applied.

## Acceptance scenarios

- `KAKAOPAY_ONETIME_ENABLED` is absent or false: `ready`, `approve`, and cancel/refund routes return a disabled response before DB/provider side effects.
- A user tries to approve someone else’s order: return 404 without provider call.
- `approve` sees an already paid order: return idempotent success and do not issue a second entitlement.
- Provider amount/order/TID mismatch: persist a reconciliation-required/failed state, grant no entitlement, and expose no provider secret.
- Provider refund fails: leave entitlement active and record failure; do not revoke a paid service before cancellation is confirmed.
- Two concurrent ready requests for the same user: exactly one creates a `ready` order; the other receives a conflict without calling Kakao.
- A provider response of `PART_CANCEL_PAYMENT`, or any attempt to supply a partial amount, is rejected before local revoke; only a full cancellation transitions the order and entitlement together.
- A finalize/revoke RPC error rolls back its order, entitlement, and member-plan writes together; it cannot publish a partial local state.

## Runnable verification recipe

1. Extend `kakaopay_one_time_payment_gate_test.ts` to read the three new handler files and assert their enable-flag guard appears before order insertion or `fetch` to Kakao.
2. Use handler-level fixtures with a synthetic valid bearer token and explicit `Origin`; the existing shared CORS helper intentionally returns `Access-Control-Allow-Origin: *`, so this route does not use Origin as an authorization control. Assert an unauthenticated request returns 401 regardless of Origin, an authenticated request receives the shared CORS response, and no test fixture can choose price, duration, or CID.
3. Drive success callback parsing with `orderId=<fixture>&pg_token=<fixture>` through the one-time success component test/smoke path; assert the client invokes only `kakaopay-one-time-approve` with both names present. Test missing either parameter as a visible error with no invocation.
4. For approve, mock Kakao only in the test harness: first call returns matching `tid`, `partner_order_id`, `partner_user_id`, and total 7000; second identical call must not create a second entitlement. A mismatched field must leave entitlement count zero and set the order repair state. Add a fixture that races two ready claims and prove only one reaches the provider mock.
5. Assert the SQL RPC source takes a user-scoped transaction lock and contains a single transaction for paid-entitlement-plan and refunded-entitlement-plan transitions. Assert `PART_CANCEL_PAYMENT` and body-supplied partial amounts are rejected before the provider cancel request.
6. Run `deno test --allow-env --allow-net --allow-read --allow-run dev_poc/poc-4-edge-function/supabase/functions/kakaopay_one_time_payment_gate_test.ts`, matching the existing gate test's declared `env`, `net`, `read`, and `run` permissions. Record the exact command and exit status in phase 040.
