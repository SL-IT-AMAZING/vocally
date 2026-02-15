# Payment Promotion Flow Audit Report

## Executive Summary

The payment promotion flow is **correctly implemented for new successful payments** but **requires manual intervention for already-missed users**. The system relies on Polar webhooks for real-time promotion and includes a manual reconciliation function as a recovery tool.

---

## 1. HOW SUCCESSFUL PAYMENT PROMOTES USER TO PRO

### Current Flow
When a user completes a Polar payment checkout:

1. **Polar sends webhook event** → `polar-webhook` edge function
2. **Event type triggers promotion** on one of these events:
   - `checkout.updated` (status = "succeeded")
   - `order.created`
   - `subscription.active`

3. **User is promoted to pro** via:
   ```typescript
   // polar-webhook/index.ts:77-100, 159-179, 195-209
   
   // Step 1: Ensure member row exists (creates if missing)
   await ensureMemberExists(supabase, userId); // defaults to "free"
   
   // Step 2: Update to pro
   await supabase
     .from("members")
     .update({
       plan: "pro",
       is_on_trial: false,
       polar_subscription_id: subscriptionId  // if available
     })
     .eq("id", userId);
   ```

4. **User ID extraction** (from Polar metadata):
   ```typescript
   // polar-webhook/index.ts:101-116
   const userId = 
     event.data.metadata.supabase_user_id ||
     event.data.customer.metadata.supabase_user_id
   ```

### What triggers promotion
- ✅ `checkout.updated` with `status="succeeded"`
- ✅ `order.created` (any status, assumes success)
- ✅ `subscription.active` (subscription activated)
- ❌ Non-succeeded checkouts are skipped

### What happens to the user
- `members.plan` → **"pro"**
- `members.is_on_trial` → **false**
- `members.polar_subscription_id` → **stored** (for cancellation lookup)

### Downgrades/Cancellations
When subscription ends:
- `subscription.canceled` / `subscription.revoked` → sets `plan="free"`
- `order.refunded` → sets `plan="free"`

---

## 2. MANUAL RECOVERY REQUIRED FOR MISSED USERS

### Status: ⚠️ NOT AUTOMATIC

**Missed users are NOT automatically backfilled.** They require explicit manual recovery.

#### Why users might be missed
1. Polar webhook fails silently (network error, invalid signature, misconfigured metadata)
2. User metadata missing from Polar event (no `supabase_user_id` in metadata)
3. Webhook endpoint misconfiguration (POLAR_WEBHOOK_SECRET not set)
4. Old orders created before system implemented (system deployed 2026-02-11)

#### Recovery Process

**The `polar-reconcile` edge function can recover missed users:**

```typescript
// polar-reconcile/index.ts:34-160

POST /functions/v1/polar-reconcile (requires auth)
  ↓
Authenticate user (must be signed in)
  ↓
Paginate through ALL Polar orders
  ↓
For each order with supabase_user_id metadata:
  - If no member row exists → CREATE with plan="pro"
  - If member exists but plan!="pro" → UPDATE to plan="pro"
  ↓
Return summary: { totalOrders, totalReconciled, reconciledUserIds, errors }
```

**Key characteristics:**
- ✅ **Creates missing member rows** as pro
- ✅ **Upgrades non-pro members** to pro
- ✅ **Stores polar_subscription_id** for future cancellations
- ❌ **NOT scheduled/automatic** — must be called manually
- ❌ **Requires authentication** — admin or user must invoke
- ❌ **No cron/scheduler triggers** exist in codebase

#### Invocation Method
This is currently a **manual admin function**. No scheduled recovery exists.

Possible invocation points (NOT currently implemented):
- Admin dashboard endpoint
- Scheduled job/cron (would need Supabase Crons or external scheduler)
- Background task in desktop/web app
- Manual curl/API call

---

## 3. EXACT FILES IMPLEMENTING EACH PART

### Promotion Logic
| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Webhook Handler** | `dev_poc/poc-4-edge-function/supabase/functions/polar-webhook/index.ts` | 118-256 | Receives Polar events, extracts userId, promotes to pro |
| **User ID Extraction** | `polar-webhook/index.ts` | 101-116 | Extracts `supabase_user_id` from event metadata |
| **Member Init** | `polar-webhook/index.ts` | 77-99 | `ensureMemberExists()` creates free member if missing |
| **Pro Promotion** | `polar-webhook/index.ts` | 161-173, 197-209 | Updates member.plan to "pro" |
| **Webhook Signature** | `polar-webhook/index.ts` | 31-75 | Validates HMAC-SHA256 signature |

### Recovery Logic
| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Reconcile Job** | `dev_poc/poc-4-edge-function/supabase/functions/polar-reconcile/index.ts` | 34-160 | Manual pagination & backfill of missed users |
| **Polar API Pagination** | `polar-reconcile/index.ts` | 56-148 | Fetches all orders from Polar API |
| **Member Creation** | `polar-reconcile/index.ts` | 88-106 | Creates missing pro members |
| **Member Upgrade** | `polar-reconcile/index.ts` | 120-142 | Upgrades non-pro members to pro |

### Supporting Functions
| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Member Init** | `dev_poc/poc-4-edge-function/supabase/functions/member-init/index.ts` | 7-35 | Called on first sign-in, creates free member row |
| **Member Get** | `dev_poc/poc-4-edge-function/supabase/functions/member-get/index.ts` | 7-47 | Returns user's member record with plan/usage |
| **Database Schema** | `dev_poc/poc-4-edge-function/supabase/migrations/20260211000000_add_polar_columns.sql` | 1-6 | Adds `polar_subscription_id`, `polar_customer_id` columns |

### Client Call Sites
| Location | File | Purpose |
|----------|------|---------|
| Web Pricing CTA | `apps/web/src/components/pricing-section/index.tsx:153` | Invokes `polar-checkout` |
| Desktop Payment Dialog | `apps/desktop/src/components/payment/PaymentDialog.tsx:103` | Invokes `polar-checkout`, polls member status |
| Web Auth Sign-in | `apps/web/src/context/auth-context.tsx:41` | Calls `member-init` on sign-in |
| Desktop Login | `apps/desktop/src/actions/login.actions.ts:16` | Calls `member-init` then `member-get` |
| Desktop Kakao Login | `apps/desktop/src/actions/kakao-login.actions.ts:13` | Calls `member-init` then `member-get` |
| Desktop Member Refresh | `apps/desktop/src/actions/member.actions.ts:14` | Refreshes via `member-get` |
| Desktop App Boot | `apps/desktop/src/components/root/AppSideEffects.tsx:125` | Fetches member on app start |

---

## 4. DETAILED FLOW DIAGRAMS

### ✅ Successful Payment Flow (Automatic)
```
User completes Polar checkout
  ↓
Polar sends webhook (checkout.updated/order.created/subscription.active)
  ↓
polar-webhook receives event
  ↓
Verifies HMAC-SHA256 signature ← (POLAR_WEBHOOK_SECRET)
  ↓
Extracts supabase_user_id from metadata
  ↓
ensureMemberExists(userId) → creates free member if missing
  ↓
UPDATE members SET plan='pro', is_on_trial=false, polar_subscription_id=...
  ↓
User can now use pro features (100k words/month)
```

### ❌ Missed Users Flow (Manual Recovery Required)
```
Order exists in Polar but webhook failed/never arrived
  ↓
User remains as "free" plan indefinitely
  ↓
[MANUAL ACTION REQUIRED]
  ↓
Admin/Developer calls POST /functions/v1/polar-reconcile
  ↓
polar-reconcile authenticates request
  ↓
Paginates Polar orders API (100 per page)
  ↓
For each order with supabase_user_id:
  - Check if member row exists
  - If missing: INSERT as pro
  - If non-pro: UPDATE to pro
  ↓
Returns: { totalOrders, totalReconciled, errors }
```

---

## 5. CRITICAL FINDINGS

### ⚠️ Issue #1: No Automatic Backfill
**Problem:** Missed users are not automatically recovered.
- `polar-reconcile` is **not scheduled**
- No cron job or timer exists
- No background task invokes it
- **Users who had payment process errors remain stuck as "free"**

**Risk:** 
- Customers who paid but weren't promoted are silently locked out of pro features
- This could be a support nightmare if not addressed

**Current Mitigation:**
- Manual reconciliation available via API
- `polar-reconcile` can fix users if invoked

**Recommendation:**
- Add scheduled job (Supabase Crons or external scheduler) to call reconcile daily
- Or add UI button for admins to manually trigger

---

### ⚠️ Issue #2: Webhook Signature Verification
**Current:** Validates HMAC-SHA256 with `POLAR_WEBHOOK_SECRET`
**Risk:** If secret is misconfigured, **all webhooks are silently rejected** with 401

### ⚠️ Issue #3: Metadata Must Be Present
**Current:** User ID extracted from Polar metadata
**Risk:** If `supabase_user_id` not attached during checkout, user won't be promoted

**Checkout code must attach metadata:**
```typescript
// This MUST happen when creating checkout
{
  checkoutData: {
    metadata: {
      supabase_user_id: user.id  // REQUIRED
    }
  }
}
```

---

## 6. DATABASE CHANGES

### Migration Applied
- **File:** `20260211000000_add_polar_columns.sql`
- **Date:** 2026-02-11
- **Changes:**
  - `ALTER TABLE members ADD COLUMN polar_subscription_id TEXT`
  - `ALTER TABLE members ADD COLUMN polar_customer_id TEXT`
  - `CREATE INDEX idx_members_polar_subscription_id` (for cancellation lookups)

### No Schema Changes Required
- `members.plan` already exists (enum: free/pro)
- No migration needed for promotion logic

---

## 7. TEST CHECKLIST

- [ ] Verify `POLAR_WEBHOOK_SECRET` is set in production
- [ ] Verify `POLAR_ACCESS_TOKEN` is set for reconcile
- [ ] Test: Create checkout with `supabase_user_id` metadata
- [ ] Test: Webhook received and user promoted to pro
- [ ] Test: Subscription cancellation downgrades to free
- [ ] Test: Run reconcile on old Polar orders
- [ ] Test: Old users backfilled to pro
- [ ] **Setup:** Add scheduled reconcile job (daily recommended)

---

## 8. SUMMARY

| Aspect | Status | Notes |
|--------|--------|-------|
| **Real-time Promotion** | ✅ Working | Webhook → pro on successful payment |
| **Automatic Backfill** | ❌ Missing | No scheduled reconcile exists |
| **Manual Recovery** | ✅ Available | `polar-reconcile` API endpoint ready |
| **Production Ready** | ⚠️ Partial | Needs scheduled recovery job |

**Next Steps:**
1. **URGENT:** Setup scheduled `polar-reconcile` job
2. Verify webhook secret configuration
3. Verify checkout metadata attachment
4. Test end-to-end payment flow in production
5. Monitor webhook delivery logs

