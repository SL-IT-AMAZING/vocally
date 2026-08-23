# 010 — One-time data and entitlement

## Goal

Give a paid `pro_30_day_once` order a server-owned, auditable 30-day entitlement without entering either recurring-subscription table.

## Change map

| Path | Change |
| --- | --- |
| `dev_poc/poc-4-edge-function/supabase/migrations/20260821010000_add_kakaopay_one_time_pass.sql` | Add `kakaopay_one_time_orders` and `kakaopay_one_time_entitlements`, RLS, indexes, immutable payment-field trigger, update trigger, and an amendment to `recompute_member_plan`. |
| `dev_poc/poc-4-edge-function/supabase/functions/member-get/index.ts` | Recompute effective plan with service role before returning membership so expiration is visible on the next authenticated read. |
| `dev_poc/poc-4-edge-function/supabase/functions/_shared/kakaopay.ts` | Define server-authoritative one-time product catalog and types; no browser price/duration input. |
| `dev_poc/poc-4-edge-function/supabase/functions/_shared/kakaopay_test.ts` | Add catalog/type tests and test fixtures reused by payment-gate tests. |

## Contract

- `kakaopay_one_time_orders`: immutable `product_key`, server price/order name, `order_id`, user, hashed partner user id, `tid`, `aid`, provider status, terminal/repair states, timestamps, and refund fields. Unique provider IDs prevent an approval from being credited twice. A database trigger rejects changes to `user_id`, `product_key`, `amount`, `currency`, and `order_name` after insert; status/provider fields remain mutable only for the server payment lifecycle.
- `kakaopay_one_time_entitlements`: one row per successful order with `UNIQUE (source_order_id)`, `starts_at`, `ends_at`, `status` (`active`, `refunded`, `expired`), and the source order id. A database trigger accepts it only when its user and product match a paid source order; it also makes source/user/product/timing fields immutable after insert. Its end time is calculated from the server catalog at approval time.
- `recompute_member_plan` first transitions active one-time entitlement with `ends_at <= NOW()` to `expired`, then treats only active unexpired entitlement exactly like an unexpired subscription when deriving `members.plan`; it never writes entitlement time from browser data.
- `member-get` calls that service-role RPC before selecting `members`; an RPC error returns a safe 500 response rather than stale Pro membership. Recomputing a free plan preserves an existing free trial; a derived Pro plan ends the trial.
- The later ready path must use an authoritative protected-database check for active recurring or one-time access and a transaction/lock to prevent two concurrent purchases. It does not extend access silently. Renewal is a fresh, later purchase after expiry.
- Refund is full-refund-only for this product. A partial refund is rejected before the provider call because the service has no partial-access entitlement state; a confirmed full refund revokes the full entitlement.

## Field chain

| Field/value | Creation | Serialization | Deserialization | Consumers |
| --- | --- | --- | --- | --- |
| `pro_30_day_once` | shared server catalog and ready request allow-list | `kakaopay_one_time_orders.product_key` | approve loads order by id and product key | ready, approve, refund, review copy, tests |
| `starts_at` / `ends_at` | approve transaction only | entitlement row | recompute/member-get query | access checks, success copy, refund recovery |
| `status` | ready/approve/refund state machine | order/entitlement rows | functions load terminal state before provider calls | idempotency, refund, reconciliation tests |

## Acceptance scenarios

- A crafted request supplies `amount`, `duration`, or a different product key: the server ignores unsupported fields and only accepts `pro_30_day_once`; observed result is HTTP 400 before order insertion/provider request.
- Repeated approval redirect uses the same order: exactly one paid order and entitlement remain; observed result is an idempotent success response.
- An entitlement has passed `ends_at`: the next `member-get` returns Free after recomputation.
- A refund marks the entitlement unavailable and the next membership read is Free unless a valid recurring subscription still exists.
- The membership recomputation RPC fails: `member-get` returns a safe error and never returns a stale paid plan.
- Two ready attempts race for the same user: the later phase's protected claim admits at most one pending/purchased one-time order and grants no overlapping entitlement.

## Runnable verification recipe

1. Start an isolated local stack from `dev_poc/poc-4-edge-function` with `supabase start && supabase db reset`; use a seeded authenticated test user and a service-role SQL session only in the local project.
2. Insert a paid fixture order and a matching active entitlement ending one minute in the future. Invoke `member-get` as that user and assert `plan === "pro"`; update only `ends_at` to one minute in the past, invoke it again, and assert `plan === "free"`.
3. Insert the same paid order/entitlement fixture twice through the approval test harness and assert exactly one order and one entitlement by `order_id`; assert the second response is the documented idempotent response.
4. Set `ends_at` in the past and invoke `member-get`; assert both `status = 'expired'` in the entitlement query and `plan === "free"`. Separately force the RPC to return an error in the handler test and assert a 500 response, not a stale paid member object.
5. Mark the order full-refunded through the cancel harness, query the entitlement status, and invoke `member-get`; assert `status = 'refunded'` and `plan === "free"` unless the fixture also contains a valid recurring entitlement.
6. Run the targeted Deno test file named in phase 020. Keep fixture values generated locally and never use a production user, CID, or secret.
