# Vocally Desktop App: Complete Auth → Payment → Pro Status Flow

## Overview
The desktop app uses **Supabase Auth** for authentication and **Paddle** for payment processing. User membership status is tracked in the Supabase `members` table and synced to app state via Zustand.

---

## 1. AUTHENTICATION ARCHITECTURE

### Auth Files Structure
```
apps/desktop/src/
├── types/
│   ├── auth.types.ts           # AuthUser interface
│   └── google-auth.types.ts    # Google OAuth types
├── repos/
│   └── auth.repo.ts            # SupabaseAuthRepo (abstract + implementation)
├── state/
│   ├── app.state.ts            # Global state with `auth: Nullable<AuthUser>`
│   └── login.state.ts          # Login UI state (email, password, mode)
├── actions/
│   └── login.actions.ts        # Login/signup/password reset logic
├── utils/
│   ├── login.utils.ts          # Validation utilities
│   └── user.utils.ts           # Auth detection (getIsLoggedIn)
├── components/
│   ├── login/LoginPage.tsx
│   ├── login/LoginForm.tsx
│   ├── login/SignInForm.tsx
│   ├── login/SignUpForm.tsx
│   └── root/AppSideEffects.tsx # Auth state subscription & member sync
├── components/routing/
│   └── Guard.tsx               # Route protection (welcome/onboarding/dashboard)
└── supabase.ts                 # Supabase client initialization
```

### 1.1 AuthUser Type
```typescript
// apps/desktop/src/types/auth.types.ts
export interface AuthUser {
  id: string;              // Supabase user UUID
  email: string | null;
  displayName: string | null;
}
```

### 1.2 Supabase Client
```typescript
// apps/desktop/src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 1.3 Auth Repository (Supabase Implementation)
```typescript
// apps/desktop/src/repos/auth.repo.ts

export abstract class BaseAuthRepo extends BaseRepo {
  abstract signUpWithEmail(email: string, password: string): Promise<SupabaseAuthResponse>;
  abstract signInWithEmail(email: string, password: string): Promise<SupabaseAuthResponse>;
  abstract signInWithGoogleTokens(idToken: string, accessToken: string): Promise<SupabaseAuthResponse>;
  abstract sendPasswordResetRequest(email: string): Promise<void>;
  abstract signOut(): Promise<void>;
  abstract getCurrentUser(): Promise<User | null>;
}

export class SupabaseAuthRepo extends BaseAuthRepo {
  async signUpWithEmail(email: string, password: string): Promise<SupabaseAuthResponse> {
    const result = await supabase.auth.signUp({ email, password });
    if (result.error) throw result.error;
    return result;
  }

  async signInWithEmail(email: string, password: string): Promise<SupabaseAuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { data, error };
  }

  async signInWithGoogleTokens(idToken: string, accessToken: string): Promise<SupabaseAuthResponse> {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) throw error;
    return { data, error };
  }

  async sendPasswordResetRequest(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
}
```

---

## 2. LOGIN FLOW

### 2.1 Login State
```typescript
// apps/desktop/src/state/login.state.ts
export type LoginState = {
  email: string;
  password: string;
  confirmPassword: string;
  status: ActionStatus;              // "idle" | "loading" | "success" | "error"
  mode: LoginMode;                   // "signUp" | "signIn" | "resetPassword" | "passwordResetSent"
  hasSubmittedRegistration: boolean;
  errorMessage: string;
};
```

### 2.2 Sign In Flow
```typescript
// apps/desktop/src/actions/login.actions.ts

export const submitSignIn = async (): Promise<void> => {
  const state = getAppState();
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    
    // 1. Sign in with Supabase Auth
    await getAuthRepo().signInWithEmail(
      state.login.email,
      state.login.password,
    );
    
    // 2. Initialize member (creates member record if needed)
    await tryInit();
    
    produceAppState((state) => {
      state.login.status = "success";  // Triggers navigation to onboarding/dashboard
    });
  } catch {
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing in.";
      state.login.status = "idle";
    });
  }
};

const tryInit = async () => {
  try {
    // Calls Supabase edge function to create member record
    await supabase.functions.invoke("member-init", { body: {} });
  } catch {
    // Retry once
    try {
      await supabase.functions.invoke("member-init", { body: {} });
    } catch {}
  }
  
  // Fetch member data and sync to state
  const member = await supabase.functions
    .invoke("member-get", { body: {} })
    .then((res) => res.data?.member)
    .catch(() => null);
    
  produceAppState((state) => {
    registerMembers(state, listify(member));
  });
};
```

### 2.3 Sign Up Flow
```typescript
export const submitSignUp = async (): Promise<void> => {
  const state = getAppState();

  const emailValidation = validateEmail(state);
  const passwordValidation = validatePassword(state);
  const confirmPasswordValidation = validateConfirmPassword(state);
  
  if (emailValidation || passwordValidation || confirmPasswordValidation) {
    return;
  }

  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    
    // Creates Supabase Auth user
    await getAuthRepo().signUpWithEmail(
      state.login.email,
      state.login.password,
    );
    
    produceAppState((state) => {
      state.login.status = "success";
    });
    
    // NOTE: User must verify email before full login
    // After email verification, login normally (which calls tryInit)
  } catch {
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing up.";
      state.login.status = "idle";
    });
  }
};
```

### 2.4 Google OAuth Flow
```typescript
export const submitSignInWithGoogle = async (): Promise<void> => {
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    
    // Invokes Tauri command to launch Google OAuth in native webview
    await invoke(GOOGLE_AUTH_COMMAND);
    // Command sends GoogleAuthPayload back via Tauri event
  } catch {
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing in.";
      state.login.status = "idle";
    });
  }
};

// Tauri sends back the OAuth tokens
export const handleGoogleAuthPayload = async (
  payload: GoogleAuthPayload,
): Promise<void> => {
  try {
    produceAppState((state) => {
      state.login.status = "loading";
      state.login.errorMessage = "";
    });
    
    // Sign in using ID token (Supabase handles token exchange)
    await getAuthRepo().signInWithGoogleTokens(
      payload.idToken,
      payload.accessToken,
    );
    
    // Initialize member
    await tryInit();
    
    produceAppState((state) => {
      state.login.status = "success";
    });
  } catch (error) {
    produceAppState((state) => {
      state.login.errorMessage = "An error occurred while signing in with Google.";
      state.login.status = "idle";
    });
  }
};
```

### 2.5 Auth State Subscription
```typescript
// apps/desktop/src/components/root/AppSideEffects.tsx

useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (!authReadyRef.current) {
      console.warn("[AppSideEffects] Supabase Auth timed out, proceeding without auth");
      onAuthStateChanged(null);
    }
  }, AUTH_READY_TIMEOUT_MS); // 4 seconds

  // Subscribe to Supabase Auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user
      ? ({
          id: session.user.id,
          email: session.user.email ?? null,
          displayName: session.user.user_metadata?.display_name ?? null,
        } as AuthUser)
      : null;
    
    onAuthStateChanged(user);
  });

  return () => {
    clearTimeout(timeoutId);
    subscription.unsubscribe();
  };
}, []);
```

---

## 3. MEMBER INITIALIZATION (Edge Functions)

### 3.1 member-init Edge Function
```typescript
// dev_poc/poc-4-edge-function/supabase/functions/member-init/index.ts

Deno.serve(async (req) => {
  // 1. Verify CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // 2. Extract authenticated user from JWT
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const supabase = createServiceClient();

  // 3. Upsert member record (create if not exists, ignore if exists)
  const { error } = await supabase.from("members").upsert(
    {
      id: user.id,                  // User's Supabase UUID
      type: "user",
      plan: "free",                 // Default to free plan
      is_on_trial: false,
      words_today: 0,
      words_this_month: 0,
      words_total: 0,
      tokens_today: 0,
      tokens_this_month: 0,
      tokens_total: 0,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({});
});
```

**Supabase members table schema:**
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  type TEXT,
  plan VARCHAR(50),           -- "free" | "pro"
  is_on_trial BOOLEAN,
  words_today INTEGER,
  words_this_month INTEGER,
  words_total INTEGER,
  tokens_today INTEGER,
  tokens_this_month INTEGER,
  tokens_total INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  paddle_subscription_id VARCHAR(255),
  -- Additional fields for future use
);
```

### 3.2 member-get Edge Function
```typescript
// dev_poc/poc-4-edge-function/supabase/functions/member-get/index.ts

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const supabase = createServiceClient();

  // Query member record for authenticated user
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = not found
    return errorResponse(error.message, 500);
  }

  if (!data) return jsonResponse({ member: null });

  // Map database fields to camelCase
  const member = {
    id: data.id,
    type: data.type,
    plan: data.plan,
    wordsToday: data.words_today,
    wordsThisMonth: data.words_this_month,
    wordsTotal: data.words_total,
    tokensToday: data.tokens_today,
    tokensThisMonth: data.tokens_this_month,
    tokensTotal: data.tokens_total,
    todayResetAt: data.today_reset_at,
    thisMonthResetAt: data.this_month_reset_at,
    isOnTrial: data.is_on_trial,
    trialEndsAt: data.trial_ends_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return jsonResponse({ member });
});
```

---

## 4. MEMBER/SUBSCRIPTION TYPES

### 4.1 Member Type Definition
```typescript
// packages/types/src/member.types.ts

export type MemberPlan = "free" | "pro";

export type DatabaseMember = {
  id: string;
  type: "user";
  createdAt: FiremixTimestamp;
  updatedAt: FiremixTimestamp;
  plan: MemberPlan;                      // ⭐ KEY FIELD: Determines Pro status
  stripeCustomerId?: Nullable<string>;   // Legacy
  priceId?: Nullable<string>;
  wordsToday: number;
  wordsThisMonth: number;
  wordsTotal: number;
  tokensToday: number;
  tokensThisMonth: number;
  tokensTotal: number;
  todayResetAt: FiremixTimestamp;
  thisMonthResetAt: FiremixTimestamp;
  isOnTrial?: Nullable<boolean>;
  trialEndsAt?: Nullable<FiremixTimestamp>;
};

export type Member = Replace<DatabaseMember, FiremixTimestamp, string>;
```

### 4.2 Effective Plan (App UI)
```typescript
// apps/desktop/src/types/member.types.ts

export type EffectivePlan = MemberPlan | "community" | "enterprise";
```

### 4.3 Member Utilities
```typescript
// apps/desktop/src/utils/member.utils.ts

export const getMyMember = (state: AppState): Nullable<Member> => {
  return getRec(state.memberById, state.auth?.id) ?? null;
};

export const getEffectivePlan = (state: AppState): EffectivePlan => {
  if (state.userPrefs?.isEnterprise) {
    return "enterprise";
  }
  return getMyMember(state)?.plan ?? "community";
};

export const getIsPaying = (state: AppState): boolean => {
  const member = getMyMember(state);
  if (!member) {
    return false;
  }
  return member.plan !== "free";  // ⭐ PRO STATUS CHECK: plan !== "free"
};
```

---

## 5. PAYMENT FLOW (Paddle)

### 5.1 Payment State
```typescript
// apps/desktop/src/state/payment.state.ts

export type PaymentState = {
  open: boolean;
  priceId: Nullable<string>;
};

export const INITIAL_PAYMENT_STATE: PaymentState = {
  open: false,
  priceId: null,
};
```

### 5.2 Open Payment Dialog
```typescript
// apps/desktop/src/actions/payment.actions.ts

export const openPaymentDialog = (priceId: string) => {
  produceAppState((draft) => {
    draft.payment.open = true;
    draft.payment.priceId = priceId;
  });
};

export const tryOpenPaymentDialogForPricingPlan = (
  plan?: PricingPlan | string | null,
): boolean => {
  const castedPlan = plan as PricingPlan | undefined;
  if (!castedPlan || !PRICING_PLANS.includes(castedPlan)) {
    return false;
  }

  if (castedPlan === "free" || castedPlan === "community" || castedPlan === "enterprise") {
    return false;
  }

  openPaymentDialog(castedPlan);
  return true;
};
```

### 5.3 PaymentDialog Component
```typescript
// apps/desktop/src/components/payment/PaymentDialog.tsx

export const PaymentDialog = () => {
  const open = useAppStore((state) => state.payment.open);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("monthly");
  const [paddleLoaded, setPaddleLoaded] = useState(false);

  // 1. Load Paddle script from CDN
  useEffect(() => {
    if (window.Paddle) {
      setPaddleLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        // 2. Set Paddle environment (sandbox for dev, production for prod)
        if (import.meta.env.DEV) {
          window.Paddle.Environment.set("sandbox");
        }

        // 3. Initialize Paddle with token
        window.Paddle.Initialize({
          token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN ?? "",
          eventCallback: async (event) => {
            // 4. Handle checkout completed event
            if (event.name === "checkout.completed" && event.data?.transaction_id) {
              try {
                // 5. Verify transaction with backend
                const { error: verifyError } = await supabase.functions.invoke(
                  "paddle-verify",
                  {
                    body: { transactionId: event.data.transaction_id },
                  },
                );

                if (verifyError) {
                  setError("Payment verification failed. Please contact support.");
                  return;
                }

                // 6. Refresh member status (member is now Pro)
                setSuccess(true);
                await refreshMember();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Payment verification failed.");
              }
            }
          },
        });

        setPaddleLoaded(true);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // 7. Handle payment button click
  const handlePayment = async () => {
    if (!paddleLoaded || !window.Paddle) {
      setError("Loading payment system. Please try again shortly.");
      return;
    }

    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || !user?.id) {
        setError("Unable to verify login. Please sign in again.");
        return;
      }

      // Select price ID based on plan
      const priceId =
        selectedPlan === "monthly"
          ? import.meta.env.VITE_PADDLE_PRICE_MONTHLY
          : import.meta.env.VITE_PADDLE_PRICE_YEARLY;

      if (!priceId) {
        setError("Payment is not configured. Please contact support.");
        return;
      }

      // 8. Open Paddle checkout
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: user.email },
        customData: { userId: user.id },  // ⭐ Embedded for verification
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    }
  };

  // Render monthly/yearly plan selector and subscribe button
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
            Vocally Pro
          </Typography>

          <Stack spacing={2} sx={{ mb: 3 }}>
            {/* Monthly plan option: $5/mo */}
            <Box onClick={() => setSelectedPlan("monthly")}>
              <Typography>Monthly - $5/mo</Typography>
            </Box>

            {/* Yearly plan option: $50/yr (Save 17%) */}
            <Box onClick={() => setSelectedPlan("yearly")}>
              <Typography>Yearly - $50/yr (Save 17%)</Typography>
            </Box>
          </Stack>

          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={!paddleLoaded}
            fullWidth
          >
            Subscribe
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
```

### 5.4 paddle-verify Edge Function
```typescript
// dev_poc/poc-4-edge-function/supabase/functions/paddle-verify/index.ts

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // 1. Verify user is authenticated
  const user = await getUser(req);
  if (!user) return errorResponse("Unauthorized", 401);

  // 2. Extract transaction ID from request
  const { transactionId } = await req.json();
  if (!transactionId) return errorResponse("Missing transactionId", 400);

  const apiKey = Deno.env.get("PADDLE_API_KEY");
  if (!apiKey) return errorResponse("Paddle API key not configured", 500);

  const environment = Deno.env.get("PADDLE_ENVIRONMENT") || "sandbox";
  const baseUrl = environment === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

  // 3. Verify transaction with Paddle API
  const paddleResponse = await fetch(`${baseUrl}/transactions/${transactionId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!paddleResponse.ok) {
    return errorResponse("Failed to verify transaction with Paddle", 500);
  }

  const transactionData = await paddleResponse.json();

  // 4. Verify transaction is completed
  if (transactionData.data.status !== "completed" && transactionData.data.status !== "paid") {
    return errorResponse("Transaction not completed", 400);
  }

  // 5. ⭐ CRITICAL: Verify userId in transaction matches authenticated user
  if (transactionData.data.custom_data?.userId !== user.id) {
    return errorResponse("Transaction does not belong to this user", 403);
  }

  const supabase = createServiceClient();

  // 6. Update member plan to "pro"
  const { error } = await supabase
    .from("members")
    .update({
      plan: "pro",
      is_on_trial: false,
    })
    .eq("id", user.id);

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true });
});
```

### 5.5 Refresh Member After Payment
```typescript
// apps/desktop/src/actions/member.actions.ts

export async function refreshMember(): Promise<void> {
  const state = getAppState();
  const userId = state.auth?.id;
  if (!userId) {
    return;
  }

  try {
    // Re-fetch member-get to get updated plan status
    const res = await supabase.functions.invoke("member-get", { body: {} });
    const member = res.data?.member;
    
    produceAppState((draft) => {
      registerMembers(draft, listify(member));
    });
  } catch {
    // No-op on failure
  }
}
```

### 5.6 Paddle Webhook (Optional - for subscription cancellations)
```typescript
// dev_poc/poc-4-edge-function/supabase/functions/paddle-webhook/index.ts

Deno.serve(async (req) => {
  // 1. Verify webhook signature
  const signature = req.headers.get("paddle-signature");
  if (!signature) return errorResponse("Missing signature", 401);

  const secret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
  if (!secret) return errorResponse("Webhook secret not configured", 500);

  const rawBody = await req.text();
  if (!verifySignature(signature, rawBody, secret)) {
    return errorResponse("Invalid signature", 401);
  }

  const event = JSON.parse(rawBody);
  const supabase = createServiceClient();

  // 2. Handle transaction.completed event
  if (event.event_type === "transaction.completed") {
    const userId = event.data?.custom_data?.userId;
    const subscriptionId = event.data?.subscription_id;

    if (!userId) {
      return jsonResponse({ received: true });
    }

    // Update member to Pro (in case paddle-verify wasn't called)
    const updateData: Record<string, unknown> = {
      plan: "pro",
      is_on_trial: false,
    };

    if (subscriptionId) {
      updateData.paddle_subscription_id = subscriptionId;
    }

    await supabase
      .from("members")
      .update(updateData)
      .eq("id", userId);
  }

  // 3. Handle subscription.canceled event
  if (event.event_type === "subscription.canceled") {
    const subscriptionId = event.data?.subscription_id;

    if (subscriptionId) {
      // Downgrade to free
      await supabase
        .from("members")
        .update({ plan: "free" })
        .eq("paddle_subscription_id", subscriptionId);
    }
  }

  return jsonResponse({ received: true });
});
```

---

## 6. ROUTE GUARDS (Protecting Pages)

### 6.1 Guard Component
```typescript
// apps/desktop/src/components/routing/Guard.tsx

export type Node = "dashboard" | "notFound" | "onboarding" | "welcome";

type GuardState = {
  isOnboarded: boolean;
  isLoggedIn: boolean;
};

const graph: Graph = {
  welcome: {
    edges: [
      { to: "dashboard", condition: (s) => s.isLoggedIn && s.isOnboarded },
      { to: "onboarding", condition: (s) => s.isLoggedIn && !s.isOnboarded },
    ],
    builder: () => <Redirect to="/welcome" />,
  },
  onboarding: {
    edges: [
      { to: "dashboard", condition: (s) => s.isLoggedIn && s.isOnboarded },
    ],
    builder: () => <Redirect to="/onboarding" />,
  },
  dashboard: {
    edges: [
      { to: "welcome", condition: (s) => !s.isLoggedIn },
      { to: "welcome", condition: (s) => !s.isOnboarded },
    ],
    builder: () => <Redirect to="/dashboard" />,
  },
};

export const Guard = ({ children, node }: GuardProps) => {
  const isOnboarded = useIsOnboarded();
  const isLoggedIn = useAppStore(getIsLoggedIn);  // Checks state.auth !== null

  // Determine if should redirect
  const redirectTo = useMemo(() => {
    const edges = getRec(graph, node)?.edges ?? [];
    for (const edge of edges) {
      if (edge.condition(state)) {
        return edge.to;
      }
    }
    return null;
  }, [node, state]);

  if (redirectTo) {
    return builder(state);  // Redirects to target node
  }

  return children;  // Render protected content
};
```

### 6.2 Router Configuration
```typescript
// apps/desktop/src/router.tsx

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      // Welcome page (accessible without login)
      {
        element: <Guard node="welcome"><AppWrapper /></Guard>,
        children: [
          { path: "login", element: <LoginPage /> },
        ],
      },
      // Onboarding (requires login, not onboarded)
      {
        element: <Guard node="onboarding"><AppWrapper /></Guard>,
        children: [
          { path: "onboarding", element: <OnboardingPage /> },
        ],
      },
      // Dashboard (requires login + onboarded)
      {
        element: <Guard node="dashboard"><AppWrapper /></Guard>,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
            children: [
              { path: "", element: <HomePage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "transcriptions", element: <TranscriptionsPage /> },
              // ... other pages
            ],
          },
        ],
      },
    ],
  },
]);
```

---

## 7. HOW PRO STATUS IS CHECKED

### 7.1 Lookup Path
```
User clicks "Upgrade" button
  ↓
Component calls getIsPaying(state)
  ↓
getIsPaying() calls getMyMember(state)
  ↓
getMyMember() → state.memberById[state.auth?.id]
  ↓
Check member.plan !== "free"
  ↓
If true → User is Pro, show premium features
If false → User is Free, show upgrade button
```

### 7.2 Code Example
```typescript
const member = getMyMember(state);  // Lookup from state.memberById by user ID
const isPaying = member?.plan !== "free";  // ⭐ THE KEY CHECK

if (isPaying) {
  // Show Pro-only feature
} else {
  // Show upgrade dialog
}
```

---

## 8. FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ COMPLETE AUTH → PAYMENT → PRO STATUS FLOW                       │
└─────────────────────────────────────────────────────────────────┘

LOGIN PHASE
===========
User Opens App
  ↓
[AppSideEffects] Supabase.auth.onAuthStateChange() listener
  ↓ (no session)
User clicks "Sign In"
  ↓
SignInForm component
  ↓
submitSignIn() action
  ↓
supabase.auth.signInWithPassword()
  ↓
✅ Auth successful
  ↓
tryInit() called:
  - supabase.functions.invoke("member-init", {})  [edge function]
  - supabase.functions.invoke("member-get", {})   [edge function]
  ↓
registerMembers(state, [...])  [Zustand state update]
  ↓
state.auth = { id, email, displayName }
state.memberById[userId] = { plan: "free", wordsToday: 0, ... }
  ↓
Guard checks: isLoggedIn ✅ → Route to onboarding

ONBOARDING PHASE
================
OnboardingPage displayed
  ↓
User completes onboarding
  ↓
state.userPrefs.hasCompletedOnboarding = true
  ↓
Guard checks: isOnboarded ✅ → Route to dashboard

DASHBOARD PHASE
===============
User uses free plan
  ↓
Hits word limit or sees "Upgrade" button
  ↓
Clicks "Subscribe to Pro"
  ↓
openPaymentDialog() called
  ↓
PaymentDialog component rendered
  ↓
User selects monthly/yearly plan
  ↓
handlePayment() action:
  - Gets current user from supabase.auth.getUser()
  - Opens Paddle.Checkout with customData: { userId }
  ↓
User completes Paddle checkout
  ↓
Paddle.eventCallback() triggered with "checkout.completed"
  ↓
supabase.functions.invoke("paddle-verify", { transactionId })
  ↓
EDGE FUNCTION: paddle-verify
  1. Verify user is authenticated ✅
  2. Get transaction from Paddle API ✅
  3. Verify transaction.custom_data.userId === user.id ⭐ SECURITY CHECK
  4. Verify transaction status === "completed" or "paid" ✅
  5. UPDATE members SET plan = "pro" WHERE id = user.id
  6. Return { success: true }
  ↓
✅ Verification successful
  ↓
refreshMember() called:
  - supabase.functions.invoke("member-get", {})
  ↓
EDGE FUNCTION: member-get
  1. Query members table WHERE id = user.id
  2. Return { plan: "pro", ... }
  ↓
registerMembers(state, [...])  [Zustand state update]
  ↓
state.memberById[userId].plan = "pro"  ⭐ PRO STATUS NOW ACTIVE
  ↓
PaymentDialog shows success message
  ↓
User closes dialog
  ↓
Dashboard re-renders
  ↓
Pro features enabled:
  - Higher word/token limits
  - No ads
  - Premium features visible

PRO STATUS CHECK (On Every Page)
================================
getEffectivePlan(state)
  → member.plan === "pro" ? show premium features

getIsPaying(state)
  → member.plan !== "free" ? true : false

getMemberExceedsLimitByState(state)
  → compare member.wordsToday/wordsThisMonth vs config limits
  → limits depend on member.plan
```

---

## 9. ENVIRONMENT VARIABLES

### Desktop App (.env.local)
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[public anon key]
VITE_PADDLE_CLIENT_TOKEN=[paddle client token]
VITE_PADDLE_PRICE_MONTHLY=pri_[paddle price ID]
VITE_PADDLE_PRICE_YEARLY=pri_[paddle price ID]
VITE_FLAVOR=dev|prod|emulators
```

### Firebase Functions (for Paddle webhook)
```
PADDLE_API_KEY=[paddle API key]
PADDLE_WEBHOOK_SECRET=[paddle webhook secret]
PADDLE_ENVIRONMENT=sandbox|production
```

---

## 10. SUMMARY TABLE

| Component | Purpose | Type |
|-----------|---------|------|
| **apps/desktop/src/repos/auth.repo.ts** | Sign in/up with email/Google | Repository |
| **apps/desktop/src/actions/login.actions.ts** | Handle form submissions | Action |
| **apps/desktop/src/components/login/** | UI for authentication | Component |
| **member-init edge function** | Create member record on first login | Supabase Function |
| **member-get edge function** | Fetch member status | Supabase Function |
| **state.memberById** | Store member data in Zustand | State |
| **state.auth** | Store user identity | State |
| **PaymentDialog** | Paddle checkout UI | Component |
| **paddle-verify edge function** | Verify payment and upgrade to Pro | Supabase Function |
| **paddle-webhook edge function** | Handle subscription events | Webhook Handler |
| **getIsPaying()** | Check if user is Pro | Utility |
| **getEffectivePlan()** | Get user's plan tier | Utility |
| **Guard component** | Protect routes | Component |

---

## 11. KEY FILES TO COPY FOR WEB APP

1. **Supabase edge functions** (reusable):
   - `member-init/index.ts`
   - `member-get/index.ts`
   - `paddle-verify/index.ts`
   - `paddle-webhook/index.ts`
   - `_shared/*.ts` (auth, cors, response helpers)

2. **Types** (shared):
   - `packages/types/src/member.types.ts`
   - `packages/utilities/src/member.ts`

3. **Auth repo pattern** (adapt to web):
   - `apps/desktop/src/repos/auth.repo.ts`
   - `apps/desktop/src/types/auth.types.ts`

4. **Payment component** (can adapt):
   - `apps/desktop/src/components/payment/PaymentDialog.tsx`
   - `apps/desktop/src/actions/payment.actions.ts`
   - `apps/desktop/src/state/payment.state.ts`

5. **Guard pattern** (for route protection):
   - `apps/desktop/src/components/routing/Guard.tsx`

6. **Member utilities** (reusable):
   - `apps/desktop/src/utils/member.utils.ts`

