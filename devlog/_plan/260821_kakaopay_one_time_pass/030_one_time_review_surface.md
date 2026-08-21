# 030 — One-time product and review surface

## Goal

Make a reviewer and buyer see a real, unambiguous one-time digital product before any Kakao redirect.

## Change map

| Path | Change |
| --- | --- |
| `apps/web/src/components/pricing-section/index.tsx` | Keep recurring cards intact and add a visually separate one-time product card. Its CTA uses a dedicated one-time review route, not the monthly route. |
| `apps/web/src/pages/KakaoPayOneTimeReviewPage.tsx` | Render product name, KRW 7,000, 30-day period, `1회 결제`, `자동 갱신 없음`, digital delivery, signed-in account, and terms/refund links. In disabled state it is reviewable but cannot collect money. |
| `apps/web/src/pages/KakaoPayOneTimeSuccessPage.tsx` | Call only one-time approval and state the date the access ends; failure/cancel pages never claim that a payment succeeded. |
| `apps/web/src/App.tsx` | Register distinct one-time review, success, cancel, and fail routes. |
| `apps/web/src/pages/kakaopay-review.module.css` or focused sibling CSS | Reuse the established checkout layout; no generic payment modal or duplicated style system. |
| `apps/web/content/terms.md`, `apps/web/content/refund.md` | State one-time 30-day access, no renewal, access start/end, and applicable refund/revocation rule beside the recurring policy. |

## Review copy contract

The product must never be called a subscription, monthly plan, billing period, or recurring payment. The page presents a single product and one price:

`Vocally Pro 30일 이용권 · ₩7,000 · 결제 1회 · 자동 갱신 없음 · 결제 완료일부터 30일간 Pro 기능 제공`

## Acceptance scenarios

- Logged out user presses the product CTA: sign-in opens; no payment request is made.
- Signed-in user reaches the review page: every required product fact and policy link is visible before the payment action.
- Disabled deployment: pressing pay shows `카카오페이 단건결제 심사 진행 중` and no browser request reaches a provider endpoint.
- The existing monthly recurring card still points to the existing monthly review page, and semiannual/annual Toss actions remain unchanged.

## Runnable browser verification recipe

1. Run the existing web app, sign in with the review account only, and open `/pricing` at a 1280×720 viewport. Capture a screenshot proving the existing monthly card and the distinct `Vocally Pro 30일 이용권` card coexist.
2. Click the one-time CTA. Assert its route is the new one-time review route, its page includes `₩7,000`, `결제 1회`, `자동 갱신 없음`, `30일간`, terms link, and refund link before any payment action.
3. With `VITE_KAKAOPAY_ONETIME_ENABLED` unset, press the one-time payment action and inspect the browser network log: show the disabled notice and assert there is no request to `kakaopay-one-time-ready` or a Kakao URL.
4. Return to `/pricing`, click the monthly Kakao CTA and assert it still opens the existing monthly review route. Click each half-year/year Toss CTA and assert its URL/action matches the pre-change behavior. Save all three screenshots into the phase-040 evidence directory.
