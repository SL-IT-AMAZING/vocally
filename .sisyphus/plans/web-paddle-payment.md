# Plan: Web Paddle Payment Integration

## Requirements Summary

- Add Supabase auth to the marketing website (same project as desktop app)
- Replace Pro plan "Download free" button with a "Subscribe" button that opens Paddle checkout
- Gate checkout behind login — show login modal if not authenticated
- Paddle checkout passes user email + userId as customData (mirrors desktop PaymentDialog)
- Support monthly ($5/mo) and yearly ($50/yr) billing options
- Show success modal with download link after successful checkout
- Personal and Enterprise plan CTAs remain unchanged
- All new strings must use react-intl with `defaultMessage` only (no hardcoded IDs)

## Scope & Constraints

### In Scope

- Supabase JS client setup for the web app
- Auth context with onAuthStateChange listener
- Login modal (email/password only — simple, marketing website)
- Header login/account button
- Pro plan CTA replacement with payment flow
- Paddle.js loading and checkout integration
- Post-checkout success modal
- Vite env variable declarations
- i18n extraction after all changes

### Out of Scope

- Google/Kakao OAuth on the website (desktop-only for now)
- New backend edge functions (reuse existing `paddle-verify`)
- Account management/settings page on website
- Subscription management UI (users manage via Paddle portal)
- Production Paddle credentials (sandbox only for this task)

### Technical Constraints

- Website is a static SPA deployed to Vercel — client-side Supabase only
- Must use same Supabase project: `https://prtyyjlmnjbibjjwwfgl.supabase.co`
- Must use same Paddle sandbox client token: `test_95353dcd93c4c98e8ce14b3dfd0`
- CSS Modules only (no MUI, no Tailwind) — matches existing website pattern
- react-intl: `defaultMessage` only, no hardcoded message IDs
- Auth state via React Context (not Zustand — website is simpler than desktop)

## Implementation Steps

### Phase 1: Foundation (Environment & Dependencies)

#### Step 1.1: Add Supabase dependency to apps/web

**File:** `apps/web/package.json`
**Action:** Add `@supabase/supabase-js` to dependencies.

```json
"dependencies": {
  "@supabase/supabase-js": "^2.49.0",
  ...existing...
}
```

Then run `npm install` from the monorepo root.

#### Step 1.2: Add environment variables

**File:** `apps/web/.env`
**Action:** Append Supabase and Paddle env vars (file is already gitignored for `.env*` except `.env` which is explicitly un-ignored via `!.env`).

```env
VITE_MIXPANEL_TOKEN="f765e7b079449c33f82ea9a5f3750b7f"
VITE_SUPABASE_URL=https://prtyyjlmnjbibjjwwfgl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydHl5amxtbmpiaWJqand3ZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTMwOTMsImV4cCI6MjA4NTk2OTA5M30.OmQ7WuJZRTORVOw6-fhaOVpryn_qRPMAS-7rFA8L1-0
VITE_PADDLE_CLIENT_TOKEN=test_95353dcd93c4c98e8ce14b3dfd0
VITE_PADDLE_PRICE_MONTHLY=pri_01kgp4x6gxggtp3p2nrkn5wzbq
VITE_PADDLE_PRICE_YEARLY=pri_01kh2p21nptcmktxxm2a2rsppj
```

**WARNING:** The `.env` file is NOT gitignored (it's un-ignored via `!.env` in `.gitignore`). The Supabase anon key is safe to commit (it's a public client key), and the Paddle token is a sandbox test token. However, consider whether these should be in `.env` (committed) vs a Vercel environment variable. For now, match the desktop pattern where `.env` contains these values.

#### Step 1.3: Add Vite env type declarations

**File:** `apps/web/src/env.d.ts`
**Action:** Extend the existing file with ImportMetaEnv interface.

```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_PADDLE_CLIENT_TOKEN: string;
  readonly VITE_PADDLE_PRICE_MONTHLY: string;
  readonly VITE_PADDLE_PRICE_YEARLY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Phase 2: Supabase Client & Auth Context

#### Step 2.1: Create Supabase client

**File:** `apps/web/src/lib/supabase.ts` (NEW)
**Action:** Mirror the desktop's `supabase.ts` pattern exactly.

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### Step 2.2: Create Auth Context

**File:** `apps/web/src/contexts/auth-context.tsx` (NEW)
**Action:** Create a React Context that wraps Supabase auth state. Provides:

- `user: User | null` — current Supabase user
- `loading: boolean` — true while initial auth check is in progress
- `signIn(email, password)` — sign in with email/password
- `signUp(email, password)` — create account with email/password
- `signOut()` — log out

**Implementation details:**

- Use `supabase.auth.onAuthStateChange()` in a `useEffect` to track session changes
- Call `supabase.auth.getSession()` on mount for initial state
- Export `useAuth()` hook that throws if used outside `AuthProvider`
- Return type of `User` is from `@supabase/supabase-js`

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

#### Step 2.3: Wrap app with AuthProvider

**File:** `apps/web/src/main.tsx`
**Action:** Import `AuthProvider` and wrap it inside `IntlProvider` but outside `BrowserRouter` (auth is app-wide, not route-dependent).

**Current structure:**

```tsx
<StrictMode>
  <IntlProvider {...intlConfig}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </IntlProvider>
</StrictMode>
```

**New structure:**

```tsx
<StrictMode>
  <IntlProvider {...intlConfig}>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </IntlProvider>
</StrictMode>
```

### Phase 3: Paddle Integration

#### Step 3.1: Create Paddle helper module

**File:** `apps/web/src/lib/paddle.ts` (NEW)
**Action:** Create utilities for loading Paddle.js from CDN and opening checkout. Mirror the pattern from desktop's `PaymentDialog.tsx` but extracted into reusable functions.

```typescript
// Paddle.js v2 global type (same as desktop PaymentDialog declares)
declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (options: {
        token: string;
        eventCallback?: (event: PaddleEvent) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
          customer?: { email: string };
          customData?: Record<string, string>;
        }) => void;
      };
    };
  }
}

export interface PaddleEvent {
  name: string;
  data?: {
    transaction_id?: string;
  };
}

type InitOptions = {
  onCheckoutComplete: (transactionId: string) => void;
  onCheckoutError?: () => void;
};

let paddleInitialized = false;

export function loadAndInitializePaddle(options: InitOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Paddle && paddleInitialized) {
      resolve();
      return;
    }

    if (window.Paddle) {
      initializePaddle(options);
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        initializePaddle(options);
        resolve();
      } else {
        reject(new Error("Paddle failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Paddle script"));
    document.head.appendChild(script);
  });
}

function initializePaddle(options: InitOptions) {
  if (!window.Paddle || paddleInitialized) return;

  if (import.meta.env.DEV) {
    window.Paddle.Environment.set("sandbox");
  }

  window.Paddle.Initialize({
    token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    eventCallback: (event) => {
      if (event.name === "checkout.completed" && event.data?.transaction_id) {
        options.onCheckoutComplete(event.data.transaction_id);
      }
    },
  });

  paddleInitialized = true;
}

export type BillingPeriod = "monthly" | "yearly";

export function openCheckout(params: {
  email: string;
  userId: string;
  period: BillingPeriod;
}) {
  if (!window.Paddle) {
    throw new Error("Paddle not loaded");
  }

  const priceId =
    params.period === "monthly"
      ? import.meta.env.VITE_PADDLE_PRICE_MONTHLY
      : import.meta.env.VITE_PADDLE_PRICE_YEARLY;

  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: params.email },
    customData: { userId: params.userId },
  });
}
```

### Phase 4: UI Components

#### Step 4.1: Create Login Modal

**File:** `apps/web/src/components/auth/login-modal.tsx` (NEW)
**Action:** Create a modal component for email/password login and signup. Features:

- Toggle between "Sign in" and "Sign up" modes
- Email + password form fields
- Error message display
- Loading state (disabled button, not text change — per AGENTS.md convention)
- Backdrop click to close
- All strings via `<FormattedMessage defaultMessage="..." />`

**Key design decisions:**

- Use CSS modules (consistent with website)
- Modal renders via a portal or just positioned fixed (keep it simple — no portal needed)
- Two modes: `sign-in` and `sign-up`, toggled with a text link
- On successful sign-in, modal auto-closes (parent checks `user` from auth context)
- On successful sign-up, show "Check your email" message

#### Step 4.2: Create Login Modal styles

**File:** `apps/web/src/components/auth/login-modal.module.css` (NEW)
**Action:** Style the modal using the existing website design system variables:

- `var(--level0)`, `var(--level1)`, `var(--border)`, `var(--shadow)` etc.
- Backdrop: semi-transparent black overlay
- Modal card: centered, max-width ~420px, rounded corners (24px like pricing cards)
- Input fields: styled to match the site's clean aesthetic
- Submit button: uses `var(--primary-button-bg)` pattern from `page.module.css`
- Dark mode support via `prefers-color-scheme: dark`

#### Step 4.3: Create Checkout Success Modal

**File:** `apps/web/src/components/pricing-section/checkout-success-modal.tsx` (NEW)
**Action:** Simple modal shown after successful Paddle checkout + verification. Contains:

- Success checkmark icon (reuse the check SVG pattern from AuthConfirmedPage)
- "Payment successful!" heading
- "Your Pro subscription is now active." body text
- "Download Vocally" primary button (uses `DownloadButton` or links to `/download`)
- "Close" secondary button
- All strings via `<FormattedMessage defaultMessage="..." />`

#### Step 4.4: Create Checkout Success Modal styles

**File:** `apps/web/src/components/pricing-section/checkout-success-modal.module.css` (NEW)
**Action:** Reuse the same modal pattern as login-modal (backdrop, centered card). Can share base styles or just duplicate the small amount of CSS.

### Phase 5: Pricing Section Integration (Core Change)

#### Step 5.1: Update PricingSection component

**File:** `apps/web/src/components/pricing-section/index.tsx`
**Action:** This is the main integration point. Changes:

1. **Import auth context:** `import { useAuth } from "../../contexts/auth-context";`
2. **Import Paddle helpers:** `import { loadAndInitializePaddle, openCheckout, type BillingPeriod } from "../../lib/paddle";`
3. **Import Supabase client:** `import { supabase } from "../../lib/supabase";`
4. **Import new modals:** `import { LoginModal } from "../auth/login-modal";` and `import { CheckoutSuccessModal } from "./checkout-success-modal";`

5. **Add state variables:**

   ```typescript
   const { user } = useAuth();
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [showSuccessModal, setShowSuccessModal] = useState(false);
   const [paddleReady, setPaddleReady] = useState(false);
   const [checkoutLoading, setCheckoutLoading] = useState(false);
   ```

6. **Initialize Paddle on mount:**

   ```typescript
   useEffect(() => {
     loadAndInitializePaddle({
       onCheckoutComplete: async (transactionId) => {
         // Verify payment via existing edge function
         const { error } = await supabase.functions.invoke("paddle-verify", {
           body: { transactionId },
         });
         if (!error) {
           setShowSuccessModal(true);
         }
         setCheckoutLoading(false);
       },
     }).then(() => setPaddleReady(true));
   }, []);
   ```

7. **Update Pro plan CTA rendering:**
   - Change the `usePricingPlans()` hook: Pro plan's `cta` string should be `intl.formatMessage({ defaultMessage: "Subscribe" })` instead of `"Download free"`
   - Add `isPro?: boolean` to the `PricingPlan` type
   - Set `isPro: true` on the Pro plan object

8. **Replace the CTA button section** (lines ~296-314):
   - Enterprise: keep the `<a href="mailto:...">` (no change)
   - Personal (free): keep `<DownloadButton>` (no change)
   - Pro (`plan.isPro`): render a `<button>` instead of `<DownloadButton>`
     - onClick handler:
       ```typescript
       const handleProCTA = () => {
         if (!user) {
           setShowLoginModal(true);
           return;
         }
         if (!paddleReady || !user.email) return;
         setCheckoutLoading(true);
         openCheckout({
           email: user.email,
           userId: user.id,
           period: isYearly ? "yearly" : "monthly",
         });
       };
       ```
     - Button uses `styles.ctaButton` class (same as the popular card's existing CTA style)
     - Button is disabled while `checkoutLoading` or `(!paddleReady && !!user)`

9. **Render modals at bottom of the component:**

   ```tsx
   {
     showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />;
   }
   {
     showSuccessModal && (
       <CheckoutSuccessModal onClose={() => setShowSuccessModal(false)} />
     );
   }
   ```

10. **Auto-open checkout after login:** Add a `useEffect` that watches `user`:
    ```typescript
    useEffect(() => {
      // If user just logged in and we were showing the login modal, auto-trigger checkout
      if (user && showLoginModal) {
        setShowLoginModal(false);
        if (paddleReady && user.email) {
          setCheckoutLoading(true);
          openCheckout({
            email: user.email,
            userId: user.id,
            period: isYearly ? "yearly" : "monthly",
          });
        }
      }
    }, [user]);
    ```
    Note: Use a ref (`pendingCheckout`) to track whether login was triggered from Pro CTA to avoid opening checkout on unrelated auth state changes.

### Phase 6: Header Integration

#### Step 6.1: Update SiteHeader

**File:** `apps/web/src/components/site-header.tsx`
**Action:** Add a login/account indicator to the header.

1. **Import auth context:** `import { useAuth } from "../contexts/auth-context";`
2. **Import LoginModal:** `import { LoginModal } from "./auth/login-modal";`
3. **Add state + auth:**

   ```typescript
   const { user, signOut } = useAuth();
   const [showLoginModal, setShowLoginModal] = useState(false);
   ```

4. **In `headerActions` div**, add before the `<DownloadButton>`:
   - If `user` is null: Show "Sign in" ghost button → `onClick={() => setShowLoginModal(true)}`
   - If `user` is present: Show user email truncated or "Account" button with sign-out dropdown
   - Keep it simple: just a text button showing email or "Sign out"

5. **Mobile menu:** Add the same sign-in/sign-out option in the mobile menu section.

6. **Render login modal:**
   ```tsx
   {
     showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />;
   }
   ```

### Phase 7: i18n Extraction

#### Step 7.1: Extract and sync i18n messages

**Action:** Run from `apps/web`:

```bash
npm run i18n:extract
npm run i18n:sync
```

This will:

- Regenerate `src/i18n/locales/en.json` with all new `defaultMessage` strings (Subscribe, Sign in, Sign up, Email, Password, etc.)
- Propagate new keys to all 10 locale files (ko, es, fr, de, pt, pt-BR, it, zh-CN, zh-TW)
- New keys will have empty values in non-English locales (to be translated later)

### Phase 8: Verification

#### Step 8.1: Type check

```bash
npm run check-types --workspace apps/web
```

#### Step 8.2: Lint

```bash
npm run lint --workspace apps/web
```

#### Step 8.3: Build

```bash
npm run build --workspace apps/web
```

#### Step 8.4: Manual verification checklist

- Visit `http://localhost:3000` and scroll to pricing section
- Personal plan CTA still shows "Download free" → clicking downloads the app
- Pro plan CTA now shows "Subscribe"
- Click Pro "Subscribe" when not logged in → login modal appears
- Sign up with a new email/password → "Check your email" message
- Sign in with existing account → modal closes, Paddle checkout opens
- Paddle checkout shows correct price ($5/mo or $50/yr depending on toggle)
- Complete sandbox checkout → success modal appears with download link
- Header shows "Sign in" when logged out, email/sign-out when logged in
- Toggle monthly/yearly → Pro price updates and checkout uses correct price ID
- Enterprise CTA still shows "Contact us" → mailto link
- Switch to Korean locale → all new strings show (or fallback to English)

## Acceptance Criteria

- [ ] `@supabase/supabase-js` is installed and Supabase client is initialized in `apps/web/src/lib/supabase.ts`
- [ ] Auth context provides `user`, `loading`, `signIn`, `signUp`, `signOut` and wraps the app in `main.tsx`
- [ ] Login modal appears when Pro CTA is clicked while not authenticated
- [ ] Login modal supports email/password sign-in and sign-up with error display
- [ ] Paddle.js loads from CDN and initializes with sandbox token on component mount
- [ ] Clicking Pro CTA while authenticated opens Paddle checkout with correct priceId, user email, and userId
- [ ] Monthly/yearly toggle correctly selects `VITE_PADDLE_PRICE_MONTHLY` or `VITE_PADDLE_PRICE_YEARLY`
- [ ] After checkout completion, `paddle-verify` edge function is called with the transaction ID
- [ ] Success modal appears after verified payment with download link
- [ ] Personal plan CTA remains a `<DownloadButton>` (unchanged)
- [ ] Enterprise plan CTA remains a `mailto:hello@voquill.com` link (unchanged)
- [ ] Header shows sign-in button (logged out) or email + sign-out (logged in)
- [ ] All new user-facing strings use `<FormattedMessage defaultMessage="..." />` or `intl.formatMessage({ defaultMessage: "..." })`
- [ ] `i18n:extract` and `i18n:sync` have been run, locale files are updated
- [ ] `npm run build` passes with no TypeScript or build errors
- [ ] No Supabase service-role keys are exposed client-side (only anon key)

## Risk Mitigations

| Risk                                                       | Mitigation                                                                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Paddle.js CDN fails to load                                | Disable Pro CTA button if `paddleReady` is false; show tooltip "Loading payment system"                                                |
| User closes Paddle checkout without completing             | `checkoutLoading` resets; no success modal shown; user can retry                                                                       |
| `paddle-verify` edge function rejects (user mismatch)      | Show error message in the pricing section; user sees payment failed                                                                    |
| Supabase auth session expires mid-checkout                 | Paddle checkout still completes (it's external); verification may fail — user can refresh and retry                                    |
| User signs up but email not confirmed                      | Supabase allows session on signup but may require email confirmation depending on project settings; test and handle gracefully         |
| `.env` file committed with credentials                     | Supabase anon key is safe to commit (public); Paddle sandbox token is test-only; document that production values go in Vercel env vars |
| Login modal blocks scroll / has z-index issues over header | Modal uses `z-index: 100` (header is `z-index: 50`); body overflow hidden while modal open                                             |
| Multiple Paddle initializations                            | `paddleInitialized` flag in `paddle.ts` prevents re-init; script deduplication check                                                   |

## Verification Steps

1. **Unit verification:** `npm run check-types && npm run lint && npm run build` in `apps/web` — all must pass
2. **Auth flow:** Sign up → check for confirmation email → sign in → verify `user` object in React DevTools
3. **Paddle sandbox:** Complete a test checkout using Paddle sandbox test card `4242 4242 4242 4242` → verify success modal appears
4. **Edge function:** Check Supabase dashboard → `members` table → verify plan updated to "pro" for the test user
5. **i18n:** Switch to Korean locale → verify new strings appear (empty = English fallback, which is acceptable for initial release)
6. **Responsive:** Test on mobile viewport — login modal and checkout should work; Pro CTA should still be functional
7. **Production build:** `npm run build` produces no warnings about missing env vars (Vite will inline them)

## File Change Summary

| File                                                                        | Action | Description                                  |
| --------------------------------------------------------------------------- | ------ | -------------------------------------------- |
| `apps/web/package.json`                                                     | MODIFY | Add `@supabase/supabase-js` dependency       |
| `apps/web/.env`                                                             | MODIFY | Add 5 env vars (Supabase + Paddle)           |
| `apps/web/src/env.d.ts`                                                     | MODIFY | Add `ImportMetaEnv` interface                |
| `apps/web/src/lib/supabase.ts`                                              | CREATE | Supabase client (mirrors desktop)            |
| `apps/web/src/lib/paddle.ts`                                                | CREATE | Paddle load/init/checkout helpers            |
| `apps/web/src/contexts/auth-context.tsx`                                    | CREATE | Auth React Context + `useAuth` hook          |
| `apps/web/src/main.tsx`                                                     | MODIFY | Wrap with `<AuthProvider>`                   |
| `apps/web/src/components/auth/login-modal.tsx`                              | CREATE | Email/password login/signup modal            |
| `apps/web/src/components/auth/login-modal.module.css`                       | CREATE | Login modal styles                           |
| `apps/web/src/components/pricing-section/checkout-success-modal.tsx`        | CREATE | Post-payment success modal                   |
| `apps/web/src/components/pricing-section/checkout-success-modal.module.css` | CREATE | Success modal styles                         |
| `apps/web/src/components/pricing-section/index.tsx`                         | MODIFY | Pro CTA → subscribe button + Paddle checkout |
| `apps/web/src/components/site-header.tsx`                                   | MODIFY | Add sign-in/account button                   |
| `apps/web/src/i18n/locales/*.json` (10 files)                               | AUTO   | Updated by i18n:extract + i18n:sync          |

**Total: 8 modified files, 6 new files, 10 auto-updated locale files**

## Execution Order

```
1.1 package.json (add dependency)
    → npm install
1.2 .env (add env vars)
1.3 env.d.ts (type declarations)
2.1 lib/supabase.ts (client setup)
2.2 contexts/auth-context.tsx (auth context)
2.3 main.tsx (wrap with AuthProvider)
3.1 lib/paddle.ts (paddle helpers)
4.1 components/auth/login-modal.tsx (login UI)
4.2 components/auth/login-modal.module.css (login styles)
4.3 components/pricing-section/checkout-success-modal.tsx (success UI)
4.4 components/pricing-section/checkout-success-modal.module.css (success styles)
5.1 components/pricing-section/index.tsx (main integration)
6.1 components/site-header.tsx (header login button)
7.1 i18n:extract + i18n:sync
8.1 check-types → 8.2 lint → 8.3 build → 8.4 manual test
```
