# 020 — One-time Kakao Pay API

## Goal

Implement standard one-time `ready -> redirect -> approve` without creating an SID, calling a recurring endpoint, or relying on a subscription CID.

## Change map

| Path | Change |
| --- | --- |
| `dev_poc/poc-4-edge-function/supabase/functions/_shared/kakaopay.ts` | Add a separate general-payment configuration (`KAKAOPAY_CID_ONETIME`, optional matching CID secret, dedicated enable flag) and standard-CID request helpers. Preserve existing subscription configuration unchanged. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-one-time-ready/index.ts` | Authenticate user, load authoritative product, call the protected active-access/order-claim database function, create at most one pending one-time order, map returned TID, and return only redirect URLs. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-one-time-approve/index.ts` | Claim the order atomically, verify TID/order/user/amount, mark it paid, create entitlement exactly once, and recompute membership. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-one-time-cancel/index.ts` | Server-only refund/cancel path gated by the existing admin authorization pattern; provider result is recorded before entitlement removal. |
| `dev_poc/poc-4-edge-function/supabase/config.toml` | Add explicit `verify_jwt = false` entries matching the existing Kakao functions; each handler, not gateway JWT verification, validates the bearer token or server-only admin secret and emits the shared CORS response. |
| `dev_poc/poc-4-edge-function/supabase/functions/kakaopay_one_time_payment_gate_test.ts` | Exercise disabled mode, invalid product, duplicate approval, provider mismatch, and refund entitlement removal. |
| `README.md` | Document the new secret names only; never add their values. |

## Provider boundary

Kakao’s online-payment flow stores the TID returned by `ready` and finishes only after `approve`; standard one-time and subscription CIDs are separate. The new functions use the general CID only after Kakao has approved the extra payment type and issued it. Before that, the runtime returns a truthful disabled response and never calls Kakao.

## Acceptance scenarios

- `KAKAOPAY_ONETIME_ENABLED` is absent or false: `ready`, `approve`, and cancel/refund routes return a disabled response before DB/provider side effects.
- A user tries to approve someone else’s order: return 404 without provider call.
- `approve` sees an already paid order: return idempotent success and do not issue a second entitlement.
- Provider amount/order/TID mismatch: persist a reconciliation-required/failed state, grant no entitlement, and expose no provider secret.
- Provider refund fails: leave entitlement active and record failure; do not revoke a paid service before cancellation is confirmed.

## Runnable verification recipe

1. Extend `kakaopay_one_time_payment_gate_test.ts` to read the three new handler files and assert their enable-flag guard appears before order insertion or `fetch` to Kakao.
2. Use handler-level fixtures with a synthetic valid bearer token and explicit `Origin`; the existing shared CORS helper intentionally returns `Access-Control-Allow-Origin: *`, so this route does not use Origin as an authorization control. Assert an unauthenticated request returns 401 regardless of Origin, an authenticated request receives the shared CORS response, and no test fixture can choose price, duration, or CID.
3. Drive success callback parsing with `orderId=<fixture>&pg_token=<fixture>` through the one-time success component test/smoke path; assert the client invokes only `kakaopay-one-time-approve` with both names present. Test missing either parameter as a visible error with no invocation.
4. For approve, mock Kakao only in the test harness: first call returns matching `tid`, `partner_order_id`, `partner_user_id`, and total 7000; second identical call must not create a second entitlement. A mismatched field must leave entitlement count zero and set the order repair state.
5. Run `deno test --allow-env --allow-net --allow-read --allow-run dev_poc/poc-4-edge-function/supabase/functions/kakaopay_one_time_payment_gate_test.ts`, matching the existing gate test's declared `env`, `net`, `read`, and `run` permissions. Record the exact command and exit status in phase 040.
