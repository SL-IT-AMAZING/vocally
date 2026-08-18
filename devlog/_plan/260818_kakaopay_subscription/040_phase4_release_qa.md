# Phase 4 — Release, mockup validation, and review

## Scope and acceptance criteria

Deploy the web code and Edge Functions only after database migration and secret configuration. Test the official Kakao Pay mockup flow with a development Secret key and `TCSUBSCRIP`; do not enter a real payment method or charge a production account. Verify first approval returns/stores SID, a due renewal uses SID, duplicate approval does not double-charge, cancellation deactivates SID, and Kakao Pay Money cash receipt behavior is documented rather than duplicated.

## Change map

| Path                                                    | Change | Detail                                                                                                        |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `README.md`                                             | MODIFY | production checklist, required partner-center items, Supabase secret names, deployment/rollback steps.        |
| `devlog/_plan/260818_kakaopay_subscription/000_plan.md` | MODIFY | append command outputs, independent review verdict, screenshots, deployment ID, and unresolved merchant gate. |
| `devlog/_plan/260818_kakaopay_subscription/artifacts/*` | NEW    | C4 QA screenshots/observations only; no keys, cookies, or payment data.                                       |

## Verification and release proof

1. Run `npm run build --workspace apps/web`, `npm run lint --workspace apps/web`, `npm run check-types --workspace apps/desktop`, and the targeted function checks/deploy; retain exit codes and pre-existing warning characterization.
2. Use `npx supabase db push --project-ref prtyyjlmnjbibjjwwfgl --workdir dev_poc/poc-4-edge-function` only after dashboard/CLI authentication is verified. The CLI help accepts one or more function-name arguments; deploy the explicit inventory with `npx supabase functions deploy kakaopay-ready kakaopay-approve kakaopay-recurring subscription-cancel kakaopay-cancel-payment kakaopay-reconcile toss-recurring toss-cancel-subscription --project-ref prtyyjlmnjbibjjwwfgl --workdir dev_poc/poc-4-edge-function`. If the authenticated CLI rejects a multi-name deployment, execute and record one identical command per function. No command logs secrets.
3. Verify Vercel production artifact serves `vocally.site/pricing` with both payment methods.
4. Run an independent code reviewer against the final diff, including database/RLS, cross-provider entitlement, cron concurrency, provider-input trust boundaries, and desktop payment/cancellation consumers.
5. Record deployment target, user-visible smoke test, and rollback action (Vercel immediate prior deployment + hide Kakao Pay method/stop cron).

## Human activation gate

Production release cannot be described as active until a representative completes Kakao Pay Partner Center login, business-app/online-payment approval, domain registration, receives the production recurring CID and Secret key, and those values are saved to Supabase secrets. These are external contract/account actions, not code changes.
