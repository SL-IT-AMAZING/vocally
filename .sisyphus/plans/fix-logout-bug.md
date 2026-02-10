# Plan: Fix Logout Bug (Reviewed & Corrected)

## Problem

User presses "Sign out" on settings page. Nothing happens — they remain on the dashboard with stale data visible.

## Root Cause (Verified by tracing code)

Two independent failures compound:

### Failure 1: Guard doesn't check `isLoggedIn` for dashboard

The routing guard graph for `dashboard` only has one edge:

```ts
dashboard: {
  edges: [
    { to: "welcome", condition: (s) => !s.isOnboarded },
  ],
}
```

After logout, `auth` becomes null, but `getIsOnboarded` still returns `true` because it resolves to the local user (`LOCAL_USER_ID`) whose `onboarded` flag is `true`. So the guard never redirects away from dashboard.

### Failure 2: No state cleanup on logout

`handleSignOut()` only calls `supabase.auth.signOut()`. The `onAuthStateChange` listener only sets `draft.auth = null` and `draft.initialized = false`. All user-specific data (`userById`, `memberById`, `userPrefs`, `transcriptionById`, etc.) remains in the Zustand store.

### Bonus Failure: Broken import from earlier cleanup

`payment.actions.ts` imports `getPriceIdFromKey` which was removed from `price.utils.ts` in our earlier commit. This is a build error that needs fixing.

## Plan

### Step 1: Fix Guard routing graph

**File:** `apps/desktop/src/components/routing/Guard.tsx`

**CRITICAL:** Simply adding `!isLoggedIn` to dashboard would cause an infinite redirect loop with the welcome node (welcome redirects onboarded users to dashboard, dashboard redirects non-logged-in users back to welcome).

Fix both nodes:

```ts
welcome: {
  edges: [
    { to: "dashboard", condition: (s) => s.isLoggedIn && s.isOnboarded },        // CHANGED: added isLoggedIn
    { to: "onboarding", condition: (s) => s.isLoggedIn && !s.isOnboarded },       // unchanged
  ],
},
onboarding: {
  edges: [
    { to: "dashboard", condition: (s) => s.isLoggedIn && s.isOnboarded },         // CHANGED: added isLoggedIn
  ],
},
dashboard: {
  edges: [
    { to: "welcome", condition: (s) => !s.isLoggedIn },                           // NEW: logout → welcome
    { to: "welcome", condition: (s) => !s.isOnboarded },                          // existing (keep for safety)
  ],
},
```

**Behavior matrix after fix:**

| State                      | At welcome   | At onboarding            | At dashboard |
| -------------------------- | ------------ | ------------------------ | ------------ |
| logged in + onboarded      | → dashboard  | → dashboard              | stays        |
| logged in + not onboarded  | → onboarding | stays                    | → welcome    |
| logged out + onboarded     | stays        | stays (no edge triggers) | → welcome    |
| logged out + not onboarded | stays        | stays                    | → welcome    |

### Step 2: Clear user-specific state on logout

**File:** `apps/desktop/src/components/root/AppSideEffects.tsx`

In the `onAuthStateChanged` callback, when `user` is null AND we previously had a user (i.e., this is a logout, not an initial cold start), clear all cloud user data:

```ts
const onAuthStateChanged = (user: AuthUser | null) => {
  authReadyRef.current = true;
  setAuthReady(true);
  produceAppState((draft) => {
    const wasLoggedIn = !!draft.auth;
    draft.auth = user;
    draft.initialized = false;

    if (!user && wasLoggedIn) {
      // Clear all cloud/user-specific data on logout
      draft.memberById = {};
      draft.userPrefs = null;
      draft.transcriptionById = {};
      draft.termById = {};
      draft.apiKeyById = {};
      draft.toneById = {};
      draft.hotkeyById = {};
      draft.appTargetById = {};
      draft.priceValueByKey = {};
      // Preserve local user, clear cloud user entries
      const localUser = draft.userById[LOCAL_USER_ID];
      draft.userById = localUser ? { [LOCAL_USER_ID]: localUser } : {};
    }
  });
};
```

**Why `wasLoggedIn` guard:** Prevents clearing data on initial app load when auth times out (the 4-second timeout path). We only want cleanup on actual logout transitions.

**Note:** Need to import `LOCAL_USER_ID` at the top of AppSideEffects.tsx (it's already imported from user.utils).

### Step 3: Fix broken `getPriceIdFromKey` import

**File:** `apps/desktop/src/actions/payment.actions.ts`

The function `getPriceIdFromKey` was removed from `price.utils.ts` in our earlier cleanup. It was a trivial identity function: `(key: string) => key`. Inline it:

```ts
// Before:
openPaymentDialog(getPriceIdFromKey(castedPlan));
// After:
openPaymentDialog(castedPlan);
```

And remove the import.

## Files Changed

1. `apps/desktop/src/components/routing/Guard.tsx` — Fix guard graph for all 3 nodes
2. `apps/desktop/src/components/root/AppSideEffects.tsx` — Clear state on logout
3. `apps/desktop/src/actions/payment.actions.ts` — Fix broken import

## Risks

- **LOW:** Brief flash of `<LoadingApp />` during logout transition (initialized goes false then true). This is acceptable UX — better than showing stale data.
- **LOW:** If a user logs out then logs in as a different user, all data reloads fresh. This is correct behavior.
- **NONE:** The `wasLoggedIn` guard ensures cold start path is unaffected.

## Verification

1. Sign in → settings → "Sign out" → should redirect to welcome page
2. Sign in again → all data loads fresh (no stale data from previous session)
3. While logged out, navigating to `/dashboard` redirects to `/welcome`
4. While logged in + onboarded, dashboard works normally
5. Cold start (app launch) still works — shows loading then redirects appropriately
6. Build passes (no import errors)
