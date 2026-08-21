# 040 — QA, deployment, and submission package

## Goal

Produce independently checkable disabled-mode production evidence for a separate one-time product, then prepare the exact material Kakao asked for.

## Verification matrix

| Check | Evidence |
| --- | --- |
| Type/build/prerender | `npm run build --workspace=web`; it executes `tsc --noEmit`, Vite build, and the app prerender script, which includes `/pricing`, `/terms`, and `/refund`. Base-tree run exited 0 before this plan. |
| Server gates | Repository-root Deno gates prove disabled-before-side-effect, missing authorization rejection, server-owned product authority, and schema invariants. Provider success/refund state is separately exercised in a rollback-only Supabase SQL transaction. |
| Schema | Apply migration in an isolated Supabase environment; query rows/RPC state for paid, expired, and refunded examples. |
| Visual QA | Signed-in browser path: pricing card -> one-time review -> disabled notice. Confirm existing monthly Kakao review and each Toss CTA remain distinct. |
| Production disabled proof | Deploy functions with one-time flag unset, then invoke only an authenticated/controlled disabled-path request. No real CID, secret, or money movement. |

## Exact execution order

1. From repository root, run `npm run build --workspace=web`; retain complete command output and exit status.
2. From the repository root, run the focused one-time Deno gate tests. Retain their output and the rollback-only Supabase SQL transaction evidence; do not claim provider success/refund fixtures that the local gate does not execute.
3. Start the existing web development command with the one-time frontend flag unset. Use the Aside browser only: perform the four browser steps in phase 030 and save read-back screenshots plus the disabled-action network result.
4. Before production deployment, compare `git diff main...HEAD --` for `apps/web`, `dev_poc/poc-4-edge-function`, and policy files. Assert the existing `kakaopay-ready`, `kakaopay-approve`, `kakaopay-recurring`, `toss-checkout`, and `toss-recurring` source paths were not modified unless a targeted regression test documents why.
5. After the user explicitly approves merge/deployment, deploy only with `KAKAOPAY_ONETIME_ENABLED` and `VITE_KAKAOPAY_ONETIME_ENABLED` unset. In the fixed production URL, use Aside Browser to click the signed-in review action and retain the screenshot/network evidence that no ready/Kakao request occurs. The authorized operator confirms Vercel Production env and Supabase flag are unset; any production order-table query is read-only and user-controlled. This proof must not call Kakao.

## Submission package

1. Pricing page screenshot showing the standalone one-time item.
2. Signed-in one-time review screenshot showing all commercial facts and policy links.
3. Terms/refund screenshot or URLs that expressly cover 30-day access, no auto-renewal, and refund handling.
4. Reply draft in the existing Kakao thread: state that the one-time product is now posted and attach screenshots; ask for the separate card/internal-review steps. Do not send until current user approval.

## Deployment and external boundaries

- Create a focused PR from `feature/kakaopay-one-time-pass`. Merge, Vercel production deployment, Supabase migration/function deployment, environment confirmation, and production DB lookup each require the user's explicit final approval and authenticated operator access.
- Keep `KAKAOPAY_ONETIME_ENABLED` off and do not configure any live CID/Secret until Kakao has granted the one-time payment category and the user explicitly authorizes secret setup.
- If Kakao asks for another e-contract or an actual purchase, stop and request user confirmation.
