# Phase 1 — Kakao Pay payment state

## Scope and acceptance criteria

First revoke the insecure direct client insert/update policies on `members`; that table contains entitlement and usage authority, and no current client update consumer exists. Create isolated Kakao Pay order/subscription records. Secret-bearing identifiers are service-role only. An approval is claimable once only. A renewal claim is unique per subscription/billing period before any provider request. The activation scenarios are: (1) an authenticated REST update/insert tries to set `members.plan=pro` and fails; (2) two approval invocations for one ready order produce one `approving` claim; (3) two cron invocations for a due subscription produce one renewal-order claim.

## Change map

| Path                                                                                           | Change | Detail                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev_poc/poc-4-edge-function/supabase/migrations/20260818001000_add_kakaopay_subscription.sql` | NEW    | `kakaopay_payment_orders`, `kakaopay_subscriptions`, indexes, RLS, and timestamp triggers; all provider tokens remain in these private tables.        |
| `dev_poc/poc-4-edge-function/supabase/migrations/20260818001000_add_kakaopay_subscription.sql` | NEW    | drop `members_update_own`/`members_insert_own`; add server-only `recompute_member_plan(UUID)` and atomic `claim_kakaopay_renewal(...)` SQL functions. |

## Data contract

`kakaopay_payment_orders`: `order_id` -> `user_id`, `plan`, server-authoritative amount/name, pseudonymous `partner_user_id`, `tid` (unique), `sid`, `billing_period_start`, `status`, provider status, payment method, paid/cancelled timestamps, failure code/message. Allowed lifecycle: `ready -> approving -> paid`, `ready/approving -> reconciliation_required|failed`, `paid -> refunded`, `paid -> partially_refunded`. `partner_order_id` is the primary key and stays correlated with TID after ready succeeds; abandoned ready orders expire without entitlement.

`kakaopay_subscriptions`: `user_id` -> `sid`, recurring CID reference through env rather than stored secret, `plan`, `status`, `current_period_end`, `next_billing_at`, `cancel_requested_at`, `cancel_at_period_end`, `renewal_claimed_at`, `retry_count`, and provider SID status. Cancellation immediately deactivates the SID and marks `cancel_at_period_end`; entitlement remains until `current_period_end`. A scheduler finalizes it only at/after that timestamp. `sid` never has a SELECT policy for authenticated users.

Field chain: plan creation comes only from authenticated `kakaopay-ready`; it is persisted into the order row; approval/renewal deserialize via service-role queries; consumers are approve, recurring, unified cancellation, refund, reconcile, and the success page. TID/SID are created only from Kakao Pay responses, persisted in private tables, and consumed only by Edge Functions. No client serialization exists (N/A by design). `current_period_end` is created from paid time + selected period, serialized only in private tables, and consumed by renewal/cancellation/recompute logic. `billing_period_start` is created by the renewal claim, persisted as a unique `(user_id, billing_period_start)` reservation, then consumed by reconcile/retry; it has no browser path (N/A by design).

## Verification

- Apply migration to the linked Supabase project and inspect tables/RLS.
- With a user JWT, attempt `members` plan insert/update and select private token columns; all must fail or return no rows.
- Call the conditional approval claim twice; one call must observe the claimed row and the other must receive no claim.
- Call the renewal claim concurrently twice for one period; exactly one row and one provider request path may exist.
- Seed active Toss + Kakao rows, then cancel/refund either one; recompute must retain Pro until both are non-entitled.
