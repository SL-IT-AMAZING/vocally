# Plan: Mixpanel Analytics Gaps — Complete Event Coverage

## Requirements Summary

- Add all 40 missing Mixpanel analytics events to the Vocally desktop app
- Follow the exact existing pattern in `analytics.utils.ts` (guard check, Title Case events, camelCase props)
- All new tracking functions go in `apps/desktop/src/utils/analytics.utils.ts`
- Call sites are in action files and component files — import analytics into them
- No changes to Mixpanel init, user identification, Rust layer, web app, or npm packages
- Must pass `tsc --noEmit`, `cargo check`, and all 230 existing tests

## Scope & Constraints

- **In scope**: 40 events across 4 priority tiers (P0 Revenue, P0 Auth, P1 Dictation, P1 Settings, P2 Feature Engagement)
- **Out of scope**: Web app analytics, Rust changes, new npm packages, Mixpanel init changes, AppSideEffects user identification
- **Pattern**: Every function uses `if (!isMixpanelReady()) return;` guard, `mixpanel.track("Event Name", { props })`
- **Naming**: Event names are Title Case ("Payment Complete"), properties are camelCase ({ selectedPlan, method })

## Implementation Steps

### Wave 1: analytics.utils.ts — Add All New Tracking Functions (SERIAL — must complete first)

**File**: `apps/desktop/src/utils/analytics.utils.ts`

Add the following exported functions after the existing ones (line 57+):

```typescript
// === P0: Revenue ===

export function trackPaymentSubscribeClicked(selectedPlan: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Payment Subscribe Clicked", { selectedPlan });
}

export function trackPaymentCheckoutOpened(selectedPlan: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Payment Checkout Opened", { selectedPlan });
}

export function trackPlanSelected(plan: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Plan Selected", { plan });
}

// === P0: Auth ===

export function trackSignInSuccess(method: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign In Success", { method });
}

export function trackSignUpSuccess() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign Up Success");
}

export function trackSignInFailed(method: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign In Failed", { method });
}

export function trackSignOut() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Sign Out");
}

export function trackPasswordResetRequested() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Password Reset Requested");
}

export function trackAccountDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Account Deleted");
}

// === P1: Dictation Lifecycle ===

export function trackDictationCompleted(props: {
  durationMs?: number | null;
  wordCount: number;
  appName?: string | null;
  mode: string;
  toneApplied: boolean;
}) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Dictation Completed", props);
}

export function trackDictationEmpty() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Dictation Empty");
}

export function trackDictationError(props: { stage: string; error: string }) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Dictation Error", props);
}

export function trackPostProcessingCompleted(props: {
  durationMs?: number | null;
}) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Post Processing Completed", props);
}

export function trackTranscriptionRetried() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Transcription Retried");
}

// === P1: Settings ===

export function trackSettingChanged(settingName: string, value?: unknown) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Setting Changed", {
    settingName,
    ...(value !== undefined ? { value: String(value) } : {}),
  });
}

// === P2: Feature Engagement ===

export function trackTermCreated() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Term Created");
}

export function trackTermDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Term Deleted");
}

export function trackToneCreated() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Tone Created");
}

export function trackToneDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Tone Deleted");
}

export function trackToneSelected(toneId: string | null) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Tone Selected", { toneId });
}

export function trackTranscriptDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Transcript Deleted");
}

export function trackTranscriptViewed() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Transcript Viewed");
}

export function trackApiKeyAdded() {
  if (!isMixpanelReady()) return;
  mixpanel.track("API Key Added");
}

export function trackApiKeyDeleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("API Key Deleted");
}

export function trackHelpAction(action: string) {
  if (!isMixpanelReady()) return;
  mixpanel.track("Help Action", { action });
}

export function trackBillingPortalOpened() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Billing Portal Opened");
}

export function trackOnboardingCompleted() {
  if (!isMixpanelReady()) return;
  mixpanel.track("Onboarding Completed");
}
```

**Agent**: `sisyphus-junior` | **Category**: `quick` | **Skills**: `[]` | **Est**: 3 min

---

### Wave 2: P0 Revenue + P0 Auth Call Sites (PARALLEL — 4 agents)

All agents in this wave are independent and can run simultaneously.

#### Agent 2A: Payment Call Sites (3 files)

**Category**: `quick` | **Skills**: `[]`

**File 1**: `apps/desktop/src/components/payment/PaymentDialog.tsx`

- **Line 49** (`setDialogState("success")` inside `checkPaymentStatus`): Add `trackPaymentComplete()` call right after `setDialogState("success")`.

  ```typescript
  // After line 49: setDialogState("success");
  trackPaymentComplete();
  ```

  Import: `import { trackPaymentComplete, trackPaymentSubscribeClicked, trackPaymentCheckoutOpened } from "../../utils/analytics.utils";`

- **Line 84** (top of `handlePayment`): Add `trackPaymentSubscribeClicked(selectedPlan)` right after `setDialogState("creating")`.

  ```typescript
  // After line 84: setDialogState("creating");
  trackPaymentSubscribeClicked(selectedPlan);
  ```

- **Line 114-115** (after `openUrl(data.checkoutUrl)`): Add `trackPaymentCheckoutOpened(selectedPlan)`.
  ```typescript
  // After line 114: await openUrl(data.checkoutUrl);
  trackPaymentCheckoutOpened(selectedPlan);
  ```

**File 2**: `apps/desktop/src/components/pricing/UpgradePlanDialog.tsx`

- In the plan selection handler: Add `trackPlanSelected(plan)` call.
  Import: `import { trackPlanSelected } from "../../utils/analytics.utils";`

#### Agent 2B: Auth Success Call Sites (3 files)

**Category**: `quick` | **Skills**: `[]`

**File 1**: `apps/desktop/src/actions/login.actions.ts`

- Add import: `import { trackSignInSuccess, trackSignUpSuccess, trackSignInFailed, trackSignOut, trackPasswordResetRequested } from "../utils/analytics.utils";`

- **Line 47** (`submitSignIn` success): After `state.login.status = "success"` (inside produceAppState at line 46-48), add call AFTER the produceAppState block:

  ```typescript
  // After the produceAppState block ending at line 48
  trackSignInSuccess("email");
  ```

- **Line 49** (`submitSignIn` catch block): Add inside catch:

  ```typescript
  trackSignInFailed("email");
  ```

- **Line 64** (`submitSignInWithGoogle` catch block): Add inside catch:

  ```typescript
  trackSignInFailed("google");
  ```

- **Line 85-86** (`handleGoogleAuthPayload` success): After the produceAppState block:

  ```typescript
  trackSignInSuccess("google");
  ```

- **Line 88** (`handleGoogleAuthPayload` catch): Add:

  ```typescript
  trackSignInFailed("google");
  ```

- **Line 124-126** (`submitSignUp` success): After the produceAppState block:

  ```typescript
  trackSignUpSuccess();
  ```

- **Line 127** (`submitSignUp` catch): Add:

  ```typescript
  trackSignInFailed("signup");
  ```

- **Line 142** (`submitResetPassword`): After `sendPasswordResetRequest`:

  ```typescript
  trackPasswordResetRequested();
  ```

- **Line 162-176** (`signOut`): At the end of the function, before the final `await getAuthRepo().signOut()` or after it:
  ```typescript
  trackSignOut();
  ```

**File 2**: `apps/desktop/src/actions/kakao-login.actions.ts`

- Add import: `import { trackSignInSuccess, trackSignInFailed } from "../utils/analytics.utils";`

- **Line 78-80** (success block): After `state.login.status = "success"`:

  ```typescript
  trackSignInSuccess("kakao");
  ```

- **Line 81-88** (catch block): Add:
  ```typescript
  trackSignInFailed("kakao");
  ```

#### Agent 2C: Auth UI Call Sites (2 files)

**Category**: `quick` | **Skills**: `[]`

**File 1**: `apps/desktop/src/components/settings/SettingsPage.tsx`

- In `handleSignOut` handler (around line 200-202): call `trackSignOut()` before or alongside the existing sign-out logic.
  Import: `import { trackSignOut, trackSettingChanged, trackHelpAction, trackBillingPortalOpened } from "../../utils/analytics.utils";`
  (This import will be reused in Wave 3 for settings events)

**File 2**: `apps/desktop/src/components/settings/DeleteAccountDialog.tsx`

- In the delete handler: Add `trackAccountDeleted()` call before the actual deletion API call.
  Import: `import { trackAccountDeleted } from "../../utils/analytics.utils";`

#### Agent 2D: Onboarding Call Site (1 file)

**Category**: `quick` | **Skills**: `[]`

**File**: `apps/desktop/src/actions/onboarding.actions.ts`

- Add import: `import { trackOnboardingCompleted } from "../utils/analytics.utils";`
  (Note: `CURRENT_COHORT` is already imported from `analytics.utils` at line 11 — extend that import)

- **Line 205** (`finishOnboarding`): After `await setAutoLaunchEnabled(true)` (line 229), before the return:
  ```typescript
  trackOnboardingCompleted();
  ```

---

### Wave 3: P1 Dictation Lifecycle + Settings + P2 Feature Engagement (PARALLEL — 5 agents)

#### Agent 3A: Dictation Lifecycle (1 file — complex, needs careful placement)

**Category**: `unspecified-low` | **Skills**: `[]`

**File**: `apps/desktop/src/components/root/RootSideEffects.ts`

This file handles the entire dictation session. Agent must READ the file first to find exact locations.

- Add import: `import { trackDictationCompleted, trackDictationEmpty, trackDictationError } from "../../utils/analytics.utils";`

- **Dictation Completed**: Around line 453 area where `transcribeResult` is available and the dictation has succeeded. After `storeTranscription` returns, track:

  ```typescript
  trackDictationCompleted({
    durationMs: transcribeResult.metadata.transcriptionDurationMs ?? null,
    wordCount: countWords(rawTranscript),
    appName: /* get from state.activeAppName or similar */,
    mode: /* "dictate" or "agent" from current mode */,
    toneApplied: /* boolean: whether a tone was used */,
  });
  ```

  Agent must identify exact variable names from context.

- **Dictation Empty**: Around line 484 where `!rawTranscript` is checked and the function returns early:

  ```typescript
  trackDictationEmpty();
  ```

- **Dictation Error**: In catch blocks of `stopRecording` or transcription flow:
  ```typescript
  trackDictationError({ stage: "transcription", error: String(err) });
  ```

#### Agent 3B: Post Processing + Retranscription (2 files)

**Category**: `quick` | **Skills**: `[]`

**File 1**: `apps/desktop/src/actions/transcribe.actions.ts`

- Add import: `import { trackPostProcessingCompleted } from "../utils/analytics.utils";`

- In `postProcessTranscript` function (~line 246), right before the return statement, add:
  ```typescript
  trackPostProcessingCompleted({
    durationMs: metadata.postprocessDurationMs ?? null,
  });
  ```

**File 2**: `apps/desktop/src/actions/transcriptions.actions.ts`

- Add import: `import { trackTranscriptionRetried } from "../utils/analytics.utils";`

- **Line 25** (`retranscribeTranscription`): At the beginning of the function body (after the transcription null-check at line 33), or at the start before the async work:
  ```typescript
  trackTranscriptionRetried();
  ```

#### Agent 3C: Settings Changed Events — Actions Files (3 files)

**Category**: `quick` | **Skills**: `[]`

**File 1**: `apps/desktop/src/actions/user.actions.ts`

- Add import: `import { trackSettingChanged } from "../utils/analytics.utils";`

- **Line 268** `setPreferredTranscriptionMode`: After `produceAppState` block:

  ```typescript
  trackSettingChanged("transcription_mode", mode);
  ```

- **Line 328** `setPreferredPostProcessingMode`: After `produceAppState` block:

  ```typescript
  trackSettingChanged("post_processing_mode", mode);
  ```

- **Line 348** `setPreferredAgentMode`: After `produceAppState` block:

  ```typescript
  trackSettingChanged("agent_mode", mode);
  ```

- **Line 500** `setIncognitoModeEnabled`: After the `updateUserPreferences` call:

  ```typescript
  trackSettingChanged("incognito_mode", enabled);
  ```

- **Line 520** `setDictationPillVisibility`: After the `updateUserPreferences` call:
  ```typescript
  trackSettingChanged("pill_visibility", visibility);
  ```

**File 2**: `apps/desktop/src/actions/settings.actions.ts`

- Add import: `import { trackSettingChanged } from "../utils/analytics.utils";`

- **Line 45** `setAutoLaunchEnabled`: After the successful `enable()`/`disable()` call (line 73-75, inside the success block):
  ```typescript
  trackSettingChanged("auto_launch", enabled);
  ```

**File 3**: `apps/desktop/src/actions/hotkey.actions.ts` (or wherever HotkeySetting save/delete is)

- Agent must READ the file first.
- Add tracking for hotkey save/delete events.

#### Agent 3D: Settings Changed Events — Component Files (3 files)

**Category**: `quick` | **Skills**: `[]`

**File 1**: `apps/desktop/src/components/settings/SettingsPage.tsx`

- Extend existing import (from Wave 2C) to include `trackSettingChanged`, `trackHelpAction`, `trackBillingPortalOpened`.

- **~Line 88** `handleLocaleToggle`: Add:

  ```typescript
  trackSettingChanged("app_language", nextLocale);
  ```

- **~Line 123** `handleDictationLanguageChange`: Add:

  ```typescript
  trackSettingChanged("dictation_language", language);
  ```

- **~Line 204** `openSubscriptionPortal`: Add:

  ```typescript
  trackBillingPortalOpened();
  ```

- **~Line 526-546** bug report mailto: Add before/after the mailto open:

  ```typescript
  trackHelpAction("bug_report");
  ```

- **~Line 555-562** feedback mailto: Add:
  ```typescript
  trackHelpAction("feedback");
  ```

**File 2**: `apps/desktop/src/components/settings/MicrophoneDialog.tsx`

- Add import: `import { trackSettingChanged } from "../../utils/analytics.utils";`

- **~Line 52** `handleSave`: After successful save:
  ```typescript
  trackSettingChanged("microphone", selectedMicrophone);
  ```

**File 3**: `apps/desktop/src/components/settings/HotkeySetting.tsx`

- Add import: `import { trackSettingChanged } from "../../utils/analytics.utils";`

- In save handler: `trackSettingChanged("hotkey", newHotkey);`
- In delete handler: `trackSettingChanged("hotkey", "deleted");`

#### Agent 3E: P2 Feature Engagement — All Remaining (6 files)

**Category**: `unspecified-low` | **Skills**: `[]`

**File 1**: `apps/desktop/src/components/dictionary/DictionaryRow.tsx`

- Add import: `import { trackTermCreated, trackTermDeleted } from "../../utils/analytics.utils";`
- In create flow: `trackTermCreated();`
- **~Line 74** `handleDelete`: `trackTermDeleted();`

**File 2**: `apps/desktop/src/components/tones/ToneEditorDialog.tsx`

- Add import: `import { trackToneCreated, trackToneDeleted } from "../../utils/analytics.utils";`
- **~Line 50** `handleCreate`: `trackToneCreated();`
- **~Line 77** `handleDelete`: `trackToneDeleted();`

**File 3**: `apps/desktop/src/actions/tone.actions.ts`

- Add import: `import { trackToneSelected } from "../utils/analytics.utils";`
- **Line 92** `setActiveTone`: After successful preference save (line 107):
  ```typescript
  trackToneSelected(toneId);
  ```

**File 4**: `apps/desktop/src/components/transcriptions/TranscriptRow.tsx`

- Add import: `import { trackTranscriptDeleted, trackTranscriptViewed } from "../../utils/analytics.utils";`
- **~Line 263** `handleDeleteTranscript`: `trackTranscriptDeleted();`
- In click handler / `openTranscriptionDetailsDialog` call: `trackTranscriptViewed();`

**File 5**: `apps/desktop/src/actions/api-key.actions.ts`

- Add import: `import { trackApiKeyAdded, trackApiKeyDeleted } from "../utils/analytics.utils";`
- **Line 62** `createApiKey`: After successful creation (line 77, before return):
  ```typescript
  trackApiKeyAdded();
  ```
- **Line 88** `deleteApiKey`: After successful deletion (line 106, before `syncAiPreferences`):
  ```typescript
  trackApiKeyDeleted();
  ```

---

### Wave 4: Verification (SERIAL)

**Agent**: `sisyphus-junior` | **Category**: `quick` | **Skills**: `[]`

1. Run `tsc --noEmit` in `apps/desktop` to confirm no TypeScript errors
2. Run the project's test suite to confirm all 230 tests pass
3. Grep all call sites to produce a final audit:
   ```
   grep -rn "track[A-Z]" apps/desktop/src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test."
   ```
4. Confirm every function exported from `analytics.utils.ts` is called at least once
5. Confirm no tracking calls were accidentally added to `apps/web`

---

## Parallel Execution Summary

| Wave      | Agents       | Tasks                                                                                                                        | Dependencies | Est Time |
| --------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------ | -------- |
| **1**     | 1 (serial)   | Add all functions to analytics.utils.ts                                                                                      | None         | 3 min    |
| **2**     | 4 (parallel) | P0 Revenue (3 files) + P0 Auth (5 files) + Auth UI (2 files) + Onboarding (1 file)                                           | Wave 1       | 5 min    |
| **3**     | 5 (parallel) | Dictation (1 file) + PostProcess (2 files) + Settings Actions (3 files) + Settings Components (3 files) + Features (6 files) | Wave 1       | 5 min    |
| **4**     | 1 (serial)   | TypeScript check + tests + audit                                                                                             | Waves 2+3    | 3 min    |
| **Total** |              | 40 events across ~22 files                                                                                                   |              | ~16 min  |

## File Change Summary

| File                                          | Changes                                 |
| --------------------------------------------- | --------------------------------------- |
| `utils/analytics.utils.ts`                    | +26 new exported functions (~130 lines) |
| `components/payment/PaymentDialog.tsx`        | +3 calls, +1 import                     |
| `components/pricing/UpgradePlanDialog.tsx`    | +1 call, +1 import                      |
| `actions/login.actions.ts`                    | +8 calls, +1 import                     |
| `actions/kakao-login.actions.ts`              | +2 calls, +1 import                     |
| `components/settings/SettingsPage.tsx`        | +5 calls, +1 import                     |
| `components/settings/DeleteAccountDialog.tsx` | +1 call, +1 import                      |
| `actions/onboarding.actions.ts`               | +1 call, extend import                  |
| `components/root/RootSideEffects.ts`          | +3 calls, +1 import                     |
| `actions/transcribe.actions.ts`               | +1 call, +1 import                      |
| `actions/transcriptions.actions.ts`           | +1 call, +1 import                      |
| `actions/user.actions.ts`                     | +5 calls, +1 import                     |
| `actions/settings.actions.ts`                 | +1 call, +1 import                      |
| `actions/hotkey.actions.ts`                   | +2 calls, +1 import                     |
| `components/settings/MicrophoneDialog.tsx`    | +1 call, +1 import                      |
| `components/settings/HotkeySetting.tsx`       | +2 calls, +1 import                     |
| `components/dictionary/DictionaryRow.tsx`     | +2 calls, +1 import                     |
| `components/tones/ToneEditorDialog.tsx`       | +2 calls, +1 import                     |
| `actions/tone.actions.ts`                     | +1 call, +1 import                      |
| `components/transcriptions/TranscriptRow.tsx` | +2 calls, +1 import                     |
| `actions/api-key.actions.ts`                  | +2 calls, +1 import                     |

## Acceptance Criteria

- [ ] All 26 new functions exist in `analytics.utils.ts` following the isMixpanelReady guard pattern
- [ ] All 40 events have at least one call site in the correct location
- [ ] `trackPaymentComplete()` (existing but uncalled) now has a call in PaymentDialog.tsx
- [ ] Event names are Title Case: "Payment Complete", "Sign In Success", "Setting Changed", etc.
- [ ] Property names are camelCase: selectedPlan, method, settingName, durationMs, etc.
- [ ] No tracking code was added to `apps/web/**`
- [ ] No modifications to Mixpanel init in `main.tsx`
- [ ] No modifications to user identification in `AppSideEffects.tsx`
- [ ] `tsc --noEmit` passes in `apps/desktop`
- [ ] All 230 existing tests pass
- [ ] Every export in analytics.utils.ts has at least one call site (verified by grep)

## Risk Mitigations

| Risk                                                                                     | Mitigation                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Line numbers shifted since user's analysis                                               | Every agent MUST read the file before editing, finding exact insertion points by code pattern rather than line number                                                      |
| Import conflicts / duplicate imports                                                     | Agent checks existing imports first; extends existing analytics import if present                                                                                          |
| `trackSettingChanged` called from `setAutoLaunchEnabled` during onboarding (double-fire) | Acceptable — the setting IS being changed during onboarding. Filtering can be done in Mixpanel dashboard if needed                                                         |
| RootSideEffects.ts is complex (500+ lines)                                               | Agent 3A gets `unspecified-low` category with instructions to read the full file first and find exact code patterns                                                        |
| Missing call site for Term Created (dictionary.actions.ts has no create)                 | DictionaryRow.tsx has the create flow — agent must check both component and action file                                                                                    |
| `trackSignOut` called twice (SettingsPage + login.actions)                               | Only add in login.actions.ts `signOut()` function — that's the single source of truth. SettingsPage calls that function. Remove from SettingsPage if it would double-fire. |

## Verification Steps

1. **TypeScript compilation**: Run `npx tsc --noEmit` in `apps/desktop` — zero errors expected
2. **Test suite**: Run `npm run test` — all 230 tests pass
3. **Call site audit**: Run grep to list every `track*` call site and verify count matches 40+ events
4. **Export audit**: Diff `analytics.utils.ts` exports vs. grep results — every function called at least once
5. **Web app clean**: `grep -r "trackSign\|trackPayment\|trackDictation\|trackSetting\|trackTone\|trackTerm\|trackApi\|trackTranscript\|trackHelp\|trackBilling\|trackOnboarding\|trackPost" apps/web/` returns empty
6. **Manual smoke test** (optional): Run the app, perform a dictation, check Mixpanel Live View for "Dictation Completed" event
