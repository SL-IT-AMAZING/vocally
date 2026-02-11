# Paddle Payment Integration Plan

## Web + Desktop — Full Implementation

**Goal**: Enable Paddle checkout on BOTH the marketing website AND the desktop app, using the same Supabase auth system and webhook infrastructure.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    USER FLOWS                         │
├──────────────────────┬───────────────────────────────┤
│     WEBSITE          │       DESKTOP APP             │
│                      │                               │
│ 1. Click "Subscribe" │ 1. Click "Subscribe"          │
│ 2. Google OAuth popup│ 2. Already logged in          │
│ 3. member-init       │ 3. (member already exists)    │
│ 4. Paddle overlay    │ 4. Paddle overlay             │
│ 5. checkout.completed│ 5. checkout.completed         │
│ 6. paddle-verify     │ 6. paddle-verify              │
│ 7. Show success +    │ 7. refreshMember()            │
│    "Download app"    │ 8. Pro unlocked               │
└──────────┬───────────┴──────────────┬────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTIONS                  │
│                                                       │
│  paddle-verify  ←  Client calls after checkout        │
│  paddle-webhook ←  Paddle calls (source of truth)     │
│  member-init    ←  Called on first login              │
│  member-get     ←  Returns member data               │
└──────────────────────────────────────────────────────┘
```

---

## WAVE 0: Prerequisites (User does manually in dashboards)

### Task 0.1: Paddle Dashboard — Create Live Products

**Who**: User (in browser)
**Steps**:

1. Go to Paddle dashboard → Products → Create Product
   - Name: "Vocally Pro"
   - Description: "Full power voice-to-text with cloud transcription"
2. Create 2 prices:
   - Monthly: $8/month (or whatever you want) recurring
   - Yearly: $60/year recurring
3. Note the `live_` client token from Developer Tools → Authentication
4. Note the `pri_` price IDs for monthly and yearly
5. Set default payment link to `https://vocally-web.vercel.app`

### Task 0.2: Paddle Dashboard — Configure Webhook

**Who**: User (in browser)
**Steps**:

1. Go to Developer Tools → Notifications → New Destination
2. URL: `https://prtyyjlmnjbibjjwwfgl.supabase.co/functions/v1/paddle-webhook`
3. Events to subscribe:
   - `transaction.completed`
   - `subscription.canceled`
   - `subscription.updated`
4. Note the webhook signing secret

### Task 0.3: Google Cloud Console — Add Website Redirect URI

**Who**: User (in browser)
**Steps**:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit OAuth 2.0 Client ID `439756522014-rqkqaq4ikthdllvig8700aodo2itflth`
3. Add Authorized redirect URIs:
   - `https://prtyyjlmnjbibjjwwfgl.supabase.co/auth/v1/callback`
     (This should already exist for desktop. Verify it's there.)
4. Add Authorized JavaScript origins:
   - `https://vocally-web.vercel.app`

### Task 0.4: Supabase Dashboard — Configure Auth Redirect

**Who**: User (in browser)
**Steps**:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `https://vocally-web.vercel.app/**`
   - `https://vocally-web.vercel.app/auth/callback`

### Task 0.5: Supabase Dashboard — Set Edge Function Secrets

**Who**: User (in browser)
**Steps**:

1. Go to Supabase Dashboard → Edge Functions → Secrets (or use CLI)
2. Set:
   - `PADDLE_API_KEY` = your Paddle API key (from Paddle → Developer Tools → Authentication → API Key)
   - `PADDLE_WEBHOOK_SECRET` = from Task 0.2
   - `PADDLE_ENVIRONMENT` = `production`

---

## WAVE 1: Foundation (Parallel — 3 tasks simultaneously)

### Task 1.1: Deploy Edge Functions to Production Supabase

**Category**: quick
**Files**:

- Copy `dev_poc/poc-4-edge-function/supabase/functions/paddle-webhook/index.ts` → deploy to production
- Copy `dev_poc/poc-4-edge-function/supabase/functions/paddle-verify/index.ts` → deploy to production
- Copy shared helpers: `_shared/supabase.ts`, `_shared/auth.ts`, `_shared/cors.ts`, `_shared/response.ts`

**Commands**:

```bash
# Link to production Supabase project
supabase link --project-ref prtyyjlmnjbibjjwwfgl

# Deploy paddle-webhook (no JWT verify — Paddle can't send JWT)
supabase functions deploy paddle-webhook --no-verify-jwt

# Deploy paddle-verify (with JWT verify — needs authenticated user)
supabase functions deploy paddle-verify
```

**Edge case**: The functions are in `dev_poc/` which is a separate Supabase project directory. Need to either:

- a) Create a `supabase/functions/` directory in the monorepo root, OR
- b) Deploy directly from `dev_poc/` directory by linking to the correct project

**Decision**: Create proper `supabase/` directory in monorepo root. Copy functions there.

### Task 1.2: Add Supabase + Paddle.js to Website

**Category**: unspecified-low
**Files to modify/create**:

1. **Install dependencies**:

   ```bash
   cd apps/web && npm install @supabase/supabase-js
   ```

2. **Create `apps/web/.env`** (NOT committed):

   ```
   VITE_SUPABASE_URL=https://prtyyjlmnjbibjjwwfgl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHl5amxtbmpiaWJqand3ZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTMwOTMsImV4cCI6MjA4NTk2OTA5M30.OmQ7WuJZRTORVOw6-fhaOVpryn_qRPMAS-7rFA8L1-0
   VITE_PADDLE_CLIENT_TOKEN=test_95353dcd93c4c98e8ce14b3dfd0
   VITE_PADDLE_PRICE_MONTHLY=pri_01kgp4x6gxggtp3p2nrkn5wzbq
   VITE_PADDLE_PRICE_YEARLY=pri_01kh2p21nptcmktxxm2a2rsppj
   ```

3. **Create `apps/web/src/lib/supabase.ts`**:

   ```typescript
   import { createClient } from "@supabase/supabase-js";

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error("Missing Supabase environment variables");
   }

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

4. **Create `apps/web/src/lib/paddle.ts`**:
   - Load Paddle.js script dynamically
   - Initialize with client token
   - Export `openCheckout(priceId, email, userId)` function
   - Auto-detect sandbox vs production based on hostname

5. **Add Vercel environment variables** (for production):
   - In Vercel dashboard → Settings → Environment Variables
   - Add all `VITE_*` variables with production values

### Task 1.3: Create Auth Context for Website

**Category**: visual-engineering + frontend-ui-ux
**Files to create**:

1. **`apps/web/src/context/auth-context.tsx`**:
   - React context providing `{ user, loading, signIn, signOut }`
   - `signIn()` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://vocally-web.vercel.app/auth/callback' } })`
   - On mount, calls `supabase.auth.getSession()` to restore session
   - Listens to `supabase.auth.onAuthStateChange()` for real-time updates
   - After sign-in detected, calls `member-init` edge function

2. **`apps/web/src/pages/AuthCallbackPage.tsx`**:
   - New route: `/auth/callback`
   - On mount, Supabase auto-parses the auth tokens from URL hash
   - Shows "Signing in..." spinner
   - After auth confirmed, redirects to `/pricing` (or wherever user came from)

3. **Update `apps/web/src/App.tsx`**:
   - Wrap app with `<AuthProvider>`
   - Add route: `<Route path="/auth/callback" element={<AuthCallbackPage />} />`

4. **Update prerender script**:
   - Add `/auth/callback` to prerendered routes (or SKIP it since it's a client-only page)
   - Make sure Supabase client doesn't crash in SSR context (guard with `typeof window !== 'undefined'`)

---

## WAVE 2: Checkout UI (After Wave 1 complete)

### Task 2.1: Website Pricing Page — Add Checkout Flow

**Category**: visual-engineering
**Skills**: frontend-ui-ux
**Files to modify**:

1. **`apps/web/src/components/pricing-section/index.tsx`**:
   - Import auth context (`useAuth`)
   - Change Pro plan CTA button:
     - If NOT logged in: "Sign in to Subscribe" → triggers Google OAuth
     - If logged in: "Subscribe — $5/mo" → opens Paddle overlay checkout
     - If already Pro: "You're subscribed ✓" (disabled)
   - After checkout.completed → call `paddle-verify` → show success UI

2. **`apps/web/src/components/pricing-section/checkout-dialog.tsx`** (NEW):
   - Modal/dialog similar to desktop's PaymentDialog
   - Monthly/yearly toggle
   - "Subscribe" button → calls `Paddle.Checkout.open()`
   - Success state → "Payment complete! Download Vocally to get started"
   - Error handling

3. **`apps/web/src/vite-env.d.ts`** (UPDATE):
   - Add Paddle + Supabase env var type declarations:
   ```typescript
   interface ImportMetaEnv {
     readonly VITE_SUPABASE_URL: string;
     readonly VITE_SUPABASE_ANON_KEY: string;
     readonly VITE_PADDLE_CLIENT_TOKEN: string;
     readonly VITE_PADDLE_PRICE_MONTHLY: string;
     readonly VITE_PADDLE_PRICE_YEARLY: string;
   }
   ```

### Task 2.2: Website — Handle Paddle Payment Link (\_ptxn)

**Category**: quick
**Files to modify**:

1. **`apps/web/src/App.tsx`** or **`apps/web/src/components/paddle-checkout-handler.tsx`**:
   - On app load, check for `_ptxn` query parameter
   - If present, load Paddle.js and let it auto-open checkout
   - This handles Paddle's default payment link flow (subscription emails, update payment links)
   - Must work on the root route `/`

### Task 2.3: Desktop App — Verify Live Mode Works

**Category**: quick
**Steps**:

1. Test with sandbox first (already working)
2. Swap `.env` to live credentials
3. Test checkout flow end-to-end
4. **Edge case — domain restriction**: If Paddle blocks overlay checkout from `tauri://localhost`:
   - Fallback: Open `https://vocally-web.vercel.app/pricing?plan=pro_monthly&userId={userId}&email={email}` in user's default browser
   - Website handles the checkout and redirects back via deep link `vocally://payment-success`
   - **This is Plan B** — try overlay first, only implement this if needed

---

## WAVE 3: Hardening (After Wave 2)

### Task 3.1: Webhook Improvements

**Category**: quick
**Files**: `supabase/functions/paddle-webhook/index.ts`
**Changes**:

- Add `subscription.updated` event handling (plan changes, payment method updates)
- Add logging for debugging
- Handle idempotency (same event received twice)

### Task 3.2: Subscription Status on Website

**Category**: quick
**Files**: Website pricing section
**Changes**:

- After login, call `member-get` to check current plan
- If Pro: Show "You're subscribed" instead of checkout button
- Show "Manage subscription" link (Paddle customer portal)

### Task 3.3: Error Handling & Edge Cases

**Category**: unspecified-low
**Cases to handle**:

1. **Payment succeeds but verify fails**: Webhook is source of truth — user gets Pro eventually (within seconds). Show "Verifying payment..." and retry `member-get` a few times.
2. **User closes browser during OAuth**: Session not created. Next visit, user is not logged in. No harm done.
3. **User pays on web, opens desktop**: `refreshMember()` on desktop login picks up Pro status from same `members` table. Works automatically.
4. **User pays on desktop, visits website**: If user logs into website, `member-get` returns Pro status. Works automatically.
5. **Subscription canceled**: Webhook handles `subscription.canceled` → sets `plan = "free"`. Both web and desktop will see updated status on next `member-get`.
6. **Duplicate member-init**: Uses `upsert` with `ignoreDuplicates: true` — safe to call multiple times.

---

## WAVE 4: Go Live (After all waves)

### Task 4.1: Swap to Production Credentials

**Steps**:

1. Update `apps/desktop/.env` with live Paddle credentials
2. Update Vercel env vars with live Paddle credentials
3. Verify `PADDLE_ENVIRONMENT=production` in Supabase secrets
4. **CRITICAL**: In `PaymentDialog.tsx`, environment detection uses `import.meta.env.DEV`. In production builds this is `false`, so sandbox won't be set. This is correct. Verify this.

### Task 4.2: End-to-End Testing

**Test matrix**:

| Test                       | Website | Desktop |
| -------------------------- | ------- | ------- |
| Sign in with Google        | ✅      | ✅      |
| Open Paddle checkout       | ✅      | ✅      |
| Complete payment (sandbox) | ✅      | ✅      |
| Verify Pro activated       | ✅      | ✅      |
| Cancel subscription        | ✅      | ✅      |
| Verify downgraded to Free  | ✅      | ✅      |
| Pay on web, check desktop  | ✅      | ✅      |
| Pay on desktop, check web  | ✅      | ✅      |
| Payment link (\_ptxn)      | ✅      | N/A     |

---

## File Summary

### New Files

| File                                                          | Purpose                                    |
| ------------------------------------------------------------- | ------------------------------------------ |
| `apps/web/.env`                                               | Supabase + Paddle env vars (NOT committed) |
| `apps/web/src/lib/supabase.ts`                                | Supabase client                            |
| `apps/web/src/lib/paddle.ts`                                  | Paddle.js loader + checkout helper         |
| `apps/web/src/context/auth-context.tsx`                       | Auth state + Google OAuth                  |
| `apps/web/src/pages/AuthCallbackPage.tsx`                     | OAuth redirect handler                     |
| `apps/web/src/components/pricing-section/checkout-dialog.tsx` | Checkout modal                             |
| `apps/web/src/vite-env.d.ts`                                  | Env var types (update existing)            |
| `supabase/functions/`                                         | Production edge functions directory        |

### Modified Files

| File                                                | Change                                         |
| --------------------------------------------------- | ---------------------------------------------- |
| `apps/web/package.json`                             | Add `@supabase/supabase-js`                    |
| `apps/web/src/App.tsx`                              | Add AuthProvider + callback route              |
| `apps/web/src/components/pricing-section/index.tsx` | Add checkout buttons + auth integration        |
| `apps/web/scripts/prerender.mjs`                    | Guard against SSR crashes from Supabase/Paddle |

### Dashboard Configuration (Manual)

| Dashboard    | Action                                                            |
| ------------ | ----------------------------------------------------------------- |
| Paddle       | Create live product + prices, set payment link, configure webhook |
| Google Cloud | Add redirect URI for website                                      |
| Supabase     | Add redirect URLs, set edge function secrets                      |
| Vercel       | Add env vars for production                                       |

---

## Estimated Effort

- Wave 0 (dashboards): 30 min (user does manually)
- Wave 1 (foundation): 2-3 hours
- Wave 2 (checkout UI): 2-3 hours
- Wave 3 (hardening): 1-2 hours
- Wave 4 (go live): 1 hour
- **Total**: ~1 day of implementation
