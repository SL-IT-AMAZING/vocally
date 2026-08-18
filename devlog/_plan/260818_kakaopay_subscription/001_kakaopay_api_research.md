# Kakao Pay API and threat-model research

## Official API facts

Primary source URLs and rendered sections inspected on 2026-08-18:

- `https://developers.kakaopay.com/docs/payment/online/common`: application registration, domain registration, payment process, cash receipt. It states that the online API uses server Secret Key + CID; `approval_url`/`cancel_url`/`fail_url` must use a registered web platform domain; iframe is discouraged; Kakao Pay Money cash receipts are issued automatically by Kakao Pay.
- `https://developers.kakaopay.com/docs/payment/online/single-payment`: `payment/ready`, redirect fields, and `payment/approve` schemas. Required ready fields include CID, partner order/user IDs, item name, quantity, total, tax-free amount, and three redirect URLs. Required approve fields include CID, TID, partner order/user IDs, and `pg_token`.
- `https://developers.kakaopay.com/docs/payment/online/subscription`: first payment produces SID under a recurring CID; later charges use `POST /online/v1/payment/subscription`; SID inactive/status operations are listed with CID/SID.
- `https://developers.kakaopay.com/docs/payment/online/cancellation`: cancellation uses CID, TID, cancel amount, cancel tax-free amount, optional matched VAT, and reports partial/full cancellation status.
- `https://developers.kakaopay.com/docs/payment/online/payment-detail`: order lookup uses CID + TID and reports pending, success, cancellation, and failure states.

The source schemas above are the coding contract. A development Secret key remains a hard external activation gate: before any customer-facing Kakao Pay button is enabled in production, the release checklist must run the ready/approve/subscription/inactive/status/cancel/order mockup fixtures against it and retain redacted request/response status evidence.

- Online payment requires a registered application, a client ID and a server Secret key. After merchant review, a CID is issued; test and production Secret keys differ. Evidence: the rendered official common guide, "애플리케이션 등록" and "애플리케이션 인증정보" sections.
- The web domain used by `approval_url`, `cancel_url`, and `fail_url` must be registered on the application. `vocally.site` is therefore required in the Kakao Pay web-platform settings.
- A normal first payment uses `POST /online/v1/payment/ready`, browser redirect, then `POST /online/v1/payment/approve`. Ready returns a TID; redirect provides `pg_token`; approval requires matching CID, TID, partner order ID, and partner user ID. Evidence: rendered official single-payment `Request Syntax` and `Request Body Payload` sections.
- Recurring billing is supported. The first charge uses the recurring CID and the same ready/approve flow, which returns a SID. Later charges use `POST /online/v1/payment/subscription` with CID, SID, order ID, and a stable partner user ID. The official rendered subscription guide names test CID `TCSUBSCRIP`, while its initial section also shows `TCSEQUENCE` for the optional sequential-payment flow; Vocally will use `TCSUBSCRIP` only after a mockup request confirms the assigned developer secret permits it.
- A SID can be deactivated with `POST /online/v1/payment/manage/subscription/inactive`; its state can be read with `POST /online/v1/payment/manage/subscription/status`. Evidence: rendered official subscription guide.
- Completed one-time and recurring charges can be cancelled through `POST /online/v1/payment/cancel`. The request requires CID, TID, cancellation total, and cancellation tax-free total; VAT is passed as the matching originally-calculated VAT. Evidence: rendered official cancellation guide.
- `POST /online/v1/payment/order` retrieves the state of a known TID for recovery/reconciliation and reports statuses including `SUCCESS_PAYMENT`, `PART_CANCEL_PAYMENT`, `CANCEL_PAYMENT`, `FAIL_PAYMENT`, and pending states. Evidence: rendered official payment-detail guide.
- Kakao Pay Money automatically issues the cash receipt. The merchant should not separately issue the same receipt.

## Threat model

| Asset                       | Entry point / boundary                    | Threat                                   | Control                                                                                                                                          | Must-pass proof                                                       |
| --------------------------- | ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Kakao Pay Secret/CID secret | Edge Function env -> Kakao Pay HTTPS      | source/log disclosure                    | no client import; redacted provider errors; managed secrets only                                                                                 | secret scan has no secret value                                       |
| pending order and TID       | user invokes ready/callback               | attacker approves another user's order   | authenticated user plus `user_id` match; store TID server-side                                                                                   | mismatched user/order returns 403/404                                 |
| pg_token                    | browser redirect -> approve function      | replay/duplicate approve                 | terminal-state response and conditional status claim                                                                                             | second approval has no second provider call                           |
| SID                         | Edge database -> recurring charge         | unauthorized recurring charge or leakage | RLS enabled/no user select policy; service role only                                                                                             | user query cannot read SID                                            |
| Pro entitlement             | provider response -> members table        | forged access grant                      | revoke client `members` insert/update; server-only recompute after provider state transition                                                     | direct `plan=pro` update/insert fails; provider success activates Pro |
| refund/cancel               | administrator/automation -> Edge Function | accidental or cross-user refund          | no public user refund endpoint; server-only function requires `x-kakaopay-admin-secret`, existing paid TID, and server-derived refundable amount | user JWT/missing/wrong secret fails; only valid admin secret succeeds |

## State mapping and entitlement rule

Provider `SUCCESS_PAYMENT` maps to local `paid`; `PART_CANCEL_PAYMENT` remains `paid` with cancellation totals recorded; `CANCEL_PAYMENT` maps to `refunded`; `READY`, `SEND_TMS`, `OPEN_PAYMENT`, `SELECT_METHOD`, `AUTH_PASSWORD`, and `ARS_WAITING` remain non-entitled `ready`; `QUIT_PAYMENT`, `FAIL_AUTH_PASSWORD`, and `FAIL_PAYMENT` map to `failed`. Unknown/malformed provider state is non-terminal `reconciliation_required` and never changes entitlement. A server-only `recompute_member_plan(user_id)` grants Pro if either a non-expired Toss subscription or a non-expired Kakao Pay subscription is active/grace/cancel-at-period-end; it sets free only when neither grants access.

## Known external prerequisite

The partner-center browser session is at the Kakao Account login screen. A representative must log in, complete partner-center membership/identity verification, convert the app to a business app, apply for online payments, register `https://vocally.site` (and the deployed preview domain only if needed), then issue/receive dev Secret key and recurring production CID. This cannot be fabricated or completed without that authenticated business account.
