# Phase 3 — User-visible Kakao Pay checkout

## Scope and acceptance criteria

Keep the existing pricing and Toss checkout functional while letting a signed-in customer select Kakao Pay for the selected monthly/yearly plan on both the web site and desktop app. Kakao Pay redirect is a top-level navigation/popup (not an iframe). A successful callback calls the server approval function and shows Pro only after it returns success. Cancel/fail states explain retry without exposing provider details. Server idempotency, rather than a React effect, is the correctness control for refresh/duplicate-tab behavior.

## Change map

| Path                                                                 | Change | Detail                                                                                                                            |
| -------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/pricing-section/index.tsx`                  | MODIFY | replace Toss-only subscribe action with explicit provider choice and invoke `kakaopay-ready` for Kakao Pay.                       |
| `apps/web/src/components/pricing-section/pricing-section.module.css` | MODIFY | accessible payment-method controls and error spacing, reusing current visual language.                                            |
| `apps/web/src/pages/KakaoPaySuccessPage.tsx`                         | NEW    | reads `orderId`/`pg_token`, invokes server approval exactly once per render lifecycle, shows success/error.                       |
| `apps/web/src/pages/KakaoPayCancelPage.tsx`                          | NEW    | safe cancellation/failure state and return route.                                                                                 |
| `apps/web/src/App.tsx`                                               | MODIFY | add `/checkout/kakaopay/success`, `/checkout/kakaopay/cancel`, and `/checkout/kakaopay/fail`.                                     |
| `apps/desktop/src/components/payment/PaymentDialog.tsx`              | MODIFY | add an accessible Toss/Kakao payment-method choice, invoke the corresponding checkout function, preserve browser handoff/polling. |
| `apps/desktop/src/components/settings/SettingsPage.tsx`              | MODIFY | invoke unified `subscription-cancel` rather than the Toss-specific function.                                                      |

## Verification

- Keyboard-select each payment method in the web and desktop flows; selected provider is visible and its button is correctly disabled while pending.
- With a mocked ready response, browser navigation receives the server-provided Kakao Pay redirect URL.
- Success page with missing `orderId`/`pg_token` renders the error state; refresh/reopen/duplicate-tab behavior is harmless because server approval has a terminal idempotent response.
- Render screenshots at desktop and mobile widths are retained in this unit during C.
