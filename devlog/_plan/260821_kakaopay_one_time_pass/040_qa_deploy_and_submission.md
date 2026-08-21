# 040 — QA, deployment, and submission package

## Goal

Produce independently checkable disabled-mode production evidence for a separate one-time product, then prepare the exact material Kakao asked for.

## Verification matrix

| Check | Evidence |
| --- | --- |
| Type/build/prerender | `npm run build --workspace=web`; it executes `tsc --noEmit`, Vite build, and the app prerender script, which includes `/pricing`, `/terms`, and `/refund`. Base-tree run exited 0 before this plan. |
| Server gates | Deno tests explicitly invoke the new one-time functions with disabled, invalid product, duplicate, mismatch, and refund states. |
| Schema | Apply migration in an isolated Supabase environment; query rows/RPC state for paid, expired, and refunded examples. |
| Visual QA | Signed-in browser path: pricing card -> one-time review -> disabled notice. Confirm existing monthly Kakao review and each Toss CTA remain distinct. |
| Production disabled proof | Deploy functions with one-time flag unset, then invoke only an authenticated/controlled disabled-path request. No real CID, secret, or money movement. |

## Exact execution order

1. From repository root, run `npm run build --workspace=web`; retain complete command output and exit status.
2. From `dev_poc/poc-4-edge-function`, run the focused one-time Deno gate test named in phase 020, then apply the migration to an isolated local Supabase project using `supabase start && supabase db reset` and execute the SQL fixture/query sequence in phase 010.
3. Start the existing web development command with the one-time frontend flag unset. Use the Aside browser only: perform the four browser steps in phase 030 and save read-back screenshots plus the disabled-action network result.
4. Before production deployment, compare `git diff main...HEAD --` for `apps/web`, `dev_poc/poc-4-edge-function`, and policy files. Assert the existing `kakaopay-ready`, `kakaopay-approve`, `kakaopay-recurring`, `toss-checkout`, and `toss-recurring` source paths were not modified unless a targeted regression test documents why.
5. Deploy only with `KAKAOPAY_ONETIME_ENABLED` and its frontend counterpart unset. Invoke an authenticated controlled request to the new ready endpoint and assert the disabled response occurs before database mutation; query the order table to prove no new order. This is the production proof and must not call Kakao.

## Submission package

1. Pricing page screenshot showing the standalone one-time item.
2. Signed-in one-time review screenshot showing all commercial facts and policy links.
3. Terms/refund screenshot or URLs that expressly cover 30-day access, no auto-renewal, and refund handling.
4. Reply draft in the existing Kakao thread: state that the one-time product is now posted and attach screenshots; ask for the separate card/internal-review steps. Do not send until current user approval.

## Deployment and external boundaries

- Create a focused PR from `feature/kakaopay-one-time-pass`; merge and deploy only after review/build/visual proof.
- Keep `KAKAOPAY_ONETIME_ENABLED` off and do not configure any live CID/Secret until Kakao has granted the one-time payment category and the user explicitly authorizes secret setup.
- If Kakao asks for another e-contract or an actual purchase, stop and request user confirmation.
