# Kakao Pay one-time pass merchant-review path

## Loop specification

- **Class:** C4 — production payment, entitlement, authenticated checkout, merchant-review, and deployment surface.
- **Loop archetype:** Spec-satisfaction. The product and backend must make a one-time purchase materially distinct from a recurring subscription, then produce a reviewable site surface and evidence pack.
- **Trigger:** Kakao Pay permits a separate one-time-payment review after a real product is published and its payment screen is supplied. It does not permit six-month or annual *recurring* subscriptions.
- **Goal:** Publish and prepare the disabled-but-real `Vocally Pro 30일 이용권` (KRW 7,000, one payment, no automatic renewal) so Kakao can separately review the product, without weakening the current monthly recurring path or any Toss plan.
- **Product contract:** Pro access begins only after server-confirmed payment; it ends 30 calendar days later; there is no SID, renewal job, saved billing key, or customer cancellation action because there is no automatic renewal. A refund removes the entitlement. A user with currently active Pro access cannot buy another pass until the entitlement expires or is refunded.
- **Non-goals:** Do not present a 6/12-month product as a renamed subscription; enable Kakao Pay; collect money; create/copy a CID or Secret; accept a new contract; send mail; modify Toss payment functions/tables; or alter historic Kakao subscription rows.
- **Verifier:** `npm run build --workspace=web` (already exits 0 on the base tree and compiles every changed web route); targeted Deno payment-gate tests to be extended with one-time ready/approve/cancel cases; Supabase migration apply on a disposable/local project before production; authenticated browser QA of `pricing -> one-time review -> disabled state`; production disabled-path request checks; rendered screenshot review.
- **Stop condition:** Production has one honest one-time product and a screenshotable checkout-review page; backend schema and functions are verified in disabled mode; package contains exact evidence and a reply draft. Real CID/Secret activation, real payment, and final mail send remain user-confirmed boundaries.
- **Rollback:** Revert the merge commit and redeploy the prior Vercel/Supabase revisions. `KAKAOPAY_ONETIME_ENABLED` stays false until a separately approved activation, so rollback never needs to reverse a collected payment.

## Evidence from the current tree

- The existing pricing surface calls `/checkout/kakaopay/review` only for the monthly plan and explicitly describes Kakao Pay as monthly-only: `apps/web/src/components/pricing-section/index.tsx:61-94, 205-309, 390-408`.
- The existing review page is intentionally recurring: `apps/web/src/pages/KakaoPayReviewPage.tsx:11-13, 20-30, 69-106`.
- The shared provider contract currently exposes only `monthly` and `subscriptionCid`: `dev_poc/poc-4-edge-function/supabase/functions/_shared/kakaopay.ts:1-64`; reusing it would make a one-time pass use a subscription CID.
- The current ready function inserts a subscription order and sends `subscriptionCid`: `dev_poc/poc-4-edge-function/supabase/functions/kakaopay-ready/index.ts:34-88`.
- `recompute_member_plan` only considers recurring Toss/Kakao tables: `dev_poc/poc-4-edge-function/supabase/migrations/20260818001000_add_kakaopay_subscription.sql:66-99`; `member-get` returns the stored plan without recomputing it: `dev_poc/poc-4-edge-function/supabase/functions/member-get/index.ts:14-46`.

## Dependency-ordered work phase map

1. **010_one_time_data_and_entitlement.md** — create the one-time order/entitlement contract and make effective Pro state include it.
2. **020_one_time_kakaopay_api.md** — add separately gated standard-CID ready/approve/refund server paths that consume only server-held product data.
3. **030_one_time_review_surface.md** — add the real product card, review/success/failure routes, and policy wording needed for merchant review.
4. **040_qa_deploy_and_submission.md** — run gates and visual QA, deploy the disabled review surface, make evidence screenshots, and prepare (not send) the Kakao reply.

## Scope boundary

**In:** a new timestamped migration; narrowly named one-time Edge Functions and tests; the shared Kakao configuration owner; effective-membership recomputation; pricing, routing, review/status pages, and policy pages; Vercel/Supabase disabled deployment; review evidence.

**Out:** any live credential, merchant-console action, external application/contract acceptance, actual charge, email send, payment-provider fee choice, existing Toss code, and historic recurring orders.

## Enforcement-bypass ledger

| Field | Value |
| --- | --- |
| Tier | E4 Edge runtime + Postgres service-role mutation |
| Executing surface | one-time ready/approve/refund functions and membership recomputation |
| Known bypass | A privileged Supabase service-role operator can still change database rows; a future deploy can turn on the runtime flag. |
| Final enforcement | The browser never supplies price, duration, CID, or entitlement status. Each payment function validates the literal product key server-side and requires the dedicated runtime flag plus general-payment CID/secret configuration. |
| Residual risk | Provider approval and card/internal review are external outcomes. Human access to Supabase/Vercel remains privileged and is not made safe by application code. |
| Wording downgrade | The public page says `심사 진행 중` until the separate one-time CID is issued and activation is explicitly approved. |
